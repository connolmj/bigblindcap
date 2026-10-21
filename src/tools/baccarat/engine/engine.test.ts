import { describe, expect, it } from "vitest";
import { betNote, stepText, whyDraw } from "./explain";
import { cardPoints, isNatural, total } from "./hand";
import { parseCards as c } from "./notation";
import { bestBet, betReturn, exactOdds, payout } from "./payouts";
import { currentSpot, drawStep, finish, placeBet, startRound } from "./round";
import { bankerDraws, correctDraw, playerDraws } from "./rules";

/** A shoe whose deal order is Player, Banker, Player, Banker, then the rest. */
const shoe = (player: [string, string], banker: [string, string], ...rest: string[]) =>
  c(player[0], banker[0], player[1], banker[1], ...rest, ...Array(10).fill("2"));

describe("hand values", () => {
  it("counts only the last digit", () => {
    expect(cardPoints("K")).toBe(0);
    expect(cardPoints("A")).toBe(1);
    expect(total(c("7", "8"))).toBe(5);
    expect(total(c("K", "9"))).toBe(9);
    expect(isNatural(c("4", "4"))).toBe(true);
    expect(isNatural(c("4", "3", "A"))).toBe(false);
  });
});

describe("drawing rules", () => {
  it("has the Player draw on 0–5", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(playerDraws)).toEqual([true, true, true, true, true, true, false, false]);
  });

  it("matches the Banker tableau", () => {
    // Rows: Banker total 0–7. Columns: Player's third card 0–9. 1 = draw.
    const tableau = [
      "1111111111",
      "1111111111",
      "1111111111",
      "1111111101",
      "0011111100",
      "0000111100",
      "0000001100",
      "0000000000",
    ];
    tableau.forEach((row, total) =>
      [...row].forEach((cell, third) => expect(bankerDraws(total, third), `B${total} v ${third}`).toBe(cell === "1")),
    );
  });

  it("has the Banker play the Player's rule when the Player stands", () => {
    expect(bankerDraws(5, null)).toBe(true);
    expect(bankerDraws(6, null)).toBe(false);
    expect(correctDraw({ side: "banker", total: 3, playerThird: 8 })).toBe("stand");
  });
});

describe("exact odds (8 decks)", () => {
  it("gives the published probabilities and house edges", () => {
    const o = exactOdds();
    expect(o.banker + o.player + o.tie).toBeCloseTo(1, 10);
    expect(o.banker).toBeCloseTo(0.458597, 6);
    expect(o.player).toBeCloseTo(0.446247, 6);
    expect(o.tie).toBeCloseTo(0.095156, 6);
    expect(betReturn("banker", "standard")).toBeCloseTo(-0.01058, 5);
    expect(betReturn("player", "standard")).toBeCloseTo(-0.01235, 5);
    expect(betReturn("tie", "standard")).toBeCloseTo(-0.1436, 4);
    expect(betReturn("banker", "none")).toBeCloseTo(-0.01458, 5);
  });

  it("makes Banker best with commission, Player best without", () => {
    expect(bestBet("standard")).toBe("banker");
    expect(bestBet("none")).toBe("player");
  });
});

describe("payout", () => {
  it("pays each bet", () => {
    expect(payout("banker", "banker", 7, "standard")).toBe(0.95);
    expect(payout("banker", "banker", 6, "none")).toBe(0.5);
    expect(payout("banker", "banker", 7, "none")).toBe(1);
    expect(payout("player", "player", 0, "standard")).toBe(1);
    expect(payout("player", "tie", 0, "standard")).toBe(0);
    expect(payout("tie", "tie", 0, "standard")).toBe(8);
    expect(payout("tie", "banker", 0, "standard")).toBe(-1);
  });
});

describe("a round", () => {
  it("settles straight away on a natural", () => {
    const r = placeBet(startRound(shoe(["4", "5"], ["K", "7"]), "standard"), "player");
    expect(r.phase).toBe("settled");
    expect(r.natural).toBe(true);
    expect(r.winner).toBe("player");
    expect(r.net).toBe(1);
    expect(r.steps).toEqual([{ kind: "natural", side: "player", player: 9, banker: 7 }]);
  });

  it("plays each third card by the rule", () => {
    // Player 2+3 = 5, Banker K+5 = 5. Player draws a 4 → 9; Banker 5 vs 4 draws a 3 → 8.
    let r = placeBet(startRound(shoe(["2", "3"], ["K", "5"], "4", "3"), "standard"), "banker");
    expect(currentSpot(r)).toEqual({ side: "player", total: 5, playerThird: null });
    r = drawStep(r);
    expect(r.player).toHaveLength(3);
    expect(r.steps[0]).toMatchObject({ kind: "draw", action: "draw", spot: { side: "player", total: 5 } });
    expect(currentSpot(r)).toEqual({ side: "banker", total: 5, playerThird: 4 });
    r = drawStep(r);
    expect(r.banker).toHaveLength(3);
    expect(r.phase).toBe("settled");
    expect(total(r.player)).toBe(9);
    expect(total(r.banker)).toBe(8);
    expect(r.net).toBe(-1);
  });

  it("stands when the rule says so", () => {
    // Player 6 stands; Banker 5 with Player standing draws.
    const r = finish(placeBet(startRound(shoe(["3", "3"], ["K", "5"], "2"), "standard"), "player"));
    expect(r.steps.map((s) => s.kind === "draw" && s.action)).toEqual(["stand", "draw"]);
    expect(r.player).toHaveLength(2);
    expect(total(r.banker)).toBe(7);
  });
});

describe("explanations", () => {
  it("names the rule", () => {
    expect(whyDraw({ side: "banker", total: 3, playerThird: 8 }, "stand")).toContain(
      "unless the Player's third card is an 8",
    );
    expect(betNote("player", "none")).toContain("lowest on this table");
    expect(betNote("tie", "standard")).toContain("8 to 1");
    expect(
      stepText({ kind: "draw", spot: { side: "player", total: 4, playerThird: null }, action: "draw", card: c("K")[0] })
        .title,
    ).toBe("Player 4 — draws a K (counts 0)");
  });
});
