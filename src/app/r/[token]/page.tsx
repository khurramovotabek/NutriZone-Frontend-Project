import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { getBrand } from "@/lib/brand";
import ThermalReceipt, { RECEIPT_CSS, som, type PublicReceipt, type ReceiptLabels } from "@/components/receipt/ThermalReceipt";
import { AutoPrint, ReceiptActions } from "@/components/receipt/ReceiptClient";

export const metadata: Metadata = { title: "E-chek", robots: { index: false, follow: false } };

type Params = { token: string };
type Search = { print?: string; autoprint?: string };

async function load(token: string, locale: string): Promise<PublicReceipt | null> {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(token)) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/receipts/${encodeURIComponent(token)}?locale=${locale}`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * `/r/<token>` -- the e-receipt behind every receipt's QR code.
 *   default          phone view: the paper receipt + "Save as PDF" / share
 *   ?print=58|80     bare thermal layout sized for the roll (used by the POS to print)
 *   &autoprint=1     prints on load (the POS loads this in a hidden iframe)
 * The data always comes live from the NutriZone server by an unguessable token,
 * so what the customer sees here is the authentic record of the sale.
 */
export default async function ReceiptPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<Search> }) {
  const { token } = await params;
  const sp = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("receipt");
  const receipt = await load(token, locale);
  const brand = await getBrand();

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  const url = `${proto}://${host}/r/${token}`;
  const printWidth = sp.print === "58" ? 58 : sp.print === "80" ? 80 : null;

  if (!receipt) {
    return (
      <main className="nzr-page">
        <style>{PAGE_CSS}</style>
        <div className="nzr-missing">
          <h1>{t("notFoundTitle")}</h1>
          <p>{t("notFoundText")}</p>
        </div>
      </main>
    );
  }

  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#000000", light: "#ffffff" } });
  const labels = Object.fromEntries(
    (["receipt", "number", "date", "cashier", "items", "subtotal", "discount", "coins", "delivery", "total", "payment", "received", "change", "customer", "earned", "tier", "refunded", "scan", "thanks", "vat", "pcs", "returns", "returnLine", "netTotal", "kassa", "shift", "salesSlip", "positions", "keep", "phone"] as const).map((k) => [k, t(k)]),
  ) as ReceiptLabels;
  for (const m of ["cash", "uzcard", "humo", "card", "click", "payme", "uzum", "mixed"]) labels[`method.${m}` as keyof ReceiptLabels] = t(`method.${m}`);
  const shortUrl = url.replace(/^https?:\/\//, "");

  if (printWidth) {
    return (
      <main className="nzr-print-root">
        <style>{RECEIPT_CSS + printCss(printWidth)}</style>
        <ThermalReceipt r={receipt} l={labels} qrSvg={qrSvg} url={shortUrl} width={printWidth} brand={brand.name} />
        {sp.autoprint === "1" && <AutoPrint />}
      </main>
    );
  }

  return (
    <main className="nzr-page">
      <style>{RECEIPT_CSS + PAGE_CSS}</style>
      <div className="nzr-shell">
        <div className="nzr-verified">
          <ShieldCheck className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
          <span>{t("verified")}</span>
        </div>
        <h1 className="nzr-heading">
          {receipt.seller.name} · <span>{som(receipt.total)} so&apos;m</span>
        </h1>
        {receipt.status === "refunded" && <p className="nzr-refund-banner">{t("refundedBanner")}</p>}
        <div className="nzr-paper">
          <ThermalReceipt r={receipt} l={labels} qrSvg={qrSvg} url={shortUrl} width={80} brand={brand.name} />
        </div>
        <ReceiptActions url={url} labels={{ pdf: t("savePdf"), share: t("share"), copy: t("copyLink"), copied: t("copied") }} />
        <p className="nzr-foot">{t("footer")}</p>
      </div>
    </main>
  );
}

function printCss(width: 58 | 80) {
  return `
@page{size:${width}mm auto;margin:0}
html,body{background:#fff!important;margin:0;padding:0}
.nzr-print-root{padding:${width === 80 ? "3mm 4mm" : "2mm 5mm"} ;background:#fff}
`;
}

const PAGE_CSS = `
.nzr-page{min-height:100vh;background:radial-gradient(1200px 600px at 20% -10%,#1e3a8a55,transparent),radial-gradient(900px 500px at 110% 10%,#10b98133,transparent),#0b1220;padding:28px 16px 40px;color:#e2e8f0;font-family:var(--font-sans),"Segoe UI",Roboto,Arial,Helvetica,sans-serif}
.nzr-shell{font-family:var(--font-sans),"Segoe UI",Roboto,Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;display:flex;flex-direction:column;align-items:center;gap:14px}
.nzr-verified{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:#10b98122;border:1px solid #10b98155;color:#6ee7b7;font-size:12px;font-weight:700}
.nzr-heading{margin:0;font-size:15px;font-weight:600;color:#cbd5e1;text-align:center}
.nzr-heading span{color:#fff;font-weight:800}
.nzr-refund-banner{margin:0;padding:8px 14px;border-radius:12px;background:#ef444422;border:1px solid #ef444466;color:#fca5a5;font-size:13px;font-weight:700;text-align:center}
.nzr-paper{width:100%;background:#fff;border-radius:6px 6px 0 0;padding:18px 12px 26px;box-shadow:0 30px 60px -20px #000c,0 0 0 1px #ffffff14;overflow-x:auto;position:relative;
  -webkit-mask:linear-gradient(#000 0 0) top/100% calc(100% - 10px) no-repeat,radial-gradient(circle 6px at 8px 100%,#0000 98%,#000) bottom/16px 10px repeat-x;
          mask:linear-gradient(#000 0 0) top/100% calc(100% - 10px) no-repeat,radial-gradient(circle 6px at 8px 100%,#0000 98%,#000) bottom/16px 10px repeat-x}
.nzr-paper .nzr{width:100%;max-width:72mm}
.nzr-actions{display:flex;gap:10px;width:100%}
.nzr-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 14px;border-radius:14px;border:1px solid #ffffff22;background:#ffffff0f;color:#fff;font:700 14px/1.2 var(--font-sans),"Segoe UI",Roboto,Arial,Helvetica,sans-serif;cursor:pointer;backdrop-filter:blur(12px)}
.nzr-btn:hover{background:#ffffff1a}
.nzr-btn-primary{background:linear-gradient(135deg,#2563eb,#1d4ed8);border-color:#3b82f6}
.nzr-foot{margin:0;font-size:11px;color:#64748b;text-align:center}
.nzr-missing{max-width:380px;margin:18vh auto 0;text-align:center}
.nzr-missing h1{font-size:20px;margin:0 0 8px;color:#fff}
.nzr-missing p{color:#94a3b8;margin:0}
@media print{
  @page{size:A4;margin:12mm}
  .nzr-page{background:#fff!important;padding:0}
  .nzr-verified,.nzr-heading,.nzr-actions,.nzr-foot,.nzr-refund-banner{display:none!important}
  .nzr-paper{box-shadow:none;padding:0;-webkit-mask:none;mask:none}
}
`;
