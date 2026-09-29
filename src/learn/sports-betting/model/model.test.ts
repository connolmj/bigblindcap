import { describe, expect, test } from "vitest";
import { buildMargins, combineMargins, keyNumbers } from "./margins";
import { coinFlipParlay, fairOdds, impliedProb, profitOn100, riskToWin100, toDecimal, twoWay } from "./odds";

describe("American odds", () => {
  test("implied chance", () => {
    expect(impliedProb(-110)).toBeCloseTo(0.52381, 5);
    expect(impliedProb(-150)).toBeCloseTo(0.6, 10);
    expect(impliedProb(150)).toBeCloseTo(0.4, 10);
    expect(impliedProb(100)).toBeCloseTo(0.5, 10);
  });

  test("decimal, profit and risk", () => {
    expect(toDecimal(-110)).toBeCloseTo(1.90909, 5);
    expect(toDecimal(150)).toBeCloseTo(2.5, 10);
    expect(profitOn100(-200)).toBeCloseTo(50, 10);
    expect(profitOn100(250)).toBeCloseTo(250, 10);
    expect(riskToWin100(-110)).toBeCloseTo(110, 10);
    expect(riskToWin100(200)).toBeCloseTo(50, 10);
  });

  test("fair price from a chance", () => {
    expect(fairOdds(0.5)).toBeCloseTo(-100, 10);
    expect(fairOdds(0.6)).toBeCloseTo(-150, 10);
    expect(fairOdds(0.4)).toBeCloseTo(150, 10);
  });
});

describe("the vig", () => {
  test("−110 / −110", () => {
    const t = twoWay(-110, -110);
    expect(t.total).toBeCloseTo(1.047619, 6);
    expect(t.hold).toBeCloseTo(1 / 22, 10); // $10 kept of $220 bet
    expect(t.fair[0]).toBeCloseTo(0.5, 10);
  });

  test("an uneven line still splits to 100%", () => {
    const t = twoWay(-150, 130);
    expect(t.fair[0] + t.fair[1]).toBeCloseTo(1, 10);
    expect(t.hold).toBeGreaterThan(0);
  });

  test("parlays of −110 coin flips", () => {
    const one = coinFlipParlay(-110, 1);
    expect(one.ev).toBeCloseTo(-1 / 22, 10);
    const two = coinFlipParlay(-110, 2);
    expect(two.bookDecimal).toBeCloseTo(3.6446, 4); // about +264
    expect(two.fairDecimal).toBeCloseTo(4, 10); // +300
    const ten = coinFlipParlay(-110, 10);
    expect(ten.winChance).toBeCloseTo(1 / 1024, 10);
    expect(ten.ev).toBeCloseTo((21 / 22) ** 10 - 1, 10);
    expect(ten.ev).toBeLessThan(two.ev);
  });
});

describe("NFL margins", () => {
  const csv = [
    "game_id,season,result,home_score",
    "a,2020,-3,10",
    "b,2020,3,13",
    "c,2020,7,14",
    "d,2021,0,17",
    "e,2021,3,20",
    "f,2026,,",
  ].join("\n");

  test("counts finished games by absolute margin, per season", () => {
    const d = buildMargins(csv, "now");
    expect(d.seasons.map((s) => s.year)).toEqual([2020, 2021]);
    expect(d.seasons[0]).toEqual({ year: 2020, games: 3, counts: [0, 0, 0, 2, 0, 0, 0, 1] });
    expect(d.seasons[1]).toEqual({ year: 2021, games: 2, counts: [1, 0, 0, 1] });
  });

  test("combines seasons and ranks key numbers without ties", () => {
    const t = combineMargins(buildMargins(csv, "now").seasons, 2020, 2021);
    expect(t.games).toBe(5);
    expect(t.share[3]).toBeCloseTo(0.6, 10);
    expect(keyNumbers(t, 2)).toEqual([
      { margin: 3, share: 0.6 },
      { margin: 7, share: 0.2 },
    ]);
    expect(keyNumbers(t, 5).every((k) => k.margin > 0)).toBe(true);
  });
});
