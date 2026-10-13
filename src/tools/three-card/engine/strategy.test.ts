import { describe, expect, it } from "vitest";
import { buildShoe, seededRng, shuffle } from "../../blackjack/engine/cards";
import { evaluate } from "./hand";
import { analyze, recommend } from "./strategy";
import { parseCards as h } from "./notation";

describe("analyze", () => {
  it("puts Q-6-4 just over the line and Q-6-3 just under", () => {
    const q64 = analyze(h("Qs", "6h", "4d"));
    expect(q64.action).toBe("play");
    expect(q64.playEv).toBeGreaterThan(-1);
    expect(q64.playEv).toBeLessThan(-0.99);

    const q63 = analyze(h("Qs", "6h", "3d"));
    expect(q63.action).toBe("fold");
    expect(q63.playEv).toBeLessThan(-1);
  });

  it("splits the dealer's hands into fails, wins, losses and ties", () => {
    const a = analyze(h("Ks", "9h", "4d"));
    expect(a.dealerFails + a.win + a.lose + a.tie).toBeCloseTo(1, 10);
    expect(a.dealerFails).toBeGreaterThan(0.28);
    expect(a.dealerFails).toBeLessThan(0.32);
  });

  it("never lets Jack-high beat a qualifying dealer", () => {
    const a = analyze(h("Js", "9h", "7d"));
    expect(a.win).toBe(0);
    expect(a.action).toBe("fold");
  });

  it("agrees with the Q-6-4 rule on random hands", () => {
    // Every hand is checked by scripts/check-three-card.ts; this is a fast sample.
    const rng = seededRng(7);
    for (let i = 0; i < 120; i++) {
      const cards = shuffle(buildShoe(1), rng).slice(0, 3);
      expect(analyze(cards).action).toBe(recommend(evaluate(cards)));
    }
  });
});
