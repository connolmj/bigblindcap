/** Run scoring odds and run expectancy by base-out state, over any run of seasons. */
import { stateIndex } from "./retro";
import type { Season } from "./types";

export { stateIndex };

/** Base states in the order the table shows them (bitmask: 1 = first, 2 = second, 4 = third). */
export const BASE_ORDER = [0, 1, 2, 4, 3, 5, 6, 7];
export const OUTS = [0, 1, 2];

const BASE_NAMES: Record<number, string> = {
  0: "Bases empty",
  1: "Runner on 1st",
  2: "Runner on 2nd",
  4: "Runner on 3rd",
  3: "1st & 2nd",
  5: "1st & 3rd",
  6: "2nd & 3rd",
  7: "Bases loaded",
};
export const baseName = (bases: number) => BASE_NAMES[bases];
export const outsName = (outs: number) => (outs === 1 ? "1 out" : `${outs} outs`);

export type Metric = "score" | "runs";

export interface Table {
  from: number;
  to: number;
  halfInnings: number;
  n: number[];
  scored: number[];
  runs: number[];
}

/** Adds up the seasons from `from` to `to`, inclusive. */
export function combine(seasons: Season[], from: number, to: number): Table {
  const t: Table = {
    from,
    to,
    halfInnings: 0,
    n: Array(24).fill(0),
    scored: Array(24).fill(0),
    runs: Array(24).fill(0),
  };
  for (const s of seasons) {
    if (s.year < from || s.year > to) continue;
    t.halfInnings += s.halfInnings;
    for (let i = 0; i < 24; i++) {
      t.n[i] += s.n[i];
      t.scored[i] += s.scored[i];
      t.runs[i] += s.runs[i];
    }
  }
  return t;
}

/**
 * Chance of scoring at least once, or runs expected, from the rest of the half-inning.
 * Three outs is the end of the inning: nothing more to come.
 */
export function value(t: Table, bases: number, outs: number, metric: Metric): number {
  if (outs >= 3) return 0;
  const i = stateIndex(bases, outs);
  if (!t.n[i]) return 0;
  return (metric === "score" ? t.scored[i] : t.runs[i]) / t.n[i];
}
