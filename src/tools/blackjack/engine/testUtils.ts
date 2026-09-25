import type { Card, Rank } from "./cards";

let n = 0;
/** Make cards from shorthand: c("A", "7") → [A♠, 7♠] */
export const c = (...ranks: Rank[]): Card[] => ranks.map((rank) => ({ rank, suit: "spades", id: `t${n++}` }));
export const one = (rank: Rank): Card => c(rank)[0];

/**
 * Build a shoe for startRound(). Deal order is player, dealer up, player, dealer hole,
 * then whatever gets drawn next.
 */
export function stack(player: [Rank, Rank], dealer: [Rank, Rank], ...rest: Rank[]): Card[] {
  return c(player[0], dealer[0], player[1], dealer[1], ...rest, ...Array<Rank>(20).fill("2"));
}
