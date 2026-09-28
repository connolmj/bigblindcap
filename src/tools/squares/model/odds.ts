/**
 * Super Bowl Squares math. A box is a pair of last digits — the row team's and the column
 * team's. It wins a quarter when both scores end in those digits at the end of it.
 */
import type { SuperBowl } from "./types";

export const QUARTERS = ["Q1", "Half", "Q3", "Final"] as const;
/** A standard pool: a 10 × 10 grid, every box sold. */
export const BOXES = 100;

/** Share of the pot paid at the end of each quarter. Sums to 1. */
export type Split = [number, number, number, number];

export interface BoxOdds {
  games: number;
  /** p[quarter][row * 10 + col] — chance the box wins that quarter. */
  p: Float64Array[];
  /** Chance the box wins at least one of the four. */
  any: Float64Array;
  /** Chance the box wins or hits the reverse at least once. */
  anyRev: Float64Array;
}

/** The box with the digits swapped: 7–0 → 0–7. Doubles (7–7) are their own reverse. */
export const reverseOf = (box: number) => (box % 10) * 10 + Math.floor(box / 10);

/** Last digits, 8 per game: Q1 home, Q1 away, half home, half away, Q3…, final… */
export function parseDigits(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) - 48;
  return out;
}

export function superBowlDigits(sbs: SuperBowl[]): Uint8Array {
  const out = new Uint8Array(sbs.length * 8);
  sbs.forEach((sb, g) => sb.q.forEach(([a, b], k) => out.set([a % 10, b % 10], g * 8 + k * 2)));
  return out;
}

/**
 * How often each box has hit. Which team gets the rows is a coin flip, so every game is
 * counted both ways round, half each — box 7-0 and box 0-7 come out the same.
 */
export function boxOdds(digits: Uint8Array): BoxOdds {
  const games = digits.length / 8;
  const p = QUARTERS.map(() => new Float64Array(BOXES));
  const any = new Float64Array(BOXES);
  const anyRev = new Float64Array(BOXES);
  const w = games ? 0.5 / games : 0;
  const hit = new Set<number>();
  const hitRev = new Set<number>();
  for (let g = 0; g < games; g++) {
    for (const flip of [false, true]) {
      hit.clear();
      hitRev.clear();
      for (let q = 0; q < 4; q++) {
        const h = digits[g * 8 + q * 2];
        const a = digits[g * 8 + q * 2 + 1];
        const box = flip ? a * 10 + h : h * 10 + a;
        p[q][box] += w;
        hit.add(box);
        hitRev.add(box).add(reverseOf(box));
      }
      for (const box of hit) any[box] += w;
      for (const box of hitRev) anyRev[box] += w;
    }
  }
  return { games, p, any, anyRev };
}

/**
 * What a box is worth per $1 paid in, when the pot is every box's money and all of it is paid out.
 * `reverse` is the share of each quarter's prize paid to the reverse box (0 = no reverses);
 * doubles have no reverse, so they keep the whole prize.
 */
export function boxValue(odds: BoxOdds, box: number, split: Split, reverse = 0): number {
  const rev = reverseOf(box);
  let v = 0;
  for (let q = 0; q < 4; q++)
    v += split[q] * (rev === box ? odds.p[q][box] : (1 - reverse) * odds.p[q][box] + reverse * odds.p[q][rev]);
  return v * BOXES;
}

/** Chance the box collects something in quarter q — a straight win, or the reverse when reverses pay. */
export function cashChance(odds: BoxOdds, q: number, box: number, reverses: boolean): number {
  const rev = reverseOf(box);
  return odds.p[q][box] + (reverses && rev !== box ? odds.p[q][rev] : 0);
}

/** Every box's value, best first: [box, value]. */
export function rankBoxes(odds: BoxOdds, split: Split, reverse = 0): [number, number][] {
  return Array.from({ length: BOXES }, (_, b): [number, number] => [b, boxValue(odds, b, split, reverse)]).sort(
    (x, y) => y[1] - x[1] || x[0] - y[0],
  );
}

/** Super Bowl number in Roman numerals from the season it capped (1966 → I). */
export function superBowlNumber(season: number): string {
  let n = season - 1965;
  let out = "";
  for (const [v, s] of [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as const) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
