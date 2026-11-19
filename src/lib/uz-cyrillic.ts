/**
 * Uzbek Latin -> Uzbek Cyrillic (the official 1995 correspondence), for the /oz page: many people in Uzbekistan
 * still type and search in Cyrillic ("Тошкентда спорт озуқалари"), and the shop's own texts are written in Latin.
 * Brand and product names, domains and Latin abbreviations listed in `keep` stay as they are.
 */
const PAIRS: Array<[string, string]> = [
  ["o'", "ў"], ["g'", "ғ"], ["sh", "ш"], ["ch", "ч"], ["yo", "ё"], ["yu", "ю"], ["ya", "я"], ["ye", "е"],
];
const SINGLE: Record<string, string> = {
  a: "а", b: "б", c: "с", d: "д", e: "е", f: "ф", g: "г", h: "ҳ", i: "и", j: "ж", k: "к", l: "л", m: "м", n: "н", o: "о",
  p: "п", q: "қ", r: "р", s: "с", t: "т", u: "у", v: "в", w: "в", x: "х", y: "й", z: "з",
};
const VOWELS = "aeiouаеиоуўэяюё";
const LETTER = /[a-z']/i;

function caseLike(src: string, out: string): string {
  return src[0] === src[0].toUpperCase() && src[0] !== src[0].toLowerCase() ? out[0].toUpperCase() + out.slice(1) : out;
}

/** English loanwords spelled the English way in Latin Uzbek texts: their established Cyrillic stem. */
const STEMS: Array<[string, string]> = [["gainer", "гейнер"], ["geyner", "гейнер"], ["creatine", "креатин"], ["hydration", "гидратация"], ["performance", "перформанс"], ["coin", "коин"], ["multivitamin", "мультивитамин"], ["shaker", "шейкер"]];

function word(w: string): string {
  const lower = w.toLowerCase();
  const stem = STEMS.find(([lat]) => lower.startsWith(lat));
  if (stem) return caseLike(w, stem[1]) + word(w.slice(stem[0].length));
  let out = "";
  for (let i = 0; i < w.length; ) {
    const rest = w.slice(i).toLowerCase();
    const pair = PAIRS.find(([lat]) => rest.startsWith(lat));
    if (pair) {
      out += caseLike(w[i], pair[1]);
      i += pair[0].length;
      continue;
    }
    const ch = rest[0];
    if (ch === "'") {
      out += i > 0 ? "ъ" : ""; // tutuq belgisi (ma'no -> маъно); a leading quote is punctuation
      i += 1;
      continue;
    }
    if (ch === "e") {
      const prev = out.slice(-1).toLowerCase();
      out += caseLike(w[i], i === 0 || VOWELS.includes(prev) ? "э" : "е"); // word-initial / after a vowel: э
      i += 1;
      continue;
    }
    out += SINGLE[ch] ? caseLike(w[i], SINGLE[ch]) : w[i];
    i += 1;
  }
  return out;
}

export function toUzCyrillic(text: string, keep: string[] = []): string {
  const norm = text.replace(/[’‘ʻʼ`]/g, "'");
  const kept: string[] = [];
  // longest first, so "Optimum Nutrition" wins over "Optimum"
  let masked = norm;
  for (const k of [...new Set(keep.filter((x) => x && x.length > 1))].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(?<![\\p{L}\\d])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\d])`, "giu");
    masked = masked.replace(re, (m) => `\u0001${kept.push(m) - 1}\u0002`);
  }
  let out = "";
  let buf = "";
  const flush = () => {
    if (buf) out += word(buf);
    buf = "";
  };
  for (let i = 0; i < masked.length; i++) {
    const ch = masked[i];
    if (ch === "\u0001") {
      flush();
      const end = masked.indexOf("\u0002", i);
      out += kept[Number(masked.slice(i + 1, end))];
      i = end;
    } else if (LETTER.test(ch) && !(ch === "'" && !buf)) {
      buf += ch;
    } else {
      flush();
      out += ch === "'" ? "'" : ch;
    }
  }
  flush();
  return out;
}

/** Names that stay Latin in Cyrillic Uzbek text: the shop, payment and delivery services, abbreviations. */
export const KEEP_LATIN = [
  "NUTRIZONE", "NutriZone", "Nutrizone", "nutrizone.uz", "Nutrizon", "Nutri Zone", "NutriZone Coins", "Coins", "BCAA", "Telegram", "Yandex", "BTS",
  "Payme", "Click", "Uzum", "Uzcard", "Humo", "whey", "pre-workout", "Instagram", "Google", "Optimum Nutrition", "Applied Nutrition", "MuscleTech", "BSN", "Myprotein",
];
