"use client";

import { usePathname } from "next/navigation";

/** Pages where the shopper should only finish the order: no footer, no chat bubble, no sign-up nudge, no compare bar. */
const FOCUS_ROUTES = ["/checkout"];

export function isFocusRoute(pathname: string | null): boolean {
  const path = (pathname ?? "").replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
  return FOCUS_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
}

export default function HideOnFocusRoutes({ children }: { children: React.ReactNode }) {
  return isFocusRoute(usePathname()) ? null : <>{children}</>;
}
