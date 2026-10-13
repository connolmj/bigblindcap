import { drawGroup, spotLabel, type Group } from "../engine/explain";
import { BET_LABEL, COMMISSION_NAME } from "../engine/payouts";
import type { Decision } from "../engine/round";

export interface Stats {
  decisions: number;
  correct: number;
  streak: number;
  bestStreak: number;
  hands: number;
  /** Units won/lost on your bets. */
  net: number;
  /** Expected units given up by choosing a worse bet. */
  cost: number;
  byGroup: Record<Group, { n: number; correct: number }>;
  /** Spot label → times missed, e.g. "Banker 5 vs Player's 3rd card 3": 2 */
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
  byGroup: { bet: empty(), player: empty(), bankerStood: empty(), bankerThird: empty() },
  misses: {},
};

const label = (d: Decision) =>
  d.kind === "bet" ? `Bet ${BET_LABEL[d.chosen]} (${COMMISSION_NAME[d.commission]})` : spotLabel(d.spot);

export function recordDecision(stats: Stats, d: Decision): Stats {
  const group: Group = d.kind === "bet" ? "bet" : drawGroup(d.spot);
  const bucket = stats.byGroup[group];
  const streak = d.correct ? stats.streak + 1 : 0;
  const spot = label(d);
  return {
    ...stats,
    decisions: stats.decisions + 1,
    correct: stats.correct + (d.correct ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    cost: stats.cost + (d.kind === "bet" ? d.cost : 0),
    byGroup: { ...stats.byGroup, [group]: { n: bucket.n + 1, correct: bucket.correct + (d.correct ? 1 : 0) } },
    misses: d.correct ? stats.misses : { ...stats.misses, [spot]: (stats.misses[spot] ?? 0) + 1 },
  };
}

export function recordHand(stats: Stats, net: number): Stats {
  return { ...stats, hands: stats.hands + 1, net: stats.net + net };
}

export { pct } from "../../blackjack/ui/stats";
