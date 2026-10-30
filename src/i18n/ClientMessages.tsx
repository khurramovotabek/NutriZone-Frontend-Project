import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

/**
 * Which translations travel to the browser. A bare <NextIntlClientProvider> serialises every message of the
 * language into every page (~150 KB of the ~360 KB product-page HTML) although server components translate
 * on the server and never need them on the client.
 *
 * - SERVER_ONLY: read only through getTranslations() in server components.
 * - APP_ONLY: used only by client components under the signed-in / app routes, which wrap themselves in
 *   <AppMessages> (account, orders, profile + branch dashboard, cart, checkout, loyalty, wishlist, compare,
 *   login / OTP / auto-login, the Mini App entry).
 * - PARTIAL: namespaces whose client components need only a sub-tree on public pages.
 * A namespace a client component needs must not be listed here for a page it renders on -- next-intl would
 * print the key instead of the text.
 */
const SERVER_ONLY = ["blog", "footer", "about", "receipt", "meta", "seo", "pagination", "guides"];
const APP_ONLY = ["myStore", "storePos", "accountSettings", "loyalty", "orders", "checkout", "profile", "chatRealtime", "payment", "auth", "otp", "autoLogin", "authLoading"];
const PARTIAL: Record<string, string[]> = { home: ["banner", "showcase"] };

type Messages = Record<string, unknown>;

function pick(all: Messages, drop: string[], partial: Record<string, string[]>): Messages {
  const out: Messages = {};
  for (const [ns, value] of Object.entries(all)) {
    if (drop.includes(ns)) continue;
    const keep = partial[ns];
    if (keep && value && typeof value === "object") {
      out[ns] = Object.fromEntries(Object.entries(value as Messages).filter(([k]) => keep.includes(k)));
    } else {
      out[ns] = value;
    }
  }
  return out;
}

/** Root provider: what public pages (catalogue, product, store, content) need on the client. */
export async function PublicMessages({ children }: { children: React.ReactNode }) {
  const all = (await getMessages()) as Messages;
  return <NextIntlClientProvider messages={pick(all, [...SERVER_ONLY, ...APP_ONLY], PARTIAL)}>{children}</NextIntlClientProvider>;
}

/** App routes: every client-side namespace (still without the server-only ones). */
export async function AppMessages({ children }: { children: React.ReactNode }) {
  const all = (await getMessages()) as Messages;
  return <NextIntlClientProvider messages={pick(all, SERVER_ONLY, {})}>{children}</NextIntlClientProvider>;
}
