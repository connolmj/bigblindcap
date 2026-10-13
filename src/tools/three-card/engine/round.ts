/**
 * One hand of Three Card Poker as a small state machine:
 *   deal → you play or fold → the dealer's cards turn over one by one → settle.
 *
 * Bets are in units: the ante is 1, playing adds 1 more, Pair Plus (if on) is 1.
 */
import type { Card } from "../../blackjack/engine/cards";
import { compare, evaluate, qualifies, type Result } from "./hand";
import { ANTE_BONUS, PAIR_PLUS, type PairPlusTable } from "./paytable";
import { analyze, type Action, type Analysis } from "./strategy";

export type Phase = "decide" | "reveal" | "settled";

export interface Decision {
  chosen: Action;
  correct: boolean;
  analysis: Analysis;
}

export interface Payout {
  ante: number;
  play: number;
  anteBonus: number;
  /** null when no Pair Plus bet was made. */
  pairPlus: number | null;
  net: number;
  dealerQualified: boolean;
  /** Your hand against the dealer's; null when you folded. */
  result: Result | null;
}

export interface RoundState {
  player: Card[];
  dealer: Card[];
  /** The Pair Plus table in use, or null for no Pair Plus bet. */
  pairPlus: PairPlusTable | null;
  phase: Phase;
  decision: Decision | null;
  /** How many of the dealer's cards are face up. */
  revealed: number;
  payout: Payout | null;
}

/** Deal from a shuffled deck: you get the first three cards, the dealer the next three. */
export function startRound(deck: Card[], pairPlus: PairPlusTable | null): RoundState {
  return {
    player: deck.slice(0, 3),
    dealer: deck.slice(3, 6),
    pairPlus,
    phase: "decide",
    decision: null,
    revealed: 0,
    payout: null,
  };
}

export function decide(round: RoundState, chosen: Action): RoundState {
  if (round.phase !== "decide") return round;
  const analysis = analyze(round.player);
  return {
    ...round,
    phase: "reveal",
    decision: { chosen, correct: chosen === analysis.action, analysis },
  };
}

/** Turn over the dealer's next card; settle once all three are up. */
export function revealStep(round: RoundState): RoundState {
  if (round.phase !== "reveal") return round;
  const revealed = round.revealed + 1;
  if (revealed < 3) return { ...round, revealed };
  return {
    ...round,
    revealed,
    phase: "settled",
    payout: settle(round.player, round.dealer, round.decision!.chosen, round.pairPlus),
  };
}

export function settle(player: Card[], dealer: Card[], chosen: Action, pairPlus: PairPlusTable | null): Payout {
  const mine = evaluate(player);
  const theirs = evaluate(dealer);
  const dealerQualified = qualifies(theirs);
  // Pair Plus only cares about your hand — it's paid even if you fold.
  const pp = pairPlus === null ? null : (PAIR_PLUS[pairPlus][mine.category] ?? -1);

  let ante = -1;
  let play = 0;
  let anteBonus = 0;
  let result: Result | null = null;
  if (chosen === "play") {
    anteBonus = ANTE_BONUS[mine.category] ?? 0;
    result = compare(mine, theirs);
    if (!dealerQualified) {
      ante = 1; // the play bet is returned
    } else if (result === "win") {
      ante = 1;
      play = 1;
    } else if (result === "lose") {
      play = -1;
    } else {
      ante = 0;
    }
  }
  return { ante, play, anteBonus, pairPlus: pp, net: ante + play + anteBonus + (pp ?? 0), dealerQualified, result };
}
