"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Phone chat = a full-screen sheet that always fits the *visible* viewport.
 * When the on-screen keyboard opens, iOS/Android shrink `visualViewport` (not `100vh`) and scroll the page
 * to keep the focused field visible -- which dragged the page (and the chat) down toward the footer.
 * Here the sheet is pinned to the visual viewport's height/offset and the page behind it is scroll-locked,
 * so the composer sits right above the keyboard and the message list stays in place.
 */
const MOBILE_QUERY = "(max-width: 639px)";

function subscribeMobile(cb: () => void) {
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function subscribeViewport(cb: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener("resize", cb);
  vv?.addEventListener("scroll", cb);
  window.addEventListener("resize", cb);
  return () => {
    vv?.removeEventListener("resize", cb);
    vv?.removeEventListener("scroll", cb);
    window.removeEventListener("resize", cb);
  };
}

// "height|top" as a primitive so useSyncExternalStore can compare snapshots by value
function viewportSnapshot() {
  const vv = window.visualViewport;
  return `${Math.round(vv ? vv.height : window.innerHeight)}|${Math.round(vv ? vv.offsetTop : 0)}`;
}

export function useMobileChatViewport(active: boolean) {
  const mobile = useSyncExternalStore(subscribeMobile, () => window.matchMedia(MOBILE_QUERY).matches, () => false);
  const viewport = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => "");
  const on = active && mobile;

  useEffect(() => {
    if (!on) return;
    const html = document.documentElement;
    const body = document.body;
    const prev = { html: html.style.overflow, body: body.style.overflow, overscroll: body.style.overscrollBehavior };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    html.dataset.nzChatOpen = "1";
    return () => {
      html.style.overflow = prev.html;
      body.style.overflow = prev.body;
      body.style.overscrollBehavior = prev.overscroll;
      delete html.dataset.nzChatOpen;
    };
  }, [on]);

  const [height, top] = viewport.split("|").map(Number);
  return { fullscreen: on, style: on && viewport ? { height: `${height}px`, top: `${top}px` } : undefined };
}
