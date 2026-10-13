import { groupOf, spotLabel, type Group } from "../engine/explain";
import type { Decision } from "../engine/table";

export interface Stats {
  decisions: number;
  correct: number;
  streak: number;
  bestStreak: number;
  /** Rolls — called `hands` so the shared stats rail can read it. */
  hands: number;
  /** Dollars won/lost. */
  net: number;
  /** Expected dollars given up by choosing worse bets. */
  cost: number;
  byGroup: Record<Group, { n: number; correct: number }>;
  /** Bet name → times made when there was a better one, e.g. "Field": 3 */
  misses: Record<string, number>;
}

const empty = () => ({ n: 0, correct: 0 });

export const EMPTY_STATS: Stats = {
  decisions: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  hands: 0,
  net: 0,
  cost: 0,
  byGroup: { line: empty(), odds: empty(), numbers: empty(), field: empty(), hard: empty(), props: empty() },
  misses: {},
};

export function recordDecision(stats: Stats, d: Decision): Stats {
  const group = groupOf(d.id);
  const bucket = stats.byGroup[group] ?? empty();
  const streak = d.good ? stats.streak + 1 : 0;
  const name = spotLabel(d.id);
  return {
    ...stats,
    decisions: stats.decisions + 1,
    correct: stats.correct + (d.good ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    cost: stats.cost + d.cost,
    byGroup: { ...stats.byGroup, [group]: { n: bucket.n + 1, correct: bucket.correct + (d.good ? 1 : 0) } },
    misses: d.good ? stats.misses : { ...stats.misses, [name]: (stats.misses[name] ?? 0) + 1 },
  };
}

export function recordRoll(stats: Stats, net: number): Stats {
  return { ...stats, hands: stats.hands + 1, net: Math.round((stats.net + net) * 100) / 100 };
}

export { pct } from "../../blackjack/ui/stats";
