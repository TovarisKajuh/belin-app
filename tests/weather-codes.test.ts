import { describe, expect, it } from "vitest";
import { weatherCodeToKey } from "@/lib/weather-codes";

describe("weatherCodeToKey", () => {
  it("maps null to unknown", () => {
    expect(weatherCodeToKey(null)).toBe("unknown");
  });
  it("maps clear and mainly clear", () => {
    expect(weatherCodeToKey(0)).toBe("clear");
    expect(weatherCodeToKey(1)).toBe("partly");
    expect(weatherCodeToKey(3)).toBe("partly");
  });
  it("maps fog, rain, snow, storm bands", () => {
    expect(weatherCodeToKey(45)).toBe("fog");
    expect(weatherCodeToKey(63)).toBe("rain");
    expect(weatherCodeToKey(75)).toBe("snow");
    expect(weatherCodeToKey(82)).toBe("rain");
    expect(weatherCodeToKey(86)).toBe("snow");
    expect(weatherCodeToKey(95)).toBe("storm");
  });
});
