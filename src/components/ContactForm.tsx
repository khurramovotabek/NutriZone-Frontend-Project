"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, CheckCircle2, Loader2, Lock, Send } from "lucide-react";
import { submitContactMessage } from "@/lib/settings-api";
import { ApiError } from "@/lib/api";

type Status = "idle" | "submitting" | "success" | "error";
type Field = "name" | "email" | "message";

const TOPICS = ["order", "product", "delivery", "partnership", "other"] as const;
type Topic = (typeof TOPICS)[number];

const MESSAGE_MAX = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function ContactForm() {
  const t = useTranslations("contact");
  const uid = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [touched, setTouched] = useState<Record<Field, boolean>>({ name: false, email: false, message: false });

  const fieldErrors: Record<Field, string | null> = {
    name: name.trim().length < 2 ? t("validation.name") : null,
    email: !EMAIL_RE.test(email.trim()) ? t("validation.email") : null,
    message: message.trim().length < 5 ? t("validation.message") : null,
  };
  const showError = (f: Field) => (touched[f] ? fieldErrors[f] : null);
  const submitting = status === "submitting";

  function pickTopic(next: Topic) {
    const nextTopic = topic === next ? null : next;
    // Chips pre-fill the subject, but never overwrite something the user typed themselves.
    const previousLabel = topic ? t(`topics.${topic}`) : "";
    if (!subject || subject === previousLabel) setSubject(nextTopic ? t(`topics.${nextTopic}`) : "");
    setTopic(nextTopic);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submissions
    setTouched({ name: true, email: true, message: true });
    if (fieldErrors.name || fieldErrors.email || fieldErrors.message) {
      const first = (["name", "email", "message"] as Field[]).find((f) => fieldErrors[f]);
      if (first) document.getElementById(`${uid}-${first}`)?.focus();
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    try {
      await submitContactMessage({ name: name.trim(), email: email.trim(), subject: subject.trim() || undefined, message: message.trim() });
      setStatus("success");
      setName("");
      setEmail("");
      setSubject("");
      setTopic(null);
      setMessage("");
      setTouched({ name: false, email: false, message: false });
    } catch (err) {
      // Never clear the user's entered data on failure.
      setStatus("error");
      setErrorMessage(err instanceof ApiError ? err.message : t("formError"));
    }
  }

  if (status === "success") {
    return (
      <div className="nz-liquid nz-rise flex min-h-[420px] flex-col items-center justify-center rounded-3xl p-8 text-center" role="status" aria-live="polite">
        <div className="nz-auth-check flex h-16 w-16 items-center justify-center rounded-full bg-success/15 ring-8 ring-success/5">
          <CheckCircle2 className="h-8 w-8 text-success" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xl font-bold tracking-tight text-ink">{t("formSuccessTitle")}</p>
        <p className="mt-2 max-w-sm text-sm text-ink-muted">{t("formSuccessBody")}</p>
        <button type="button" onClick={() => setStatus("idle")} className="nz-liquid-chip mt-6 rounded-full px-5 py-2 text-sm font-medium">
          {t("formSendAnother")}
        </button>
      </div>
    );
  }

  const inputClass = (f?: Field) =>
    `nz-glass-input peer block w-full rounded-xl px-4 pb-2 pt-6 text-sm disabled:opacity-60 ${f && showError(f) ? "!border-red-500/70 focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.15)]" : ""}`;
  const floatingLabel =
    "pointer-events-none absolute left-4 top-4 origin-left text-sm text-ink-soft transition-all duration-200 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold";

  return (
    <form onSubmit={handleSubmit} className="nz-liquid nz-rise rounded-3xl p-6 sm:p-8" style={{ animationDelay: "120ms" }} noValidate aria-describedby={`${uid}-privacy`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">{t("formTitle")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("formSubtitle")}</p>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success sm:inline-flex">
          <Lock className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          {t("secureBadge")}
        </span>
      </div>

      <fieldset className="mt-6">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">{t("topicLabel")}</legend>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((key) => (
            <button key={key} type="button" aria-pressed={topic === key} onClick={() => pickTopic(key)} disabled={submitting} className="nz-liquid-chip rounded-full px-3.5 py-1.5 text-xs font-medium">
              {t(`topics.${key}`)}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="relative">
            <input
              id={`${uid}-name`}
              type="text"
              autoComplete="name"
              required
              maxLength={150}
              placeholder=" "
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, name: true }))}
              disabled={submitting}
              aria-invalid={Boolean(showError("name"))}
              aria-describedby={showError("name") ? `${uid}-name-err` : undefined}
              className={inputClass("name")}
            />
            <label htmlFor={`${uid}-name`} className={floatingLabel}>
              {t("formName")} <span className="text-red-500">*</span>
            </label>
          </div>
          {showError("name") && <FieldError id={`${uid}-name-err`} text={showError("name")!} />}
        </div>

        <div>
          <div className="relative">
            <input
              id={`${uid}-email`}
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              maxLength={254}
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((p) => ({ ...p, email: true }))}
              disabled={submitting}
              aria-invalid={Boolean(showError("email"))}
              aria-describedby={showError("email") ? `${uid}-email-err` : undefined}
              className={inputClass("email")}
            />
            <label htmlFor={`${uid}-email`} className={floatingLabel}>
              {t("formEmail")} <span className="text-red-500">*</span>
            </label>
          </div>
          {showError("email") && <FieldError id={`${uid}-email-err`} text={showError("email")!} />}
        </div>
      </div>

      <div className="relative mt-4">
        <input
          id={`${uid}-subject`}
          type="text"
          maxLength={200}
          placeholder=" "
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={submitting}
          className={inputClass()}
        />
        <label htmlFor={`${uid}-subject`} className={floatingLabel}>
          {t("formSubject")}
        </label>
      </div>

      <div className="mt-4">
        <div className="relative">
          <textarea
            id={`${uid}-message`}
            required
            maxLength={MESSAGE_MAX}
            rows={6}
            placeholder=" "
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onBlur={() => setTouched((p) => ({ ...p, message: true }))}
            disabled={submitting}
            aria-invalid={Boolean(showError("message"))}
            aria-describedby={`${uid}-message-count${showError("message") ? ` ${uid}-message-err` : ""}`}
            className={`${inputClass("message")} min-h-[150px] resize-y`}
          />
          <label htmlFor={`${uid}-message`} className={floatingLabel}>
            {t("formMessage")} <span className="text-red-500">*</span>
          </label>
        </div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>{showError("message") && <FieldError id={`${uid}-message-err`} text={showError("message")!} />}</div>
          <p id={`${uid}-message-count`} className={`shrink-0 text-[11px] tabular-nums ${message.length > MESSAGE_MAX * 0.9 ? "text-warning" : "text-ink-soft"}`}>
            {message.length.toLocaleString("en-US")} / {MESSAGE_MAX.toLocaleString("en-US")}
          </p>
        </div>
      </div>

      {status === "error" && errorMessage && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="nz-cta nz-shimmer-btn group/send mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold disabled:pointer-events-none disabled:opacity-70"
      >
        {submitting ? (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          <Send className="h-4 w-4 transition-transform duration-200 group-hover/send:-translate-y-0.5 group-hover/send:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
        )}
        {submitting ? t("formSending") : t("formSubmit")}
      </button>

      <p id={`${uid}-privacy`} className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-ink-soft">
        <Lock className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
        {t("formPrivacyNote")}
      </p>
    </form>
  );
}

function FieldError({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {text}
    </p>
  );
}
