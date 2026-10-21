/**
 * The Hi-Lo count. Small cards leaving the shoe are good for you (+1), big
 * ones bad (−1): 2–6 count +1, 7–9 count 0, 10s, pictures and Aces count −1.
 */
import type { Card, Rank } from "../../blackjack/engine/cards";

export function hiLo(card: Card | Rank): -1 | 0 | 1 {
  const rank = typeof card === "string" ? card : card.rank;
  if (rank === "A" || rank === "10" || rank === "J" || rank === "Q" || rank === "K") return -1;
  return Number(rank) <= 6 ? 1 : 0;
}

export const countCards = (cards: Card[]) => cards.reduce((sum, c) => sum + hiLo(c), 0);

/** Decks left, to the nearest half deck — what you'd judge from the discard tray. Never below ½. */
export const decksLeft = (cardsLeft: number) => Math.max(0.5, Math.round(cardsLeft / 26) / 2);

/** Running count ÷ decks left, rounded toward zero. */
export function trueCount(running: number, cardsLeft: number): number {
  const tc = Math.trunc(running / decksLeft(cardsLeft));
  return tc === 0 ? 0 : tc; // no −0
}

/** "+3", "−2", "0" */
export const fmtCount = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

/** "4½", "1", "½" */
export function fmtDecks(d: number): string {
  const whole = Math.floor(d);
  const half = d - whole >= 0.5 ? "½" : "";
  return whole === 0 ? half || "0" : `${whole}${half}`;
}
