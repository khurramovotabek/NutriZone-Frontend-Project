/**
 * The receipt itself -- one renderer for the thermal printer (58 / 80 mm roll),
 * the phone e-receipt and the saved PDF, so every copy of a receipt is identical.
 * Deliberately plain: black on white, monospace figures, no colours or shadows --
 * thermal heads print only black, and the same markup must survive a PDF export.
 */

export interface PublicReceipt {
  number: string;
  token: string | null;
  status: "completed" | "refunded" | "voided" | "open";
  channel: string;
  issued_at: string | null;
  refunded_at: string | null;
  seller: { name: string; address: string | null; phone: string | null };
  cashier: string | null;
  /** The kassa it was rung up at (branch name or "Onlayn kassa") and the shift's running number there. */
  kassa?: string | null;
  shift?: number | null;
  items: { name: string; variant_label: string | null; sku: string | null; quantity: number; unit_price: string; line_total: string; refunded_quantity?: number }[];
  item_count: number;
  subtotal: string;
  discount: string;
  coins: string;
  delivery: string;
  total: string;
  currency: string;
  payment_method: string;
  payments: { method: string; amount: string }[];
  refunds: { number: string; at: string; value: string; coins: string; items: number }[];
  returned: string;
  amount_tendered: string | null;
  change: string | null;
  customer: { name: string | null; phone: string | null } | null;
  coins_earned: number;
  tier: string | null;
}

export type ReceiptLabels = Record<
  | "receipt" | "number" | "date" | "cashier" | "items" | "subtotal" | "discount" | "coins" | "delivery" | "total" | "payment"
  | "received" | "change" | "customer" | "earned" | "tier" | "refunded" | "scan" | "thanks" | "vat" | "method.cash"
  | "method.uzcard" | "method.humo" | "method.card" | "method.click" | "method.payme" | "method.uzum" | "method.mixed" | "pcs"
  | "returns" | "returnLine" | "netTotal" | "kassa" | "shift" | "salesSlip" | "positions" | "keep" | "phone",
  string
>;

export function som(value: string | number | null | undefined): string {
  const n = Math.round(Number(value ?? 0));
  return n.toLocaleString("ru-RU").replace(/ /g, " ");
}

function when(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  // Receipts are printed in the store's own wall-clock time.
  const t = new Date(d.toLocaleString("en-US", { timeZone: "Asia/Tashkent" }));
  return `${p(t.getDate())}.${p(t.getMonth() + 1)}.${t.getFullYear()} ${p(t.getHours())}:${p(t.getMinutes())}`;
}

function Row({ k, v, strong, big }: { k: string; v: string; strong?: boolean; big?: boolean }) {
  return (
    <div className={`nzr-row${strong ? " nzr-strong" : ""}${big ? " nzr-big" : ""}`}>
      <span>{k}</span>
      <span className="nzr-num">{v}</span>
    </div>
  );
}

