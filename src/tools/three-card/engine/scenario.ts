/**
 * Which hands to deal. "Real deck" deals straight off a shuffled deck.
 * "Close calls" leans on the hands near the Q-6-4 line — Queen-high most of
 * all — because nobody needs practice playing a straight.
 */
import { buildShoe, shuffle, type Card, type Rng } from "../../blackjack/engine/cards";
import { evaluate } from "./hand";

export type DealMode = "focus" | "realistic";

/** Chance of keeping a dealt hand in "Close calls" mode, by its top card when it's high-card only. */
function keepChance(cards: Card[]): number {
  const hand = evaluate(cards);
  if (hand.category !== "high") return 0.12;
  const top = hand.ranks[0];
  if (top === 12) return 1;
  if (top === 11 || top === 13) return 0.35;
  return 0.12;
}

/** A freshly shuffled deck whose first three cards are your hand. */
export function prepareDeck(mode: DealMode, rng: Rng = Math.random): Card[] {
  const deck = buildShoe(1);
  for (let tries = 0; tries < 60; tries++) {
    const shuffled = shuffle(deck, rng);
    if (mode === "realistic" || rng() < keepChance(shuffled.slice(0, 3))) return shuffled;
  }
  return shuffle(deck, rng);
}
