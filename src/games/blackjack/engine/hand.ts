import { cardValue, type Card } from "./cards";

export interface HandTotal {
  total: number;
  /** True when an Ace is being counted as 11 (so one more card can't bust you). */
  soft: boolean;
}

export function handTotal(cards: Card[]): HandTotal {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === "A") aces++;
  }
  // Count aces as 1 instead of 11, one at a time, until we're not bust.
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

/** Two cards totalling 21. (A split hand that makes 21 is not a blackjack; round.ts handles that.) */
export function isNatural(cards: Card[]): boolean {
  return cards.length === 2 && handTotal(cards).total === 21;
}

export const isBust = (cards: Card[]) => handTotal(cards).total > 21;

/** Two cards of the same value — K and Q count as a pair of 10s, like most casinos. */
export function isPair(cards: Card[]): boolean {
  return cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1]);
}

/** "Soft 18", "Hard 12", "Blackjack", "Bust" */
export function describeTotal(cards: Card[]): string {
  if (isNatural(cards)) return "Blackjack";
  const { total, soft } = handTotal(cards);
  if (total > 21) return `Bust · ${total}`;
  if (total === 21) return "21";
  return soft ? `Soft ${total}` : `${total}`;
}
