import { decisionLabel, groupOf, type Group } from "../engine/explain";
import type { Decision } from "../engine/session";

export interface Stats {
  decisions: number;
  correct: number;
  streak: number;
  bestStreak: number;
  hands: number;
  /** Units won/lost, at the bets you chose. */
  net: number;
  byGroup: Record<Group, { n: number; correct: number }>;
  /** Spot label → times missed, e.g. "Hard 16 vs 10 (count play)": 2 */
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
  byGroup: { count: empty(), bet: empty(), basic: empty(), deviation: empty() },
  misses: {},
};

export function recordDecision(stats: Stats, d: Decision): Stats {
  const group = groupOf(d);
  const bucket = stats.byGroup[group];
  const streak = d.correct ? stats.streak + 1 : 0;
  const spot = decisionLabel(d);
  return {
    ...stats,
    decisions: stats.decisions + 1,
    correct: stats.correct + (d.correct ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    byGroup: { ...stats.byGroup, [group]: { n: bucket.n + 1, correct: bucket.correct + (d.correct ? 1 : 0) } },
    misses: d.correct ? stats.misses : { ...stats.misses, [spot]: (stats.misses[spot] ?? 0) + 1 },
  };
}

export function recordHand(stats: Stats, net: number): Stats {
  return { ...stats, hands: stats.hands + 1, net: stats.net + net };
}

export { pct } from "../../blackjack/ui/stats";
