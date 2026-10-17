import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Real, closed gap: every product/store/blog/banner image was rendered
 * as a plain `<img>` (see MediaImage.tsx's own previous docstring)
 * because the backend media host (`NEXT_PUBLIC_API_BASE_URL`) is a
 * per-environment value -- including an ephemeral Cloudflare Quick
 * Tunnel subdomain in local dev that changes on every restart -- and
 * `next/image` refuses to optimize a host it can't statically verify
 * up front. That made every real image on the site slower (no
 * responsive `srcset`, no modern-format negotiation, no real
 * lazy-loading) than it needed to be.
 *
 * This derives the remote pattern from that same env var at config-
 * load time (Next.js loads `.env.local` before evaluating this file),
 * so it's always in sync with whichever backend this build actually
 * points at -- dev tunnel or real production domain alike -- plus a
 * wildcard for `*.trycloudflare.com` so a tunnel rotation that happens
 * *after* the dev server has already started (confirmed to happen
 * mid-session in this exact environment) still resolves without a
 * config edit or restart.
 */
function mediaRemotePatterns(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "http", hostname: "localhost" },
    { protocol: "http", hostname: "127.0.0.1" },
    { protocol: "https", hostname: "*.trycloudflare.com" },
  ];
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (base) {
    try {
      const url = new URL(base);
      // Real, closed bug: a `remotePatterns` entry with no `port` key
      // does NOT mean "any port" in this Next.js version (confirmed
      // live: `next/image` returned a real 400 for `localhost:8000`
      // even with the portless `{ hostname: "localhost" }` entry above
      // already present) -- it requires the protocol's own default
      // port (80/443). The dedup check below used to key on `hostname`
      // alone, so a non-default-port backend (e.g. local dev on :8000)
      // matched that portless static entry by hostname and was silently
      // never added with its real port at all.
      if (!patterns.some((p) => p.hostname === url.hostname && (p.port || undefined) === (url.port || undefined))) {
        patterns.push({ protocol: url.protocol === "https:" ? "https" : "http", hostname: url.hostname, port: url.port || undefined });
      }
    } catch {
      // Malformed env value -- the wildcard/localhost patterns above still cover local dev; never crash the build over it.
    }
  }
  return patterns;
}

/**
 * Real, closed bug: even with the exact right `remotePatterns` entry
 * (hostname + port both matching), `next/image` still rejected every
 * `localhost`/`127.0.0.1` backend image with a real 400 -- confirmed
 * directly in `node_modules/next/dist/server/image-optimizer.js`'s own
 * `fetchExternalImage`: Next.js 16 added an independent SSRF guard that
 * refuses to fetch any URL resolving to a private/loopback IP unless
 * `images.dangerouslyAllowLocalIP` is explicitly set, regardless of
 * `remotePatterns`. Scoped to only turn on when this build's own real
 * backend target IS a local address (dev), never unconditionally --
 * a real production `NEXT_PUBLIC_API_BASE_URL` is a public domain, so
 * this stays off there, the exact scope Next.js's own flag name warns about.
 */
function isLocalDevBackend(): boolean {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) return false;
  try {
    const { hostname } = new URL(base);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

/**
 * Security headers for every page. Deliberately not a full script-src CSP (inline JSON-LD, the Telegram WebApp
 * SDK and Leaflet tiles would each need nonces/allow-lists) -- `frame-ancestors` is the part that matters here:
 * no other site may frame the shop (clickjacking), except Telegram, which opens the Mini App (/tg) in an iframe
 * on Telegram Web / Desktop.
 */
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org; base-uri 'self'; object-src 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Location: address map / "near me" / branch pickup. Microphone: the AI advisor's voice input. Camera: scanning on phones.
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
  ...(process.env.NODE_ENV === "production" ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  // /ru/… and /en/… are the same pages as the plain (Uzbek) path; src/proxy.ts sets the language header first.
  // An internal rewrite here -- a proxy-made absolute URL behind nginx (X-Forwarded-Proto: https) became an
  // outgoing https request to the app's own http port.
  async rewrites() {
    return {
      beforeFiles: ["ru", "en"].flatMap((l) => [
        { source: `/${l}`, destination: "/" },
        { source: `/${l}/:path*`, destination: "/:path*" },
      ]),
    };
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
  // A stray, empty ~/package-lock.json makes Next.js guess the home
  // directory as the workspace root (and warn on every start). Pin both
  // roots to this project so tracing/Turbopack never look above it.
  outputFileTracingRoot: path.join(__dirname),
  turbopack: { root: path.join(__dirname) },
  allowedDevOrigins: ["localhost", "localhost:3000", "127.0.0.1", "*.trycloudflare.com"],
  images: {
    remotePatterns: mediaRemotePatterns(),
    dangerouslyAllowLocalIP: isLocalDevBackend(),
    // MediaImage.tsx requests quality=90 (product/store photography reads
    // noticeably softer at the 75 default) -- Next.js 16 refuses to serve
    // any quality not explicitly whitelisted here, so 75 (any caller that
    // omits the prop) and 90 both need to be listed.
    qualities: [75, 90],
    // AVIF first (smallest at the same visual quality), WebP as the
    // fallback -- negotiated per browser via the Accept header.
    formats: ["image/avif", "image/webp"],
    // Every backend media path is content-addressed (a sha256 of the
    // file -- e.g. image/c0/9e/c09eb9d0...jpg), so a URL's bytes never
    // change: the optimized variants can be cached for a long time
    // instead of being re-encoded every few hours.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default withNextIntl(nextConfig);
