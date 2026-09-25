import { expect, test } from "vitest";
import type { Rank } from "./cards";
import { handTotal } from "./hand";
import { explain, hitBustChance } from "./explain";
import { recommend, DEALER_UPCARDS } from "./strategy";
import { c, one } from "./testUtils";

test("hitBustChance", () => {
  expect(hitBustChance(11)).toBe(0);
  expect(hitBustChance(12)).toBe(31);
  expect(hitBustChance(16)).toBe(62);
});

test("every chart cell produces an explanation", () => {
  const hands: Rank[][] = [];
  const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10"];
  for (const a of ranks) for (const b of ranks) hands.push([a, b]);
  for (const r of ranks) hands.push(["A", r]);
  hands.push(["A", "A"], ["2", "3", "4"], ["A", "2", "3"]);
  for (const hand of hands) {
    for (const up of DEALER_UPCARDS) {
      const upRank = (up === 11 ? "A" : String(up)) as Rank;
      const cards = c(...hand);
      const rec = recommend({ cards, dealerUp: one(upRank), canDouble: hand.length === 2, canSplit: true });
      const e = explain(rec, handTotal(cards).total);
      expect(e.why.length).toBeGreaterThan(20);
      expect(e.why).not.toMatch(/undefined|NaN/);
    }
  }
});
