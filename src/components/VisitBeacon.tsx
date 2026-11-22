"use client";

import { useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";

type UAData = { mobile?: boolean; getHighEntropyValues?: (hints: string[]) => Promise<{ model?: string; platformVersion?: string }> };

/**
 * Device statistics for the dashboard (Qurilmalar): once per tab session, tells the backend which kind of device opened
 * the shop -- a random per-browser id plus screen size, touch points, Mini App flag and, where the browser offers it,
 * the phone model / real OS version (Client Hints). No cookies, no personal data; never blocks or breaks the page.
 */
export default function VisitBeacon() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        if (navigator.webdriver || !navigator.sendBeacon) return;
        const today = new Date().toISOString().slice(0, 10);
        if (sessionStorage.getItem("nz_vb") === today) return;
        sessionStorage.setItem("nz_vb", today);
        let id = localStorage.getItem("nz_vid");
        if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
          id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
          localStorage.setItem("nz_vid", id);
        }
        const body = new URLSearchParams({ v: id, w: String(window.screen.width), h: String(window.screen.height), tp: String(navigator.maxTouchPoints || 0) });
        if (document.documentElement.dataset.tg) body.set("tg", "1");
        const send = () => navigator.sendBeacon(`${API_BASE_URL}/api/v1/identity/visits`, body);
        const uad = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
        if (uad?.getHighEntropyValues) {
          body.set("m", uad.mobile ? "1" : "0");
          uad.getHighEntropyValues(["model", "platformVersion"]).then((h) => {
            if (h.model) body.set("md", h.model.slice(0, 64));
            if (h.platformVersion) body.set("pv", h.platformVersion.slice(0, 24));
          }).catch(() => undefined).finally(send);
        } else send();
      } catch {
        /* statistics are best effort */
      }
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
