/**
 * The table rules for Level 1. Basic strategy depends on these, so the
 * strategy tables in strategy.ts are written for exactly this set.
 */
export const RULES = {
  decks: 6,
  /** Dealer stands on soft 17 ("S17"). */
  dealerHitsSoft17: false,
  /** You may double on any first two cards, including after a split ("DAS"). */
  doubleAfterSplit: true,
  /** Split up to 3 times (4 hands). */
  maxHands: 4,
  /** Split aces get exactly one card each and can't be re-split. */
  resplitAces: false,
  /** A natural pays 3 to 2. */
  blackjackPays: 1.5,
  /** Dealer checks for blackjack under an Ace or 10 before you act. */
  dealerPeeks: true,
} as const;

export const RULES_SUMMARY = "6 decks · Dealer stands on soft 17 · Double after split · Blackjack pays 3:2";
