"use client";

import { useEffect, useState, type ReactNode } from "react";

interface TabDef {
  id: string;
  label: string;
  badge?: string;
  content: ReactNode;
}

/**
 * Description / Specifications / Reviews tabs on the product detail
 * page. Each tab's content is built server-side by the parent (a
 * Server Component) and passed in as `content` -- this wrapper only
 * owns which panel is visible, never re-fetches or re-shapes data.
 *
 * Syncs with the URL hash both ways: the rating summary above links to
 * `#reviews`, and this component opens that tab on mount or on any
 * later hash change (e.g. the same link clicked again while already
 * on the page), so "see reviews" genuinely jumps to the reviews panel
 * instead of only scrolling past a closed tab.
 */
export default function ProductTabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace("#", "");
      if (tabs.some((tab) => tab.id === hash)) setActive(hash);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tabs identity is stable per render of the parent Server Component; re-running per keystroke isn't needed.
  }, []);

  return (
    <div id="product-tabs" className="nz-glass overflow-hidden rounded-2xl">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border p-2 [scrollbar-width:none]! [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => {
              setActive(tab.id);
              history.replaceState(null, "", `#${tab.id}`);
            }}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
              active === tab.id ? "nz-cta" : "text-ink-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {tab.label}
            {tab.badge && <span className="ml-1.5 opacity-80">{tab.badge}</span>}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" aria-labelledby={tab.id} hidden={active !== tab.id} className="p-5 sm:p-6">
          {tab.content}
        </div>
      ))}
    </div>
  );
}
