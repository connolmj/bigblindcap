/**
 * Which hands to deal. "Real shoe" is a freshly shuffled 8-deck shoe. "Tough
 * spots" skips most naturals (nothing to call) and leans on the Banker totals
 * of 3–6, where the Banker's rule depends on the Player's third card.
 */
import { buildShoe, shuffle, type Card, type Rng } from "../../blackjack/engine/cards";
import { cardPoints } from "./hand";
import { DECKS } from "./payouts";

export type DealMode = "focus" | "realistic";

function keepChance(shoe: Card[]): number {
  const [p1, b1, p2, b2] = shoe.slice(0, 4).map(cardPoints);
  const pt = (p1 + p2) % 10;
  const bt = (b1 + b2) % 10;
  if (pt >= 8 || bt >= 8) return 0.08;
  if (pt <= 5 && bt >= 3 && bt <= 6) return 1; // Player draws, Banker's call depends on that card
  return 0.3;
}

export function prepareShoe(mode: DealMode, rng: Rng = Math.random): Card[] {
  const full = buildShoe(DECKS);
  for (let tries = 0; tries < 40; tries++) {
    const shoe = shuffle(full, rng);
    if (mode === "realistic" || rng() < keepChance(shoe)) return shoe;
  }
  return shuffle(full, rng);
}
