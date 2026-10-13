/**
 * What gets paid, and how often. Everything here is counted exactly over all
 * 22,100 three-card hands from one 52-card deck — no simulation.
 */
import { buildShoe, type Card } from "../../blackjack/engine/cards";
import { CATEGORIES, evaluate, type Category, type HandValue } from "./hand";

/** "To 1" payouts. Hands not listed pay nothing. */
export type Paytable = Partial<Record<Category, number>>;

/** Paid on the ante for a straight or better, whatever the dealer has — as long as you play. */
export const ANTE_BONUS: Paytable = { straight: 1, trips: 4, straightFlush: 5 };

export type PairPlusTable = "1-4-6-30-40" | "1-3-6-30-40";

export const PAIR_PLUS: Record<PairPlusTable, Paytable> = {
  "1-4-6-30-40": { pair: 1, flush: 4, straight: 6, trips: 30, straightFlush: 40 },
  "1-3-6-30-40": { pair: 1, flush: 3, straight: 6, trips: 30, straightFlush: 40 },
};

export const PAIR_PLUS_NAME: Record<PairPlusTable, string> = {
  "1-4-6-30-40": "Flush pays 4 to 1",
  "1-3-6-30-40": "Flush pays 3 to 1",
};

/** Every 3-card hand from a fresh deck, evaluated once. */
export const ALL_HANDS: { cards: Card[]; value: HandValue }[] = (() => {
  const deck = buildShoe(1);
  const out: { cards: Card[]; value: HandValue }[] = [];
  for (let i = 0; i < 52; i++)
    for (let j = i + 1; j < 52; j++)
      for (let k = j + 1; k < 52; k++) {
        const cards = [deck[i], deck[j], deck[k]];
        out.push({ cards, value: evaluate(cards) });
      }
  return out;
})();

/** How many of the 22,100 hands land in each category. */
export const CATEGORY_COUNTS: Record<Category, number> = (() => {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  for (const h of ALL_HANDS) counts[h.value.category]++;
  return counts;
})();

export const TOTAL_HANDS = ALL_HANDS.length;

/** Expected return per unit bet on Pair Plus (negative = house edge). */
export function pairPlusReturn(table: Paytable): number {
  let total = 0;
  for (const cat of CATEGORIES) {
    const pays = table[cat];
    total += CATEGORY_COUNTS[cat] * (pays === undefined ? -1 : pays);
  }
  return total / TOTAL_HANDS;
}

/**
 * Ante & Play played with the Q-6-4 rule, per unit of ante. Too slow to count
 * on page load (22,100 × 18,424 deals), so it's counted by
 * scripts/check-three-card.ts and written here.
 */
export const ANTE_PLAY_RETURN = -0.03373;
/** The same loss as a share of everything you put out (ante + play when you play). */
export const ANTE_PLAY_RETURN_PER_ACTION = -0.020147;

/** Per ante, from the same count: what playing some other common way costs instead. */
export const OTHER_STRATEGIES: { name: string; rule: string; ret: number }[] = [
  { name: "Never fold", rule: "Play every hand", ret: -0.07654 },
  { name: "King-high or better", rule: "Fold every Queen-high", ret: -0.04986 },
  { name: "Mimic the dealer", rule: "Play any Queen-high", ret: -0.03449 },
];
