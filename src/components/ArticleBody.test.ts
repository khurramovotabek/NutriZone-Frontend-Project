import { describe, expect, it } from "vitest";
import { parseArticle } from "./ArticleBody";

describe("parseArticle", () => {
  it("turns plain text into headings, numbered steps, lists and a note", () => {
    const blocks = parseArticle("Kirish matni bu yerda.\n\nKimga foydali?\n• Birinchi\n• Ikkinchi\n\n1. Kichik defitsit\nKam iste'mol qiling.\n\nMuhim: shifokor bilan maslahatlashing.");
    expect(blocks.map((b) => b.kind)).toEqual(["p", "h", "ul", "num", "p", "note"]);
    expect(blocks[2].items).toEqual(["Birinchi", "Ikkinchi"]);
    expect(blocks[3]).toMatchObject({ n: "1", text: "Kichik defitsit" });
  });

  it("keeps an ordinary one-line post as a paragraph", () => {
    expect(parseArticle("Creatin eng kerakli sport ozuqasi")).toEqual([{ kind: "p", text: "Creatin eng kerakli sport ozuqasi" }]);
  });
});
