/**
 * Uzbek phone numbers as people type them -- "942052040", "94 205 20 40", "94-205-20-40", "+998 94 205 20 40",
 * "8 94 205 20 40" -- mirrors the backend's apps/identity/domain/phone.py so the form agrees with the server.
 */
export function parseUzPhone(raw: string): string | null {
  const text = (raw || "").trim();
  if (!text || !/^[\s\d+\-().]+$/.test(text)) return null;
  let d = text.replace(/\D/g, "");
  if (d.length === 9) d = `998${d}`;
  else if (d.length === 10 && d.startsWith("8")) d = `998${d.slice(1)}`;
  else if (d.length === 13 && d.startsWith("9980")) d = `998${d.slice(4)}`;
  return /^998[2-9]\d{8}$/.test(d) ? `+${d}` : null;
}

/** The 9 local digits (after +998) of whatever was typed or pasted, at most 9. */
export function localDigits(raw: string): string {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length > 9 && d.startsWith("998")) d = d.slice(3);
  else if (d.length === 10 && d.startsWith("8")) d = d.slice(1);
  return d.slice(0, 9);
}

/** "942052040" → "94 205 20 40" (as far as it is typed). */
export function formatLocal(d: string): string {
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(" ");
}
