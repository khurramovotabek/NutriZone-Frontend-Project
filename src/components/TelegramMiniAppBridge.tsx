"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { onCartUpdated } from "@/lib/cart-events";
import { haptic, isMiniAppSession, loadTelegramScript, paintTelegramChrome, supports, type TelegramWebApp } from "@/lib/telegram-webapp";

type CartSummary = { count: number; total: number };

async function cartSummary(): Promise<CartSummary> {
  try {
    const body = await fetch("/api/cart").then((r) => r.json());
    const items: { quantity: number; status: string; price_reference: { unit_amount: string } | null }[] = body?.data?.items ?? [];
    const active = items.filter((i) => i.status !== "removed");
    return {
      count: active.reduce((n, i) => n + i.quantity, 0),
      total: active.reduce((s, i) => s + (i.price_reference ? Number(i.price_reference.unit_amount) * i.quantity : 0), 0),
    };
  } catch {
    return { count: 0, total: 0 };
  }
}

/**
 * The storefront as a native-feeling Telegram Mini App (active only inside Telegram, see isMiniAppSession):
 *  - Telegram's own Back button replaces the browser's (shown on every page but the home page);
 *  - the bottom MainButton is the cart: "Savat · 2 ta · 1 330 000 so'm" → /cart, "Rasmiylashtirish" on the cart page;
 *  - haptic tick when something lands in the cart; the site footer is hidden (html[data-tg]) to feel like an app.
 */
export default function TelegramMiniAppBridge() {
  const t = useTranslations("miniApp");
  const router = useRouter();
  const pathname = usePathname();
  const appRef = useRef<TelegramWebApp | null>(null);
  const mainRef = useRef<(() => void) | null>(null);
  const pathRef = useRef(pathname);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!isMiniAppSession()) return;
    let cancelled = false;
    const back = () => router.back();

    const syncMain = async () => {
      const app = appRef.current;
      const main = app?.MainButton;
      if (!app || !main) return;
      if (mainRef.current) main.offClick(mainRef.current);
      const path = pathRef.current;
      if (path.startsWith("/checkout") || path.startsWith("/tg")) {
        main.hide();
        return;
      }
      const { count, total } = await cartSummary();
      if (cancelled) return;
      if (count === 0) {
        main.hide();
        return;
      }
      const money = `${Math.round(total).toLocaleString("ru-RU").replace(/\s/g, " ")} ${t("currency")}`;
      const onCart = path.startsWith("/cart");
      const text = onCart ? t("mainCheckout") : total > 0 ? t("mainCart", { count, total: money }) : t("mainCartNoTotal", { count });
      const go = () => {
        haptic("light");
        router.push(onCart ? "/checkout" : "/cart");
      };
      mainRef.current = go;
      main.setText(text).onClick(go);
      main.setParams?.({ has_shine_effect: onCart, is_active: true });
      main.enable().show();
    };

    void loadTelegramScript().then((app) => {
      if (cancelled || !app) return;
      appRef.current = app;
      app.ready();
      document.documentElement.dataset.tg = "1";
      paintTelegramChrome(app);
      if (supports(app, "7.7")) app.disableVerticalSwipes?.();
      app.BackButton?.onClick(back);
      if (pathRef.current === "/") app.BackButton?.hide();
      else app.BackButton?.show();
      void syncMain();
    });

    const unsubscribe = onCartUpdated(() => {
      haptic("success");
      void syncMain();
    });
    // re-sync the buttons whenever the route changes (custom event from the pathname effect below)
    const onRoute = () => {
      const app = appRef.current;
      if (!app) return;
      paintTelegramChrome(app); // the theme may have been switched on the previous page
      if (pathRef.current === "/") app.BackButton?.hide();
      else app.BackButton?.show();
      void syncMain();
    };
    window.addEventListener("nz:tg-route", onRoute);
    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("nz:tg-route", onRoute);
      appRef.current?.BackButton?.offClick(back);
      if (mainRef.current) appRef.current?.MainButton?.offClick(mainRef.current);
    };
  }, [router, t]);

  useEffect(() => {
    window.dispatchEvent(new Event("nz:tg-route"));
  }, [pathname]);

  return null;
}
