import type { ReactNode } from "react";
import { segmentMetadata } from "@/lib/page-meta";
import { StoreDashboardProvider } from "@/components/store-dashboard/StoreDashboardContext";
import StoreDashboardShell from "@/components/store-dashboard/StoreDashboardShell";

/**
 * Shared shell for the whole store-owner dashboard
 * (/profile/store and its sub-pages: profile, contact, hours,
 * gallery, products, inquiries). Fetches the store once via
 * StoreDashboardProvider and renders the cover/logo hero + side nav
 * once here, so navigating between sub-pages never re-fetches or
 * re-flashes the header.
 */
export const generateMetadata = segmentMetadata("myStore");

export default function StoreDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <StoreDashboardProvider>
      <StoreDashboardShell>{children}</StoreDashboardShell>
    </StoreDashboardProvider>
  );
}
