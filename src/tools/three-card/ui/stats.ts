import { groupOf, spotLabel, type Group } from "../engine/explain";
import type { Decision } from "../engine/round";

export interface Stats {
  decisions: number;
  correct: number;
  streak: number;
  bestStreak: number;
  hands: number;
  /** Units won/lost playing your own decisions. */
  net: number;
  /** Expected units given up by wrong moves — what mistakes cost on average. */
  cost: number;
  byGroup: Record<Group, { n: number; correct: number }>;
  /** Spot label → times missed, e.g. "Q-6-3": 2 */
  misses: Record<string, number>;
}

export const EMPTY_STATS: Stats = {
  decisions: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  hands: 0,
  net: 0,
  cost: 0,
  byGroup: {
    made: { n: 0, correct: 0 },
    high: { n: 0, correct: 0 },
    queen: { n: 0, correct: 0 },
    weak: { n: 0, correct: 0 },
  },
  misses: {},
};

export function recordDecision(stats: Stats, d: Decision): Stats {
  const group = groupOf(d.analysis.hand);
  const bucket = stats.byGroup[group];
  const streak = d.correct ? stats.streak + 1 : 0;
  const spot = spotLabel(d.analysis.hand);
  return {
    ...stats,
    decisions: stats.decisions + 1,
    correct: stats.correct + (d.correct ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    cost: stats.cost + (d.correct ? 0 : d.analysis.edge),
    byGroup: { ...stats.byGroup, [group]: { n: bucket.n + 1, correct: bucket.correct + (d.correct ? 1 : 0) } },
    misses: d.correct ? stats.misses : { ...stats.misses, [spot]: (stats.misses[spot] ?? 0) + 1 },
  };
}

export function recordHand(stats: Stats, net: number): Stats {
  return { ...stats, hands: stats.hands + 1, net: stats.net + net };
}

export { pct } from "../../blackjack/ui/stats";
