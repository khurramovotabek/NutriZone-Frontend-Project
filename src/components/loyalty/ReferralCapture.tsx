"use client";

import { useEffect } from "react";

/**
 * Remembers an invite code from a shared link (`/?ref=NZABC123`, or any page
 * with `?ref=`) for 30 days and cleans it out of the address bar. The code is
 * applied server-side the moment the visitor signs in (see referral-server.ts).
 */
export default function ReferralCapture() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("ref");
    if (!code || !/^[A-Za-z0-9]{4,16}$/.test(code)) return;
    document.cookie = `nz_ref=${encodeURIComponent(code.toUpperCase())}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    url.searchParams.delete("ref");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return null;
}
