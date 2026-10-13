"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Barcode, Clock3, Flame, Hash, Keyboard, Loader2, Lock, Maximize2, Minimize2, Minus, Package, Plus, Printer, Search, ShoppingBasket, Store as StoreIcon, Trash2 } from "lucide-react";
import MediaImage from "@/components/MediaImage";
import { duration, money, pos, timeOnly } from "./api";
import type { PosCatalogItem, PosConfig, PosError, PosPerson, PosSale, PosSession } from "./types";
import CashierSwitcher from "./CashierSwitcher";
import EarningsCard from "./EarningsCard";
import CloseRegisterDialog from "./CloseRegisterDialog";
import CustomerPicker from "./CustomerPicker";
import RegisterGate from "./RegisterGate";
import { usePosErrors } from "./usePosErrors";
import PaymentDialog from "./PaymentDialog";
import ReceiptDialog from "./ReceiptDialog";
import { loadPrinterSettings, receiptTokenFrom, savePrinterSettings, type PrinterSettings } from "./printer";
import ScanToCart, { type LastScan } from "./ScanToCart";
import ParkedBaskets from "./ParkedBaskets";

/** A short beep for a scan (Web Audio; silent when the browser blocks sound). */
function beep(ok: boolean) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 1250 : 240;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.08 : 0.25));
    o.onended = () => ctx.close();
  } catch {
    /* no audio */
  }
}

type Catalog = { results: PosCatalogItem[]; total_count: number; page: number; exact_match: PosCatalogItem | null };

/**
 * The store's cash register. Everything money- or stock-related is decided by
 * the backend (/api/my-store/pos/...): this component only chooses products
 * and quantities, then shows what the server returns.
 *
 * Keyboard: "/" or F3 search · Enter in search = add scanned barcode/SKU ·
 * F2 payment · F9 new sale (after a sale) · Esc close.
 *
 * 2D scanner (USB/Bluetooth, keyboard-wedge mode): a burst of keystrokes ending
 * in Enter is recognised as a scan wherever the focus is (except another text
 * field) -- a product barcode goes into the basket, a NutriZone receipt QR opens
 * that sale in History (for a reprint or a return).
 */
