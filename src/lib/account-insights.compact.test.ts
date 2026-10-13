import { describe, expect, it } from "vitest";
import { formatMoneyCompact } from "./account-insights";

describe("formatMoneyCompact", () => {
  it("uses each language's own units", () => {
    expect(formatMoneyCompact(34271775, "UZS", "uz")).toBe("34,3 mln UZS");
    expect(formatMoneyCompact(34271775, "UZS", "ru")).toBe("34,3 млн UZS");
    expect(formatMoneyCompact(34271775, "UZS", "en")).toBe("34.3M UZS");
  });

  it("keeps small amounts and whole units readable", () => {
    expect(formatMoneyCompact(950, "UZS", "uz")).toBe("950 UZS");
    expect(formatMoneyCompact(2_000_000, null, "uz")).toBe("2 mln");
    expect(formatMoneyCompact(1_713_589, "UZS", "fr")).toBe("1.7M UZS");
  });
});
