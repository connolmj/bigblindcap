/**
 * Three-card hand rankings. With only three cards a straight is rarer than a
 * flush, so it ranks higher — the one big difference from regular poker.
 *
 * Every hand gets a single number (its score) so comparing two hands is just
 * comparing two numbers: category first, then the cards that break ties.
 */
import type { Card, Rank } from "../../blackjack/engine/cards";

export type Category = "high" | "pair" | "flush" | "straight" | "trips" | "straightFlush";

/** Weakest to strongest. */
export const CATEGORIES: Category[] = ["high", "pair", "flush", "straight", "trips", "straightFlush"];

export const CATEGORY_NAME: Record<Category, string> = {
  high: "High card",
  pair: "Pair",
  flush: "Flush",
  straight: "Straight",
  trips: "Three of a kind",
  straightFlush: "Straight flush",
};

/** Poker value of a rank: 2–10, J 11, Q 12, K 13, A 14. */
export function rankValue(rank: Rank): number {
  switch (rank) {
    case "A":
      return 14;
    case "K":
      return 13;
    case "Q":
      return 12;
    case "J":
      return 11;
    default:
      return Number(rank);
  }
}

/** 14 → "A", 12 → "Q", 9 → "9" */
export function rankLabel(value: number): string {
  return ({ 14: "A", 13: "K", 12: "Q", 11: "J" } as Record<number, string>)[value] ?? String(value);
}

const RANK_WORD: Record<number, string> = { 14: "Ace", 13: "King", 12: "Queen", 11: "Jack" };
export const rankWord = (value: number) => RANK_WORD[value] ?? String(value);
const plural = (value: number) => (value === 6 ? "6es" : `${rankWord(value)}s`);

export interface HandValue {
  category: Category;
  /** Tie-break order: for a pair, the pair rank then the kicker; for a straight, its top card. */
  ranks: [number, number, number];
  /** One number that orders every hand. Higher wins. */
  score: number;
}

const encode = (category: Category, [a, b, c]: number[]) => CATEGORIES.indexOf(category) * 4096 + a * 256 + b * 16 + c;

/** Evaluate from poker values (2–14) and whether all three suits match. */
export function evaluateValues(values: number[], suited: boolean): HandValue {
  const [a, b, c] = [...values].sort((x, y) => y - x);
  let category: Category;
  let ranks: [number, number, number] = [a, b, c];

  // A-2-3 is the lowest straight; its top card counts as the 3.
  const wheel = a === 14 && b === 3 && c === 2;
  const straight = (a - b === 1 && b - c === 1) || wheel;
  if (wheel) ranks = [3, 2, 1];

  if (a === c) category = "trips";
  else if (straight) category = suited ? "straightFlush" : "straight";
  else if (suited) category = "flush";
  else if (a === b || b === c) {
    category = "pair";
    ranks = a === b ? [a, a, c] : [b, b, a];
  } else category = "high";

  return { category, ranks, score: encode(category, ranks) };
}

export function evaluate(cards: Card[]): HandValue {
  const suited = cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit;
  return evaluateValues(
    cards.map((c) => rankValue(c.rank)),
    suited,
  );
}

/** The dealer needs Queen-high or better to "qualify". */
export const QUALIFY_SCORE = encode("high", [12, 3, 2]);
export const qualifies = (hand: HandValue) => hand.score >= QUALIFY_SCORE;

/** "Q-6-4", "A-K-2": the three ranks, high to low. */
export function shape(hand: HandValue): string {
  const ranks = hand.category === "pair" ? [hand.ranks[0], hand.ranks[1], hand.ranks[2]] : hand.ranks;
  if (hand.ranks[0] === 3 && hand.ranks[2] === 1) return "3-2-A";
  return ranks.map(rankLabel).join("-");
}

/** "Pair of 8s", "Queen-high (Q-6-4)", "Straight, 5 high". */
export function describe(hand: HandValue): string {
  const [a] = hand.ranks;
  switch (hand.category) {
    case "high":
      return `${rankWord(a)}-high (${shape(hand)})`;
    case "pair":
      return `Pair of ${plural(a)}`;
    case "flush":
      return `Flush, ${rankWord(a)} high`;
    case "straight":
      return `Straight, ${rankWord(a)} high`;
    case "trips":
      return `Three ${plural(a)}`;
    case "straightFlush":
      return a === 14 ? "Mini royal (A-K-Q suited)" : `Straight flush, ${rankWord(a)} high`;
  }
}

export type Result = "win" | "lose" | "tie";

export function compare(player: HandValue, dealer: HandValue): Result {
  if (player.score > dealer.score) return "win";
  if (player.score < dealer.score) return "lose";
  return "tie";
}
