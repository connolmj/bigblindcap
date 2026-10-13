/**
 * Which bets are worth making. The line is a 2% house edge: Pass, Don't Pass,
 * Come, Don't Come, all the odds, Place 6 and 8, and Buy / Lay 4 and 10 where
 * the commission is only taken on wins. Everything else costs real money —
 * and for each of those there's a better bet that does nearly the same job.
 */
import { betMath, parseSpot, type Rules, type SpotId } from "./bets";
import type { PointNum } from "./dice";

export const GOOD_EDGE = 0.02;

export interface Grade {
  edge: number;
  good: boolean;
  /** The better bet to make instead, when this one isn't good. */
  better: SpotId | null;
  /** Expected dollars given up per $1, compared with the better bet. */
  costPer: number;
}

/** "Pass Line" before a point is set, "Come" after — the same bet either way. */
const line = (point: PointNum | null, dont = false): SpotId =>
  point === null ? (dont ? "dontPass" : "pass") : dont ? "dontCome" : "come";

export function betterBet(id: SpotId, point: PointNum | null, rules: Rules): SpotId | null {
  const { kind, n } = parseSpot(id);
  switch (kind) {
    case "big":
      return `place${n as 6 | 8}`;
    case "place":
      if (n === 4 || n === 10) return betMath(`buy${n}`, rules).edge <= GOOD_EDGE ? `buy${n}` : line(point);
      return line(point);
    case "hard":
      if (n === 6 || n === 8) return `place${n}`;
      return betMath(`buy${n as 4 | 10}`, rules).edge <= GOOD_EDGE ? `buy${n as 4 | 10}` : line(point);
    case "lay":
    case "any7":
      return line(point, true);
    default:
      return line(point);
  }
}

export function gradeBet(id: SpotId, point: PointNum | null, rules: Rules): Grade {
  const edge = betMath(id, rules, point ?? undefined).edge;
  if (edge <= GOOD_EDGE + 1e-9) return { edge, good: true, better: null, costPer: 0 };
  const better = betterBet(id, point, rules);
  const betterEdge = better ? betMath(better, rules).edge : 0;
  return { edge, good: false, better, costPer: Math.max(0, edge - betterEdge) };
}
