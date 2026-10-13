"use client";

import { useEffect, useState } from "react";

/** Unread chat messages for a menu badge: refreshed every 30s, on focus, and whenever a chat page reports a change. */
export function useChatUnread(): number {
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/chat/unread-count", { cache: "no-store" })
        .then((r) => r.json())
        .then((b) => alive && setTotal(b?.data?.total ?? 0))
        .catch(() => {});
    load();
    const id = window.setInterval(() => document.visibilityState === "visible" && load(), 30_000);
    window.addEventListener("focus", load);
    window.addEventListener("nz:chat-read", load);
    return () => {
      alive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", load);
      window.removeEventListener("nz:chat-read", load);
    };
  }, []);
  return total;
}
