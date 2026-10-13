"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Coins, Loader2, MessageCircle, Phone, ShieldCheck, Zap } from "lucide-react";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";
import BrandMark from "@/components/BrandMark";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { haptic, loadTelegramScript, markMiniApp, supports, type TelegramWebApp } from "@/lib/telegram-webapp";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
const LINK_POLL_MS = 1500;
const LINK_POLL_TRIES = 14; // ~20 s for the bot to receive the shared contact and create the account

/** Where to land: ?next=/path, or a Mini App start parameter "product_<slug>" (t.me/<bot>/<app>?startapp=product_<slug>). */
function destination(next: string | null, startParam: string | undefined): string {
  if (startParam?.startsWith("product_")) return `/products/${encodeURIComponent(startParam.slice("product_".length))}`;
  return safeRedirectPath(next, "/");
}

type Phase = "loading" | "success" | "error" | "register" | "linking" | "confirmInBot";
type SignIn = "ok" | "unregistered" | "error";

/**
 * Telegram Mini App entry (the bot's "Do'kon" menu button / "Do'konni ochish"): signs the shopper in from the WebApp
 * initData -- no code to type -- and opens the storefront inside Telegram. A first-time visitor registers right
 * here: one tap shares their Telegram phone number with the bot (WebApp.requestContact), the bot creates the account
 * and this screen signs in as soon as it exists. Opened outside Telegram it simply continues to the site.
 */
