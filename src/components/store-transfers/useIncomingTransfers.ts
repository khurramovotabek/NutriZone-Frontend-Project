"use client";

import { useCallback, useEffect, useState } from "react";
import { transfers } from "./api";
import type { TransferList } from "./types";

const POLL_MS = 30000;

/** The branch's transfers (incoming = on the way / being received), polled while the tab is visible -- the nav badge and the list read it. */
export function useIncomingTransfers(scope: "incoming" | "history" = "incoming", query = "") {
  const [data, setData] = useState<TransferList | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await transfers<TransferList>(`?scope=${scope}&q=${encodeURIComponent(query)}`);
    if (res.ok) {
      setData(res.data);
      setError(false);
    } else setError(res.status !== 404); // 404 = this account runs no branch: nothing to show, not an error
    setLoading(false);
  }, [scope, query]);

  useEffect(() => {
    const first = window.setTimeout(load, 0);
    const timer = window.setInterval(() => !document.hidden && load(), POLL_MS);
    const onVisible = () => !document.hidden && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  return { data, error, loading, reload: load };
}
