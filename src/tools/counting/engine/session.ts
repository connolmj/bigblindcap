/**
 * A shoe of blackjack with the count, as plain data + pure functions, like
 * the Level 1 round.
 *
 *   (you give the running count) → you bet off the true count → you play the hand → next hand …
 *
 * One 6-deck shoe lasts many hands, so the count carries over. At the cut
 * card (about 75% dealt) the shoe is reshuffled and the count starts at 0.
 */
import { buildShoe, shuffle, type Card, type Rng } from "../../blackjack/engine/cards";
import {
  activeHand,
  applyAction,
  canDouble,
  canSplit,
  dealerStep,
  legalActions,
  startRound,
  type RoundState,
} from "../../blackjack/engine/round";
import { RULES } from "../../blackjack/engine/rules";
import type { Action } from "../../blackjack/engine/strategy";
import { betFor } from "./betting";
import { advise, type Advice } from "./deviations";
import { countCards, decksLeft, trueCount } from "./hilo";

/** Reshuffle once fewer than this many cards are left: 1½ decks, so 75% of the shoe is dealt. */
export const CUT_CARD = 78;

export type Phase = "count" | "bet" | "play";

export type Decision =
  | { kind: "count"; answer: number; actual: number; correct: boolean; lastHand: Card[] }
  | { kind: "bet"; chosen: number; right: number; running: number; cardsLeft: number; tc: number; correct: boolean }
  | {
      kind: "play";
      cards: Card[];
      dealerUp: Card;
      chosen: Action;
      advice: Advice;
      tc: number;
      correct: boolean;
    };

export interface Session {
  /** Cards not yet dealt. */
  shoe: Card[];
  /** Running count of every card from finished hands this shoe. */
  running: number;
  phase: Phase;
  /** The hand being played, or the one just finished (until the next deal). */
  round: RoundState | null;
  /** Hands dealt from this shoe so far. */
  hands: number;
  /** This hand's decisions, in order. */
  decisions: Decision[];
  /** Cards the last finished hand showed — what the count check asks about. */
  lastHand: Card[];
  /** True at the first hand of a fresh shoe. */
  shuffled: boolean;
}

export function newShoe(rng: Rng = Math.random): Card[] {
  return shuffle(buildShoe(RULES.decks), rng);
}

export function newSession(rng: Rng = Math.random): Session {
  return {
    shoe: newShoe(rng),
    running: 0,
    phase: "bet",
    round: null,
    hands: 0,
    decisions: [],
    lastHand: [],
    shuffled: true,
  };
}

/** Every face-up card in a hand (the dealer's hole card counts once it's turned over). */
export function visibleCards(round: RoundState): Card[] {
  const dealer = round.holeRevealed ? round.dealer : [round.dealer[0], ...round.dealer.slice(2)];
  return [...round.hands.flatMap((h) => h.cards), ...dealer];
}

/** Cards still in the shoe right now. */
export const cardsLeft = (s: Session) => (s.phase === "play" && s.round ? s.round.shoe.length : s.shoe.length);

/** The running count right now, including the hand on the table. */
export function liveRunning(s: Session): number {
  return s.running + (s.phase === "play" && s.round ? countCards(visibleCards(s.round)) : 0);
}

export const liveTrue = (s: Session) => trueCount(liveRunning(s), cardsLeft(s));
export const liveDecks = (s: Session) => decksLeft(cardsLeft(s));

export function submitCount(s: Session, answer: number): Session {
  if (s.phase !== "count") return s;
  const decision: Decision = {
    kind: "count",
    answer,
    actual: s.running,
    correct: answer === s.running,
    lastHand: s.lastHand,
  };
  return { ...s, phase: "bet", decisions: [decision] };
}

export function placeBet(s: Session, units: number): Session {
  if (s.phase !== "bet") return s;
  const tc = trueCount(s.running, s.shoe.length);
  const right = betFor(tc);
  const decision: Decision = {
    kind: "bet",
    chosen: units,
    right,
    running: s.running,
    cardsLeft: s.shoe.length,
    tc,
    correct: units === right,
  };
  return {
    ...s,
    phase: "play",
    round: startRound(s.shoe, units),
    hands: s.hands + 1,
    decisions: [...s.decisions, decision],
  };
}

/** Play the active hand. Graded against basic strategy plus the count plays at the true count you're at now. */
export function act(s: Session, action: Action): Session {
  const round = s.round;
  if (s.phase !== "play" || !round || !legalActions(round)[action]) return s;
  const hand = activeHand(round)!;
  const tc = liveTrue(s);
  const advice = advise(
    { cards: hand.cards, dealerUp: round.dealer[0], canDouble: canDouble(round), canSplit: canSplit(round) },
    tc,
  );
  const decision: Decision = {
    kind: "play",
    cards: hand.cards,
    dealerUp: round.dealer[0],
    chosen: action,
    advice,
    tc,
    correct: action === advice.rec.action,
  };
  return { ...s, round: applyAction(round, action, () => advice.rec), decisions: [...s.decisions, decision] };
}

/** One step of the dealer's turn. The UI calls this on a timer. */
export function stepDealer(s: Session): Session {
  if (!s.round || s.round.phase !== "dealer") return s;
  return { ...s, round: dealerStep(s.round) };
}

export const handOver = (s: Session) => s.phase === "play" && s.round?.phase === "settled";

/**
 * Clear the table for the next hand. Asks for the count first when `askCount`
 * is set, unless the shoe was just shuffled (the count is 0 again).
 */
export function nextHand(s: Session, askCount: boolean, rng: Rng = Math.random): Session {
  if (!handOver(s)) return s;
  const round = s.round!;
  const shown = visibleCards(round);
  if (round.shoe.length < CUT_CARD) {
    return { ...newSession(rng), round, lastHand: shown };
  }
  return {
    ...s,
    shoe: round.shoe,
    running: s.running + countCards(shown),
    phase: askCount ? "count" : "bet",
    decisions: [],
    lastHand: shown,
    shuffled: false,
  };
}
