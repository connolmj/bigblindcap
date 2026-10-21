import type { Bet, Winner } from "../engine/payouts";

/** Hands kept for the scoreboard. */
export const HISTORY = 72;

export interface Stats {
  hands: number;
  /** Units won/lost on your bets. */
  net: number;
  /** How often each side won. */
  wins: Record<Winner, number>;
  /** Your results on each bet. */
  byBet: Record<Bet, { n: number; net: number }>;
  /** Recent winners, oldest first — the scoreboard. */
  history: Winner[];
}

export const EMPTY_STATS: Stats = {
  hands: 0,
  net: 0,
  wins: { player: 0, banker: 0, tie: 0 },
  byBet: { player: { n: 0, net: 0 }, banker: { n: 0, net: 0 }, tie: { n: 0, net: 0 } },
  history: [],
};

export function recordHand(stats: Stats, bet: Bet, winner: Winner, net: number): Stats {
  const b = stats.byBet[bet];
  return {
    hands: stats.hands + 1,
    net: stats.net + net,
    wins: { ...stats.wins, [winner]: stats.wins[winner] + 1 },
    byBet: { ...stats.byBet, [bet]: { n: b.n + 1, net: b.net + net } },
    history: [...stats.history, winner].slice(-HISTORY),
  };
}
