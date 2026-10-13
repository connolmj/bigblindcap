/**
 * What each bet pays, and its exact odds from an 8-deck shoe.
 *
 * The odds are counted, not simulated: every way the first four cards and up
 * to two third cards can come out of a fresh 416-card shoe, each weighted by
 * how likely it is. That's under a million cases, a few dozen milliseconds.
 */
import { bankerDraws, playerDraws } from "./rules";

export type Bet = "player" | "banker" | "tie";
export type Commission = "standard" | "none";

export const BETS: Bet[] = ["banker", "player", "tie"];
export const BET_LABEL: Record<Bet, string> = { player: "Player", banker: "Banker", tie: "Tie" };

export const COMMISSION_NAME: Record<Commission, string> = {
  standard: "5% commission",
  none: "No commission",
};

/** Tie pays this many to 1. Banker and Player bets push on a tie. */
export const TIE_PAYS = 8;
export const DECKS = 8;

export type Winner = "player" | "banker" | "tie";

/** Units won on a 1-unit bet. `bankerTotal` matters for the no-commission Banker 6 rule. */
export function payout(bet: Bet, winner: Winner, bankerTotal: number, commission: Commission): number {
  if (winner === "tie") return bet === "tie" ? TIE_PAYS : 0;
  if (bet === "tie") return -1;
  if (bet !== winner) return -1;
  if (bet === "player") return 1;
  if (commission === "standard") return 0.95;
  return bankerTotal === 6 ? 0.5 : 1;
}

export interface Odds {
  banker: number;
  player: number;
  tie: number;
  /** Banker wins with a total of 6 — paid half on a no-commission table. */
  bankerSix: number;
  natural: number;
}

let cached: Odds | null = null;

export function exactOdds(): Odds {
  if (cached) return cached;
  // Cards per point value in the shoe: 0 is 10/J/Q/K (16 a deck), the rest 4 a deck.
  const counts = Array.from({ length: 10 }, (_, v) => (v === 0 ? 16 : 4) * DECKS);
  let left = 52 * DECKS;
  const odds: Odds = { banker: 0, player: 0, tie: 0, bankerSix: 0, natural: 0 };

  /** Draw one card: calls `next` for each point value with its chance. */
  const draw = (p: number, next: (v: number, p: number) => void) => {
    for (let v = 0; v < 10; v++) {
      if (!counts[v]) continue;
      const q = (p * counts[v]) / left;
      counts[v]--;
      left--;
      next(v, q);
      counts[v]++;
      left++;
    }
  };

  const finish = (pt: number, bt: number, p: number) => {
    if (pt > bt) odds.player += p;
    else if (bt > pt) {
      odds.banker += p;
      if (bt === 6) odds.bankerSix += p;
    } else odds.tie += p;
  };

  const bankerTurn = (pt: number, bt: number, third: number | null, p: number) => {
    if (bankerDraws(bt, third)) draw(p, (v, q) => finish(pt, (bt + v) % 10, q));
    else finish(pt, bt, p);
  };

  // Deal order: Player, Banker, Player, Banker.
  draw(1, (p1, a) =>
    draw(a, (b1, b) =>
      draw(b, (p2, c) =>
        draw(c, (b2, d) => {
          const pt = (p1 + p2) % 10;
          const bt = (b1 + b2) % 10;
          if (pt >= 8 || bt >= 8) {
            odds.natural += d;
            return finish(pt, bt, d);
          }
          if (playerDraws(pt)) draw(d, (v, q) => bankerTurn((pt + v) % 10, bt, v, q));
          else bankerTurn(pt, bt, null, d);
        }),
      ),
    ),
  );
  cached = odds;
  return odds;
}

/** Average units won per unit bet (negative: the house edge). */
export function betReturn(bet: Bet, commission: Commission, odds: Odds = exactOdds()): number {
  switch (bet) {
    case "player":
      return odds.player - odds.banker;
    case "tie":
      return TIE_PAYS * odds.tie - (1 - odds.tie);
    case "banker":
      return commission === "standard"
        ? 0.95 * odds.banker - odds.player
        : odds.banker - 0.5 * odds.bankerSix - odds.player;
  }
}

/** The bet with the smallest house edge on this table. */
export function bestBet(commission: Commission): Bet {
  return BETS.reduce((best, b) => (betReturn(b, commission) > betReturn(best, commission) ? b : best));
}
