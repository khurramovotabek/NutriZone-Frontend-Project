import { describe, expect, it } from "vitest";
import { activeFilterCount, catalogHref, parseCatalogParams, toggle } from "@/lib/catalog-params";
import { formatSizeKey } from "@/lib/format-weight";

describe("catalog URL state", () => {
  it("round-trips every filter through the URL", () => {
    const href = "/products?q=whey&category=c1&brand=b1%2Cb2&flavour=f1&size=250g%2C2270g&min=100000&max=500000&rating=4&stock=1&sort=-price&view=list&page=3";
    const state = parseCatalogParams(Object.fromEntries(new URL(`http://x${href}`).searchParams));
    expect(state).toMatchObject({ q: "whey", category: "c1", brands: ["b1", "b2"], flavours: ["f1"], sizes: ["250g", "2270g"], min: "100000", max: "500000", rating: 4, stock: true, sort: "-price", view: "list", page: 3 });
    expect(catalogHref(state, { page: 3 })).toBe(href);
  });

  it("drops invalid values instead of passing them to the API", () => {
    const state = parseCatalogParams({ rating: "9", sort: "bogus", min: "abc", page: "-2" });
    expect(state.rating).toBeUndefined();
    expect(state.sort).toBeUndefined();
    expect(state.min).toBeUndefined();
    expect(state.page).toBe(1);
  });

  it("any filter change resets pagination", () => {
    const state = parseCatalogParams({ page: "4", brand: "b1" });
    expect(catalogHref(state, { stock: true })).toBe("/products?brand=b1&stock=1");
  });

  it("toggles multi-value options and counts active filters", () => {
    expect(toggle(["a", "b"], "a")).toEqual(["b"]);
    expect(toggle(["a"], "b")).toEqual(["a", "b"]);
    expect(activeFilterCount(parseCatalogParams({ brand: "a,b", min: "1", max: "2", stock: "1" }))).toBe(4);
  });
});

describe("formatSizeKey", () => {
  it.each([
    ["250g", "250 g"],
    ["2270g", "2.27 kg"],
    ["1.5kg", "1.5 kg"],
    ["weird", "weird"],
  ])("%s -> %s", (key, label) => {
    expect(formatSizeKey(key)).toBe(label);
  });
});