export default function PosTerminal() {
  const t = useTranslations("storePos");
  const [config, setConfig] = useState<PosConfig | null>(null);
  const [sale, setSale] = useState<PosSale | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [query, setQuery] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: "error" | "ok"; text: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<PosSale | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [session, setSession] = useState<PosSession | null>(null);
  const [ready, setReady] = useState(false);
  const [closing, setClosing] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [showKeys, setShowKeys] = useState(false);
  const [showPrinter, setShowPrinter] = useState(false);
  const [printer, setPrinter] = useState<PrinterSettings>({ width: 80, auto: true });
  const [top, setTop] = useState<PosCatalogItem[]>([]);
  const [clock, setClock] = useState<string>("");
  const searchRef = useRef<HTMLInputElement>(null);
  const scanRef = useRef<HTMLInputElement>(null);
  const [lastScan, setLastScan] = useState<LastScan | null>(null);
  const [priceMode, setPriceMode] = useState(false);
  const [parkSignal, setParkSignal] = useState(0);
  const focusScan = useCallback(() => setTimeout(() => scanRef.current?.focus(), 50), []);
  const scanBuffer = useRef({ text: "", at: 0 });
  const router = useRouter();
  const pathname = usePathname();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((tone: "error" | "ok", text: string) => {
    setToast({ tone, text });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const explain = usePosErrors();

  // ---- loading
  const loadCatalog = useCallback(async (q: string, onlyInStock: boolean, page = 1) => {
    const params = new URLSearchParams({ page: String(page) });
    if (q) params.set("q", q);
    if (onlyInStock) params.set("in_stock", "1");
    const res = await pos<Catalog>(`catalog?${params}`);
    return res.ok ? res.data : null;
  }, []);

  const startSale = useCallback(async () => {
    const current = await pos<PosSale>("sales/current", { method: "POST", body: {} });
    if (current.ok) setSale(current.data);
    else say("error", explain(current.error));
  }, [explain, say]);

  const refreshSession = useCallback(async () => {
    const res = await pos<PosSession | null>("session");
    if (res.ok) setSession(res.data);
  }, []);

  /** Quick buttons: the kassa's 8 best sellers of the last 30 days that are in stock (they move with every sale). */
  const loadTop = useCallback(async () => {
    const res = await pos<{ results: PosCatalogItem[] }>("top");
    if (res.ok) setTop(res.data.results);
  }, []);

  /** The terminal was handed to another cashier: their own basket is resumed, every sale from now on is theirs. */
  const onCashierSwitched = useCallback(
    async (person: PosPerson) => {
      const cfg = await pos<PosConfig>("config");
      if (cfg.ok) setConfig(cfg.data);
      const current = await pos<PosSale>("sales/current", { method: "POST", body: {} });
      if (current.ok) setSale(current.data);
      say("ok", t("cashiers.switched", { name: person.full_name }));
      focusScan();
    },
    [focusScan, say, t],
  );

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 15_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    pos<PosConfig>("config").then(async (cfg) => {
      if (cancelled) return;
      if (cfg.ok) {
        setConfig(cfg.data);
        setSession(cfg.data.session);
        if (cfg.data.session) {
          const current = await pos<PosSale>("sales/current", { method: "POST", body: {} });
          if (!cancelled && current.ok) setSale(current.data);
          const best = await pos<{ results: PosCatalogItem[] }>("top");
          if (!cancelled && best.ok) setTop(best.data.results);
        }
      }
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(() => {
      loadCatalog(query.trim(), inStockOnly).then((data) => {
        if (cancelled) return;
        setCatalog(data);
        setLoadingCatalog(false);
      });
    }, query ? 220 : 0);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, inStockOnly, loadCatalog]);

  async function loadMore() {
    if (!catalog) return;
    const next = await loadCatalog(query.trim(), inStockOnly, catalog.page + 1);
    if (next) setCatalog({ ...next, results: [...catalog.results, ...next.results] });
  }

  // ---- basket actions
  const apply = useCallback(
    async (key: string, call: () => Promise<{ ok: true; data: PosSale } | { ok: false; error: PosError; status: number }>) => {
      setBusy(key);
      const res = await call();
      setBusy(null);
      if (res.ok) {
        setSale(res.data);
        return true;
      }
      say("error", explain(res.error));
      return false;
    },
    [explain, say],
  );

  const addProduct = useCallback(
    async (item: PosCatalogItem, code?: string, quantity = 1) => {
      if (!sale) return false;
      if (!item.sellable) {
        beep(false);
        const message = item.stock <= 0 ? t("errors.OUT_OF_STOCK") : t("errors.NO_PRICE");
        setLastScan({ kind: "error", code: code || item.sku, message });
        say("error", message);
        return false;
      }
      if (item.batch?.expired) {
        beep(false);
        setLastScan({ kind: "error", code: code || item.sku, message: t("errors.EXPIRED_BATCH") });
        say("error", t("errors.EXPIRED_BATCH"));
        return false;
      }
      // the scanned code goes along: a batch barcode makes the server record exactly that batch on the line
      const body = code ? { variant_id: item.variant_id, quantity, code } : { variant_id: item.variant_id, quantity };
      setBusy(`add-${item.variant_id}`);
      const res = await pos<PosSale>(`sales/${sale.id}/items`, { method: "POST", body });
      setBusy(null);
      if (!res.ok) {
        beep(false);
        const message = explain(res.error);
        setLastScan({ kind: "error", code: code || item.sku, message });
        say("error", message);
        return false;
      }
      setSale(res.data);
      beep(true);
      const inBasket = res.data.items.filter((l) => l.variant_id === item.variant_id).reduce((n, l) => n + l.quantity, 0);
      setLastScan({ kind: "added", item, qty: quantity, inBasket });
      return true;
    },
    [explain, sale, say, t],
  );

  function setQty(lineId: string, quantity: number) {
    if (!sale) return;
    apply(`line-${lineId}`, () => pos<PosSale>(`sales/${sale.id}/items/${lineId}`, { method: "PATCH", body: { quantity } }));
  }

  function removeLine(lineId: string) {
    if (!sale) return;
    apply(`line-${lineId}`, () => pos<PosSale>(`sales/${sale.id}/items/${lineId}`, { method: "DELETE" }));
  }

  function clearBasket() {
    if (!sale || !sale.items.length) return;
    apply("clear", () => pos<PosSale>(`sales/${sale.id}/items`, { method: "DELETE" }));
  }

  async function voidSale() {
    if (!sale) return;
    setConfirmVoid(false);
    const res = await pos<PosSale>(`sales/${sale.id}/void`, { method: "POST", body: {} });
    if (!res.ok) return say("error", explain(res.error));
    await newSale();
    say("ok", t("voided"));
  }

  const newSale = useCallback(async () => {
    const res = await pos<PosSale>("sales/current", { method: "POST", body: {} });
    if (res.ok) setSale(res.data);
    setReceipt(null);
    refreshSession();
    loadTop();
    pos<PosConfig>("config").then((cfg) => cfg.ok && setConfig(cfg.data)); // the cashier's KPI moves with every sale
    loadCatalog(query.trim(), inStockOnly).then((d) => d && setCatalog(d));
    setLastScan(null);
    focusScan();
  }, [focusScan, inStockOnly, loadCatalog, loadTop, query, refreshSession]);

  /** A scanned or typed code: a receipt QR opens that sale in History; in price mode the product is only shown; else it goes into the basket. */
  const handleCode = useCallback(
    async (raw: string, quantity = 1) => {
      const code = raw.trim();
      if (!code) return false;
      const token = receiptTokenFrom(code);
      if (token) {
        router.push(`${pathname}?tab=sales&q=${encodeURIComponent(token)}`, { scroll: false });
        return true;
      }
      const data = await loadCatalog(code, false);
      const hit = data?.exact_match ?? (data?.results.length === 1 ? data.results[0] : null);
      if (!hit) {
        beep(false);
        setLastScan({ kind: "error", code, message: t("scanner.notFound") });
        return false;
      }
      if (priceMode) {
        beep(true);
        setLastScan({ kind: "price", item: hit });
        return true;
      }
      return addProduct(hit, code, quantity);
    },
    [addProduct, loadCatalog, pathname, priceMode, router, t],
  );

  /** The last scan was a mistake (double scan, wrong count): take its units back out. */
  const undoLast = useCallback(() => {
    if (!sale || lastScan?.kind !== "added") return;
    const line = sale.items.find((l) => l.variant_id === lastScan.item.variant_id);
    if (!line) return;
    const next = line.quantity - lastScan.qty;
    const call = next > 0
      ? () => pos<PosSale>(`sales/${sale.id}/items/${line.id}`, { method: "PATCH", body: { quantity: next } })
      : () => pos<PosSale>(`sales/${sale.id}/items/${line.id}`, { method: "DELETE" });
    apply(`line-${line.id}`, call).then((ok) => {
      if (ok) setLastScan(null);
      focusScan();
    });
  }, [apply, focusScan, lastScan, sale]);

  /** "+" / "−" on the empty scanner field: one more / one less of the last scanned product. */
  const adjustLast = useCallback((delta: number) => {
    if (!sale || lastScan?.kind !== "added") return;
    const line = sale.items.find((l) => l.variant_id === lastScan.item.variant_id);
    if (!line) return;
    const next = line.quantity + delta;
    const call = next > 0
      ? () => pos<PosSale>(`sales/${sale.id}/items/${line.id}`, { method: "PATCH", body: { quantity: next } })
      : () => pos<PosSale>(`sales/${sale.id}/items/${line.id}`, { method: "DELETE" });
    apply(`line-${line.id}`, call).then((ok) => {
      if (ok) setLastScan({ ...lastScan, qty: delta > 0 ? 1 : lastScan.qty, inBasket: Math.max(0, next) });
    });
  }, [apply, lastScan, sale]);

  async function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (await handleCode(query)) {
      setQuery("");
      focusScan();
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- printer preferences live in this browser's storage
    setPrinter(loadPrinterSettings());
  }, []);

  function updatePrinter(next: PrinterSettings) {
    setPrinter(next);
    savePrinterSettings(next);
  }

  // ---- keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA" || el?.tagName === "SELECT" || Boolean(el?.isContentEditable);
      const dialogOpen = paying || Boolean(receipt) || closing;

      // keyboard-wedge scanner: characters arriving < 50 ms apart, ended by Enter
      if (!typing && !dialogOpen) {
        const now = performance.now();
        const buf = scanBuffer.current;
        if (e.key === "Enter" && buf.text.length >= 3 && now - buf.at < 120) {
          e.preventDefault();
          const code = buf.text;
          buf.text = "";
          handleCode(code);
          return;
        }
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          buf.text = now - buf.at < 50 ? buf.text + e.key : e.key;
          buf.at = now;
          if (buf.text.length > 1) {
            e.preventDefault(); // mid-scan: never let a "/" in a QR link trigger shortcuts
            return;
          }
        }
      }

      if (e.key === "F2") {
        e.preventDefault();
        if (sale?.items.length && !receipt) setPaying(true);
      } else if (e.key === "F9" && receipt) {
        e.preventDefault();
        newSale();
      } else if (e.key === "F8" && !receipt && !paying) {
        e.preventDefault();
        setParkSignal((n) => n + 1);
      } else if (e.key === "F4") {
        e.preventDefault();
        scanRef.current?.focus();
      } else if (e.key === "F3" || (e.key === "/" && !typing)) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape") {
        setPaying(false);
        setShowKeys(false);
        setShowPrinter(false);
        setConfirmVoid(false);
        if (fullscreen && !paying && !receipt) setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closing, fullscreen, handleCode, newSale, paying, receipt, sale]);

  const inBasket = useMemo(() => {
    const map = new Map<string, number>();
    sale?.items.forEach((l) => l.variant_id && map.set(l.variant_id, (map.get(l.variant_id) ?? 0) + l.quantity));
    return map;
  }, [sale]);

  const items = sale?.items ?? [];

  if (!ready || !config) {
    return (
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]" aria-hidden="true">
        <div className="nz-liquid h-96 animate-pulse rounded-3xl" />
        <div className="nz-liquid h-96 animate-pulse rounded-3xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <RegisterGate
        config={config}
        explain={explain}
        onOpened={(opened) => {
          setSession(opened);
          startSale();
          loadTop();
          setTimeout(() => scanRef.current?.focus(), 100);
        }}
      />
    );
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-[70] overflow-auto bg-bg p-3 sm:p-5" : ""}>
      {/* shift bar: kassa · shift № · since · who is selling · takings */}
      <div className="nz-liquid mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-3 py-2 text-xs sm:px-4">
        <span className="inline-flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          {t("session.openBadge")}
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <StoreIcon className="h-3.5 w-3.5 text-primary" strokeWidth={2} aria-hidden="true" />
          {config.kassa.name}
        </span>
        {session.number ? (
          <span className="inline-flex items-center gap-1 text-ink-muted tabular-nums">
            <Hash className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("session.shiftNo", { n: session.number })}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-ink-muted tabular-nums">
          <Clock3 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {t("session.since", { time: timeOnly(session.opened_at) })} · {duration(session.duration_minutes)}
        </span>
        <CashierSwitcher config={config} onSwitched={onCashierSwitched} disabled={paying || Boolean(receipt)} />
        <span className="text-ink-muted tabular-nums">
          {t("session.shiftSales", { count: session.sales_count })} · <b className="text-ink">{money(session.gross_sales)}</b> {t("som")}
        </span>
        <span className="ml-auto hidden font-mono text-sm font-bold text-ink tabular-nums sm:inline">{clock}</span>
        {config.earnings && <EarningsCard e={config.earnings} compact />}
        <button type="button" onClick={() => setClosing(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 font-bold text-red-600 transition-colors hover:bg-red-500/20 dark:text-red-400 max-sm:ml-auto">
          <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {t("session.closeButton")}
        </button>
      </div>

      {/* toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-soft" strokeWidth={2} aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKey}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="nz-glass-input w-full rounded-2xl py-3 pl-10 pr-24 text-sm"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
            <Barcode className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
            {t("scanReady")}
          </span>
        </div>
        <button type="button" aria-pressed={inStockOnly} onClick={() => setInStockOnly((v) => !v)} className="nz-liquid-chip rounded-2xl px-3.5 py-3 text-xs font-semibold">
          {t("inStockOnly")}
        </button>
        <button type="button" onClick={() => setShowPrinter((v) => !v)} aria-pressed={showPrinter} className="nz-liquid-chip inline-flex rounded-2xl p-3" aria-label={t("printer.settings")} title={t("printer.settings")}>
          <Printer className="h-4 w-4" strokeWidth={2} />
        </button>
        <button type="button" onClick={() => setShowKeys((v) => !v)} className="nz-liquid-chip hidden rounded-2xl p-3 sm:inline-flex" aria-label={t("shortcuts")} title={t("shortcuts")}>
          <Keyboard className="h-4 w-4" strokeWidth={2} />
        </button>
        <button type="button" onClick={() => setFullscreen((v) => !v)} className="nz-liquid-chip inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-3 text-xs font-semibold" aria-pressed={fullscreen}>
          {fullscreen ? <Minimize2 className="h-4 w-4" strokeWidth={2} /> : <Maximize2 className="h-4 w-4" strokeWidth={2} />}
          <span className="hidden sm:inline">{fullscreen ? t("exitFullscreen") : t("fullscreen")}</span>
        </button>
      </div>

      {showPrinter && (
        <div className="nz-liquid mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl p-4 text-xs">
          <span className="flex items-center gap-2 text-sm font-bold text-ink">
            <Printer className="h-4 w-4 text-primary" strokeWidth={2} aria-hidden="true" />
            {t("printer.settings")}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-ink-muted">{t("printer.paper")}</span>
            <div className="inline-flex rounded-full bg-surface-2/70 p-0.5">
              {([58, 80] as const).map((w) => (
                <button key={w} type="button" aria-pressed={printer.width === w} onClick={() => updatePrinter({ ...printer, width: w })} className={`rounded-full px-3 py-1 font-bold ${printer.width === w ? "bg-surface text-ink shadow" : "text-ink-muted"}`}>
                  {w} mm
                </button>
              ))}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-ink-muted">
            <input type="checkbox" checked={printer.auto} onChange={(e) => updatePrinter({ ...printer, auto: e.target.checked })} className="h-4 w-4 accent-[var(--color-primary,#2563eb)]" />
            {t("printer.auto")}
          </label>
          <p className="basis-full text-[11px] text-ink-soft">{t("printer.kioskHint")}</p>
        </div>
      )}

      {showKeys && (
        <div className="nz-liquid mb-4 grid grid-cols-2 gap-2 rounded-2xl p-4 text-xs sm:grid-cols-5">
          {(["scanner", "search", "scan", "pay", "park", "newSale"] as const).map((k) => (
            <div key={k} className="flex items-center justify-between gap-2 rounded-xl bg-surface-2/50 px-3 py-2">
              <span className="text-ink-muted">{t(`keys.${k}.label`)}</span>
              <kbd className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink">{t(`keys.${k}.key`)}</kbd>
            </div>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${fullscreen ? "lg:grid-cols-[1fr_420px]" : "lg:grid-cols-[1fr_340px]"}`}>
        {/* ---------------- products */}
        <section aria-label={t("products")} className="min-w-0">
          {top.length > 0 && !query && (
            <div className="mb-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <Flame className="h-3.5 w-3.5 text-orange-500" strokeWidth={2.25} aria-hidden="true" />
                {t("quick.title")}
              </p>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {top.map((item, i) => (
                  <li key={item.variant_id}>
                    <button
                      type="button"
                      onClick={() => addProduct(item).then(focusScan)}
                      disabled={busy === `add-${item.variant_id}`}
                      className="nz-liquid nz-liquid-tile group flex w-full items-center gap-2.5 rounded-2xl p-2 text-left"
                      title={item.name}
                    >
                      <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white">
                        <MediaImage src={item.image_url} alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
                        <span className="absolute left-0 top-0 rounded-br-lg bg-orange-500 px-1 text-[9px] font-black text-white">{i + 1}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-xs font-bold text-ink group-hover:text-primary">{item.name}</span>
                        <span className="block text-[11px] font-semibold text-ink-muted tabular-nums">
                          {money(item.price)} <span className="font-normal text-ink-soft">· {t("stockLeft", { count: item.stock })}</span>
                        </span>
                      </span>
                      {(inBasket.get(item.variant_id) ?? 0) > 0 && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-contrast">{inBasket.get(item.variant_id)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {loadingCatalog ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="nz-liquid aspect-[3/4] animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : !catalog || catalog.results.length === 0 ? (
            <div className="nz-liquid flex flex-col items-center rounded-3xl px-6 py-14 text-center">
              <Package className="h-10 w-10 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-ink">{query ? t("noResults") : t("noProducts")}</p>
              <p className="mt-1 max-w-sm text-xs text-ink-muted">{query ? t("noResultsHint") : t("noProductsHint")}</p>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs text-ink-soft">{t("resultCount", { count: catalog.total_count })}</p>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                {catalog.results.map((item) => {
                  const count = inBasket.get(item.variant_id) ?? 0;
                  const out = item.stock <= 0;
                  const low = !out && item.stock <= 3;
                  return (
                    <li key={item.variant_id}>
                      <button
                        type="button"
                        onClick={() => addProduct(item).then(focusScan)}
                        disabled={busy === `add-${item.variant_id}`}
                        className={`nz-liquid nz-liquid-tile group relative flex h-full w-full flex-col overflow-hidden rounded-2xl text-left ${out || !item.sellable ? "nz-soldout" : ""}`}
                      >
                        <div className="relative aspect-square bg-white">
                          <MediaImage src={item.image_url} alt="" fit="contain" padding="p-3" fallbackIcon={<Package className="h-8 w-8 text-ink-soft" strokeWidth={1.25} aria-hidden="true" />} />
                          {count > 0 && (
                            <span className="absolute left-2 top-2 z-10 flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-contrast shadow-lg">{count}</span>
                          )}
                          <span className={`absolute bottom-2 right-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold ${out ? "bg-red-600 text-white" : low ? "bg-amber-500 text-white" : "bg-emerald-600/90 text-white"}`}>
                            {out ? t("outOfStock") : t("stockLeft", { count: item.stock })}
                          </span>
                          {busy === `add-${item.variant_id}` && (
                            <span className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" strokeWidth={2} />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-3">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-primary">{item.name}</p>
                          {item.variant_label && <p className="mt-0.5 text-[11px] text-ink-soft">{item.variant_label}</p>}
                          <p className="mt-auto pt-2 text-base font-extrabold text-ink tabular-nums">
                            {item.price ? `${money(item.price)} ` : "—"}
                            {item.price && <span className="text-[11px] font-medium text-ink-soft">{t("som")}</span>}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {catalog.results.length < catalog.total_count && (
                <div className="mt-4 text-center">
                  <button type="button" onClick={loadMore} className="nz-liquid-chip rounded-full px-5 py-2 text-sm font-medium">
                    {t("loadMore")}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* ---------------- basket */}
        <aside aria-label={t("basket")} className={`nz-liquid flex flex-col overflow-hidden rounded-3xl ${fullscreen ? "lg:sticky lg:top-0 lg:max-h-[calc(100vh-7rem)]" : "lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]"}`}>
          <ScanToCart
            ref={scanRef}
            busy={busy !== null}
            last={lastScan}
            priceMode={priceMode}
            onPriceMode={(on) => {
              setPriceMode(on);
              focusScan();
            }}
            onScan={(code, quantity) => handleCode(code, quantity)}
            onUndo={undoLast}
            onAdjustLast={adjustLast}
          />
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <div>
              <p className="flex items-center gap-2 text-base font-bold text-ink">
                <ShoppingBasket className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden="true" />
                {t("basket")}
              </p>
              <p className="text-[11px] text-ink-soft tabular-nums">
                {sale?.number ?? "…"} · {config.cashier.full_name || t("cashier")}
              </p>
            </div>
            {items.length > 0 && (
              <button type="button" onClick={clearBasket} disabled={busy === "clear"} className="rounded-lg px-2 py-1 text-xs font-semibold text-ink-soft transition-colors hover:bg-red-500/10 hover:text-red-600">
                {t("clear")}
              </button>
            )}
          </div>
          <ParkedBaskets
            sale={sale}
            hasItems={items.length > 0}
            onSale={(next) => {
              setSale(next);
              setLastScan(null);
              focusScan();
            }}
            explain={explain}
            say={say}
            parkSignal={parkSignal}
          />

          {/* customer */}
          <div className="border-b border-border/60 px-4 py-3">{sale && <CustomerPicker sale={sale} onSale={setSale} explain={explain} />}</div>

          {/* lines */}
          <div className="min-h-[160px] flex-1 overflow-y-auto px-3 py-2">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center px-4 py-10 text-center">
                <ShoppingBasket className="h-10 w-10 text-ink-soft/60" strokeWidth={1.25} aria-hidden="true" />
                <p className="mt-2 text-sm font-medium text-ink-muted">{t("emptyBasket")}</p>
                <p className="mt-1 text-xs text-ink-soft">{t("emptyBasketHint")}</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {items.map((line) => {
                  const lineBusy = busy === `line-${line.id}`;
                  const atMax = line.stock != null && line.quantity >= line.stock;
                  return (
                    <li key={line.id} className={`flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-surface-2/50 ${lineBusy ? "opacity-60" : ""} ${lastScan?.kind === "added" && lastScan.item.variant_id === line.variant_id ? "bg-emerald-500/10 ring-1 ring-emerald-500/40" : ""}`}>
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white">
                        <MediaImage src={line.image_url} alt="" fit="contain" padding="p-1" fallbackIcon={<Package className="h-5 w-5 text-ink-soft" strokeWidth={1.5} aria-hidden="true" />} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{line.name}</p>
                        <p className="text-[11px] text-ink-soft tabular-nums">
                          {line.variant_label ? `${line.variant_label} · ` : ""}
                          {money(line.unit_price)} × {line.quantity}
                        </p>
                        {line.batches && line.batches.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {line.batches.map((b) => (
                              <span key={`${b.batch}|${b.expiry}`} className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 tabular-nums">
                                {b.batch ? `LOT ${b.batch}` : t("batch")}{b.expiry ? ` · ${b.expiry.split("-").reverse().join(".")}` : ""} ×{b.qty}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-1 flex items-center gap-1">
                          <button type="button" onClick={() => setQty(line.id, line.quantity - 1)} disabled={lineBusy} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-ink-muted hover:border-primary hover:text-primary" aria-label={t("decrease")}>
                            <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                          <span className="w-8 text-center text-sm font-bold tabular-nums text-ink">{line.quantity}</span>
                          <button type="button" onClick={() => setQty(line.id, line.quantity + 1)} disabled={lineBusy || atMax} className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-ink-muted hover:border-primary hover:text-primary disabled:opacity-40" aria-label={t("increase")}>
                            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm font-bold text-ink tabular-nums">{money(line.line_total)}</p>
                        <button type="button" onClick={() => removeLine(line.id)} disabled={lineBusy} className="rounded-lg p-1 text-ink-soft hover:bg-red-500/10 hover:text-red-600" aria-label={t("remove")}>
                          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* totals */}
          <div className="border-t border-border/60 bg-surface-2/30 px-5 py-4">
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{t("itemsCount", { count: sale?.item_count ?? 0 })}</span>
              <span>{t("acceptedMethods")}</span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-ink">{t("total")}</span>
              <span className="text-3xl font-extrabold tracking-tight text-ink tabular-nums">
                {money(sale?.total)} <span className="text-sm font-semibold text-ink-soft">{t("som")}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setPaying(true)}
              disabled={!items.length}
              className="nz-cta nz-shimmer-btn mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold disabled:pointer-events-none disabled:opacity-50"
            >
              {t("pay")}
              <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[11px]">F2</kbd>
            </button>
            {items.length > 0 &&
              (confirmVoid ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-red-500/10 p-2 text-xs">
                  <span className="flex-1 font-medium text-red-600 dark:text-red-400">{t("confirmVoid")}</span>
                  <button type="button" onClick={voidSale} className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white">
                    {t("yes")}
                  </button>
                  <button type="button" onClick={() => setConfirmVoid(false)} className="rounded-lg px-3 py-1.5 font-semibold text-ink-muted">
                    {t("no")}
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmVoid(true)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold text-ink-soft hover:text-red-600">
                  <Ban className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  {t("voidSale")}
                </button>
              ))}
          </div>
        </aside>
      </div>

      {toast && (
        <div role="status" aria-live="polite" className={`fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur ${toast.tone === "error" ? "bg-red-600/95 text-white" : "bg-emerald-600/95 text-white"}`}>
          {toast.text}
        </div>
      )}

      {paying && sale && config && (
        <PaymentDialog
          sale={sale}
          config={config}
          onClose={() => setPaying(false)}
          onError={(e) => say("error", explain(e))}
          onPaid={(done) => {
            setPaying(false);
            setReceipt(done);
            refreshSession();
          }}
        />
      )}
      {receipt && <ReceiptDialog sale={receipt} onNewSale={newSale} onClose={newSale} />}
      {closing && (
        <CloseRegisterDialog
          config={config}
          explain={explain}
          onClose={() => setClosing(false)}
          onClosed={() => {
            setClosing(false);
            setSession(null);
            setSale(null);
            setFullscreen(false);
          }}
        />
      )}
    </div>
  );
}
