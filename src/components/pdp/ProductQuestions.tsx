"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hourglass, LoaderCircle, MessageCircleQuestion, Send, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ProductQuestions as QA } from "@/lib/pdp-api";

const MIN = 8;
const MAX = 600;

/** Savol-javob: answered questions of this product + an "ask the store" form for signed-in shoppers. */
export default function ProductQuestions({ slug, initial, signedIn, loginHref }: { slug: string; initial: QA; signedIn: boolean; loginHref: string }) {
  const t = useTranslations("product");
  const router = useRouter();
  const [data, setData] = useState<QA>(initial);
  const [text, setText] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // dd.mm.yyyy from the ISO date itself: identical on the server and in every browser (Intl's "uz" months differ)
  const date = (iso: string) => iso.slice(0, 10).split("-").reverse().join(".");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = text.trim();
    if (question.length < MIN || state === "sending") return;
    setState("sending");
    setError(null);
    const res = await fetch("/api/products/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, question }) }).catch(() => null);
    if (res?.status === 401) {
      router.push(loginHref);
      return;
    }
    const body = await res?.json().catch(() => null);
    if (!res?.ok || !body?.success) {
      setError(body?.error?.message ?? t("qaError"));
      setState("error");
      return;
    }
    setData((d) => ({ ...d, mine: [{ id: body.data.id, question: body.data.question, asked_at: body.data.asked_at }, ...d.mine] }));
    setText("");
    setState("sent");
  }

  const items = showAll ? data.items : data.items.slice(0, 5);

  return (
    <div className="space-y-5">
      {signedIn ? (
        <form onSubmit={submit} className="nz-liquid rounded-3xl p-4 sm:p-5">
          <label htmlFor="qa-input" className="flex items-center gap-2 text-[15px] font-bold text-ink">
            <MessageCircleQuestion className="h-5 w-5 text-primary" strokeWidth={2} aria-hidden="true" />
            {t("qaAskTitle")}
          </label>
          <p className="mt-0.5 text-xs text-ink-soft">{t("qaAskHint")}</p>
          <textarea
            id="qa-input"
            value={text}
            onChange={(e) => { setText(e.target.value.slice(0, MAX)); if (state !== "sending") setState("idle"); }}
            rows={3}
            maxLength={MAX}
            placeholder={t("qaPlaceholder")}
            className="mt-3 w-full resize-y rounded-2xl border border-border bg-surface/70 px-3.5 py-3 text-base text-ink placeholder:text-ink-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <small className="tabular-nums text-ink-soft">{text.length}/{MAX}</small>
            <button type="submit" disabled={text.trim().length < MIN || state === "sending"}
              className="nz-cta inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">
              {state === "sending" ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {t("qaSend")}
            </button>
          </div>
          {state === "sent" && <p className="mt-2 text-sm font-medium text-emerald-600 dark:text-emerald-400" role="status">{t("qaSent")}</p>}
          {state === "error" && error && <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
        </form>
      ) : (
        <div className="nz-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
          <p className="text-sm text-ink-muted">{t("qaLoginHint")}</p>
          <Link href={loginHref} className="nz-cta inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold">{t("qaLogin")}</Link>
        </div>
      )}

      {data.mine.length > 0 && (
        <ul className="space-y-2">
          {data.mine.map((q) => (
            <li key={q.id} className="flex items-start gap-2.5 rounded-2xl border border-dashed border-amber-400/50 bg-amber-50/60 p-3 text-sm dark:bg-amber-400/5">
              <Hourglass className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-ink">{q.question}<span className="mt-0.5 block text-xs text-ink-soft">{t("qaPending")}</span></span>
            </li>
          ))}
        </ul>
      )}

      {data.items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t("qaEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <li key={q.id} className="nz-glass rounded-2xl p-4">
              <p className="flex items-start gap-2.5 text-[15px] font-semibold text-ink">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-xs font-bold text-primary" aria-hidden="true">S</span>
                <span className="min-w-0">{q.question}<span className="mt-0.5 block text-xs font-normal text-ink-soft">{[q.author || t("qaCustomer"), date(q.asked_at)].join(" · ")}</span></span>
              </p>
              <div className="mt-3 flex items-start gap-2.5 rounded-xl bg-emerald-500/[0.07] p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white" aria-hidden="true"><Store className="h-3.5 w-3.5" /></span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{t("qaStoreAnswer")}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-ink">{q.answer}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {data.items.length > 5 && !showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="w-full rounded-2xl border border-border py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft">
          {t("qaShowAll", { count: data.total })}
        </button>
      )}
    </div>
  );
}
