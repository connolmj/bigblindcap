/** Each hand comes from a freshly shuffled 8-deck shoe. */
import { buildShoe, shuffle, type Card, type Rng } from "../../blackjack/engine/cards";
import { DECKS } from "./payouts";

export function prepareShoe(rng: Rng = Math.random): Card[] {
  return shuffle(buildShoe(DECKS), rng);
}
