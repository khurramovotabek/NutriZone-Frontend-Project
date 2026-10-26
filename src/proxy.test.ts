import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const run = (path: string, cookie?: string) =>
  proxy(new NextRequest(`https://nutrizone.uz${path}`, { headers: cookie ? { cookie } : {} }));

describe("/uz addresses", () => {
  it.each([
    ["/uz", "https://nutrizone.uz/"],
    ["/uz/", "https://nutrizone.uz/"],
    ["/uz/products/whey?flavour=choc", "https://nutrizone.uz/products/whey?flavour=choc"],
  ])("%s redirects permanently to the plain path", async (path, target) => {
    const res = await run(path, "nz_locale=ru");
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(target);
    expect(res.cookies.get("nz_locale")?.value).toBe("uz");
  });

  it.each(["/uzbek-protein", "/products/uz", "/ru/uz"])("%s is not touched", async (path) => {
    const res = await run(path);
    expect(res.status).not.toBe(308);
  });
});
