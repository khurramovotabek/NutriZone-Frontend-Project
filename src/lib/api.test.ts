import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError, getProducts } from "./api";

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves with the parsed envelope on a successful response", async () => {
    const envelope = { success: true, data: { id: "1" }, meta: { request_id: "r1", timestamp: "now" } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(envelope)));

    const result = await apiFetch("/api/v1/products/x");

    expect(result).toEqual(envelope);
  });

  it("throws an ApiError carrying the backend's own error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: { message: "Product not found" } }, 404)),
    );

    await expect(apiFetch("/api/v1/products/missing")).rejects.toMatchObject(
      new ApiError(404, "Product not found"),
    );
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    const response = {
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(apiFetch("/api/v1/products")).rejects.toThrow(
      "Request to /api/v1/products failed with status 500",
    );
  });
});

describe("getProducts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Regression test for a real, previously-confirmed bug (documented in
  // api.ts): the backend only recognizes bracketed `filter[category_id]`/
  // `filter[brand_id]` query params -- a plain `category_id`/`brand_id`
  // param is silently ignored server-side, which this function used to send.
  it("builds JSON:API-style bracketed filter params, not plain ones", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: true, data: [], meta: { request_id: "r1", timestamp: "now" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getProducts({ page: 2, pageSize: 10, categoryId: "cat-1", brandId: "brand-1" });

    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    const query = new URL(requestedUrl).searchParams;
    expect(query.get("page")).toBe("2");
    expect(query.get("page_size")).toBe("10");
    expect(query.get("filter[category_id]")).toBe("cat-1");
    expect(query.get("filter[brand_id]")).toBe("brand-1");
    expect(query.has("category_id")).toBe(false);
    expect(query.has("brand_id")).toBe(false);
  });
});
