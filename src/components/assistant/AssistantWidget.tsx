"use client";

import { useEffect, useRef, useState } from "react";
import { ASSISTANT_OPEN_EVENT } from "@/lib/assistant-events";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUp, Bot, LoaderCircle, Mic, MicOff, RotateCcw, Sparkles, Square, ThumbsDown, ThumbsUp, Volume2, VolumeX, X } from "lucide-react";
import ProductMini from "./ProductMini";
import RichText from "./RichText";
import { useAssistant } from "./useAssistant";
import { useDictation, useSpeech } from "./useVoice";

const HIDDEN = [/^\/profile\/store/, /^\/checkout/];
const SUGGESTIONS = ["s1", "s2", "s3", "s4"] as const;

/**
 * Storefront AI shopping assistant (apps/assistant: free local advisor, or Claude when a key is configured): a launcher button and a chat panel -- full screen on
 * phones, a docked card on wide screens. Answers stream in; recommended products arrive as cards with add-to-cart.
 * Voice: dictation (mic) and read-aloud answers via the browser's Web Speech API. Quick replies (chips) under the
 * latest answer. Hidden where it would get in the way (store owner panel, checkout) or when the backend switches it off.
 */
export default function AssistantWidget() {
  const t = useTranslations("assistant");
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const ai = useAssistant();
  const locale = useLocale();
  const dictation = useDictation(locale);
  const speech = useSpeech(locale);
  const spokenRef = useRef(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/assistant/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((b) => alive && setEnabled(Boolean(b?.data?.enabled)))
      .catch(() => alive && setEnabled(false));
    return () => {
      alive = false;
    };
  }, []);

  // read each finished answer aloud when the shopper turned voice answers on
  useEffect(() => {
    const lastIdx = ai.messages.length - 1;
    const last = ai.messages[lastIdx];
    if (ai.busy || !last || last.role !== "assistant" || !last.text || last.error || spokenRef.current === lastIdx) return;
    spokenRef.current = lastIdx;
    speech.speak(last.text);
  }, [ai.busy, ai.messages, speech]);

  // keep the newest message in view while it streams
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ai.messages, ai.stage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const lock = window.matchMedia("(max-width: 639px)").matches;
    if (lock) document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // other pages open the advisor with a ready question: openAssistant("...") (src/lib/assistant-events.ts)
  const aiRef = useRef(ai);
  useEffect(() => {
    aiRef.current = ai;
  }, [ai]);
  useEffect(() => {
    const onOpen = async (e: Event) => {
      const text = (e as CustomEvent<{ text?: string }>).detail?.text?.trim();
      setOpen(true);
      await aiRef.current.load(); // the saved history first, or it would replace the question sent below
      window.setTimeout(() => {
        if (text && !aiRef.current.busy) aiRef.current.send(text, { network: t("errNetwork"), busy: t("errBusy"), full: t("errFull"), limited: t("errLimited") });
        inputRef.current?.focus();
      }, 60);
    };
    window.addEventListener(ASSISTANT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(ASSISTANT_OPEN_EVENT, onOpen);
  }, [t]);

  if (!enabled || HIDDEN.some((re) => re.test(pathname))) return null;

  const errors = { network: t("errNetwork"), busy: t("errBusy"), full: t("errFull"), limited: t("errLimited") };
  function submit(text: string) {
    if (!text.trim() || ai.busy) return;
    ai.send(text, errors);
    setDraft("");
    inputRef.current?.focus();
  }
  function openPanel() {
    setOpen(true);
    ai.load();
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }

  const stageText = ai.stage ? t(`stage.${ai.stage}`) : null;
  function toggleMic() {
    if (dictation.listening) return dictation.stop();
    dictation.start((text) => setDraft(text), (text) => submit(text));
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={openPanel}
          aria-label={t("open")}
          className="nz-cta fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex h-14 items-center gap-2 rounded-full pl-4 pr-5 text-sm font-semibold text-white shadow-[0_12px_32px_-10px_rgba(var(--nz-primary-rgb),0.8)] transition-transform hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-4.5 w-4.5" aria-hidden="true" />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white/70" aria-hidden="true" />
          </span>
          <span className="hidden sm:inline">{t("launcher")}</span>
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label={t("title")}
          className="fixed inset-0 z-[60] flex flex-col bg-surface sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(680px,calc(100vh-3rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-3">
            <span className="nz-cta flex h-10 w-10 items-center justify-center rounded-2xl text-white"><Bot className="h-5 w-5" aria-hidden="true" /></span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-bold text-ink">{t("title")}</h2>
              <p className="flex items-center gap-1.5 text-xs text-ink-soft"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />{t("subtitle")}</p>
            </div>
            {speech.supported && (
              <button type="button" onClick={speech.toggle} aria-pressed={speech.on} aria-label={speech.on ? t("speakOff") : t("speakOn")} title={speech.on ? t("speakOff") : t("speakOn")} className={`flex h-9 w-9 items-center justify-center rounded-xl hover:bg-surface-2 ${speech.on ? "text-primary" : "text-ink-muted hover:text-ink"}`}>
                {speech.on ? <Volume2 className="h-4 w-4" aria-hidden="true" /> : <VolumeX className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
            {ai.messages.length > 0 && (
              <button type="button" onClick={ai.reset} aria-label={t("newChat")} title={t("newChat")} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label={t("close")} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-2 hover:text-ink">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
            {ai.messages.length === 0 ? (
              <div className="grid gap-4">
                <div className="rounded-2xl bg-primary-soft/60 p-4">
                  <p className="text-sm font-semibold text-ink">{t("welcomeTitle")}</p>
                  <p className="mt-1 text-sm text-ink-muted">{t("welcomeBody")}</p>
                </div>
                <div className="grid gap-2">
                  {SUGGESTIONS.map((k) => (
                    <button key={k} type="button" onClick={() => submit(t(`suggest.${k}`))} className="rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm text-ink transition-colors hover:border-primary hover:text-primary">
                      {t(`suggest.${k}`)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ol className="grid gap-3">
                {ai.messages.map((m, i) => {
                  const last = i === ai.messages.length - 1;
                  if (m.role === "user") {
                    return <li key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm text-white">{m.text}</li>;
                  }
                  return (
                    <li key={i} className="grid max-w-[95%] gap-2">
                      {(m.text || !last || !ai.busy) && (
                        <div className={`break-words rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed ${m.error ? "border border-red-400/40 bg-red-500/8 text-ink" : "bg-surface-2 text-ink"}`}>
                          {m.text ? <RichText text={m.text} /> : <span className="text-ink-soft">…</span>}
                        </div>
                      )}
                      {last && ai.busy && (stageText || !m.text) && (
                        <p className="flex items-center gap-2 text-xs text-ink-soft"><LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{stageText ?? t("stage.thinking")}</p>
                      )}
                      {m.products && m.products.length > 0 && (
                        <div className="grid gap-2">{m.products.map((p) => <ProductMini key={p.id} card={p} onNavigate={() => window.matchMedia("(max-width: 639px)").matches && setOpen(false)} />)}</div>
                      )}
                      {last && !ai.busy && m.chips && m.chips.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.chips.map((c) => (
                            <button key={c} type="button" onClick={() => submit(c)} className="rounded-full border border-primary/40 bg-primary-soft/40 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-white">{c}</button>
                          ))}
                        </div>
                      )}
                      {!m.error && m.index !== undefined && !(last && ai.busy) && (
                        <div className="flex items-center gap-1 text-ink-soft">
                          <button type="button" onClick={() => ai.rate(m, "up")} aria-pressed={m.feedback === "up"} aria-label={t("helpful")} className={`rounded-lg p-1.5 hover:bg-surface-2 ${m.feedback === "up" ? "text-emerald-500" : ""}`}><ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
                          <button type="button" onClick={() => ai.rate(m, "down")} aria-pressed={m.feedback === "down"} aria-label={t("notHelpful")} className={`rounded-lg p-1.5 hover:bg-surface-2 ${m.feedback === "down" ? "text-red-500" : ""}`}><ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <footer className="border-t border-border px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
            {ai.limit ? (
              <div className="grid gap-2 text-center text-sm text-ink-muted">
                <p>{ai.limit}</p>
                <button type="button" onClick={ai.reset} className="mx-auto rounded-xl border border-border px-3 py-1.5 text-sm font-semibold text-ink hover:border-primary">{t("newChat")}</button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); submit(draft); }} className="flex items-end gap-2 rounded-2xl border border-border bg-surface-2 p-1.5 focus-within:border-primary">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  maxLength={800}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      submit(draft);
                    }
                  }}
                  placeholder={dictation.listening ? t("listening") : t("placeholder")}
                  aria-label={t("placeholder")}
                  className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2.5 py-2 text-sm text-ink outline-none placeholder:text-ink-soft"
                />
                {dictation.supported && !ai.busy && (
                  <button type="button" onClick={toggleMic} aria-pressed={dictation.listening} aria-label={dictation.listening ? t("voiceStop") : t("voiceStart")} title={dictation.listening ? t("voiceStop") : t("voiceStart")}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${dictation.listening ? "animate-pulse bg-red-500 text-white" : "text-ink-muted hover:bg-surface hover:text-primary"}`}>
                    {dictation.listening ? <MicOff className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
                  </button>
                )}
                {ai.busy ? (
                  <button type="button" onClick={ai.stop} aria-label={t("stop")} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink/10 text-ink"><Square className="h-4 w-4" aria-hidden="true" /></button>
                ) : (
                  <button type="submit" disabled={!draft.trim()} aria-label={t("send")} className="nz-cta flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white disabled:opacity-40"><ArrowUp className="h-5 w-5" aria-hidden="true" /></button>
                )}
              </form>
            )}
            <p className="mt-2 text-center text-[11px] leading-snug text-ink-soft">{t("disclaimer")}</p>
          </footer>
        </section>
      )}
    </>
  );
}
