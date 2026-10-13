# NutriZone Storefront

A real Next.js 16 + TypeScript + Tailwind e-commerce storefront,
connected end-to-end to the live NutriZone Django backend — no mock
data, no placeholder APIs.

## What's implemented

- **Authentication** — Telegram-based, passwordless login: "Open
  Telegram Bot" deep link, 6-digit code entry with real focus
  management/paste support, secure HttpOnly-cookie JWT session
  (never localStorage). Premium liquid-glass login page.
- **Catalog** — server-rendered product listing with category/brand
  filtering (a real "Filter" panel — sticky sidebar on desktop, a
  floating glass drawer on mobile), pagination, a top-of-viewport
  animated loading bar on every navigation.
- **Product detail** — real product data, multilingual content,
  variant/pricing display.
- **Cart** — full guest (not-logged-in) support: add, view, change
  quantity, remove, clear — all without an account. Only checkout
  requires logging in.
- **Checkout** — address selection/creation (with recipient
  name/phone/Telegram username), single payment method (cash on
  delivery, matching the real backend contract).
- **Account** — profile (name, username, email, avatar upload),
  addresses, orders, wishlist, reviews.
- **Reviews** — submit and view product reviews; requires login,
  redirects back to the same page after authentication.
- **Internationalization** — UZ/RU/EN via next-intl, including a
  redesigned language switcher (single flag indicator, no duplicate
  flags, full keyboard support).
- **Design system** — dark, liquid-glass premium visual identity
  (NutriZone lime-green accent), consistent across login, catalog,
  cart, checkout, and account pages.

## Real, disclosed backend constraints

These are backend facts, not frontend limitations to be worked
around with fake data:

- The Cart API's `AddLineItem`/quantity-update operations accept a
  price but never recompute it server-side from a coupon on their
  own — applying a coupon (in the POS terminal; not yet wired into
  this storefront's own cart) works by re-adding each line item with
  its new, server-computed price via the existing pricing endpoint.
- `PublicProductListSerializer` does not include price/stock in the
  catalog list response by itself; price/stock are resolved via a
  separate, bulk-loaded lookup (see backend `selectors.py`), already
  wired into `ProductCard`.

## Environment

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

This must point at the real Django backend. No secrets belong in this
file — Telegram bot URLs are fixed, public deep links, not credentials.

## Running

```bash
npm install
npm run dev     # requires the Django backend running and reachable at NEXT_PUBLIC_API_BASE_URL
npm run build
npm start
```

## Verifying changes

Before considering any change complete:

```bash
npx tsc --noEmit   # must be zero errors
npm run build      # must succeed against a live backend
```

Any new translatable string must be added to all three files under
`messages/` (`en.json`, `ru.json`, `uz.json`) — verified valid JSON
and structurally identical key sets, checked via:

```bash
python3 -c "import json; json.load(open('messages/en.json', encoding='utf-8'))"
```

## Project structure

| Directory | Contents |
|---|---|
| `src/app/` | Next.js App Router pages — `(storefront)/` route group holds every customer-facing page (shares one navbar/footer layout); `login`, `verify-otp`, `auto-login` sit outside it (standalone auth experience, no storefront chrome) |
| `src/app/api/` | Route Handlers that bridge the browser to the Django backend — the only place JWT/cart tokens are ever read/written (HttpOnly cookies) |
| `src/components/` | Reusable UI components (ProductCard, CatalogFilterPanel, CatalogButton, UserAvatar, LoginCodeForm, OtpInput, etc.) |
| `src/lib/` | Typed API clients (`api.ts`, `cart-api.ts`, `auth-api.ts`, etc.) and server-only session helpers (`session.ts`) |
| `messages/` | next-intl translation files (`en.json`, `ru.json`, `uz.json`) |
# NutriZone-Frontend-Project