export default function ThermalReceipt({ r, l, qrSvg, url, width, brand = "NutriZone" }: { r: PublicReceipt; l: ReceiptLabels; qrSvg: string | null; url: string | null; width: 58 | 80; brand?: string }) {
  const discount = Number(r.discount);
  const coins = Number(r.coins);
  const delivery = Number(r.delivery);
  const method = l[`method.${r.payment_method}` as keyof ReceiptLabels] ?? r.payment_method;
  const label = (m: string) => l[`method.${m}` as keyof ReceiptLabels] ?? m;
  const hasCash = r.payment_method === "cash" || r.payments.some((p) => p.method === "cash");
  return (
    <article className={`nzr nzr-w${width}`} aria-label={`${l.receipt} ${r.number}`}>
      <header className="nzr-center">
        <div className="nzr-logo">{brand.toUpperCase()}</div>
        <div className="nzr-strong">{r.seller.name}</div>
        {r.seller.address && <div>{r.seller.address}</div>}
        {r.seller.phone && <div>{r.seller.phone}</div>}
      </header>
      <div className="nzr-rule" />
      <div className="nzr-center nzr-title">{l.salesSlip}</div>
      {r.status === "refunded" && <div className="nzr-center nzr-stamp">*** {l.refunded} ***</div>}
      <Row k={l.number} v={r.number} strong />
      <Row k={l.date} v={when(r.issued_at)} />
      {r.kassa && <Row k={l.kassa} v={r.kassa} />}
      {r.shift ? <Row k={l.shift} v={`№${r.shift}`} /> : null}
      {r.cashier && <Row k={l.cashier} v={r.cashier} strong />}
      <div className="nzr-rule" />
      <ul className="nzr-items">
        {r.items.map((it, i) => (
          <li key={i}>
            <div className="nzr-item-name">
              {i + 1}. {it.name}
              {it.variant_label ? ` (${it.variant_label})` : ""}
            </div>
            {it.sku && <div className="nzr-sku">Art. {it.sku}</div>}
            <div className="nzr-row">
              <span className="nzr-num">
                {it.quantity} {l.pcs} × {som(it.unit_price)}
                {it.refunded_quantity ? ` (${l.returnLine} ${it.refunded_quantity})` : ""}
              </span>
              <span className="nzr-num">{som(it.line_total)}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="nzr-rule" />
      <Row k={l.positions} v={`${r.items.length} / ${r.item_count} ${l.pcs}`} />
      <Row k={l.subtotal} v={som(r.subtotal)} />
      {discount > 0 && <Row k={l.discount} v={`−${som(discount)}`} />}
      {coins > 0 && <Row k={l.coins} v={`−${som(coins)}`} />}
      {delivery > 0 && <Row k={l.delivery} v={som(delivery)} />}
      <div className="nzr-rule nzr-double" />
      <Row k={l.total} v={`${som(r.total)} ${r.currency === "UZS" ? "so'm" : r.currency}`} strong big />
      <div className="nzr-rule" />
      {r.payments.length > 1 ? r.payments.map((p) => <Row key={p.method} k={label(p.method)} v={som(p.amount)} />) : <Row k={l.payment} v={method} />}
      {r.amount_tendered !== null && hasCash && r.change !== null && Number(r.change) > 0 && <Row k={l.received} v={som(r.amount_tendered)} />}
      {r.change !== null && hasCash && Number(r.change) > 0 && <Row k={l.change} v={som(r.change)} strong />}
      {r.refunds.length > 0 && (
        <>
          <div className="nzr-rule" />
          <div className="nzr-strong">{l.returns}</div>
          {r.refunds.map((x) => (
            <Row key={x.number} k={`${x.number} · ${x.items} ${l.pcs} · ${when(x.at).slice(0, 10)}`} v={`−${som(x.value)}`} />
          ))}
          <Row k={l.netTotal} v={som(Number(r.total) + Number(r.coins) - Number(r.returned))} strong />
        </>
      )}
      {r.customer && (
        <>
          <div className="nzr-rule" />
          <Row k={l.customer} v={r.customer.name ?? "—"} />
          {r.customer.phone && <Row k={l.phone} v={r.customer.phone} />}
          {r.tier && <Row k={l.tier} v={r.tier} />}
          {r.coins_earned > 0 && <Row k={l.earned} v={`+${som(r.coins_earned)}`} strong />}
        </>
      )}
      {qrSvg && (
        <div className="nzr-center nzr-qr-block">
          <div className="nzr-qr" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div className="nzr-small">{l.scan}</div>
          {url && <div className="nzr-url">{url}</div>}
        </div>
      )}
      <div className="nzr-center nzr-thanks">{l.thanks}</div>
      <div className="nzr-center nzr-small">{l.keep}</div>
    </article>
  );
}

/** Scoped styles for the receipt (plain CSS so the printed page needs nothing else). */
export const RECEIPT_CSS = `
.nzr{background:#fff;color:#000;font-family:"Courier New",ui-monospace,Menlo,Consolas,monospace;line-height:1.35;margin:0 auto;box-sizing:border-box}
.nzr *{box-sizing:border-box}
.nzr-w80{width:72mm;font-size:12px}
.nzr-w58{width:48mm;font-size:10.5px}
.nzr-center{text-align:center}
.nzr-logo{font-weight:900;letter-spacing:.28em;font-size:1.45em;margin-bottom:2px}
.nzr-title{font-weight:900;font-size:1.05em;margin:4px 0 6px;letter-spacing:.14em}
.nzr-stamp{font-weight:900;margin:4px 0;letter-spacing:.08em}
.nzr-strong{font-weight:800}
.nzr-big{font-size:1.3em}
.nzr-rule{border-top:1px dashed #000;margin:6px 0}
.nzr-double{border-top:3px double #000}
.nzr-row{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.nzr-row>span:first-child{flex:0 1 auto;min-width:0}
.nzr-row>span:last-child{text-align:right;min-width:0;overflow-wrap:anywhere}
.nzr-num{font-variant-numeric:tabular-nums;white-space:nowrap}
.nzr-items{list-style:none;margin:0;padding:0}
.nzr-items li{margin:0 0 4px}
.nzr-item-name{overflow-wrap:anywhere;font-weight:700}
.nzr-sku{font-size:.82em}
.nzr-qr-block{margin-top:10px}
.nzr-qr{width:34mm;height:34mm;margin:0 auto}
.nzr-w58 .nzr-qr{width:30mm;height:30mm}
.nzr-qr svg{width:100%;height:100%;display:block}
.nzr-small{font-size:.85em;margin-top:3px}
.nzr-url{font-size:.8em;overflow-wrap:anywhere;margin-top:2px}
.nzr-thanks{margin-top:10px;font-weight:700}
`;
