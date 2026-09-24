import type { Decision } from "../engine/round";
import type { TableName } from "../engine/strategy";
import { spotLabel } from "../engine/explain";

export interface Stats {
  decisions: number;
  correct: number;
  streak: number;
  bestStreak: number;
  hands: number;
  /** Units won/lost playing your own decisions. */
  net: number;
  byTable: Record<TableName, { n: number; correct: number }>;
  /** Spot label → times missed, e.g. "Soft 18 (A,7) vs 9": 3 */
  misses: Record<string, number>;
}

export const EMPTY_STATS: Stats = {
  decisions: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  hands: 0,
  net: 0,
  byTable: { hard: { n: 0, correct: 0 }, soft: { n: 0, correct: 0 }, pair: { n: 0, correct: 0 } },
  misses: {},
};

export function recordDecision(stats: Stats, d: Decision): Stats {
  const table = d.recommendation.table;
  const bucket = stats.byTable[table];
  const streak = d.correct ? stats.streak + 1 : 0;
  const spot = spotLabel(d.recommendation);
  return {
    ...stats,
    decisions: stats.decisions + 1,
    correct: stats.correct + (d.correct ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    byTable: { ...stats.byTable, [table]: { n: bucket.n + 1, correct: bucket.correct + (d.correct ? 1 : 0) } },
    misses: d.correct ? stats.misses : { ...stats.misses, [spot]: (stats.misses[spot] ?? 0) + 1 },
  };
}

export function recordHand(stats: Stats, net: number): Stats {
  return { ...stats, hands: stats.hands + 1, net: stats.net + net };
}

export const pct = (correct: number, n: number) => (n ? Math.round((correct / n) * 100) : null);
