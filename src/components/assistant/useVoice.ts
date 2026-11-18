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

/* ------------------------------------------------------------------------------------------------------------------
 * Voice messages written down on our own server (/api/assistant/stt -> offline Uzbek / Russian / English models).
 * Works where the browser's dictation doesn't know Uzbek or doesn't exist (iOS Safari, Telegram, Firefox): the
 * microphone is recorded with MediaRecorder (webm/ogg opus, or mp4 on Safari), a live level drives the waveform, it
 * stops by itself at MAX_SECONDS, and the text comes back to be sent like a typed question.
 * ------------------------------------------------------------------------------------------------------------------ */

export type RecorderState = "idle" | "recording" | "sending";
export type VoiceResult = { text?: string; confidence?: number; error?: string };
const MAX_SECONDS = 59;
const MIME = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4", "audio/aac"];

export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const level = useRef(0); // 0..1, read by the waveform's own animation frame (no re-render per frame)
  const [supported, setSupported] = useState(false);
  const media = useRef<{ rec: MediaRecorder; stream: MediaStream; ctx?: AudioContext; raf?: number; timer?: number; started: number } | null>(null);
  const chunks = useRef<Blob[]>([]);
  const onDone = useRef<((r: VoiceResult) => void) | null>(null);
  const discard = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- capability probe needs the browser
    setSupported(typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
  }, []);

  const release = useCallback(() => {
    const m = media.current;
    if (!m) return;
    if (m.raf) cancelAnimationFrame(m.raf);
    if (m.timer) window.clearInterval(m.timer);
    m.stream.getTracks().forEach((tr) => tr.stop());
    m.ctx?.close().catch(() => undefined);
    media.current = null;
    level.current = 0;
  }, []);

  const upload = useCallback(async (blob: Blob, elapsed: number) => {
    const done = onDone.current;
    if (elapsed < 0.6 || blob.size < 1200) {
      setState("idle");
      done?.({ error: "short" });
      return;
    }
    setState("sending");
    try {
      const res = await fetch("/api/assistant/stt", { method: "POST", headers: { "Content-Type": blob.type || "audio/webm" }, body: blob });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data?.text) done?.({ text: String(body.data.text), confidence: Number(body.data.confidence ?? 1) });
      else done?.({ error: body?.error?.message || (res.status === 429 ? "limited" : "failed") });
    } catch {
      done?.({ error: "network" });
    } finally {
      setState("idle");
    }
  }, []);

  /** Starts recording; `done` gets {text} or {error: "denied" | "short" | "failed" | "network" | "limited" | message}. */
  const start = useCallback(async (done: (r: VoiceResult) => void) => {
    if (media.current) return;
    onDone.current = done;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    } catch {
      done({ error: "denied" });
      return;
    }
    const mimeType = MIME.find((m) => MediaRecorder.isTypeSupported?.(m));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
    } catch {
      stream.getTracks().forEach((tr) => tr.stop());
      done({ error: "failed" });
      return;
    }
    chunks.current = [];
    discard.current = false;
    const started = performance.now();
    media.current = { rec, stream, started };
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = () => {
      const elapsed = (performance.now() - started) / 1000;
      const blob = new Blob(chunks.current, { type: rec.mimeType || mimeType || "audio/webm" });
      release();
      if (discard.current) setState("idle");
      else upload(blob, elapsed);
    };
    // live level for the waveform (best effort: some webviews have no AudioContext)
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          level.current = Math.min(1, peak / 64);
          if (media.current) media.current.raf = requestAnimationFrame(tick);
        };
        media.current.ctx = ctx;
        media.current.raf = requestAnimationFrame(tick);
      }
    } catch {
      /* no waveform, recording still works */
    }
    setSeconds(0);
    media.current.timer = window.setInterval(() => {
      const s = Math.floor((performance.now() - started) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS && media.current?.rec.state === "recording") media.current.rec.stop();
    }, 250);
    rec.start(250);
    setState("recording");
  }, [release, upload]);

  /** Stops and sends the recording. */
  const finish = useCallback(() => {
    const m = media.current;
    if (m?.rec.state === "recording") m.rec.stop();
  }, []);

  /** Stops and throws the recording away. */
  const cancel = useCallback(() => {
    discard.current = true;
    const m = media.current;
    if (m?.rec.state === "recording") m.rec.stop();
    else release();
    setState("idle");
  }, [release]);

  useEffect(() => () => {
    discard.current = true;
    if (media.current?.rec.state === "recording") media.current.rec.stop();
  }, []);

  return { supported, state, seconds, level, start, finish, cancel, max: MAX_SECONDS };
}
