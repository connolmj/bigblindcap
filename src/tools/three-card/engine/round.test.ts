import { describe, expect, it } from "vitest";
import { decide, revealStep, settle, startRound } from "./round";
import { prepareDeck } from "./scenario";
import { parseCards as h } from "./notation";
import { seededRng } from "../../blackjack/engine/cards";
import { evaluate } from "./hand";

describe("settle", () => {
  it("costs the ante on a fold, but still pays Pair Plus", () => {
    const p = settle(h("8s", "8h", "2d"), h("As", "Kh", "3d"), "fold", "1-4-6-30-40");
    expect(p).toMatchObject({ ante: -1, play: 0, anteBonus: 0, pairPlus: 1, net: 0 });
  });

  it("pays the ante and pushes the play when the dealer doesn't qualify", () => {
    const p = settle(h("4s", "3h", "2d"), h("Js", "9h", "7d"), "play", null);
    expect(p).toMatchObject({ ante: 1, play: 0, anteBonus: 1, pairPlus: null, net: 2, dealerQualified: false });
  });

  it("pays both bets when you beat a qualifying dealer", () => {
    const p = settle(h("Ks", "Kh", "2d"), h("Qs", "9h", "7d"), "play", null);
    expect(p).toMatchObject({ ante: 1, play: 1, net: 2, result: "win" });
  });

  it("loses both bets to a better qualifying hand, but keeps the ante bonus", () => {
    const p = settle(h("7s", "7h", "7d"), h("2h", "3h", "4h"), "play", "1-3-6-30-40");
    expect(p).toMatchObject({ ante: -1, play: -1, anteBonus: 4, pairPlus: 30, net: 32, result: "lose" });
  });

  it("pushes a tie", () => {
    const p = settle(h("Qs", "6h", "4d"), h("Qh", "6d", "4c"), "play", null);
    expect(p).toMatchObject({ ante: 0, play: 0, net: 0, result: "tie" });
  });

  it("loses the Pair Plus bet on high card", () => {
    expect(settle(h("As", "9h", "4d"), h("2s", "5h", "7d"), "play", "1-4-6-30-40").pairPlus).toBe(-1);
  });
});

describe("a round", () => {
  it("deals, takes a decision, reveals three cards and settles", () => {
    let r = startRound([...h("Qs", "6h", "3d", "As", "Kh", "2c")], null);
    expect(r.phase).toBe("decide");
    r = decide(r, "play");
    expect(r.phase).toBe("reveal");
    expect(r.decision).toMatchObject({ chosen: "play", correct: false });
    r = revealStep(revealStep(r));
    expect(r.phase).toBe("reveal");
    r = revealStep(r);
    expect(r.phase).toBe("settled");
    expect(r.payout?.net).toBe(-2);
  });
});

describe("prepareDeck", () => {
  it("leans on Queen-high hands in close-calls mode", () => {
    const rng = seededRng(3);
    let queens = 0;
    for (let i = 0; i < 400; i++) {
      const v = evaluate(prepareDeck("focus", rng).slice(0, 3));
      if (v.category === "high" && v.ranks[0] === 12) queens++;
    }
    expect(queens / 400).toBeGreaterThan(0.25); // ~9% off a real deck
  });
});
