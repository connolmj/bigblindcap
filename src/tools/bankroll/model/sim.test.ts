import { describe, expect, test } from "vitest";
import { binProfits, ticks } from "./bins";
import { breakEven, flatEdge, kelly, payout, probProfitFlat, roi, simulate, type SimInput } from "./sim";

const base: SimInput = {
  winRate: 0.56,
  odds: -110,
  bets: 100,
  bankroll: 1000,
  unit: 0.02,
  sizing: "flat",
  seasons: 20000,
  seed: 7,
};

describe("odds math", () => {
  test("payouts", () => {
    expect(payout(-110)).toBeCloseTo(0.9091, 4);
    expect(payout(150)).toBe(1.5);
    expect(payout(-200)).toBe(0.5);
  });
  test("break-even at -110 is 52.38%", () => {
    expect(breakEven(-110)).toBeCloseTo(0.5238, 4);
    expect(breakEven(100)).toBe(0.5);
  });
  test("56% at -110 returns about 6.9% per bet", () => {
    expect(roi(0.56, -110)).toBeCloseTo(0.0691, 3);
  });
  test("Kelly", () => {
    expect(kelly(0.56, -110)).toBeCloseTo(0.076, 3);
    expect(kelly(0.5, -110)).toBe(0);
  });
  test("exact chance of finishing ahead over 100 flat bets at 56%", () => {
    // Need 53+ wins of 100 at -110.
    const p = probProfitFlat(0.56, -110, 100);
    expect(p).toBeCloseTo(0.76, 2);
  });
});

describe("simulate", () => {
  test("same seed, same seasons", () => {
    const a = simulate(base);
    const b = simulate(base);
    expect(a.median).toBe(b.median);
    expect(a.pProfit).toBe(b.pProfit);
  });

  test("flat staking matches the binomial and the expected value", () => {
    const r = simulate(base);
    expect(r.pProfit).toBeCloseTo(probProfitFlat(0.56, -110, 100), 1);
    // EV = 100 bets × $20 × 6.9% ≈ +$138
    expect(r.mean - base.bankroll).toBeGreaterThan(115);
    expect(r.mean - base.bankroll).toBeLessThan(160);
    expect(r.pBust).toBe(0);
  });

  test("oversized bets go bust even with an edge", () => {
    const r = simulate({ ...base, unit: 0.25, bets: 500, seasons: 4000 });
    expect(r.pBust).toBeGreaterThan(0.2);
    expect(r.finals[0]).toBe(0);
  });

  test("percent staking never quite hits zero but can still fall below the bust line", () => {
    const r = simulate({ ...base, sizing: "percent", unit: 0.3, bets: 500, seasons: 4000 });
    expect(r.pBust).toBeGreaterThan(0.1);
    expect(r.finals[0]).toBeGreaterThan(0);
  });

  test("bands are ordered and sized to the checkpoints", () => {
    const r = simulate({ ...base, bets: 500, seasons: 4000 });
    expect(r.bands.p50.length).toBe(201);
    for (let i = 0; i < r.bands.p50.length; i++) {
      expect(r.bands.p5[i]).toBeLessThanOrEqual(r.bands.p25[i]);
      expect(r.bands.p25[i]).toBeLessThanOrEqual(r.bands.p50[i]);
      expect(r.bands.p50[i]).toBeLessThanOrEqual(r.bands.p75[i]);
      expect(r.bands.p75[i]).toBeLessThanOrEqual(r.bands.p95[i]);
    }
    expect(r.samples[0].length).toBe(501);
  });
});

describe("histogram bins", () => {
  test("every bar is all-win or all-loss, and every season lands in one", () => {
    const r = simulate(base);
    const profits = r.finals.map((f) => f - base.bankroll);
    const { edge, lattice } = flatEdge(-110, 100, 20);
    const bins = binProfits(profits, { edge, lattice });
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(base.seasons);
    for (const b of bins) expect(b.hi <= edge + 1e-6 || b.lo >= edge - 1e-6).toBe(true);
    // 53 wins at -110 with $20 bets is +$63.6; 52 wins is −$18.2. The edge sits between.
    expect(edge).toBeGreaterThan(-18.2);
    expect(edge).toBeLessThan(63.6);
    const ahead = bins.filter((b) => b.lo >= edge - 1e-6).reduce((s, b) => s + b.count, 0);
    expect(ahead / base.seasons).toBeCloseTo(r.pProfit, 6);
  });

  test("ticks", () => {
    expect(ticks(0, 1000, 5)).toEqual([0, 200, 400, 600, 800, 1000]);
    expect(ticks(-130, 260, 4)).toEqual([-100, 0, 100, 200]);
  });
});
