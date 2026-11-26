import { describe, expect, it } from "vitest";
import { androidMapIntent, geoUri, twoGisUrl, yandexPointUrl, yandexRouteUrl } from "./maps";

describe("androidMapIntent", () => {
  it("opens a Yandex pin in the Yandex Maps app with the website as fallback", () => {
    const web = yandexPointUrl(41.311081, 69.240562);
    const intent = androidMapIntent(web)!;
    expect(intent).toMatch(/^intent:\/\/maps\.yandex\.ru\/\?pt=69\.240562,41\.311081&z=17&l=map#Intent;scheme=yandexmaps;package=ru\.yandex\.yandexmaps;/);
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(web)};end`);
  });

  it("keeps the route request for a Yandex route", () => {
    expect(androidMapIntent(yandexRouteUrl(41.3, 69.2))).toContain("intent://maps.yandex.ru/?rtext=~41.300000,69.200000&rtt=auto#Intent;");
  });

  it("opens 2GIS points in the 2GIS app", () => {
    expect(androidMapIntent(twoGisUrl(41.3, 69.2))).toMatch(/^intent:\/\/2gis\.ru\/geo\/69\.200000,41\.300000#Intent;scheme=dgis;package=ru\.dublgis\.dgismobile;/);
  });

  it("leaves place cards and other links alone", () => {
    expect(androidMapIntent("https://yandex.uz/maps/org/nutrizone/123456/")).toBeNull();
    expect(androidMapIntent("https://yandex.uz/maps/")).toBeNull();
    expect(androidMapIntent("https://www.google.com/maps/search/?api=1&query=1,2")).toBeNull();
    expect(androidMapIntent("not a url")).toBeNull();
  });
});

describe("geoUri", () => {
  it("builds an Android geo: link with the label", () => {
    expect(geoUri(41.3, 69.2, "NutriZone Chilonzor")).toBe("geo:41.300000,69.200000?q=41.300000,69.200000(NutriZone%20Chilonzor)");
  });
});
