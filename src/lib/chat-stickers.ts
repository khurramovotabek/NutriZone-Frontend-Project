import type { AttachmentUpload } from "@/lib/account-api";

/**
 * The chat's sticker set -- a store <-> customer sales conversation's most
 * common beats (greeting, "in stock", "on the way", "delivered", ...), each
 * drawn as its own gradient card. The codes must match the backend's
 * `apps.chat.domain.value_objects.STICKER_CODES` exactly: a sticker message
 * carries only its code, and the backend rejects any other value.
 */
export type StickerCode =
  | "hello"
  | "thanks"
  | "in_stock"
  | "order_ready"
  | "on_the_way"
  | "delivered"
  | "discount"
  | "original"
  | "one_moment"
  | "power"
  | "call_me"
  | "deal";

export interface Sticker {
  code: StickerCode;
  emoji: string;
  /** Tailwind gradient stops for the card. */
  gradient: string;
  label: { uz: string; ru: string; en: string };
}

export const STICKERS: Sticker[] = [
  { code: "hello", emoji: "👋", gradient: "from-sky-400 to-indigo-500", label: { uz: "Assalomu alaykum!", ru: "Здравствуйте!", en: "Hello!" } },
  { code: "thanks", emoji: "🙏", gradient: "from-rose-400 to-fuchsia-500", label: { uz: "Rahmat!", ru: "Спасибо!", en: "Thank you!" } },
  { code: "in_stock", emoji: "✅", gradient: "from-emerald-400 to-teal-600", label: { uz: "Mavjud", ru: "В наличии", en: "In stock" } },
  { code: "order_ready", emoji: "📦", gradient: "from-amber-400 to-orange-500", label: { uz: "Buyurtma tayyor", ru: "Заказ готов", en: "Order ready" } },
  { code: "on_the_way", emoji: "🚚", gradient: "from-blue-500 to-cyan-500", label: { uz: "Yo'lda", ru: "В пути", en: "On the way" } },
  { code: "delivered", emoji: "🎉", gradient: "from-violet-500 to-purple-600", label: { uz: "Yetkazildi", ru: "Доставлено", en: "Delivered" } },
  { code: "discount", emoji: "🔥", gradient: "from-orange-500 to-red-600", label: { uz: "Chegirma!", ru: "Скидка!", en: "Discount!" } },
  { code: "original", emoji: "🛡️", gradient: "from-slate-600 to-slate-900", label: { uz: "100% original", ru: "100% оригинал", en: "100% original" } },
  { code: "one_moment", emoji: "⏳", gradient: "from-yellow-400 to-amber-600", label: { uz: "Bir daqiqa", ru: "Минутку", en: "One moment" } },
  { code: "power", emoji: "💪", gradient: "from-lime-400 to-green-600", label: { uz: "Kuch sizda!", ru: "Сила с вами!", en: "Power up!" } },
  { code: "call_me", emoji: "📞", gradient: "from-teal-400 to-emerald-600", label: { uz: "Qo'ng'iroq qiling", ru: "Позвоните", en: "Call me" } },
  { code: "deal", emoji: "🤝", gradient: "from-indigo-500 to-blue-700", label: { uz: "Kelishdik!", ru: "Договорились!", en: "Deal!" } },
];

const BY_CODE = new Map(STICKERS.map((s) => [s.code, s]));

export function findSticker(code: string | null | undefined): Sticker | undefined {
  return code ? BY_CODE.get(code as StickerCode) : undefined;
}

export function stickerLabel(sticker: Sticker, locale: string): string {
  return locale === "ru" || locale === "en" ? sticker.label[locale] : sticker.label.uz;
}


/**
 * The original emoji sticker set -- small SVGs shipped in /public/stickers,
 * sent as ordinary image attachments (the backend's media gateway accepts
 * exactly these slugs: RealMediaStorageGateway.STICKER_SLUGS). Sizes are the
 * real file sizes, as the message API requires a real byte count.
 */
export const EMOJI_STICKERS: { slug: string; sizeBytes: number }[] = [
  { slug: "thumbs-up", sizeBytes: 308 },
  { slug: "heart", sizeBytes: 285 },
  { slug: "fire", sizeBytes: 519 },
  { slug: "party", sizeBytes: 460 },
  { slug: "laugh", sizeBytes: 395 },
  { slug: "ok", sizeBytes: 406 },
  { slug: "check", sizeBytes: 242 },
  { slug: "sweat-smile", sizeBytes: 497 },
  { slug: "cool", sizeBytes: 430 },
  { slug: "shaka", sizeBytes: 380 },
  { slug: "open-hands", sizeBytes: 472 },
  { slug: "eyes", sizeBytes: 384 },
  { slug: "recycle", sizeBytes: 335 },
  { slug: "raised-hands", sizeBytes: 334 },
  { slug: "fist", sizeBytes: 326 },
];

export function emojiStickerAttachment(slug: string, sizeBytes: number): AttachmentUpload {
  return {
    attachment_type: "image",
    attachment_url: `${window.location.origin}/stickers/${slug}.svg`,
    attachment_filename: `${slug}.svg`,
    attachment_size_bytes: sizeBytes,
  };
}
