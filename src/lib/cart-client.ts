"use client";

/**
 * Browser-side cart calls, one at a time.
 *
 * The backend versions every cart write (optimistic locking): two writes to the same cart at the same moment --
 * e.g. pricing two lines in parallel right after sign-in, or two quick "add" taps -- make the second one fail, and
 * with no cart cookie yet two parallel adds even created two carts (the first item was lost). Every cart write from
 * the storefront goes through this queue, so they reach the server in order.
 */
import { emitCartUpdated } from "@/lib/cart-events";

export interface CartLine {
  id: string;
  product_variant_id: string;
  quantity: number;
  status: string;
  price_reference: { unit_amount: string; currency: string } | null;
}

export interface CartBody {
  success: boolean;
  data?: { items: CartLine[] } & Record<string, unknown>;
  meta?: { authenticated?: boolean };
  error?: { code?: string; message?: string };
}

let tail: Promise<unknown> = Promise.resolve();

/** Runs `task` after every earlier queued cart task has finished (success or not). */
export function queueCartTask<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}

async function json(res: Response): Promise<CartBody> {
  return (await res.json().catch(() => ({ success: false }))) as CartBody;
}

const post = (url: string, body: unknown) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** POST /api/cart; `line` is the line now holding this variant (an existing line just grows -- it isn't always the last one). */
export function addToCart(variantId: string, quantity = 1): Promise<{ res: Response; body: CartBody; line: CartLine | null }> {
  return queueCartTask(async () => {
    const res = await post("/api/cart", { product_variant_id: variantId, quantity });
    const body = await json(res);
    const line = body.data?.items?.find((i) => i.product_variant_id === variantId && i.status !== "removed") ?? null;
    return { res, body, line };
  });
}

/** Locks today's price on one line (signed-in shoppers only). Retried once when another write got there first. */
export function priceLine(lineId: string): Promise<{ res: Response; body: CartBody }> {
  return queueCartTask(async () => {
    let res = await post(`/api/cart/items/${lineId}/price`, {});
    let body = await json(res);
    if (res.status === 409 && body.error?.code !== "RESOURCE_NOT_FOUND") {
      res = await post(`/api/cart/items/${lineId}/price`, {});
      body = await json(res);
    }
    return { res, body };
  });
}

/** Add + (when signed in) price, the way every "Add to cart" button needs it. */
export async function addAndPrice(variantId: string, quantity = 1): Promise<{ ok: boolean; status: number; body: CartBody; line: CartLine | null; priced: boolean }> {
  const added = await addToCart(variantId, quantity);
  if (!added.res.ok || !added.body.success) return { ok: false, status: added.res.status, body: added.body, line: null, priced: false };
  emitCartUpdated();
  if (!added.body.meta?.authenticated || !added.line || added.line.price_reference) {
    return { ok: true, status: added.res.status, body: added.body, line: added.line, priced: Boolean(added.line?.price_reference) };
  }
  const priced = await priceLine(added.line.id);
  const line = priced.body.data?.items?.find((i) => i.id === added.line!.id) ?? added.line;
  return { ok: true, status: priced.res.status, body: priced.body.success ? priced.body : added.body, line, priced: priced.res.ok && Boolean(priced.body.success) };
}
