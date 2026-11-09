import { afterEach, describe, expect, it, vi } from "vitest";
import { internalTokenHeader } from "@/lib/internal-token";

describe("internalTokenHeader", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends the token from the server", () => {
    vi.stubEnv("INTERNAL_API_TOKEN", "s3cret-token");
    expect(internalTokenHeader()).toEqual({ "X-Internal-Token": "s3cret-token" });
  });

  it("sends nothing when the token is not configured", () => {
    vi.stubEnv("INTERNAL_API_TOKEN", "");
    expect(internalTokenHeader()).toEqual({});
  });

  it("never sends it from a browser", () => {
    vi.stubEnv("INTERNAL_API_TOKEN", "s3cret-token");
    vi.stubGlobal("window", {});
    try {
      expect(internalTokenHeader()).toEqual({});
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
