"use client";

import type { ApiResult } from "./types";

/** Calls the branch transfers proxy (/api/my-store/transfers/...) and normalises the { success, data | error } envelope. */
export async function transfers<T>(path = "", init?: { method?: "GET" | "POST"; body?: unknown }): Promise<ApiResult<T>> {
  try {
    const suffix = !path ? "" : path.startsWith("?") ? path : `/${path}`;
    const res = await fetch(`/api/my-store/transfers${suffix}`, {
      method: init?.method ?? "GET",
      headers: init?.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.success) return { ok: true, data: body.data as T };
    return { ok: false, status: res.status, error: { code: body?.error?.code ?? "UNKNOWN", message: body?.error?.message ?? "", details: body?.error?.details } };
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK", message: "" } };
  }
}

export function som(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return Math.round(Number.isFinite(n) ? n : 0).toLocaleString("ru-RU").replace(/ /g, " ");
}

/** "2027-04-30" -> "30.04.2027" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return d && m && y ? `${d}.${m}.${y}` : iso;
}

export function daysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

/** One short beep for a scan (Web Audio; silent if the browser blocks sound). */
let audio: AudioContext | null = null;
export function beep(ok: boolean) {
  try {
    audio ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.frequency.value = ok ? 1250 : 240;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + (ok ? 0.08 : 0.25));
  } catch {
    /* no audio */
  }
}
