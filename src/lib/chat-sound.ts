"use client";

import { useSyncExternalStore } from "react";

// Per-device preference: the chime is a browser feature, not an account setting.
const KEY = "nz_chat_sound";
const EVENT = "nz:chat-sound-changed";

export function isChatSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setChatSoundEnabled(enabled: boolean): void {
  try {
    window.localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    // Storage blocked (private mode) -- the toggle just won't persist.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** Live value of the chat chime preference (true during SSR). */
export function useChatSoundEnabled(): boolean {
  return useSyncExternalStore(subscribe, isChatSoundEnabled, () => true);
}
