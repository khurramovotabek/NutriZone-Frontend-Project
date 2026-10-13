"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowLeft, ArrowRight, Barcode, CheckCircle2, CircleAlert, FileSpreadsheet, History, LoaderCircle, Minus, PackageCheck, PackageOpen, Plus, RotateCcw, Save, Scale, TriangleAlert, Truck, WifiOff, X,
} from "lucide-react";
import { Button, Card, ErrorState, Skeleton } from "@/components/ui";
import MediaImage from "@/components/MediaImage";
import { beep, daysLeft, fmtDate, transfers } from "./api";
import type { ApiError, LookupResult, TransferDetail, TransferItem } from "./types";

type Counts = Record<string, number>;
type Reasons = Record<string, { reason: string; note: string }>;
type LastScan = { ok: boolean; title: string; text: string; undo?: { id: string; n: number } };
type WrongScan = { kind: string; text: string; at: string };

const SAVE_DELAY = 900;
const RETRY_MS = 5000;
const POLL_MS = 20000;
const DOUBLE_SCAN_MS = 150;

function now(): string {
  return new Date().toTimeString().slice(0, 5);
}

function Expiry({ iso }: { iso: string }) {
  const t = useTranslations("myStore.receiving");
  if (!iso) return <span className="text-ink-soft">—</span>;
  const n = daysLeft(iso) ?? 0;
  const tone = n < 0 ? "text-red-600 dark:text-red-400" : n <= 60 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400";
  return (
    <span className="inline-flex flex-col leading-tight">
      <span className="font-semibold tabular-nums text-ink">{fmtDate(iso)}</span>
      <span className={`text-[11px] font-semibold ${tone}`}>{n < 0 ? t("expired") : t("daysLeft", { count: n })}</span>
    </span>
  );
}

function BatchTag({ item }: { item: TransferItem }) {
  const t = useTranslations("myStore.receiving");
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className={`inline-flex w-fit rounded-lg border px-2 py-0.5 font-mono text-xs font-bold ${item.batch ? "border-indigo-400/40 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" : "border-border bg-surface-2 text-ink-soft"}`}>
        {item.batch || (item.expiry ? t("noBatch") : "FEFO")}
      </span>
      {item.allocations.length > 1 && (
        <span className="text-[11px] text-ink-soft">{item.allocations.map((a) => `${a.batch || t("noBatch")}: ${a.qty}`).join(" · ")}</span>
      )}
    </span>
  );
}

function StatusPill({ sent, got }: { sent: number; got: number }) {
  const t = useTranslations("myStore.receiving");
  if (!got && sent) return <span className="rounded-full bg-slate-500/12 px-2.5 py-0.5 text-xs font-bold text-ink-soft">{t("stWaiting")}</span>;
  if (got === sent) return <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">{t("stMatched")}</span>;
  if (got < sent) return <span className="rounded-full bg-red-500/12 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:text-red-400">{t("stShortage", { n: got - sent })}</span>;
  return <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">{t("stExcess", { n: got - sent })}</span>;
}

function Stepper({ value, min, onChange, label, big = false }: { value: number; min: number; onChange: (v: number) => void; label: string; big?: boolean }) {
  const t = useTranslations("myStore.receiving");
  const h = big ? "h-12" : "h-9";
  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-border bg-surface">
      <button type="button" aria-label={t("decrease")} onClick={() => onChange(Math.max(min, value - 1))} className={`${h} w-10 text-ink-muted hover:bg-surface-2 hover:text-ink`}>
        <Minus className="mx-auto h-4 w-4" aria-hidden="true" />
      </button>
      <input
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value.replace(/\D/g, ""), 10);
          onChange(Number.isFinite(v) ? Math.max(min, v) : min);
        }}
        className={`${h} ${big ? "w-20 text-lg" : "w-16"} border-x border-border bg-transparent text-center font-bold tabular-nums text-ink outline-none`}
      />
      <button type="button" aria-label={t("increase")} onClick={() => onChange(value + 1)} className={`${h} w-10 text-ink-muted hover:bg-surface-2 hover:text-ink`}>
        <Plus className="mx-auto h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function ReasonFields({ id, reasons, options, onChange, missing }: { id: string; reasons: Reasons; options: TransferDetail["reasons"]; onChange: (id: string, r: { reason: string; note: string }) => void; missing: boolean }) {
  const t = useTranslations("myStore.receiving");
  const r = reasons[id] ?? { reason: "", note: "" };
  return (
    <div className="grid gap-1.5">
      <select
        aria-label={t("reason")}
        value={r.reason}
        onChange={(e) => onChange(id, { ...r, reason: e.target.value })}
        className={`nz-glass-input h-9 w-full min-w-44 text-sm ${missing && !r.reason ? "ring-2 ring-red-500" : ""}`}
      >
        <option value="">{t("chooseReason")}</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>{t.has(`reasons.${o.code}`) ? t(`reasons.${o.code}`) : o.label}</option>
        ))}
      </select>
      <input aria-label={t("note")} placeholder={t("notePlaceholder")} value={r.note} onChange={(e) => onChange(id, { ...r, note: e.target.value })} className="nz-glass-input h-9 w-full text-sm" />
    </div>
  );
}

