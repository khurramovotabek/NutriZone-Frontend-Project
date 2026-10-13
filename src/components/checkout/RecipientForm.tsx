"use client";

import { useTranslations } from "next-intl";

const INPUT_CLASS = "nz-glass-input w-full rounded-lg px-4 py-2.5";

/**
 * "Qabul qiluvchi ma'lumotlari". First/Last name are UI-only (see
 * name-utils.ts) -- the real backend field they map onto,
 * Address.recipient_name, is a single combined string. Phone/Telegram
 * username pre-fill from the authenticated user's real profile
 * (UserProfile.phone_number/telegram_username) when available, but
 * always stay editable -- the value actually submitted is whatever is
 * in this form at confirm time, never silently overwritten by profile
 * data. Telegram username is optional: not every account has one
 * (UserProfile.telegram_username is nullable), and it is never
 * required to place an order.
 */
export default function RecipientForm({
  firstName, lastName, phone, telegramUsername, onFirstNameChange, onLastNameChange, onPhoneChange, onTelegramUsernameChange, disabled = false,
}: {
  firstName: string;
  lastName: string;
  phone: string;
  telegramUsername: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onTelegramUsernameChange: (value: string) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("checkout");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="recipient-first-name" className="mb-1 block text-sm font-medium text-ink-muted">
          {t("firstName")}
        </label>
        <input id="recipient-first-name" type="text" required value={firstName} onChange={(e) => onFirstNameChange(e.target.value)} disabled={disabled} className={INPUT_CLASS} />
      </div>
      <div>
        <label htmlFor="recipient-last-name" className="mb-1 block text-sm font-medium text-ink-muted">
          {t("lastName")} <span className="font-normal text-ink-soft">({t("optional")})</span>
        </label>
        <input id="recipient-last-name" type="text" value={lastName} onChange={(e) => onLastNameChange(e.target.value)} disabled={disabled} className={INPUT_CLASS} />
      </div>
      <div>
        <label htmlFor="recipient-phone" className="mb-1 block text-sm font-medium text-ink-muted">
          {t("phoneNumber")}
        </label>
        <input
          id="recipient-phone" type="tel" required value={phone} onChange={(e) => onPhoneChange(e.target.value)} disabled={disabled}
          placeholder="+998 90 123 45 67" className={INPUT_CLASS}
        />
      </div>
      <div>
        <label htmlFor="recipient-telegram-username" className="mb-1 block text-sm font-medium text-ink-muted">
          {t("telegramUsername")} <span className="font-normal text-ink-soft">({t("optional")})</span>
        </label>
        <input
          id="recipient-telegram-username" type="text" value={telegramUsername} onChange={(e) => onTelegramUsernameChange(e.target.value)} disabled={disabled}
          placeholder="username" className={INPUT_CLASS}
        />
      </div>
    </div>
  );
}
