export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
  /** Unique within a shoe, so React can track each card as it animates in. */
  id: string;
}

export const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
export const RANKS: Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const TEN_RANKS: Rank[] = ["10", "J", "Q", "K"];

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export const isRed = (card: Card) => card.suit === "hearts" || card.suit === "diamonds";

/** Blackjack value of a card. Aces count 11 here; hand.ts drops them to 1 when needed. */
export function cardValue(card: Card | Rank): number {
  const rank = typeof card === "string" ? card : card.rank;
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank);
}

/** A random-number function returning [0, 1), like Math.random. Injectable so tests are repeatable. */
export type Rng = () => number;

/** Small seeded RNG (mulberry32) for tests and reproducible deals. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildShoe(decks: number): Card[] {
  const cards: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ rank, suit, id: `${d}-${suit}-${rank}` });
      }
    }
  }
  return cards;
}

/** Fisher–Yates shuffle. Returns a new array. */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** "an Ace", "a 6", "an 8" — for explanations. */
export function withArticle(upValue: number): string {
  if (upValue === 11) return "an Ace";
  if (upValue === 8) return "an 8";
  return `a ${upValue}`;
}
