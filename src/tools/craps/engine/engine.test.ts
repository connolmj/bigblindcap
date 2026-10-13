import { describe, expect, it } from "vitest";
import { betMath, DEFAULT_RULES, lineWithOddsEdge, type Rules, type SpotId } from "./bets";
import type { Dice } from "./dice";
import { gradeBet } from "./grade";
import { newTable, placeChips, roll, undo } from "./table";

const R = DEFAULT_RULES;
const edge = (id: SpotId, rules: Rules = R) => betMath(id, rules).edge;

describe("house edges match the published numbers", () => {
  const cases: [SpotId, number, Rules?][] = [
    ["pass", 7 / 495],
    ["come", 7 / 495],
    ["dontPass", 3 / 220],
    ["dontCome", 3 / 220],
    ["comeOdds4", 0],
    ["dontComeOdds9", 0],
    ["place6", 1 / 66],
    ["place8", 1 / 66],
    ["place5", 0.04],
    ["place10", 1 / 15],
    ["buy4", 1 / 60],
    ["buy10", 0.05 / 1.05, { ...R, vig: "upfront" }],
    ["lay4", 1 / 60],
    ["lay10", 0.025 / 1.025, { ...R, vig: "upfront" }],
    ["field", 1 / 36],
    ["field", 2 / 36, { ...R, field12: 2 }],
    ["big6", 1 / 11],
    ["hard6", 1 / 11],
    ["hard4", 1 / 9],
    ["any7", 1 / 6],
    ["anyCraps", 1 / 9],
    ["yo", 1 / 9],
    ["aces", 5 / 36],
    ["aceDeuce", 1 / 9],
    ["horn", 0.125],
  ];
  for (const [id, want, rules] of cases) {
    it(`${id}${rules ? " (" + JSON.stringify(rules) + ")" : ""}`, () => expect(edge(id, rules)).toBeCloseTo(want, 9));
  }

  it("Pass with 3-4-5× odds is 0.374%, Don't with full lay odds 0.273%", () => {
    expect(lineWithOddsEdge(R, false)).toBeCloseTo(0.00374, 5);
    expect(lineWithOddsEdge(R, true)).toBeCloseTo(0.00273, 5);
  });

  it("a Pass Line bet takes 3.376 rolls on average", () => {
    expect(betMath("pass", R).rolls).toBeCloseTo(557 / 165, 9);
  });
});

describe("grading", () => {
  it("good bets are under the 2% line", () => {
    for (const id of ["pass", "dontPass", "place6", "buy4", "lay10"] as SpotId[])
      expect(gradeBet(id, null, R).good).toBe(true);
    for (const id of ["place5", "field", "big8", "hard6", "any7", "horn"] as SpotId[])
      expect(gradeBet(id, null, R).good).toBe(false);
  });

  it("points to the better bet and prices the gap", () => {
    const g = gradeBet("big6", 5, R);
    expect(g.better).toBe("place6");
    expect(g.costPer).toBeCloseTo(1 / 11 - 1 / 66, 9);
    expect(gradeBet("field", null, R).better).toBe("pass");
    expect(gradeBet("field", 6, R).better).toBe("come");
    expect(gradeBet("any7", 6, R).better).toBe("dontCome");
  });

  it("buying the 4 is only good when the vig is taken on wins", () => {
    expect(gradeBet("buy4", 6, { ...R, vig: "upfront" }).good).toBe(false);
    expect(gradeBet("place4", 6, R).better).toBe("buy4");
    expect(gradeBet("place4", 6, { ...R, vig: "upfront" }).better).toBe("come");
  });
});

const d = (a: number, b: number) => [a, b] as Dice;

describe("the table", () => {
  it("sets the point, takes odds, and pays them at true odds", () => {
    let s = placeChips(newTable(), "pass", 10, R);
    expect(placeChips(s, "come", 10, R)).toBe(s); // no Come bets on the come-out
    s = roll(s, d(2, 3), R);
    expect(s.point).toBe(5);
    expect(s.last?.event).toBe("pointSet");
    for (let i = 0; i < 6; i++) s = placeChips(s, "passOdds", 10, R);
    expect(s.bets.passOdds).toBe(40); // 4× on the 5
    s = roll(s, d(1, 4), R);
    expect(s.point).toBeNull();
    expect(s.last?.event).toBe("pointMade");
    expect(s.last?.net).toBe(10 + 60);
    expect(s.bets).toEqual({});
  });

  it("moves a Come bet to its number, and its odds are off on the come-out", () => {
    let s = roll(placeChips(newTable(), "pass", 5, R), d(3, 3), R); // point 6
    s = roll(placeChips(s, "come", 5, R), d(4, 4), R); // come → 8
    expect(s.bets.come8).toBe(5);
    s = placeChips(s, "comeOdds8", 5, R);
    s = roll(s, d(3, 3), R); // point made, now a come-out
    expect(s.point).toBeNull();
    s = roll(s, d(3, 4), R); // 7 on the come-out: come 8 loses, odds come back
    const byId = Object.fromEntries(s.last!.settlements.map((x) => [x.id, x]));
    expect(byId.come8.result).toBe("lose");
    expect(byId.comeOdds8.result).toBe("push");
  });

  it("Place 6 is sized in $6, stays up after a win, and is off on the come-out", () => {
    let s = placeChips(newTable(), "place6", 5, R);
    expect(s.bets.place6).toBe(6);
    s = roll(s, d(3, 3), R); // come-out 6: no action
    expect(s.last?.settlements).toEqual([]);
    s = roll(s, d(2, 4), R); // easy 6 with point on: wins 7
    expect(s.last?.net).toBe(7);
    expect(s.bets.place6).toBe(6);
  });

  it("hardways lose to the easy way", () => {
    let s = roll(newTable(), d(2, 2), R); // point 4
    s = roll(placeChips(s, "hard8", 5, R), d(5, 3), R);
    expect(s.last?.net).toBe(-5);
    s = roll(placeChips(s, "hard8", 5, R), d(4, 4), R);
    expect(s.last?.net).toBe(45);
  });

  it("charges upfront vig when the bet is made", () => {
    const rules: Rules = { ...R, vig: "upfront" };
    let s = roll(newTable(), d(2, 2), rules); // point 4
    s = roll(placeChips(s, "buy10", 20, rules), d(1, 1), rules);
    expect(s.last?.net).toBe(-1);
  });

  it("grades each bet once per roll however many chips go on it, and undo takes them back", () => {
    let s = placeChips(newTable(), "field", 5, R);
    s = placeChips(s, "field", 5, R);
    expect(s.pending).toHaveLength(1);
    expect(s.pending[0].amount).toBe(10);
    expect(s.pending[0].cost).toBeCloseTo(10 * (1 / 36 - 7 / 495), 9);
    s = undo(s);
    expect(s.bets.field).toBe(5);
    s = undo(s);
    expect(s.bets.field).toBeUndefined();
    expect(s.pending).toHaveLength(0);
  });

  it("undoing a flat bet takes its odds down too", () => {
    let s = roll(newTable(), d(3, 3), R);
    s = placeChips(s, "come", 5, R);
    s = roll(s, d(4, 5), R); // come → 9
    s = placeChips(s, "comeOdds9", 5, R);
    expect(s.bets.comeOdds9).toBe(5);
    s = undo(s);
    expect(s.bets.comeOdds9).toBeUndefined();
    expect(s.bets.come9).toBe(5);
  });
});
