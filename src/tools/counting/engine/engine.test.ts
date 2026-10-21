import { describe, expect, it } from "vitest";
import { seededRng, type Card, type Rank } from "../../blackjack/engine/cards";
import { finishDealer } from "../../blackjack/engine/round";
import { c as make } from "../../blackjack/engine/testUtils";
import { betFor } from "./betting";
import { advise, basicCell, DEVIATIONS } from "./deviations";
import { decisionLabel, deviationRule, whyBet, whyCount, whyPlay } from "./explain";
import { countCards, decksLeft, fmtCount, fmtDecks, hiLo, trueCount } from "./hilo";
import {
  act,
  CUT_CARD,
  liveRunning,
  newSession,
  nextHand,
  placeBet,
  submitCount,
  visibleCards,
  type Session,
} from "./session";

const c = (...ranks: string[]) => make(...(ranks as Rank[]));
const up = (rank: string) => c(rank)[0];

/** A session whose shoe deals these cards first (you, dealer up, you, dealer hole, …), then 7s (which count 0). */
function sessionWith(order: string[], running = 0, filler = 300): Session {
  const shoe: Card[] = [...c(...order), ...c(...Array(filler).fill("7"))];
  return { ...newSession(seededRng(1)), shoe, running };
}

describe("Hi-Lo", () => {
  it("counts 2–6 up, 7–9 level, 10s and Aces down", () => {
    expect(["2", "3", "4", "5", "6"].map((r) => hiLo(r as Rank))).toEqual([1, 1, 1, 1, 1]);
    expect(["7", "8", "9"].map((r) => hiLo(r as Rank))).toEqual([0, 0, 0]);
    expect(["10", "J", "Q", "K", "A"].map((r) => hiLo(r as Rank))).toEqual([-1, -1, -1, -1, -1]);
    expect(countCards(c("2", "K", "5", "A", "8", "3"))).toBe(1);
  });

  it("sums to zero over a full shoe", () => {
    expect(countCards(newSession(seededRng(3)).shoe)).toBe(0);
  });

  it("divides by decks left to the nearest half deck, rounding toward zero", () => {
    expect(decksLeft(312)).toBe(6);
    expect(decksLeft(120)).toBe(2.5); // 2.3 decks → 2½
    expect(decksLeft(10)).toBe(0.5);
    expect(trueCount(7, 182)).toBe(2); // 7 ÷ 3½
    expect(trueCount(-5, 104)).toBe(-2); // −5 ÷ 2 = −2.5 → −2
    expect(trueCount(-1, 208)).toBe(0);
    expect(Object.is(trueCount(-1, 208), -0)).toBe(false);
    expect(fmtCount(-3)).toBe("−3");
    expect(fmtDecks(4.5)).toBe("4½");
    expect(fmtDecks(0.5)).toBe("½");
  });
});

describe("bet ramp", () => {
  it("bets the minimum until +2, then spreads to 8", () => {
    expect([-3, 0, 1, 2, 3, 4, 5, 9].map(betFor)).toEqual([1, 1, 1, 2, 4, 6, 8, 8]);
  });
});

