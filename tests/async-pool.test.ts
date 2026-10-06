import { describe, expect, it } from "vitest";
import { mapWithLimit } from "@/lib/async-pool";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("mapWithLimit", () => {
  it("keeps the input order whatever finishes first", async () => {
    const out = await mapWithLimit([30, 5, 15], 2, async (ms, index) => {
      await sleep(ms);
      return index;
    });
    expect(out).toEqual([0, 1, 2]);
  });

  it("never runs more than the limit at once", async () => {
    let active = 0;
    let peak = 0;
    await mapWithLimit(Array.from({ length: 20 }, (_, i) => i), 6, async () => {
      active++;
      peak = Math.max(peak, active);
      await sleep(5);
      active--;
    });
    expect(peak).toBe(6);
  });

  it("handles an empty list", async () => {
    expect(await mapWithLimit([], 6, async () => 1)).toEqual([]);
  });
});
