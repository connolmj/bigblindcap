import { describe, expect, test } from "vitest";
import { buildSurvivorData } from "./build";
import { estimatePickShares } from "./pickpct";
import { bestPlan, futureValues, hungarian, type WinTable } from "./plan";
import { fitRatings, projectSpread } from "./ratings";
import { moneylineToHomeWin, normalCdf, spreadToWin } from "./winprob";

describe("win probability", () => {
  test("normal CDF", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1)).toBeCloseTo(0.1587, 3);
  });
  test("a 7-point favourite wins about 72%", () => {
    expect(spreadToWin(7)).toBeCloseTo(0.724, 2);
  });
  test("moneylines with the margin removed", () => {
    // -325 / +260 → 76.5% and 27.8% implied (includes margin) → 73.4% home
    expect(moneylineToHomeWin(-325, 260)).toBeCloseTo(0.734, 3);
  });
});

describe("ratings", () => {
  test("recover ratings from consistent lines", () => {
    const truth: Record<string, number> = { A: 6, B: 2, C: -3, D: -5 };
    const hfa = 2;
    const teams = Object.keys(truth);
    const lines = [];
    for (const h of teams)
      for (const a of teams)
        if (h !== a) lines.push({ home: h, away: a, week: 1, neutral: false, spread: hfa + truth[h] - truth[a] });
    const r = fitRatings(teams, lines, { decay: 0, latestWeek: 1 });
    expect(r.hfa).toBeCloseTo(2, 1);
    for (const t of teams) expect(r.ratings[t]).toBeCloseTo(truth[t], 1);
    expect(projectSpread(r, "D", "A", true)).toBeCloseTo(-11, 1);
  });
});

test("pick shares sum to 1 and favour favourites", () => {
  const s = estimatePickShares({ A: 0.85, B: 0.7, C: 0.5, D: 0.3 });
  expect(Object.values(s).reduce((x, y) => x + y, 0)).toBeCloseTo(1, 6);
  expect(s.A).toBeGreaterThan(s.B);
  expect(s.D).toBeLessThan(0.01);
});

describe("planning", () => {
  test("hungarian finds the cheapest assignment", () => {
    // Greedy would take (0,0)=1 then (1,1)=10 → 11; best is 2+3 = 5.
    expect(
      hungarian([
        [1, 2, 9],
        [3, 10, 9],
      ]),
    ).toEqual([1, 0]);
  });

  // Two weeks, three teams. A is great in both weeks, B only in week 2.
  const win: WinTable = {
    1: { A: 0.9, B: 0.55, C: 0.7 },
    2: { A: 0.85, B: 0.88, C: 0.6 },
  };

  test("saves a team for the week it's needed", () => {
    const plan = bestPlan(win, [1, 2], ["A", "B", "C"], new Set());
    expect(plan.picks).toEqual({ 1: "A", 2: "B" });
    expect(plan.survival).toBeCloseTo(0.9 * 0.88, 6);
  });

  test("respects teams already used", () => {
    const plan = bestPlan(win, [1, 2], ["A", "B", "C"], new Set(["A"]));
    expect(plan.picks).toEqual({ 1: "C", 2: "B" });
  });

  test("byes can't be picked", () => {
    const plan = bestPlan({ 1: { A: 0.9 }, 2: { B: 0.6 } }, [1, 2], ["A", "B"], new Set());
    expect(plan.picks).toEqual({ 1: "A", 2: "B" });
  });

  test("future value is high for a team you'll need later", () => {
    const fv = futureValues(win, 1, 2, ["A", "B", "C"], new Set());
    // Week 2 without B falls back to A (0.85), without A still B (0.88).
    expect(fv.B).toBeGreaterThan(fv.C);
    expect(fv.A).toBe(0);
  });
});

test("builds a season from nflverse-style rows", () => {
  const csv = [
    "season,game_type,week,gameday,gametime,away_team,home_team,location,spread_line,home_moneyline,away_moneyline,home_score,away_score",
    "2025,REG,1,2025-09-07,13:00,MIA,BUF,Home,7,-320,260,30,10",
    "2026,REG,1,2026-09-13,13:00,MIA,BUF,Home,6.5,-300,245,,",
    "2026,REG,2,2026-09-20,13:00,BUF,MIA,Home,,,,,",
  ].join("\n");
  const d = buildSurvivorData(csv, "2026-09-25T00:00:00Z");
  expect(d.season).toBe(2026);
  expect(d.lastMarketWeek).toBe(1);
  const [w1, w2] = d.weeks;
  expect(w1.games[0].line).toBe("market");
  expect(w1.games[0].homeWin).toBeCloseTo(0.721, 3); // -300 / +245, margin removed
  expect(w2.games[0].line).toBe("projected");
  expect(w2.games[0].spread).toBeLessThan(0); // BUF is better, so the away team is favoured
  expect(w1.games[0].homePick + w1.games[0].awayPick).toBeCloseTo(1, 2);
});
