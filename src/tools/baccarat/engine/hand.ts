/**
 * Baccarat hand values: Aces count 1, 2–9 count face value, 10s and picture
 * cards count 0, and only the last digit of the total matters (7 + 8 = 15 → 5).
 */
import type { Card, Rank } from "../../blackjack/engine/cards";

export function cardPoints(card: Card | Rank): number {
  const rank = typeof card === "string" ? card : card.rank;
  if (rank === "A") return 1;
  if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") return 0;
  return Number(rank);
}

export const total = (cards: Card[]) => cards.reduce((sum, c) => sum + cardPoints(c), 0) % 10;

/** An 8 or 9 on the first two cards. Nobody draws after a natural. */
export const isNatural = (cards: Card[]) => cards.length === 2 && total(cards) >= 8;
