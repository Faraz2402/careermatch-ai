import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/lib/geo/data";
import { cityMatches, detectLocation, jobAvailableIn } from "@/lib/geo/detect";

const d = detectLocation;

describe("location detection", () => {
  it("finds Indian cities, aliases and states", () => {
    expect(d("Bengaluru, Karnataka, India")).toMatchObject({ countries: ["IN"], city: "Bengaluru" });
    expect(d("Bangalore")).toMatchObject({ countries: ["IN"], city: "Bengaluru" });
    expect(d("Gurgaon, Haryana")).toMatchObject({ countries: ["IN"], city: "Gurugram" });
    expect(d("Hyderabad, Telangana")).toMatchObject({ countries: ["IN"], city: "Hyderabad" });
    expect(d("Navi Mumbai")).toMatchObject({ countries: ["IN"], city: "Navi Mumbai" });
    expect(d("Pune / Remote")).toMatchObject({ countries: ["IN"], city: "Pune", remote: true });
    expect(d("Maharashtra")).toMatchObject({ countries: ["IN"], city: null });
  });

  it("handles other countries, US states and short codes", () => {
    expect(d("Austin, TX")).toMatchObject({ countries: ["US"], city: "Austin" });
    expect(d("Remote (US)")).toMatchObject({ countries: ["US"], remote: true });
    expect(d("London, UK")).toMatchObject({ countries: ["GB"], city: "London" });
    expect(d("Berlin")).toMatchObject({ countries: ["DE"], city: "Berlin" });
    expect(d("München")).toMatchObject({ countries: ["DE"], city: "Munich" });
    expect(d("Dubai, UAE")).toMatchObject({ countries: ["AE"], city: "Dubai" });
    expect(d("Atlanta, Georgia")).toMatchObject({ countries: ["US"], city: "Atlanta" });
    expect(d("Tbilisi, Georgia")).toMatchObject({ countries: ["GE"], city: "Tbilisi" });
  });

  it("reads remote scopes", () => {
    expect(d("Worldwide")).toMatchObject({ countries: [], remote: true, regions: "any" });
    expect(d("Remote - APAC")).toMatchObject({ countries: [], regions: ["Asia", "Oceania"] });
    expect(d("United Kingdom - Remote")).toMatchObject({ countries: ["GB"], remote: true });
    expect(d("India, Pakistan, Bangladesh").countries).toEqual(["IN", "PK", "BD"]);
  });
});

describe("availability in a country", () => {
  const avail = (loc: string, mode = "remote") => {
    const x = d(loc);
    return jobAvailableIn({ ...x, remote: x.remote || mode === "remote" }, "IN", true);
  };
  it("includes India-based and India-eligible remote roles", () => {
    expect(avail("Mumbai, India", "onsite")).toBe(true);
    expect(avail("Worldwide")).toBe(true);
    expect(avail("APAC")).toBe(true);
    expect(avail("India, Pakistan")).toBe(true);
  });
  it("excludes roles tied to other countries or regions", () => {
    expect(avail("United Kingdom - Remote")).toBe(false);
    expect(avail("Remote (US)")).toBe(false);
    expect(avail("Europe")).toBe(false);
    expect(avail("Remote")).toBe(false); // unspecified remote is not assumed open to India
  });
  it("can exclude remote roles entirely", () => {
    const x = d("Worldwide");
    expect(jobAvailableIn({ ...x }, "IN", false)).toBe(false);
  });
});

describe("dataset", () => {
  it("covers the world with unique codes and at least one city each", () => {
    expect(COUNTRIES.length).toBeGreaterThan(190);
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    expect(COUNTRIES.every((c) => c.cities.length > 0)).toBe(true);
  });
  it("matches cities by alias", () => {
    expect(cityMatches(null, "Bangalore Urban", "Bengaluru")).toBe(true);
    expect(cityMatches(null, "Chennai", "Bengaluru")).toBe(false);
  });
});
