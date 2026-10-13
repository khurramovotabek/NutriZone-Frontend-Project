import { describe, expect, it } from "vitest";
import { parseKeyValueText } from "./parse-key-value-text";

describe("parseKeyValueText", () => {
  // Regression test using the real, observed content shape from an actual
  // product's supplement_facts field (Applied Nutrition Creatine Monohydrate).
  it("splits real 'label — value' lines into rows, keeping a non-matching claim as a note", () => {
    const text = "🧬 Creatine Monohydrate — 5 g\r\n🍴 Serving Size — 5 g\r\n📦 250 g — 50 Servings\r\n✨ 100% Micronized Creatine Monohydrate";

    const { rows, notes } = parseKeyValueText(text);

    expect(rows).toEqual([
      { key: "🧬 Creatine Monohydrate", value: "5 g" },
      { key: "🍴 Serving Size", value: "5 g" },
      { key: "📦 250 g", value: "50 Servings" },
    ]);
    expect(notes).toEqual(["✨ 100% Micronized Creatine Monohydrate"]);
  });

  it("returns no rows for free text with no key/value delimiter, never a fabricated split", () => {
    const { rows, notes } = parseKeyValueText("Just a plain paragraph of marketing copy with no structure.");

    expect(rows).toEqual([]);
    expect(notes).toEqual(["Just a plain paragraph of marketing copy with no structure."]);
  });

  it("ignores blank lines", () => {
    const { rows } = parseKeyValueText("Protein: 24 g\n\n\nFat: 1.5 g\n");

    expect(rows).toEqual([
      { key: "Protein", value: "24 g" },
      { key: "Fat", value: "1.5 g" },
    ]);
  });
});
