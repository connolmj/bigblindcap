import { describe, expect, it } from "vitest";
import { CATEGORY_COUNTS, PAIR_PLUS, pairPlusReturn, TOTAL_HANDS } from "./paytable";

describe("paytables", () => {
  it("counts every 3-card hand", () => {
    expect(TOTAL_HANDS).toBe(22100);
    expect(CATEGORY_COUNTS).toEqual({
      straightFlush: 48,
      trips: 52,
      straight: 720,
      flush: 1096,
      pair: 3744,
      high: 16440,
    });
  });

  it("gives the published Pair Plus house edges", () => {
    expect(pairPlusReturn(PAIR_PLUS["1-4-6-30-40"])).toBeCloseTo(-0.0232, 4);
    expect(pairPlusReturn(PAIR_PLUS["1-3-6-30-40"])).toBeCloseTo(-0.0728, 4);
  });
});