export default function ReceiveWorkspace({ transferId, onBack }: { transferId: string; onBack: () => void }) {
  const t = useTranslations("myStore.receiving");
  const [T, setT] = useState<TransferDetail | null>(null);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [counts, setCounts] = useState<Counts>({});
  const [reasons, setReasons] = useState<Reasons>({});
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [last, setLast] = useState<LastScan | null>(null);
  const [wrong, setWrong] = useState<WrongScan[]>([]);
  const [mult, setMult] = useState(1);
  const [confirm, setConfirm] = useState<"partial" | "final" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showMissing, setShowMissing] = useState(false);
  const [flash, setFlash] = useState<{ id: string; ok: boolean; at: number } | null>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);
  const retryTimer = useRef<number | null>(null);
  const lastCode = useRef({ code: "", at: 0 });
  const saveRef = useRef<() => Promise<boolean>>(async () => false);
  const state = useRef({ counts, reasons, dirty, T });
  useEffect(() => {
    state.current = { counts, reasons, dirty, T };
  }, [counts, reasons, dirty, T]);

  const adopt = useCallback((data: TransferDetail) => {
    setT(data);
    setCounts(Object.fromEntries(data.items.map((i) => [i.id, i.received])));
    setReasons(Object.fromEntries(data.items.map((i) => [i.id, { reason: i.reason || "", note: i.note || "" }])));
    setDirty(false);
  }, []);

  const load = useCallback(async () => {
    const res = await transfers<TransferDetail>(transferId);
    if (res.ok) {
      adopt(res.data);
      setLoadError(null);
    } else setLoadError(res.error);
  }, [transferId, adopt]);

  useEffect(() => {
    const first = window.setTimeout(load, 0);
    return () => window.clearTimeout(first);
  }, [load]);

  const errorText = useCallback((e: ApiError): string => {
    const known = ["DISCREPANCY_REASON_REQUIRED", "NOT_RECEIVABLE", "BELOW_POSTED", "COUNT_UNREALISTIC", "INVALID_TRANSITION", "NETWORK"];
    return known.includes(e.code) ? t(`err.${e.code}`) : e.message || t("err.UNKNOWN");
  }, [t]);

  // ---- saving (absolute counts: re-sending is harmless)
  const save = useCallback(async (): Promise<boolean> => {
    const { counts: c, reasons: r, T: cur } = state.current;
    if (!cur?.can_receive) return false;
    setSaveState("saving");
    const res = await transfers<TransferDetail>(`${transferId}/receive`, { method: "POST", body: { mode: "save", counts: c, reasons: r } });
    if (res.ok) {
      setT(res.data);
      setDirty(false);
      setSaveState("saved");
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      return true;
    }
    setSaveState("failed");
    if (res.error.code === "NETWORK" || res.status >= 500 || res.status === 0) {
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
      retryTimer.current = window.setTimeout(() => state.current.dirty && saveRef.current(), RETRY_MS);
    } else {
      setActionError(errorText(res.error));
      if (res.error.code === "NOT_RECEIVABLE" || res.error.code === "INVALID_TRANSITION") load();
    }
    return false;
  }, [transferId, errorText, load]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const scheduleSave = useCallback(() => {
    setDirty(true);
    setSaveState("saving");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => save(), SAVE_DELAY);
  }, [save]);

  useEffect(() => {
    const online = () => state.current.dirty && save();
    const leave = (e: BeforeUnloadEvent) => {
      if (state.current.dirty) e.preventDefault();
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", leave);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (retryTimer.current) window.clearTimeout(retryTimer.current);
    };
  }, [save]);

  // ---- another person (the warehouse, a manager) may change the transfer: pick it up while nothing is unsaved
  useEffect(() => {
    const timer = window.setInterval(async () => {
      const cur = state.current;
      if (document.hidden || cur.dirty || !cur.T || confirm) return;
      const res = await transfers<TransferDetail>(transferId);
      if (!res.ok || state.current.dirty) return;
      const sig = (d: TransferDetail) => d.status + d.updated_at + d.items.map((i) => `${i.received}:${i.posted}`).join(",");
      if (sig(res.data) !== sig(cur.T)) adopt(res.data);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [transferId, adopt, confirm]);

  const setCount = useCallback((item: TransferItem, value: number) => {
    setCounts((c) => ({ ...c, [item.id]: Math.max(item.posted, value) }));
    scheduleSave();
  }, [scheduleSave]);

  const setReason = useCallback((id: string, r: { reason: string; note: string }) => {
    setReasons((all) => ({ ...all, [id]: r }));
    scheduleSave();
  }, [scheduleSave]);

  // ---- scanning
  const fail = useCallback((kind: string, text: string) => {
    setWrong((w) => [{ kind, text, at: now() }, ...w].slice(0, 30));
    setLast({ ok: false, title: kind, text });
    beep(false);
  }, []);

  const count = useCallback((candidates: TransferItem[], n: number, match: LookupResult | null) => {
    let list = candidates;
    if (match?.batch) {
      const same = list.filter((i) => i.batch === match.batch);
      if (!same.length && list.every((i) => i.batch)) {
        fail(t("wrongBatch"), t("wrongBatchText", { name: match.name, batch: match.batch, expected: list.map((i) => i.batch).join(", ") }));
        return;
      }
      if (same.length) {
        list = same;
        if (match.expiry && same[0].expiry && match.expiry !== same[0].expiry) {
          setWrong((w) => [{ kind: t("expiryMismatch"), text: t("expiryMismatchText", { name: match.name, label: fmtDate(match.expiry), doc: fmtDate(same[0].expiry) }), at: now() }, ...w]);
        }
      }
    }
    list = [...list].sort((a, b) => (a.expiry || "9999").localeCompare(b.expiry || "9999"));
    const c = state.current.counts;
    const item = list.find((i) => (c[i.id] ?? 0) < i.dispatched) ?? list[list.length - 1];
    const next = (c[item.id] ?? 0) + n;
    const over = next > item.dispatched;
    setCounts((all) => ({ ...all, [item.id]: next }));
    scheduleSave();
    setLast({ ok: !over, title: `${item.name}${item.batch ? ` · ${item.batch}` : ""}`, text: `+${n} → ${next} / ${item.dispatched}${over ? ` · ${t("excessNote")}` : ""}`, undo: { id: item.id, n } });
    setFlash({ id: item.id, ok: !over, at: Date.now() });
    beep(!over);
  }, [fail, scheduleSave, t]);

  const onScan = useCallback(async (raw: string) => {
    const code = raw.trim();
    const cur = state.current.T;
    if (!code || !cur?.can_receive) return;
    const ts = Date.now();
    if (code === lastCode.current.code && ts - lastCode.current.at < DOUBLE_SCAN_MS) return; // one physical scan delivered twice
    lastCode.current = { code, at: ts };
    if (code.length > 64 || /[\u0000-\u001f]/.test(code)) {
      fail(t("badCode"), t("badCodeText"));
      return;
    }
    const n = mult;
    const local = cur.items.filter((i) => i.barcode === code || i.sku.toLowerCase() === code.toLowerCase());
    if (local.length) {
      count(local, n, null);
      return;
    }
    const res = await transfers<LookupResult>(`lookup?code=${encodeURIComponent(code)}`);
    if (!res.ok) {
      if (res.error.code === "NETWORK") fail(t("networkTitle"), t("scanAgain"));
      else fail(t("notFound"), t("notFoundText", { code }));
      return;
    }
    const hits = cur.items.filter((i) => i.variant_id === res.data.variant_id);
    if (!hits.length) {
      fail(t("wrongProduct"), t("wrongProductText", { name: res.data.name }));
      return;
    }
    count(hits, n, res.data);
  }, [count, fail, mult, t]);

  const undo = useCallback(() => {
    const u = last?.undo;
    const item = state.current.T?.items.find((i) => i.id === u?.id);
    if (!u || !item) return;
    setCounts((c) => ({ ...c, [u.id]: Math.max(item.posted, (c[u.id] ?? 0) - u.n) }));
    scheduleSave();
    setLast({ ok: true, title: t("undone"), text: `−${u.n}` });
  }, [last, scheduleSave, t]);

  // keep the scanner field focused (a USB / Bluetooth scanner types into whatever has focus)
  useEffect(() => {
    if (!T?.can_receive || confirm) return;
    const refocus = () => {
      const a = document.activeElement;
      if (!a || a === document.body) scanRef.current?.focus();
    };
    const timer = window.setInterval(refocus, 1500);
    refocus();
    return () => window.clearInterval(timer);
  }, [T?.can_receive, confirm]);

  useEffect(() => {
    if (!flash) return;
    document.getElementById(`rcv-${flash.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    const timer = window.setTimeout(() => setFlash(null), 1200);
    return () => window.clearTimeout(timer);
  }, [flash]);

  // ---- totals
  const totals = useMemo(() => {
    if (!T) return { sent: 0, got: 0, remaining: 0, diffLines: 0, missing: [] as TransferItem[] };
    const sent = T.items.reduce((s, i) => s + i.dispatched, 0);
    const got = T.items.reduce((s, i) => s + (counts[i.id] ?? 0), 0);
    const diffs = T.items.filter((i) => (counts[i.id] ?? 0) !== i.dispatched);
    return {
      sent, got, remaining: Math.max(0, sent - got),
      diffLines: diffs.filter((i) => counts[i.id]).length,
      missing: diffs.filter((i) => !(reasons[i.id]?.reason)),
    };
  }, [T, counts, reasons]);

  async function submit(mode: "partial" | "final") {
    if (!T) return;
    if (mode === "final" && totals.missing.length) {
      setShowMissing(true);
      setConfirm(null);
      setActionError(t("err.DISCREPANCY_REASON_REQUIRED"));
      return;
    }
    setBusy(true);
    setActionError(null);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    const res = await transfers<TransferDetail>(`${transferId}/receive`, { method: "POST", body: { mode, counts, reasons } });
    setBusy(false);
    setConfirm(null);
    if (res.ok) {
      adopt(res.data);
      setLast({ ok: true, title: mode === "final" ? t("finalDone") : t("partialDone"), text: "" });
      setWrong([]);
      return;
    }
    setActionError(errorText(res.error));
  }

  if (loadError) {
    return <ErrorState message={errorText(loadError)} action={<Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("backToList")}</Button>} />;
  }
  if (!T) {
    return (
      <div className="grid gap-3" aria-busy="true">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const receiving = T.can_receive;
  const progress = totals.sent ? Math.min(100, Math.round((totals.got * 100) / totals.sent)) : 0;

  return (
    <div className="grid gap-4">
      {/* header */}
      <Card className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} aria-label={t("backToList")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-ink-muted hover:text-ink">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1 basis-[calc(100%-3.5rem)] sm:basis-0">
          <p className="flex flex-wrap items-center gap-2 font-mono text-lg font-extrabold text-ink">
            {T.number}
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 font-sans text-xs font-bold text-primary">{t(`status.${T.status}`)}</span>
            {T.discrepancy_open && <span className="rounded-full bg-red-500/12 px-2.5 py-0.5 font-sans text-xs font-bold text-red-600 dark:text-red-400">{t("awaitingManager")}</span>}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
            <span className="font-semibold text-ink">{T.source.name}</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-semibold text-ink">{T.destination.name}</span>
            {T.dispatched_at && <span className="inline-flex items-center gap-1 text-ink-soft"><Truck className="h-3.5 w-3.5" aria-hidden="true" />{T.dispatched_at}{T.dispatched_by ? ` · ${T.dispatched_by}` : ""}</span>}
          </p>
        </div>
        <a href={`/api/my-store/transfers/${T.id}/document.xlsx`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-ink hover:border-primary hover:text-primary sm:w-auto">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" aria-hidden="true" />{t("waybill")}
        </a>
      </Card>

      {/* stats */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {[
          [t("statLines"), T.items.length, ""],
          [t("statExpected"), totals.sent, ""],
          [t("statScanned"), totals.got, "text-primary"],
          [t("statRemaining"), totals.remaining, totals.remaining ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"],
          [t("statDiff"), totals.diffLines, totals.diffLines ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"],
        ].map(([label, value, tone]) => (
          <div key={String(label)} className="nz-glass rounded-2xl px-4 py-3">
            <p className={`text-2xl font-extrabold tabular-nums ${tone || "text-ink"}`}>{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</p>
          </div>
        ))}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* state banners */}
      {!receiving && (
        <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${T.discrepancy_open ? "border-red-400/40 bg-red-500/8" : "border-emerald-400/40 bg-emerald-500/8"}`}>
          {T.discrepancy_open ? <Scale className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" aria-hidden="true" />}
          <p className="text-ink">
            <b>{T.discrepancy_open ? t("discrepancyTitle") : T.direction === "outgoing" ? t("outgoingTitle") : t("doneTitle")}</b>{" "}
            {T.discrepancy_open ? t("discrepancyBody") : T.direction === "outgoing" ? t("outgoingBody") : t("doneBody", { by: T.received_by || "—", at: T.received_at || "—" })}
          </p>
        </div>
      )}
      {receiving && T.status === "partial" && (
        <div role="status" className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-500/8 px-4 py-3 text-sm text-ink">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />{t("partialBanner")}
        </div>
      )}
      {saveState === "failed" && dirty && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-red-400/40 bg-red-500/8 px-4 py-3 text-sm text-ink">
          <WifiOff className="h-5 w-5 text-red-500" aria-hidden="true" />
          <span className="flex-1"><b>{t("notSavedTitle")}</b> {t("notSavedBody")}</span>
          <Button variant="secondary" onClick={() => save()}><RotateCcw className="h-4 w-4" aria-hidden="true" />{t("saveNow")}</Button>
        </div>
      )}
      {actionError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-400/40 bg-red-500/8 px-4 py-3 text-sm text-ink">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
          <span className="flex-1">{actionError}</span>
          <button type="button" aria-label={t("close")} onClick={() => setActionError(null)} className="text-ink-soft hover:text-ink"><X className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      )}

      {/* scanner */}
      {receiving && (
        <div className="grid gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = scanRef.current?.value ?? "";
              if (scanRef.current) scanRef.current.value = "";
              onScan(v);
            }}
            className="flex items-center gap-2 rounded-2xl border-2 border-primary/50 bg-primary/5 px-3 py-2 focus-within:border-primary"
          >
            <Barcode className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" />
            <input
              ref={scanRef}
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="done"
              aria-label={t("scanPlaceholder")}
              placeholder={t("scanPlaceholder")}
              className="min-w-0 flex-1 bg-transparent py-2 text-lg font-bold text-ink outline-none placeholder:font-medium placeholder:text-ink-soft"
            />
            <label className="flex items-center gap-1 rounded-xl border border-border bg-surface px-2" title={t("multHint")}>
              <span className="font-bold text-ink-soft">×</span>
              <input
                type="number"
                min={1}
                max={999}
                inputMode="numeric"
                aria-label={t("multHint")}
                value={mult}
                onChange={(e) => setMult(Math.min(999, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                className="h-9 w-12 bg-transparent text-center font-bold tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </label>
          </form>
          {last && (
            <div role="status" className={`flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm ${last.ok ? "border-emerald-400/40 bg-emerald-500/8" : "border-red-400/40 bg-red-500/8"}`}>
              {last.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : <CircleAlert className="h-4 w-4 text-red-500" aria-hidden="true" />}
              <span className="min-w-0 flex-1 text-ink"><b>{last.title}</b> {last.text}</span>
              {last.undo && (
                <button type="button" onClick={undo} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2 hover:text-ink">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />{t("undo", { n: last.undo.n })}
                </button>
              )}
            </div>
          )}
          {wrong.length > 0 && (
            <details className="rounded-xl border border-amber-400/40 bg-amber-500/8 px-3 py-2 text-sm text-ink" open>
              <summary className="cursor-pointer font-bold">{t("wrongTitle", { count: wrong.length })}</summary>
              <p className="mt-1 text-xs text-ink-muted">{t("wrongHint")}</p>
              <ul className="mt-1.5 grid gap-1">
                {wrong.slice(0, 8).map((w, k) => (
                  <li key={`${w.at}-${k}`} className="text-xs"><b>{w.kind}</b> — {w.text} <span className="text-ink-soft">{w.at}</span></li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* lines: one scan-friendly card per product × batch (the branch panel is narrow, a 9-column table doesn't fit) */}
      <div className="grid gap-2.5">
        {T.items.map((i, n) => {
          const got = receiving ? (counts[i.id] ?? 0) : i.received;
          const d = got - i.dispatched;
          const reasonLabel = i.reason ? (t.has(`reasons.${i.reason}`) ? t(`reasons.${i.reason}`) : T.reasons.find((r) => r.code === i.reason)?.label) : "";
          return (
            <article key={i.id} id={`rcv-${i.id}`} className={`nz-glass rounded-2xl p-3 transition-shadow sm:p-4 ${flash?.id === i.id ? (flash.ok ? "ring-2 ring-emerald-500" : "ring-2 ring-amber-500") : got && d === 0 ? "border-l-4 border-l-emerald-500" : ""}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-5 text-right text-xs font-bold tabular-nums text-ink-soft">{n + 1}</span>
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border bg-white"><MediaImage src={i.image_url} alt="" fit="contain" padding="p-1" sizes="56px" fallbackIcon={<PackageOpen className="h-6 w-6 text-ink-soft" aria-hidden="true" />} /></div>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="text-sm font-bold leading-snug text-ink">{i.name}</p>
                  <p className="font-mono text-[11px] text-ink-soft">{i.sku} · {i.barcode || "—"}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2"><BatchTag item={i} /><Expiry iso={i.expiry} /></div>
                </div>
                <div className="grid w-full grid-cols-3 gap-1.5 text-center sm:w-auto">
                  <div className="rounded-xl bg-surface-2 px-3 py-1.5"><p className="text-lg font-extrabold tabular-nums text-ink">{i.dispatched}</p><p className="text-[10px] font-bold uppercase text-ink-soft">{t("colSent")}</p></div>
                  <div className="rounded-xl bg-surface-2 px-3 py-1.5"><p className="text-lg font-extrabold tabular-nums text-ink">{got}</p><p className="text-[10px] font-bold uppercase text-ink-soft">{t("colReceived")}</p></div>
                  <div className="rounded-xl bg-surface-2 px-3 py-1.5"><p className={`text-lg font-extrabold tabular-nums ${d === 0 ? "text-emerald-600" : d < 0 ? "text-red-600" : "text-amber-600"}`}>{d > 0 ? `+${d}` : d}</p><p className="text-[10px] font-bold uppercase text-ink-soft">{t("colDiff")}</p></div>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill sent={i.dispatched} got={got} />
                  {receiving && i.posted > 0 && <span className="text-[11px] text-ink-soft">{t("posted", { n: i.posted })}</span>}
                  {!receiving && reasonLabel && <span className="text-xs text-ink-muted">{reasonLabel}{i.note ? ` — ${i.note}` : ""}{i.resolution_label ? ` · ${i.resolution_label}` : ""}</span>}
                </div>
                {receiving && <Stepper big value={got} min={i.posted} label={t("colReceived")} onChange={(v) => setCount(i, v)} />}
              </div>
              {receiving && d !== 0 && got > 0 && <div className="mt-2.5 sm:max-w-md"><ReasonFields id={i.id} reasons={reasons} options={T.reasons} onChange={setReason} missing={showMissing} /></div>}
              {receiving && d !== 0 && got === 0 && showMissing && <div className="mt-2.5 sm:max-w-md"><ReasonFields id={i.id} reasons={reasons} options={T.reasons} onChange={setReason} missing={showMissing} /></div>}
            </article>
          );
        })}
      </div>

      {/* history */}
      <details className="nz-glass rounded-2xl px-4 py-3">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold text-ink"><History className="h-4 w-4 text-primary" aria-hidden="true" />{t("history", { count: T.events.length })}</summary>
        <ol className="mt-3 grid gap-2.5 border-l border-border pl-4">
          {T.events.map((e, k) => (
            <li key={`${e.at}-${k}`} className="text-sm"><p className="text-[11px] text-ink-soft">{e.at} · {e.actor || "—"}</p><p className="text-ink">{e.message}</p></li>
          ))}
        </ol>
      </details>

      {/* action bar */}
      {receiving && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-xl backdrop-blur">
          <p className="mr-auto text-sm text-ink-muted">
            {t("barTotals", { sent: totals.sent, got: totals.got })}{" "}
            <span className="text-xs">{saveState === "saving" ? t("saving") : saveState === "saved" ? `✓ ${t("saved")}` : ""}</span>
          </p>
          <Button variant="secondary" onClick={() => save()} disabled={busy}><Save className="h-4 w-4" aria-hidden="true" />{t("save")}</Button>
          <Button variant="secondary" onClick={() => setConfirm("partial")} disabled={busy || !totals.got}><PackageOpen className="h-4 w-4" aria-hidden="true" />{t("partial")}</Button>
          <Button onClick={() => setConfirm("final")} disabled={busy}><PackageCheck className="h-4 w-4" aria-hidden="true" />{t("reviewConfirm")}</Button>
        </div>
      )}

      {/* confirmation */}
      {confirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="rcv-confirm-title" className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-sm sm:items-center" onKeyDown={(e) => e.key === "Escape" && setConfirm(null)}>
          <div className="nz-glass max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-surface p-5">
            <h2 id="rcv-confirm-title" className="text-lg font-bold text-ink">{confirm === "final" ? t("confirmFinalTitle") : t("confirmPartialTitle")}</h2>
            <p className="mt-1 text-sm text-ink-muted">{t("confirmBody", { sent: totals.sent, got: totals.got, store: T.destination.name })}</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border text-left text-[11px] font-bold uppercase text-ink-soft"><th className="px-3 py-2">{t("colProduct")}</th><th className="px-3 py-2">{t("colBatch")}</th><th className="px-3 py-2 text-right">{t("colSent")}</th><th className="px-3 py-2 text-right">{t("colReceived")}</th><th className="px-3 py-2 text-right">{t("colDiff")}</th></tr></thead>
                <tbody>
                  {T.items.map((i) => {
                    const got = counts[i.id] ?? 0;
                    const d = got - i.dispatched;
                    return (
                      <tr key={i.id} className={`border-b border-border/60 ${d ? "bg-red-500/6" : ""}`}>
                        <td className="px-3 py-2 text-ink">{i.name}</td><td className="px-3 py-2 font-mono text-xs">{i.batch || "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{i.dispatched}</td><td className="px-3 py-2 text-right font-bold tabular-nums">{got}</td>
                        <td className={`px-3 py-2 text-right font-bold tabular-nums ${d === 0 ? "text-emerald-600" : d < 0 ? "text-red-600" : "text-amber-600"}`}>{d > 0 ? `+${d}` : d}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {confirm === "final" && totals.diffLines + totals.missing.length > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-sm text-ink"><Scale className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />{t("confirmDiscrepancy")}</p>
            )}
            {confirm === "final" && totals.missing.length > 0 && (
              <div role="alert" className="mt-3 rounded-xl border border-red-400/40 bg-red-500/8 px-3 py-2 text-sm text-ink">
                <p className="font-bold">{t("err.DISCREPANCY_REASON_REQUIRED")}</p>
                <p className="mt-0.5 text-xs text-ink-muted">{totals.missing.map((i) => `${i.name}${i.batch ? ` (${i.batch})` : ""}`).join(", ")}</p>
              </div>
            )}
            {confirm === "partial" && <p className="mt-3 text-sm text-ink-muted">{t("confirmPartialHint")}</p>}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)} disabled={busy}>{t("cancel")}</Button>
              {confirm === "final" && totals.missing.length > 0 ? (
                <Button autoFocus onClick={() => {
                  setShowMissing(true);
                  setConfirm(null);
                  window.setTimeout(() => document.getElementById(`rcv-${totals.missing[0].id}`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 50);
                }}>
                  <Scale className="h-4 w-4" aria-hidden="true" />{t("enterReasons")}
                </Button>
              ) : (
                <Button onClick={() => submit(confirm)} disabled={busy} autoFocus>
                  {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PackageCheck className="h-4 w-4" aria-hidden="true" />}
                  {confirm === "final" ? t("confirmFinal") : t("confirmPartial")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
