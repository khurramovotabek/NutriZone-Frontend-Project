"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { MyStore, SaveState } from "./types";

interface StoreDashboardValue {
  store: MyStore | null;
  setStore: (store: MyStore) => void;
  loading: boolean;
  error: string | null;
  saveState: SaveState;
  saveField: (patch: Partial<MyStore>) => Promise<void>;
  refresh: () => Promise<void>;
}

const StoreDashboardCtx = createContext<StoreDashboardValue | null>(null);

type MyStoreResult = { store: MyStore } | { error: string };

async function fetchMyStore(): Promise<MyStoreResult> {
  try {
    const res = await fetch("/api/my-store", { cache: "no-store" });
    const body = await res.json();
    if (!res.ok || !body.success) {
      return { error: res.status === 404 ? "notFound" : res.status === 401 ? "login" : "load" };
    }
    return { store: body.data };
  } catch {
    return { error: "network" };
  }
}

/**
 * Single source of truth for the whole store dashboard: fetched once
 * here in the shared layout, then every sub-page (/profile/store,
 * /profile/store/profile, /contact, /hours, /gallery, /products,
 * /inquiries) reads and mutates the same store object via this
 * context instead of each page re-fetching /api/my-store on its own.
 */
export function StoreDashboardProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<MyStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const applyResult = useCallback((result: MyStoreResult) => {
    if ("store" in result) {
      setStore(result.store);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    applyResult(await fetchMyStore());
  }, [applyResult]);

  useEffect(() => {
    let cancelled = false;
    fetchMyStore().then((result) => {
      if (!cancelled) applyResult(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyResult]);

  async function saveField(patch: Partial<MyStore>) {
    if (!store) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/my-store", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setSaveState("error");
        return;
      }
      setStore(body.data);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  }

  return <StoreDashboardCtx.Provider value={{ store, setStore, loading, error, saveState, saveField, refresh }}>{children}</StoreDashboardCtx.Provider>;
}

export function useStoreDashboard(): StoreDashboardValue {
  const ctx = useContext(StoreDashboardCtx);
  if (!ctx) throw new Error("useStoreDashboard must be used within StoreDashboardProvider");
  return ctx;
}
