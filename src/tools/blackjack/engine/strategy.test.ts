import { describe, expect, test } from "vitest";
import type { Rank } from "./cards";
import { recommend, type Action } from "./strategy";
import { c, one } from "./testUtils";

const rec = (hand: Rank[], up: Rank, { canDouble = hand.length === 2, canSplit = true } = {}) =>
  recommend({ cards: c(...hand), dealerUp: one(up), canDouble, canSplit }).action;

// Well-known basic strategy spots (6D, S17, DAS, no surrender).
const cases: [Rank[], Rank, Action][] = [
  [["10", "6"], "10", "hit"],
  [["10", "6"], "6", "stand"],
  [["10", "2"], "2", "hit"],
  [["10", "2"], "3", "hit"],
  [["10", "2"], "4", "stand"],
  [["9", "4"], "2", "stand"],
  [["6", "5"], "10", "double"],
  [["6", "5"], "A", "hit"],
  [["6", "4"], "9", "double"],
  [["6", "4"], "10", "hit"],
  [["5", "4"], "2", "hit"],
  [["5", "4"], "3", "double"],
  [["10", "7"], "A", "stand"],
  [["A", "7"], "2", "stand"],
  [["A", "7"], "3", "double"],
  [["A", "7"], "7", "stand"],
  [["A", "7"], "9", "hit"],
  [["A", "7"], "A", "hit"],
  [["A", "6"], "2", "hit"],
  [["A", "6"], "3", "double"],
  [["A", "2"], "5", "double"],
  [["A", "2"], "4", "hit"],
  [["A", "4"], "4", "double"],
  [["A", "8"], "6", "stand"],
  [["A", "A"], "A", "split"],
  [["8", "8"], "10", "split"],
  [["10", "10"], "6", "stand"],
  [["K", "Q"], "5", "stand"],
  [["9", "9"], "7", "stand"],
  [["9", "9"], "8", "split"],
  [["9", "9"], "A", "stand"],
  [["5", "5"], "9", "double"],
  [["5", "5"], "10", "hit"],
  [["4", "4"], "5", "split"],
  [["4", "4"], "4", "hit"],
  [["2", "2"], "7", "split"],
  [["2", "2"], "8", "hit"],
  [["6", "6"], "6", "split"],
  [["6", "6"], "7", "hit"],
  [["7", "7"], "7", "split"],
  [["7", "7"], "8", "hit"],
];

describe("basic strategy", () => {
  test.each(cases)("%j vs %s → %s", (hand, up, action) => {
    expect(rec(hand, up)).toBe(action);
  });
});

describe("when doubling isn't allowed", () => {
  test("D becomes hit", () => {
    expect(rec(["2", "3", "6"], "6")).toBe("hit"); // hard 11, 3 cards
  });
  test("Ds becomes stand", () => {
    expect(rec(["A", "3", "4"], "4")).toBe("stand"); // soft 18, 3 cards
  });
});

describe("when splitting isn't allowed", () => {
  test("8,8 plays as hard 16", () => {
    expect(rec(["8", "8"], "10", { canSplit: false })).toBe("hit");
    expect(rec(["8", "8"], "6", { canSplit: false })).toBe("stand");
  });
  test("A,A plays as soft 12 and hits", () => {
    expect(rec(["A", "A"], "6", { canSplit: false })).toBe("hit");
  });
});

test("multi-card soft hands use the soft table", () => {
  expect(rec(["A", "2", "4"], "4")).toBe("hit"); // soft 17 vs 4 on 3 cards: D → hit
  expect(rec(["A", "2", "2"], "5")).toBe("hit"); // soft 15 vs 5: D → hit
});
