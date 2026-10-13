"use client";

import type { PosError } from "./types";

export type PosResult<T> = { ok: true; data: T } | { ok: false; error: PosError; status: number };

const HANDOVER_KEY = "nz_pos_cashier";

/**
 * On a shared computer the terminal is handed from one cashier to the next with the kassa PIN; the server answers
 * with a signed token naming the new cashier, kept for this browser tab only and sent with every POS call.
 */
export function getHandover(): string | null {
  try {
    return sessionStorage.getItem(HANDOVER_KEY);
  } catch {
    return null;
  }
}

export function setHandover(token: string | null) {
  try {
    if (token) sessionStorage.setItem(HANDOVER_KEY, token);
    else sessionStorage.removeItem(HANDOVER_KEY);
  } catch {
    /* storage blocked: the signed-in person keeps selling */
  }
}

/** Calls the store POS proxy (/api/my-store/pos/...) and normalises the envelope. */
export async function pos<T>(path: string, init?: { method?: string; body?: unknown }): Promise<PosResult<T>> {
  try {
    const headers: Record<string, string> = {};
    if (init?.body !== undefined) headers["Content-Type"] = "application/json";
    const handover = getHandover();
    if (handover) headers["X-Pos-Cashier"] = handover;
    const res = await fetch(`/api/my-store/pos/${path}`, {
      method: init?.method ?? "GET",
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.success) return { ok: true, data: body.data as T };
    return { ok: false, status: res.status, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "", details: body?.error?.details } };
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK", message: "" } };
  }
}

export function money(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US").replace(/,/g, " ");
}

const pad = (n: number) => String(n).padStart(2, "0");

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${pad(minutes % 60)}`;
}
