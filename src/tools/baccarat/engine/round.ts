/**
 * One hand of baccarat as a state machine:
 *   you bet → four cards → the Player's third-card rule → the Banker's → settle.
 *
 * Your bet is the only choice in baccarat. Everything after it follows the
 * drawing rules exactly, the way a dealer plays it, and each step is kept so
 * the table can show which rule applied.
 */
import type { Card } from "../../blackjack/engine/cards";
import { cardPoints, isNatural, total } from "./hand";
import { payout, type Bet, type Commission, type Winner } from "./payouts";
import { correctDraw, type DrawAction, type DrawSpot, type Side } from "./rules";

/** "playerDraw" and "bankerDraw" are whose rule is up next; the table plays them on a timer. */
export type Phase = "bet" | "playerDraw" | "bankerDraw" | "settled";

/** What happened at one point in the hand. */
export type Step =
  | { kind: "natural"; side: Side | "both"; player: number; banker: number }
  | { kind: "draw"; spot: DrawSpot; action: DrawAction; card?: Card };

export interface RoundState {
  shoe: Card[];
  /** Next card to deal from the shoe. */
  pos: number;
  commission: Commission;
  bet: Bet | null;
  player: Card[];
  banker: Card[];
  phase: Phase;
  steps: Step[];
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
    steps: [],
    natural: false,
    winner: null,
    net: null,
  };
}

export function placeBet(round: RoundState, bet: Bet): RoundState {
  if (round.phase !== "bet") return round;
  const s = round.shoe;
  const p = round.pos;
  // Deal order: Player, Banker, Player, Banker.
  const player = [s[p], s[p + 2]];
  const banker = [s[p + 1], s[p + 3]];
  const pn = isNatural(player);
  const bn = isNatural(banker);
  const next: RoundState = { ...round, bet, player, banker, pos: p + 4, phase: "playerDraw" };
  if (!pn && !bn) return next;
  const step: Step = {
    kind: "natural",
    side: pn && bn ? "both" : pn ? "player" : "banker",
    player: total(player),
    banker: total(banker),
  };
  return settle({ ...next, natural: true, steps: [step] });
}

/** The spot whose rule is up next, if any. */
export function currentSpot(round: RoundState): DrawSpot | null {
  if (round.phase === "playerDraw") return { side: "player", total: total(round.player), playerThird: null };
  if (round.phase === "bankerDraw") {
    const third = round.player[2];
    return { side: "banker", total: total(round.banker), playerThird: third ? cardPoints(third) : null };
  }
  return null;
}

/** Play the next third-card rule: draw or stand, whichever the rule says. */
export function drawStep(round: RoundState): RoundState {
  const spot = currentSpot(round);
  if (!spot) return round;
  const action = correctDraw(spot);
  const card = action === "draw" ? round.shoe[round.pos] : undefined;
  const steps: Step[] = [...round.steps, { kind: "draw", spot, action, card }];
  const pos = card ? round.pos + 1 : round.pos;

  if (spot.side === "player") {
    return { ...round, steps, pos, player: card ? [...round.player, card] : round.player, phase: "bankerDraw" };
  }
  return settle({ ...round, steps, pos, banker: card ? [...round.banker, card] : round.banker });
}

/** Play out the rest of the hand at once (tests, and "skip ahead"). */
export function finish(round: RoundState): RoundState {
  let r = round;
  while (r.phase === "playerDraw" || r.phase === "bankerDraw") r = drawStep(r);
  return r;
}

function settle(round: RoundState): RoundState {
  const pt = total(round.player);
  const bt = total(round.banker);
  const winner: Winner = pt > bt ? "player" : bt > pt ? "banker" : "tie";
  return { ...round, phase: "settled", winner, net: payout(round.bet!, winner, bt, round.commission) };
}
