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

function cleanForSpeech(text: string): string {
  return text.replace(/\*\*|~~|(^|\s)_|_(\s|$)/g, " ").replace(/[•#]/g, "").replace(/\s+/g, " ").trim().slice(0, 1200);
}

/**
 * Read-aloud. `serverTts` = the backend has natural neural voices (Azure: Uzbek Madina/Sardor, Russian, English) --
 * then every language is read by /api/assistant/tts; otherwise the browser's own voice is used, and only when it has
 * one for the language (most browsers have no Uzbek voice, so the button stays hidden there).
 * `on` = read each new answer automatically (remembered per browser); `play(key, text)` reads one message on demand.
 */
export function useSpeech(locale: string, serverTts: boolean) {
  const [on, setOn] = useState(false);
  const [browserVoice, setBrowserVoice] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<string, string>());
  const lang = LANG[locale] ?? "uz-UZ";

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of a browser preference
      setOn(localStorage.getItem(SPEAK_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const check = () => setBrowserVoice(window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2))));
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", check);
  }, [lang]);

  const supported = serverTts || browserVoice;

  const stop = useCallback(() => {
    audio.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlaying(null);
    setLoading(null);
  }, []);

  const browserSay = useCallback((key: string, text: string) => {
    if (!browserVoice) return false;
    const u = new SpeechSynthesisUtterance(cleanForSpeech(text));
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    u.lang = voice?.lang ?? lang;
    if (voice) u.voice = voice;
    u.onend = () => setPlaying((k) => (k === key ? null : k));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setPlaying(key);
    return true;
  }, [browserVoice, lang]);

  const play = useCallback(async (key: string, text: string) => {
    if (!text) return;
    if (playing === key || loading === key) return stop();
    stop();
    if (!serverTts) {
      browserSay(key, text);
      return;
    }
    let url = urls.current.get(key);
    if (!url) {
      setLoading(key);
      try {
        const res = await fetch("/api/assistant/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, locale }) });
        if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("audio/")) throw new Error(String(res.status));
        url = URL.createObjectURL(await res.blob());
        urls.current.set(key, url);
      } catch {
        setLoading(null);
        browserSay(key, text);
        return;
      }
      setLoading(null);
    }
    if (!audio.current) audio.current = new Audio();
    const a = audio.current;
    a.src = url;
    a.onended = () => setPlaying((k) => (k === key ? null : k));
    a.onerror = () => setPlaying(null);
    setPlaying(key);
    a.play().catch(() => setPlaying(null));
  }, [browserSay, loading, locale, playing, serverTts, stop]);

  const toggle = useCallback(() => {
    setOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(SPEAK_KEY, next ? "1" : "0");
      } catch {
        /* storage blocked */
      }
      if (!next) stop();
      return next;
    });
  }, [stop]);

  useEffect(() => {
    const cache = urls.current;
    return () => {
      audio.current?.pause();
      cache.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  return { supported, on, toggle, play, stop, playing, loading };
}
