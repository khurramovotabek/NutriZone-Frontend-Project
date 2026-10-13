"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StoreOrdersPayload } from "./types";

const POLL_MS = 20000;

/**
 * The branch's online orders (GET /api/my-store/orders), polled every 20 s while the tab is visible -- the nav badge,
 * the overview and the orders page all read it. `onNew` fires when more orders are waiting than at the last poll
 * (the orders page plays a chime then).
 */
export function useStoreOrders(scope: "active" | "done" | "all" = "active", query = "", onNew?: (count: number) => void) {
  const [data, setData] = useState<StoreOrdersPayload | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastNew = useRef<number | null>(null);
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  }, [onNew]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/my-store/orders?scope=${scope}&q=${encodeURIComponent(query)}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(true);
        return;
      }
      const payload: StoreOrdersPayload = body.data;
      if (lastNew.current !== null && payload.counts.new > lastNew.current) onNewRef.current?.(payload.counts.new);
      lastNew.current = payload.counts.new;
      setData(payload);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [scope, query]);

  useEffect(() => {
    const first = window.setTimeout(load, 0);
    const timer = window.setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    const onVisible = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { data, error, loading, reload: load, setData };
}
