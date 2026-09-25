import { describe, expect, test } from "vitest";
import { describeTotal, handTotal, isNatural, isPair } from "./hand";
import { c } from "./testUtils";

describe("handTotal", () => {
  test("counts face cards as 10", () => {
    expect(handTotal(c("K", "Q"))).toEqual({ total: 20, soft: false });
  });
  test("an Ace is 11 when it fits (soft)", () => {
    expect(handTotal(c("A", "7"))).toEqual({ total: 18, soft: true });
  });
  test("an Ace drops to 1 to avoid busting (hard)", () => {
    expect(handTotal(c("A", "7", "9"))).toEqual({ total: 17, soft: false });
  });
  test("two Aces are soft 12", () => {
    expect(handTotal(c("A", "A"))).toEqual({ total: 12, soft: true });
  });
  test("bust", () => {
    expect(handTotal(c("10", "6", "8")).total).toBe(24);
  });
});

test("isNatural", () => {
  expect(isNatural(c("A", "K"))).toBe(true);
  expect(isNatural(c("A", "5", "5"))).toBe(false);
});

test("isPair treats all 10-value cards as a pair", () => {
  expect(isPair(c("8", "8"))).toBe(true);
  expect(isPair(c("K", "Q"))).toBe(true);
  expect(isPair(c("9", "8"))).toBe(false);
});

test("describeTotal", () => {
  expect(describeTotal(c("A", "6"))).toBe("Soft 17");
  expect(describeTotal(c("10", "6"))).toBe("16");
  expect(describeTotal(c("A", "Q"))).toBe("Blackjack");
});
