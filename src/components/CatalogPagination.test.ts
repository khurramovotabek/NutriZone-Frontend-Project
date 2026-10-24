import { describe, expect, it } from "vitest";
import { buildPageNumbers } from "./CatalogPagination";

describe("buildPageNumbers", () => {
  it("lists every page when there are few", () => {
    expect(buildPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it("shows five numbers near the start and the end", () => {
    expect(buildPageNumbers(1, 34)).toEqual([1, 2, 3, 4, 5, "ellipsis", 34]);
    expect(buildPageNumbers(34, 34)).toEqual([1, "ellipsis", 30, 31, 32, 33, 34]);
  });
  it("keeps a window around the current page in the middle", () => {
    expect(buildPageNumbers(17, 34)).toEqual([1, "ellipsis", 16, 17, 18, "ellipsis", 34]);
  });
  it("leaves the edges early once the current page moves past them", () => {
    expect(buildPageNumbers(4, 34)).toEqual([1, 2, 3, 4, 5, "ellipsis", 34]);
    expect(buildPageNumbers(5, 34)).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 34]);
    expect(buildPageNumbers(5, 8)).toEqual([1, "ellipsis", 4, 5, 6, 7, 8]);
  });
});
