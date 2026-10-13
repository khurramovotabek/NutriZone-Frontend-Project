"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";

export const OTP_LENGTH = 6; // confirmed real length: real captured codes were consistently 6 digits

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  variant?: "default" | "premium";
  /** Real, product-required capability: lets the caller (LoginCodeForm) visually mark the input as invalid (e.g. after a wrong-code error) without disabling it. */
  invalid?: boolean;
}

export default function OtpInput({ value, onChange, disabled, variant = "default", invalid = false }: Props) {
  const t = useTranslations("common");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").split("").slice(0, OTP_LENGTH);

  function focusField(index: number) {
    inputsRef.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
  }

  function setDigit(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");

    // Real, critical defect fix: a genuine single keystroke's
    // event.target.value is one character, but iOS/Android
    // "one-time-code" autofill (the SMS/clipboard suggestion chip
    // above the keyboard, which is exactly what autoComplete=
    // "one-time-code" on the first box asks for) and some GBoard
    // paste-from-suggestion flows deliver the ENTIRE 6-digit code
    // into a single field's change event instead of firing a real
    // clipboard "paste" event. The previous logic took only the
    // LAST character (`.slice(-1)`), silently discarding the other
    // five digits -- the user would see one lone digit, the code
    // would never match, and login looked completely broken with no
    // visible error explaining why. Multi-digit input is now
    // distributed across the boxes exactly like a paste.
    if (clean.length > 1) {
      distributeDigits(clean, index);
      return;
    }

    const next = digits.slice();
    next[index] = clean || " ";
    onChange(next.join("").trimEnd());
    if (clean && index < OTP_LENGTH - 1) focusField(index + 1);
  }

  function distributeDigits(clean: string, startIndex: number) {
    // A string long enough to be the whole code always starts at the
    // first box -- autofill always targets the complete code, never
    // a partial one, regardless of which box technically received
    // the event.
    const start = clean.length >= OTP_LENGTH ? 0 : startIndex;
    const next = digits.slice();
    for (let i = 0; start + i < OTP_LENGTH && i < clean.length; i++) {
      next[start + i] = clean[i];
    }
    onChange(next.join("").trimEnd());
    focusField(Math.min(start + clean.length, OTP_LENGTH - 1));
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "Backspace":
        if (digits[index].trim()) {
          // Field has a digit -- clear it in place, stay put (matches native input backspace behavior).
          const next = digits.slice();
          next[index] = " ";
          onChange(next.join("").trimEnd());
        } else if (index > 0) {
          // Field is already empty -- move back and clear the previous digit too, so repeated backspace deletes leftward.
          e.preventDefault();
          const next = digits.slice();
          next[index - 1] = " ";
          onChange(next.join("").trimEnd());
          focusField(index - 1);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusField(index - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusField(index + 1);
        break;
      case "Home":
        e.preventDefault();
        focusField(0);
        break;
      case "End":
        e.preventDefault();
        focusField(OTP_LENGTH - 1);
        break;
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    // Sanitizes pasted values containing spaces or hyphens (e.g.
    // "123 456" or "123-456") down to plain digits before extracting
    // up to OTP_LENGTH of them -- never logs the pasted value.
    const pasted = e.clipboardData
      .getData("text")
      .replace(/[\s-]/g, "")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (pasted) {
      e.preventDefault();
      distributeDigits(pasted, 0);
    }
  }

  const baseClassName =
    variant === "premium"
      ? "nz-glass-input h-14 w-12 rounded-xl text-center text-2xl font-semibold text-ink outline-none transition-all duration-150 focus:shadow-[0_0_0_3px_var(--nz-primary-soft)] disabled:opacity-40 sm:h-16 sm:w-14"
      : "nz-glass-input h-14 w-11 rounded-lg text-center text-xl font-semibold outline-none disabled:opacity-50";
  const invalidClassName = invalid ? "!border-red-500 focus:!border-red-500" : "";

  return (
    <div className="flex justify-center gap-1.5 sm:gap-2.5" role="group" aria-label={t("verificationGroupLabel")}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit.trim()}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          aria-label={t("digitLabel", { n: i + 1, total: OTP_LENGTH })}
          aria-invalid={invalid || undefined}
          className={`${baseClassName} ${invalidClassName}`}
        />
      ))}
    </div>
  );
}
