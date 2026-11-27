import { describe, expect, it } from "vitest";
import { storeMetaDescription } from "./seo";

describe("storeMetaDescription", () => {
  const template = "LifeSport Siti: Shayxontohur. Ish vaqti, telefon, xaritada yo'nalish va filialdagi mahsulotlar.";
  it("drops a bare link or one-liner for the address template", () => {
    expect(storeMetaDescription("LifeSport sport ozuqalari do'koni — Shayxontohur. https://t.me/lifesportpit/3686", template)).toBe(template);
    expect(storeMetaDescription(null, template)).toBe(template);
  });
  it("keeps a real store text, without links", () => {
    const own = "Toshkent Siti savdo markazidagi filial: protein, kreatin, vitaminlar, bepul maslahat va olib ketish. Har kuni 10:00–22:00 ochiq. https://t.me/x";
    expect(storeMetaDescription(own, template)).toBe(own.replace(" https://t.me/x", ""));
  });
});