describe("count plays", () => {
  it("has basic strategy as one side of every deviation", () => {
    for (const v of DEVIATIONS) {
      const basic = basicCell(v);
      expect([v.atOrAbove, v.below], deviationRule(v)).toContain(basic);
    }
  });

  it("stands 16 vs 10 at 0 or more, hits below", () => {
    const s = { cards: c("10", "6"), dealerUp: up("K"), canDouble: true, canSplit: false };
    expect(advise(s, 0).rec.action).toBe("stand");
    expect(advise(s, 0).deviates).toBe(true);
    expect(advise(s, -1).rec.action).toBe("hit");
    expect(advise(s, -1).deviation).toBeDefined();
  });

  it("hits 12 vs 4 below 0", () => {
    const s = { cards: c("10", "2"), dealerUp: up("4"), canDouble: true, canSplit: false };
    expect(advise(s, -1).rec.action).toBe("hit");
    expect(advise(s, 0).rec.action).toBe("stand");
  });

  it("splits 10s vs 6 at +4", () => {
    const s = { cards: c("K", "Q"), dealerUp: up("6"), canDouble: true, canSplit: true };
    expect(advise(s, 4).rec.action).toBe("split");
    expect(advise(s, 3).rec.action).toBe("stand");
  });

  it("can't double a three-card 10, even at a high count", () => {
    const s = { cards: c("4", "3", "3"), dealerUp: up("10"), canDouble: false, canSplit: false };
    const a = advise(s, 6);
    expect(a.rec.action).toBe("hit");
    expect(a.deviates).toBe(false);
  });

  it("leaves other spots to basic strategy", () => {
    const s = { cards: c("10", "7"), dealerUp: up("9"), canDouble: true, canSplit: false };
    expect(advise(s, 8).deviation).toBeUndefined();
    expect(advise(s, 8).rec.action).toBe("stand");
  });
});

describe("a session", () => {
  it("bets off the true count, then grades plays at the live count", () => {
    // Running +7 with 6 decks left → true +1 → 1 unit.
    let s = sessionWith(["10", "K", "6", "9"], 7);
    s = placeBet(s, 4);
    expect(s.decisions[0]).toMatchObject({ kind: "bet", chosen: 4, right: 1, tc: 1, correct: false });
    expect(s.round!.hands[0].bet).toBe(4);
    // Visible: 10, K, 6 → −1. Live running +6, still true +1: 16 vs 10 stands at 0 or more.
    expect(liveRunning(s)).toBe(6);
    s = act(s, "hit");
    const d = s.decisions[1];
    expect(d.kind === "play" && d.advice.deviates).toBe(true);
    expect(d.correct).toBe(false);
  });

  it("carries the count into the next hand and checks it", () => {
    let s = sessionWith(["10", "5", "9", "6"]);
    s = placeBet(s, 1);
    s = act(s, "stand"); // 19 vs 5: stand
    s = { ...s, round: finishDealer(s.round!) };
    const shown = visibleCards(s.round!);
    s = nextHand(s, true);
    expect(s.phase).toBe("count");
    expect(s.running).toBe(countCards(shown));
    s = submitCount(s, s.running);
    expect(s.decisions[0]).toMatchObject({ kind: "count", correct: true });
    expect(s.phase).toBe("bet");
  });

  it("skips the count check when asked not to", () => {
    let s = placeBet(sessionWith(["10", "5", "9", "6"]), 1);
    s = act(s, "stand");
    s = { ...s, round: finishDealer(s.round!) };
    expect(nextHand(s, false).phase).toBe("bet");
  });

  it("reshuffles at the cut card", () => {
    let s = sessionWith(["10", "5", "9", "6"], 3, CUT_CARD - 10);
    s = placeBet(s, 1);
    s = act(s, "stand");
    s = { ...s, round: finishDealer(s.round!) };
    s = nextHand(s, true);
    expect(s.shuffled).toBe(true);
    expect(s.running).toBe(0);
    expect(s.shoe).toHaveLength(312);
    expect(s.phase).toBe("bet");
  });
});

describe("explanations", () => {
  it("explains each kind of call", () => {
    let s = sessionWith(["10", "K", "6", "9"], 7);
    s = placeBet(s, 1);
    const bet = s.decisions[0];
    if (bet.kind === "bet") expect(whyBet(bet)).toContain("+7 ÷ 6 decks left → +1");
    s = act(s, "stand");
    const play = s.decisions[1];
    if (play.kind === "play") {
      expect(whyPlay(play)).toContain("16 vs 10: stand at 0 or more");
      expect(decisionLabel(play)).toBe("Hard 16 vs 10 (count play)");
    }
    expect(
      whyCount({ kind: "count", answer: 2, actual: 3, correct: false, lastHand: c("2", "3", "K", "9") }),
    ).toContain("running count is +3");
  });
});