function MiniAppEntry() {
  const t = useTranslations("miniApp");
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<Phase>("loading");
  const [declined, setDeclined] = useState(false);
  const appRef = useRef<TelegramWebApp | null>(null);
  const startedRef = useRef(false);

  const target = useCallback(() => destination(params.get("next"), appRef.current?.initDataUnsafe?.start_param), [params]);

  const trySignIn = useCallback(async (): Promise<SignIn> => {
    const app = appRef.current;
    if (!app) return "error";
    try {
      const res = await fetch("/api/auth/telegram-webapp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: app.initData }) });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.success) return "ok";
      return body?.error?.code === "NOT_REGISTERED" ? "unregistered" : "error";
    } catch {
      return "error";
    }
  }, []);

  const enter = useCallback(() => {
    setPhase("success");
    haptic("success");
    markMiniApp();
    router.replace(target());
    router.refresh();
  }, [router, target]);

  const start = useCallback(async () => {
    setPhase("loading");
    const result = await trySignIn();
    if (result === "ok") enter();
    else setPhase(result === "unregistered" ? "register" : "error");
  }, [enter, trySignIn]);

  useEffect(() => {
    if (startedRef.current) return; // once per open
    startedRef.current = true;
    void (async () => {
      const app = await loadTelegramScript();
      if (!app) {
        router.replace(destination(params.get("next"), undefined)); // not inside Telegram -- nothing to sign in with
        return;
      }
      appRef.current = app;
      app.ready();
      app.expand();
      app.setHeaderColor?.("#0b1220");
      app.setBackgroundColor?.("#0b1220");
      if (supports(app, "7.10")) app.setBottomBarColor?.("#0b1220");
      if (supports(app, "7.7")) app.disableVerticalSwipes?.();
      await start();
    })();
  }, [params, router, start]);

  async function shareContact() {
    const app = appRef.current;
    if (!app?.requestContact || !supports(app, "6.9")) {
      openBot();
      return;
    }
    setDeclined(false);
    haptic("select");
    app.requestContact(async (shared) => {
      if (!shared) {
        setDeclined(true);
        haptic("error");
        return;
      }
      setPhase("linking");
      // The bot receives the contact as a message and creates the account; sign in as soon as it exists.
      for (let i = 0; i < LINK_POLL_TRIES; i++) {
        await new Promise((r) => setTimeout(r, LINK_POLL_MS));
        const result = await trySignIn();
        if (result === "ok") return enter();
      }
      setPhase("confirmInBot"); // e.g. the shopper was midway through the bot's own sign-up and must confirm there
    });
  }

  function openBot() {
    if (!BOT_USERNAME) return;
    const url = `https://t.me/${BOT_USERNAME}?start=webapp`;
    if (appRef.current?.openTelegramLink) appRef.current.openTelegramLink(url);
    else window.location.href = url;
  }

  const continueAsGuest = () => {
    markMiniApp();
    router.replace(target());
  };

  if (phase === "register" || phase === "linking" || phase === "confirmInBot") {
    const name = appRef.current?.initDataUnsafe?.user?.first_name;
    const photo = appRef.current?.initDataUnsafe?.user?.photo_url;
    return (
      <div className="dark relative flex min-h-dvh flex-col overflow-hidden bg-[#0b1220] px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+28px)] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/25 blur-[110px]" />
          <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-[90px]" />
        </div>
        <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
          <div className="flex items-center gap-3">
            <BrandMark className="h-11 w-11 rounded-2xl text-base" />
            <div className="flex items-center gap-1.5 text-xs font-medium text-white/60">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              {t("secure")}
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4">
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- Telegram's own avatar URL, not a site asset
              <img src={photo} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/60" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/20 text-3xl ring-2 ring-primary/50" aria-hidden="true">👋</div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">{name ? t("greeting", { name }) : t("greetingAnon")}</h1>
              <p className="mt-1 text-sm leading-snug text-white/70">{t("registerLead")}</p>
            </div>
          </div>

          <ul className="mt-8 space-y-3">
            {[
              { icon: Zap, text: t("benefitFast"), tone: "text-amber-300 bg-amber-400/10" },
              { icon: Coins, text: t("benefitCoins"), tone: "text-yellow-300 bg-yellow-400/10" },
              { icon: MessageCircle, text: t("benefitTrack"), tone: "text-sky-300 bg-sky-400/10" },
            ].map(({ icon: Icon, text, tone }) => (
              <li key={text} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="h-4.5 w-4.5" aria-hidden="true" /></span>
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-8">
            {phase === "linking" ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-5 text-center" role="status">
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
                <p className="font-semibold">{t("linking")}</p>
                <p className="text-xs text-white/60">{t("linkingHint")}</p>
              </div>
            ) : phase === "confirmInBot" ? (
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-4 text-center" role="alert">
                <p className="font-semibold text-amber-200">{t("linkTimeout")}</p>
                <p className="mt-1 text-xs text-white/70">{t("linkTimeoutText")}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={openBot} className="nz-cta flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold">{t("openBot")}</button>
                  <button type="button" onClick={() => void start()} className="flex-1 rounded-xl border border-white/15 px-3 py-2.5 text-sm font-medium">{t("retry")}</button>
                </div>
              </div>
            ) : (
              <>
                <button type="button" onClick={() => void shareContact()} className="nz-cta flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] font-semibold shadow-lg shadow-primary/30">
                  <Phone className="h-4.5 w-4.5" aria-hidden="true" />
                  {t("shareContact")}
                </button>
                {declined && <p className="mt-2 text-center text-xs text-amber-200/90" role="alert">{t("contactDeclined")}</p>}
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  {BOT_USERNAME && (
                    <button type="button" onClick={openBot} className="rounded-2xl border border-white/15 px-3 py-3 text-sm font-medium text-white/85">{t("register")}</button>
                  )}
                  <button type="button" onClick={continueAsGuest} className={`rounded-2xl border border-white/15 px-3 py-3 text-sm font-medium text-white/85 ${BOT_USERNAME ? "" : "col-span-2"}`}>
                    {t("continueAsGuest")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthLoadingScreen
      phase={phase === "error" ? "error" : phase === "success" ? "success" : "loading"}
      title={phase === "error" ? t("errorTitle") : t("title")}
      subtitle={phase === "error" ? t("errorText") : t("subtitle")}
      onRetry={phase === "error" ? () => void start() : undefined}
      retryLabel={t("retry")}
    />
  );
}

export default function MiniAppPage() {
  return (
    <Suspense>
      <MiniAppEntry />
    </Suspense>
  );
}
