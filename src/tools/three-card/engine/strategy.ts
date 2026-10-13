/**
 * The whole strategy: play Q-6-4 or better, fold anything worse.
 *
 * Rather than just trusting the rule, analyze() counts out every hand the
 * dealer could hold from the 49 cards you can't see (18,424 of them) and
 * works out exactly what playing is worth. Folding always costs exactly your
 * ante, so the right move is whichever loses less.
 */
import { buildShoe, type Card } from "../../blackjack/engine/cards";
import { compare, evaluate, evaluateValues, qualifies, type HandValue } from "./hand";
import { ANTE_BONUS } from "./paytable";

export type Action = "play" | "fold";

/** Weakest hand worth playing. */
export const THRESHOLD = evaluateValues([12, 6, 4], false);

export const shouldPlay = (hand: HandValue) => hand.score >= THRESHOLD.score;
export const recommend = (hand: HandValue): Action => (shouldPlay(hand) ? "play" : "fold");

/** Folding gives up the ante — no more, no less. */
export const FOLD_EV = -1;

export interface Analysis {
  hand: HandValue;
  action: Action;
  /** Average result of playing, in antes (the play bet is 1 more ante). */
  playEv: number;
  foldEv: number;
  /** What the wrong move costs per hand, in antes. */
  edge: number;
  /** Shares of the dealer's possible hands (0–1). */
  dealerFails: number;
  win: number;
  lose: number;
  tie: number;
}

const DECK = buildShoe(1);
const memo = new Map<string, Analysis>();
const key = (cards: Card[]) =>
  cards
    .map((c) => `${c.rank}${c.suit[0]}`)
    .sort()
    .join();

export function analyze(cards: Card[]): Analysis {
  const k = key(cards);
  const hit = memo.get(k);
  if (hit) return hit;

  const hand = evaluate(cards);
  const gone = new Set(cards.map((c) => `${c.rank}${c.suit}`));
  const rest = DECK.filter((c) => !gone.has(`${c.rank}${c.suit}`));

  const bonus = ANTE_BONUS[hand.category] ?? 0;
  let n = 0;
  let total = 0;
  let fails = 0;
  let win = 0;
  let lose = 0;
  let tie = 0;
  for (let i = 0; i < rest.length; i++)
    for (let j = i + 1; j < rest.length; j++)
      for (let m = j + 1; m < rest.length; m++) {
        const d = evaluate([rest[i], rest[j], rest[m]]);
        n++;
        if (!qualifies(d)) {
          fails++;
          total += 1 + bonus; // ante wins, play pushes
          continue;
        }
        const r = compare(hand, d);
        if (r === "win") {
          win++;
          total += 2 + bonus;
        } else if (r === "lose") {
          lose++;
          total += -2 + bonus;
        } else {
          tie++;
          total += bonus;
        }
      }

  const playEv = total / n;
  const action: Action = playEv > FOLD_EV ? "play" : "fold";
  const result: Analysis = {
    hand,
    action,
    playEv,
    foldEv: FOLD_EV,
    edge: Math.abs(playEv - FOLD_EV),
    dealerFails: fails / n,
    win: win / n,
    lose: lose / n,
    tie: tie / n,
  };
  memo.set(k, result);
  return result;
}
