"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "Rate our chat" -- shown in a closed support chat whose latest closing hasn't been rated yet (`can_rate` from the
 * conversation detail). 1–5 stars + an optional comment, sent once; afterwards it shows the given score.
 */
export default function ChatRating({ conversationId, initial, onRated }: { conversationId: string; initial?: { score: number; comment: string } | null; onRated?: (score: number) => void }) {
  const t = useTranslations("chatRealtime");
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(initial ? "done" : "idle");
  const [given, setGiven] = useState(initial?.score ?? 0);

  async function submit() {
    if (!score || state === "busy") return;
    setState("busy");
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/rating`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score, comment }) });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) throw new Error();
      setGiven(score);
      setState("done");
      onRated?.(score);
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="nz-glass mx-3 my-2 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm" role="status">
        <span className="font-semibold text-ink">{t("rateThanks")}</span>
        <span className="flex text-amber-400" aria-label={t("rateStars", { count: given })}>
          {[1, 2, 3, 4, 5].map((n) => <Star key={n} className="h-4 w-4" fill={n <= given ? "currentColor" : "none"} strokeWidth={1.75} aria-hidden="true" />)}
        </span>
      </div>
    );
  }

  const shown = hover || score;
  return (
    <section className="nz-glass mx-3 my-2 rounded-2xl p-4 text-center" aria-labelledby="chat-rate-title">
      <h3 id="chat-rate-title" className="text-sm font-bold text-ink">{t("rateTitle")}</h3>
      <p className="mt-0.5 text-xs text-ink-muted">{t("rateHint")}</p>
      <div className="mt-3 flex justify-center gap-1.5" role="radiogroup" aria-label={t("rateTitle")} onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={score === n} aria-label={t("rateStars", { count: n })} onMouseEnter={() => setHover(n)} onClick={() => setScore(n)}
            className="rounded-lg p-1 text-amber-400 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <Star className="h-8 w-8" fill={n <= shown ? "currentColor" : "none"} strokeWidth={1.6} aria-hidden="true" />
          </button>
        ))}
      </div>
      {score > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder={t("rateComment")} aria-label={t("rateComment")}
            className="nz-glass-input min-w-0 flex-1 rounded-xl px-3 py-2 text-sm" />
          <button type="button" onClick={submit} disabled={state === "busy"} className="nz-cta rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60">{t("rateSend")}</button>
        </div>
      )}
      {state === "error" && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{t("rateError")}</p>}
    </section>
  );
}
