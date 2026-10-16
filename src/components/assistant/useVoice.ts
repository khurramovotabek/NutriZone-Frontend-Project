"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Browser speech (free, on-device / the browser vendor's service): Web Speech API recognition for dictation and
   speechSynthesis for reading answers aloud. Both degrade to "unsupported" silently. */

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

const LANG: Record<string, string> = { uz: "uz-UZ", ru: "ru-RU", en: "en-US" };
const SPEAK_KEY = "nz_ai_speak";

function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Dictation: `start(onText, onFinal)` streams the interim transcript and calls onFinal with the last result. */
export function useDictation(locale: string) {
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);
  const supported = typeof window !== "undefined" && recognitionCtor() !== null;

  const stop = useCallback(() => {
    rec.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback((onText: (t: string) => void, onFinal: (t: string) => void) => {
    const Ctor = recognitionCtor();
    if (!Ctor) return false;
    const r = new Ctor();
    r.lang = LANG[locale] ?? "uz-UZ";
    r.interimResults = true;
    r.continuous = false;
    let text = "";
    r.onresult = (e) => {
      text = Array.from(e.results).map((res) => res[0].transcript).join(" ");
      onText(text);
      const last = e.results[e.results.length - 1];
      if (last?.isFinal) onFinal(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
    return true;
  }, [locale]);

  useEffect(() => () => rec.current?.stop(), []);
  return { supported, listening, start, stop };
}

/** Read-aloud toggle (remembered per browser) + speak(text) that strips the light markdown first. */
export function useSpeech(locale: string) {
  const [on, setOn] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser preference
      setOn(localStorage.getItem(SPEAK_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(SPEAK_KEY, next ? "1" : "0");
      } catch {
        /* storage blocked */
      }
      if (!next && supported) window.speechSynthesis.cancel();
      return next;
    });
  }, [supported]);

  const speak = useCallback((text: string) => {
    if (!on || !supported || !text) return;
    const clean = text.replace(/\*\*|~~|(^|\s)_|_(\s|$)/g, " ").replace(/[•#]/g, "").replace(/\s+/g, " ").trim().slice(0, 1200);
    const u = new SpeechSynthesisUtterance(clean);
    const lang = LANG[locale] ?? "uz-UZ";
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [on, supported, locale]);

  return { supported, on, toggle, speak };
}
