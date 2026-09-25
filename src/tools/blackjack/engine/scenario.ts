/**
 * Builds the shoe for each new round.
 *
 * - "realistic": a freshly shuffled 6-deck shoe. You see hands as often as
 *   they happen at a real table (lots of easy 17–20s).
 * - "focus": picks your starting hand on purpose, weighted toward the spots
 *   people actually get wrong (12 vs 2, soft 18, 9s, 16 vs 10...). Everything
 *   after the deal is still random.
 */
import { buildShoe, shuffle, SUITS, TEN_RANKS, type Card, type Rank, type Rng } from "./cards";
import { RULES } from "./rules";

export type DealMode = "focus" | "realistic";

interface Spot {
  kind: "hard" | "soft" | "pair";
  /** hard: total · soft: the non-Ace card's value · pair: card value (11 = A) */
  key: number;
  weight: number;
}

// Relative weights. Tricky decisions show up the most; no-brainers still appear occasionally.
const SPOTS: Spot[] = [
  ...[
    [5, 1],
    [6, 1],
    [7, 1],
    [8, 2],
    [9, 5],
    [10, 5],
    [11, 5],
    [12, 8],
    [13, 5],
    [14, 4],
    [15, 5],
    [16, 7],
    [17, 2],
    [18, 1],
    [19, 1],
  ].map(([key, weight]) => ({ kind: "hard" as const, key, weight })),
  ...[
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
    [6, 4],
    [7, 7],
    [8, 3],
    [9, 1],
  ].map(([key, weight]) => ({ kind: "soft" as const, key, weight })),
  ...[
    [11, 3],
    [2, 2],
    [3, 2],
    [4, 2],
    [5, 1],
    [6, 3],
    [7, 3],
    [8, 3],
    [9, 4],
    [10, 2],
  ].map(([key, weight]) => ({ kind: "pair" as const, key, weight })),
];

function pickWeighted<T extends { weight: number }>(items: T[], rng: Rng): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r < 0) return item;
  }
  return items[items.length - 1];
}

const pick = <T>(items: T[], rng: Rng): T => items[Math.floor(rng() * items.length)];

/** A random rank with this blackjack value (10 → 10/J/Q/K). */
function rankFor(value: number, rng: Rng): Rank {
  if (value === 11 || value === 1) return "A";
  if (value === 10) return pick(TEN_RANKS, rng);
  return String(value) as Rank;
}

/** The two starting ranks for a spot. */
function ranksForSpot(spot: Spot, rng: Rng): [Rank, Rank] {
  if (spot.kind === "pair") {
    const r = rankFor(spot.key, rng);
    // Pairs of 10s: allow mixed faces (K,Q) as well as true pairs.
    return [r, spot.key === 10 ? rankFor(10, rng) : r];
  }
  if (spot.kind === "soft") return shuffle(["A", rankFor(spot.key, rng)] as [Rank, Rank], rng) as [Rank, Rank];

  // Hard total from two different, non-Ace values, e.g. 16 = 10+6 or 9+7.
  const options: [number, number][] = [];
  for (let a = 2; a <= 10; a++) {
    const b = spot.key - a;
    if (b >= 2 && b <= 10 && a !== b) options.push([a, b]);
  }
  const [a, b] = pick(options, rng);
  return [rankFor(a, rng), rankFor(b, rng)];
}

/** Pull one card of `rank` out of the shoe (random suit). */
function takeRank(shoe: Card[], rank: Rank, rng: Rng): Card {
  const suits = shuffle(SUITS, rng);
  for (const suit of suits) {
    const i = shoe.findIndex((c) => c.rank === rank && c.suit === suit);
    if (i !== -1) return shoe.splice(i, 1)[0];
  }
  throw new Error(`No ${rank} left in shoe`);
}

/**
 * Returns a shoe ordered so that startRound() deals the chosen spot.
 * Deal order is: player, dealer up, player, dealer hole, then the rest.
 */
export function prepareShoe(mode: DealMode, rng: Rng = Math.random): Card[] {
  const shoe = shuffle(buildShoe(RULES.decks), rng);
  if (mode === "realistic") return shoe;

  const spot = pickWeighted(SPOTS, rng);
  const [r1, r2] = ranksForSpot(spot, rng);
  // Every up card equally often, so 10s don't crowd out the rest.
  const upRank = rankFor(pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 11], rng), rng);

  const p1 = takeRank(shoe, r1, rng);
  const p2 = takeRank(shoe, r2, rng);
  const up = takeRank(shoe, upRank, rng);
  return [p1, up, p2, ...shoe];
}
