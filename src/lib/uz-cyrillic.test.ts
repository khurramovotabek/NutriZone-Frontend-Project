import { describe, expect, it } from "vitest";
import { KEEP_LATIN, toUzCyrillic } from "./uz-cyrillic";

describe("toUzCyrillic", () => {
  it("follows the official correspondence", () => {
    expect(toUzCyrillic("Toshkentda sport ozuqalari")).toBe("Тошкентда спорт озуқалари");
    expect(toUzCyrillic("O'zbekiston bo'ylab yetkazib berish")).toBe("Ўзбекистон бўйлаб етказиб бериш");
    expect(toUzCyrillic("Ko'p beriladigan savollar")).toBe("Кўп бериладиган саволлар");
    expect(toUzCyrillic("ta'mlar, ma'no, g'alaba, choy, yog' yoquvchi")).toBe("таъмлар, маъно, ғалаба, чой, ёғ ёқувчи");
    expect(toUzCyrillic("Ekspress, energiya, hamda")).toBe("Экспресс, энергия, ҳамда");
    expect(toUzCyrillic("Ha. Mahsulotlar originalmi?")).toBe("Ҳа. Маҳсулотлар оригиналми?");
  });
  it("spells English loanwords the established way", () => {
    expect(toUzCyrillic("gainerlar, Creatine, 1 coin, Hydration, multivitaminlar")).toBe("гейнерлар, Креатин, 1 коин, Гидратация, мультивитаминлар");
  });
  it("keeps brand names, the domain and abbreviations Latin", () => {
    expect(toUzCyrillic("NUTRIZONE — Optimum Nutrition va BCAA, rasmiy sayt: nutrizone.uz.", KEEP_LATIN)).toBe("NUTRIZONE — Optimum Nutrition ва BCAA, расмий сайт: nutrizone.uz.");
    expect(toUzCyrillic("«Nutrizon» deb qidirsangiz", KEEP_LATIN)).toBe("«Nutrizon» деб қидирсангиз");
  });
});
