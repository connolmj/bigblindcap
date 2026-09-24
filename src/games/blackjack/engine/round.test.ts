import { describe, expect, test } from "vitest";
import { handTotal } from "./hand";
import { applyAction, finishDealer, legalActions, startRound } from "./round";
import { stack } from "./testUtils";

describe("naturals", () => {
  test("player blackjack pays 3:2 and ends the round", () => {
    const s = startRound(stack(["A", "K"], ["9", "7"]));
    expect(s.phase).toBe("settled");
    expect(s.natural).toBe("player");
    expect(s.net).toBe(1.5);
  });
  test("dealer peeks with a 10 up and takes the hand", () => {
    const s = startRound(stack(["10", "8"], ["K", "A"]));
    expect(s.phase).toBe("settled");
    expect(s.natural).toBe("dealer");
    expect(s.net).toBe(-1);
  });
  test("both blackjack is a push", () => {
    const s = startRound(stack(["A", "Q"], ["A", "J"]));
    expect(s.natural).toBe("both");
    expect(s.net).toBe(0);
  });
});

describe("playing a hand out", () => {
  test("hit then stand, dealer draws to 17+", () => {
    // You: 10,2 → hit 5 → 17. Dealer: 6,10 = 16 → draws 3 → 19.
    let s = startRound(stack(["10", "2"], ["6", "10"], "5", "3"));
    s = applyAction(s, "hit");
    expect(handTotal(s.hands[0].cards).total).toBe(17);
    expect(s.phase).toBe("player");
    s = applyAction(s, "stand");
    expect(s.phase).toBe("dealer");
    s = finishDealer(s);
    expect(handTotal(s.dealer).total).toBe(19);
    expect(s.hands[0].outcome).toBe("lose");
    expect(s.net).toBe(-1);
  });

  test("dealer stands on soft 17", () => {
    let s = startRound(stack(["10", "8"], ["A", "6"]));
    s = finishDealer(applyAction(s, "stand"));
    expect(s.dealer).toHaveLength(2);
    expect(s.hands[0].outcome).toBe("win");
  });

  test("busting ends the round without the dealer drawing", () => {
    let s = startRound(stack(["10", "6"], ["10", "7"], "K"));
    s = applyAction(s, "hit");
    expect(s.phase).toBe("settled");
    expect(s.dealer).toHaveLength(2);
    expect(s.net).toBe(-1);
  });

  test("hitting to 21 finishes the hand automatically", () => {
    let s = startRound(stack(["10", "6"], ["9", "7"], "5"));
    s = applyAction(s, "hit");
    expect(s.phase).toBe("dealer");
  });

  test("double takes exactly one card and doubles the bet", () => {
    let s = startRound(stack(["6", "5"], ["6", "10"], "9", "10"));
    s = applyAction(s, "double");
    expect(s.hands[0].cards).toHaveLength(3);
    expect(s.hands[0].bet).toBe(2);
    s = finishDealer(s);
    expect(s.net).toBe(2); // 20 vs dealer bust (6+10+10)
  });

  test("you can't double after hitting", () => {
    let s = startRound(stack(["2", "3"], ["6", "10"], "4"));
    s = applyAction(s, "hit");
    expect(legalActions(s).double).toBe(false);
  });
});

describe("splitting", () => {
  test("8,8 splits into two hands played in order", () => {
    // Split 8s: first hand gets 3 (11), second gets 10 (18).
    let s = startRound(stack(["8", "8"], ["6", "10"], "3", "10", "9", "5"));
    s = applyAction(s, "split");
    expect(s.hands).toHaveLength(2);
    expect(s.active).toBe(0);
    // Double after split is allowed
    expect(legalActions(s).double).toBe(true);
    s = applyAction(s, "double"); // 8,3 + 9 = 20
    expect(s.active).toBe(1);
    s = applyAction(s, "stand"); // 8,10 = 18
    s = finishDealer(s); // 6,10 + 5 = 21
    expect(handTotal(s.dealer).total).toBe(21);
    expect(s.net).toBe(-3);
  });

  test("split Aces get one card each and the hand ends", () => {
    let s = startRound(stack(["A", "A"], ["9", "7"], "K", "5"));
    s = applyAction(s, "split");
    expect(s.phase).toBe("dealer");
    s = finishDealer(s);
    // A,K after a split is 21, not blackjack: pays 1:1
    expect(s.hands[0].outcome).toBe("win");
    expect(s.hands[0].net).toBe(1);
    expect(s.hands[1].outcome).toBe("lose"); // soft 16 vs 16... dealer 9,7 = 16 draws 2 → 18
  });

  test("no more than 4 hands", () => {
    let s = startRound(stack(["8", "8"], ["6", "10"], "8", "8", "8", "8", "8", "8"));
    s = applyAction(s, "split");
    s = applyAction(s, "split");
    s = applyAction(s, "split");
    expect(s.hands).toHaveLength(4);
    expect(legalActions(s).split).toBe(false);
  });
});

test("every decision is graded against basic strategy", () => {
  let s = startRound(stack(["10", "6"], ["10", "7"], "2", "9"));
  s = applyAction(s, "stand"); // wrong: 16 vs 10 is a hit
  expect(s.decisions).toHaveLength(1);
  expect(s.decisions[0].correct).toBe(false);
  expect(s.decisions[0].recommendation.action).toBe("hit");
});
