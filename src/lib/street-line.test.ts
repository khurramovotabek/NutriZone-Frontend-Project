import { describe, expect, it } from "vitest";
import type { LocateResult } from "@/lib/geo-locate";
import { streetLineFrom } from "./street-line";

const base: LocateResult = {
  latitude: 41.3, longitude: 69.2, in_uzbekistan: true, in_service_area: true, distance_km: 1, city: { id: "c", name: "Toshkent" },
  region: { id: "r", name: "Toshkent shahri" }, country: { id: "u", name: "O'zbekiston", code: "UZ" }, district: { id: "d", name: "Yunusobod tumani" },
  street: "", house: "", label: "", postcode: "",
};

describe("streetLineFrom", () => {
  it("does not repeat the house the street already ends with", () => {
    expect(streetLineFrom({ ...base, street: "Yunusobod-4 12", house: "12" })).toBe("Yunusobod-4 12");
    expect(streetLineFrom({ ...base, street: "Navoiy ko'chasi 30/2", house: "30/2" })).toBe("Navoiy ko'chasi 30/2");
  });
  it("adds the house when the street is only a name", () => {
    expect(streetLineFrom({ ...base, street: "Amir Temur shoh ko'chasi", house: "108" })).toBe("Amir Temur shoh ko'chasi 108");
    expect(streetLineFrom({ ...base, street: "Mirobod 112", house: "12" })).toBe("Mirobod 112 12");
  });
  it("falls back to the mahalla from the label", () => {
    expect(streetLineFrom({ ...base, label: "Iftixor mahallasi, Yunusobod tumani, Toshkent, 100000, O'zbekiston" })).toBe("Iftixor mahallasi");
  });
});
