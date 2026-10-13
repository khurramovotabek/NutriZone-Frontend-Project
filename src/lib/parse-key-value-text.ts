/**
 * `Product.supplement_facts` is a real, existing backend field, but a
 * plain free-text `CharField` (confirmed against `ProductDetailSerializer`)
 * -- not a structured `{key, value}[]` field like `specifications`. Its
 * real, actually-entered content already consistently uses one of a
 * few "label — value" delimiters per line (e.g. "🧬 Creatine Monohydrate
 * — 5 g"), so this re-flows that SAME text into table rows for display
 * -- it never invents, renames, or drops a value. A line that doesn't
 * match any known delimiter (e.g. "✨ 100% Micronized Creatine
 * Monohydrate", a standalone claim, not a fact) is kept verbatim as a
 * note rather than forced into a fabricated key/value split.
 */

const DELIMITERS = [" — ", " – ", ": "];

export interface ParsedKeyValueText {
  rows: { key: string; value: string }[];
  notes: string[];
}

export function parseKeyValueText(text: string): ParsedKeyValueText {
  const rows: { key: string; value: string }[] = [];
  const notes: string[] = [];

  for (const rawLine of text.split(/\r\n|\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    let matched = false;
    for (const delimiter of DELIMITERS) {
      const index = line.indexOf(delimiter);
      if (index === -1) continue;
      const key = line.slice(0, index).trim();
      const value = line.slice(index + delimiter.length).trim();
      if (key && value) {
        rows.push({ key, value });
        matched = true;
        break;
      }
    }
    if (!matched) notes.push(line);
  }

  return { rows, notes };
}
