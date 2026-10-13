"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { safeRedirectPath } from "@/lib/safe-redirect";
import AuthLoadingScreen from "@/components/AuthLoadingScreen";

// Purely cosmetic: how long the success state stays on screen before
// navigating away, once the backend has already confirmed a real
// success. Never gates or delays the actual authentication request.
const SUCCESS_TRANSITION_MS = 450;

function AutoLoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get("session");
  const t = useTranslations("autoLogin");
  const tAuthLoading = useTranslations("authLoading");
  const [requestState, setState] = useState<"loading" | "success" | "error">("loading");
  // A link with no session id can never succeed -- derived, not fetched.
  const state = sessionId ? requestState : "error";
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!sessionId) return;

    // Real, critical fix: React 18 StrictMode (dev mode) intentionally
    // runs this effect twice. TelegramAuthSession is consume-once by
    // design (CompleteTelegramAuthSession marks it CONSUMED the
    // moment it succeeds) -- a second, StrictMode-only request always
    // failed with "consumed", showing the user an error even though
    // the first request had already logged them in successfully.
    // This ref (not the `cancelled` flag below, which only guards
    // setState) ensures the actual network request fires only once.
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    let cancelled = false;
    fetch(`/api/auth/auto-login?session=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        if (cancelled) return;
        const body = await res.json();
        if (!res.ok || !body.success) {
          setState("error");
          return;
        }
        // Real success already confirmed above -- this only delays the
        // redirect for a short, purely cosmetic beat (never the other
        // way around: the animation never decides when auth is "done").
        setState("success");
        await new Promise((resolve) => setTimeout(resolve, SUCCESS_TRANSITION_MS));
        if (cancelled) return;
        // This deep-link path is reached from inside the Telegram bot
        // itself (its "🌐 Saytga avtomatik kirish" menu button) --
        // the bot never knows any website-side `next` destination, so
        // this always lands on the real, safe default rather than an
        // unvalidated stored value.
        router.replace(safeRedirectPath(null, "/"));
        router.refresh();
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  if (state === "error") {
    // The existing, specific copy ("this login link is no longer
    // valid / it may have expired or already been used") is kept as
    // the real message here rather than a generic authLoading.errorTitle
    // -- it's more accurate for a consume-once deep link, and there is
    // no real retry action for an already-expired/used session (the
    // existing flow never offered one either).
    return <AuthLoadingScreen phase="error" title={t("errorTitle")} subtitle={t("errorDescription")} />;
  }

  return (
    <AuthLoadingScreen
      phase={state}
      title={state === "success" ? tAuthLoading("welcomeBack") : tAuthLoading("signingIn")}
      subtitle={state === "success" ? tAuthLoading("preparing") : tAuthLoading("connectingTelegram")}
    />
  );
}

function AutoLoginFallback() {
  const tAuthLoading = useTranslations("authLoading");
  // Suspense fallback while useSearchParams() resolves -- shows the same
  // premium screen immediately rather than a blank/unstyled flash before
  // AutoLoginContent mounts (the exact flash this task explicitly guards
  // against for this deep-link entry point).
  return <AuthLoadingScreen phase="loading" title={tAuthLoading("signingIn")} subtitle={tAuthLoading("connectingTelegram")} />;
}

export default function AutoLoginPage() {
  return (
    <Suspense fallback={<AutoLoginFallback />}>
      <AutoLoginContent />
    </Suspense>
  );
}
