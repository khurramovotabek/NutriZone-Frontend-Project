import Link from "next/link";
import { getTranslations } from "next-intl/server";
import BrandMark from "@/components/BrandMark";
import { getBrand } from "@/lib/brand";
import { getAccessToken, getRefreshToken } from "@/lib/session";

export default async function Footer() {
  const t = await getTranslations("footer");
  const tNav = await getTranslations("navigation");
  const tBlog = await getTranslations("blog");
  const year = new Date().getFullYear();
  const brand = await getBrand();
  const signedIn = Boolean((await getAccessToken()) ?? (await getRefreshToken()));

  return (
    <footer className="nz-glass nz-site-footer">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
              <BrandMark className="h-7 w-7 rounded-lg text-xs" />
              {brand.name}
            </p>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">{t("tagline")}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{t("shopHeading")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/products" className="text-ink-muted transition-colors hover:text-primary">
                  {tNav("catalog")}
                </Link>
              </li>
              <li>
                <Link href="/cart" className="text-ink-muted transition-colors hover:text-primary">
                  {tNav("cart")}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-ink-muted transition-colors hover:text-primary">
                  {tBlog("title")}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-ink-muted transition-colors hover:text-primary">
                  {tNav("about")}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-ink-muted transition-colors hover:text-primary">
                  {tNav("contact")}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-ink-soft">{t("accountHeading")}</h3>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link href="/account" className="text-ink-muted transition-colors hover:text-primary">
                  {t("myAccount")}
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-ink-muted transition-colors hover:text-primary">
                  {tNav("orders")}
                </Link>
              </li>
              <li>
                {/* signed-in shoppers get their wallet here instead of a pointless "Log in" */}
                <Link href={signedIn ? "/account/loyalty" : "/login"} className="text-ink-muted transition-colors hover:text-primary">
                  {signedIn ? tNav("loyalty") : tNav("login")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-ink-soft">© {year} {brand.name}</div>
      </div>
    </footer>
  );
}
