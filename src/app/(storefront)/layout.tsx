import { Heart, Package, Store, Tag } from "lucide-react";
import CoinIcon from "@/components/loyalty/CoinIcon";
import ReferralCapture from "@/components/loyalty/ReferralCapture";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { getLocale, getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/api";
import { getMe } from "@/lib/auth-api";
import { getAccessToken } from "@/lib/session";
import CartBadge from "@/components/CartBadge";
import CatalogButton from "@/components/CatalogButton";
import MobileNav from "@/components/MobileNav";
import SearchBar from "@/components/SearchBar";
import CompareBar from "@/components/compare/CompareBar";
import MobileSearchOverlay from "@/components/MobileSearchOverlay";
import WishlistBadge from "@/components/WishlistBadge";
import { SearchOverlayProvider } from "@/components/SearchOverlayContext";
import { WishlistProvider } from "@/components/WishlistContext";
import GlobalSearchOverlay from "@/components/GlobalSearchOverlay";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import UserAvatar from "@/components/UserAvatar";
import Footer from "@/components/Footer";
import NotificationBell from "@/components/notifications/NotificationBell";
import TelegramMiniAppBridge from "@/components/TelegramMiniAppBridge";
import MiniAppTabBar from "@/components/MiniAppTabBar";
import AssistantWidget from "@/components/assistant/AssistantWidget";

/**
 * Storefront layout -- the main ecommerce navbar/footer, applied ONLY
 * to the (storefront) route group (home, catalog, cart, orders,
 * account, etc). Deliberately excludes /login, /verify-otp, and
 * /auto-login -- those are a standalone authentication experience
 * with no navbar, no footer, no language switcher (per explicit
 * product requirement), and must never render this chrome.
 */
export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("navigation");

  // Real, product-required capability: shows the visitor's actual
  // avatar photo instead of a generic profile icon, wherever one is
  // logged in. Never fails the whole page if this lookup errors (e.g.
  // an expired token) -- a not-logged-in visitor simply sees the
  // fallback icon UserAvatar itself already renders.
  let avatarUrl: string | null = null;
  let fullName = "";
  const accessToken = await getAccessToken();
  if (accessToken) {
    try {
      const me = await getMe(accessToken);
      avatarUrl = me.avatar_url;
      fullName = me.full_name;
    } catch {
      // Not logged in / expired session -- fall through to the icon fallback.
    }
  }

  let categories: Awaited<ReturnType<typeof getCategories>>["data"] = [];
  try {
    categories = (await getCategories(await getLocale())).data;
  } catch {
    // The Katalog button simply hides itself if categories can't be loaded (see CatalogButton's own empty-array guard).
  }

  return (
    <WishlistProvider>
    <SearchOverlayProvider>
      <TelegramMiniAppBridge />
      <header className="nz-glass sticky top-0 z-40" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:py-4 xl:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/" className="group flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
              <BrandMark className="h-8 w-8 rounded-xl text-sm" />
              {/* Real overflow fix, live-verified: at 375px the full wordmark
                  (~95px) plus CatalogButton plus the header's own icon row
                  added up to 400px in a 363px-wide flex row -- below `sm`
                  (640px, the same breakpoint CatalogButton's own label
                  already collapses at) only the square mark shows, matching
                  the icon-only brand mark pattern most mobile commerce apps
                  use rather than shrinking the tap targets on the icons. */}
              <span className="hidden transition-colors group-hover:text-primary sm:inline">{t("home")}</span>
            </Link>
            {/* every category goes into the page payload: drop the per-language slug map, the menu links in this language */}
            <CatalogButton categories={categories.map(({ slugs: _slugs, ...c }) => c)} />
          </div>
          {/* min-w-0 + a shrinkable SearchBar: the nav absorbs longer labels (Russian, the signed-in cart/bell/avatar) by
              narrowing the search pill instead of pushing past the viewport -- previously ~7px over at 1440px in Russian. */}
          <nav className="hidden min-w-0 items-center justify-end gap-4 whitespace-nowrap text-sm font-medium text-ink-muted xl:flex">
            <Link href="/brands" className="flex items-center gap-1.5 transition-colors hover:text-primary">
              <Tag className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {t("brands")}
            </Link>
            <Link href="/stores" className="flex items-center gap-1.5 transition-colors hover:text-primary">
              <Store className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {t("stores")}
            </Link>
            <Link href="/orders" className="flex items-center gap-1.5 transition-colors hover:text-primary">
              <Package className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              {t("orders")}
            </Link>
            {/* Icon-only (like Wishlist next to it): the header row is 1280px at every desktop width, so labels here cost search-pill width. */}
            <Link href="/loyalty" aria-label={t("loyalty")} title={t("loyalty")} className="group flex items-center gap-1.5 transition-colors hover:text-primary">
              <CoinIcon size={20} className="transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
            </Link>
            <Link href="/wishlist" aria-label={t("wishlist")} className="flex items-center transition-colors hover:text-primary">
              <Heart className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </Link>
            <span className="h-5 w-px bg-border" aria-hidden="true" />
            <SearchBar />
            <CartBadge />
            <NotificationBell />
            <LanguageSwitcher compact />
            <ThemeToggle />
            <Link href="/account" aria-label={t("login")} className="flex items-center rounded-full ring-offset-2 transition-all hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/40">
              <UserAvatar avatarUrl={avatarUrl} alt={fullName || t("login")} size={30} />
            </Link>
          </nav>
          <div className="flex items-center gap-0.5 xl:hidden">
            <MobileSearchOverlay />
            {/* below 380px six header icons don't fit -- the wishlist stays reachable from the menu */}
            <span className="hidden min-[380px]:contents">
              <WishlistBadge />
            </span>
            <NotificationBell compact />
            {/* inside the Telegram Mini App the bottom tab bar carries cart / profile / menu (html[data-tg] hides these) */}
            <span className="contents nz-tg-hide-wrap">
              <span className="nz-tg-hide flex"><CartBadge compact /></span>
              <Link href="/account" aria-label={t("login")} className="nz-tg-hide flex h-9 w-9 items-center justify-center">
                <UserAvatar avatarUrl={avatarUrl} alt={fullName || t("login")} size={26} />
              </Link>
              <span className="nz-tg-hide flex"><MobileNav /></span>
            </span>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <Footer />
      <ReferralCapture />
      <GlobalSearchOverlay />
      <CompareBar />
      <AssistantWidget />
      <MiniAppTabBar />
    </SearchOverlayProvider>
    </WishlistProvider>
  );
}
