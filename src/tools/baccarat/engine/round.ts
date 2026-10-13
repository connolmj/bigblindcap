/**
 * One hand of baccarat as a state machine:
 *   you bet → four cards → you call the Player's draw → you call the Banker's → settle.
 *
 * Your draw calls are graded, but the dealer always follows the real rule,
 * so the hand plays out exactly as it would at a casino.
 */
import type { Card } from "../../blackjack/engine/cards";
import { cardPoints, isNatural, total } from "./hand";
import { bestBet, betReturn, payout, type Bet, type Commission, type Winner } from "./payouts";
import { correctDraw, type DrawAction, type DrawSpot } from "./rules";

export type Phase = "bet" | "playerDraw" | "bankerDraw" | "settled";

export type Decision =
  | { kind: "bet"; chosen: Bet; best: Bet; correct: boolean; commission: Commission; cost: number }
  | { kind: "draw"; spot: DrawSpot; chosen: DrawAction; right: DrawAction; correct: boolean };

export interface RoundState {
  shoe: Card[];
  /** Next card to deal from the shoe. */
  pos: number;
  commission: Commission;
  bet: Bet | null;
  player: Card[];
  banker: Card[];
  phase: Phase;
  decisions: Decision[];
  natural: boolean;
  winner: Winner | null;
  net: number | null;
}

export function startRound(shoe: Card[], commission: Commission): RoundState {
  return {
    shoe,
    pos: 0,
    commission,
    bet: null,
    player: [],
    banker: [],
    phase: "bet",
    decisions: [],
    natural: false,
    winner: null,
    net: null,
  };
}

export function placeBet(round: RoundState, bet: Bet): RoundState {
  if (round.phase !== "bet") return round;
  const best = bestBet(round.commission);
  const decision: Decision = {
    kind: "bet",
    chosen: bet,
    best,
    correct: bet === best,
    commission: round.commission,
    cost: betReturn(best, round.commission) - betReturn(bet, round.commission),
  };
  const s = round.shoe;
  const p = round.pos;
  // Deal order: Player, Banker, Player, Banker.
  const player = [s[p], s[p + 2]];
  const banker = [s[p + 1], s[p + 3]];
  const natural = isNatural(player) || isNatural(banker);
  const next: RoundState = {
    ...round,
    bet,
    player,
    banker,
    pos: p + 4,
    natural,
    phase: "playerDraw",
    decisions: [decision],
  };
  return natural ? settle(next) : next;
}

/** The spot you're being asked about right now, if any. */
export function currentSpot(round: RoundState): DrawSpot | null {
  if (round.phase === "playerDraw") return { side: "player", total: total(round.player), playerThird: null };
  if (round.phase === "bankerDraw") {
    const third = round.player[2];
    return { side: "banker", total: total(round.banker), playerThird: third ? cardPoints(third) : null };
  }
  return null;
}

export function callDraw(round: RoundState, chosen: DrawAction): RoundState {
  const spot = currentSpot(round);
  if (!spot) return round;
  const right = correctDraw(spot);
  const decisions: Decision[] = [...round.decisions, { kind: "draw", spot, chosen, right, correct: chosen === right }];
  const card = round.shoe[round.pos];
  const drew = right === "draw";
  const pos = drew ? round.pos + 1 : round.pos;

  if (spot.side === "player") {
    return { ...round, decisions, pos, player: drew ? [...round.player, card] : round.player, phase: "bankerDraw" };
  }
  return settle({ ...round, decisions, pos, banker: drew ? [...round.banker, card] : round.banker });
}

function settle(round: RoundState): RoundState {
  const pt = total(round.player);
  const bt = total(round.banker);
  const winner: Winner = pt > bt ? "player" : bt > pt ? "banker" : "tie";
  return { ...round, phase: "settled", winner, net: payout(round.bet!, winner, bt, round.commission) };
}
