import type { Card, Rank, Suit } from "../../blackjack/engine/cards";

const SUIT: Record<string, Suit> = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };

/** Cards from shorthand: parseCards("Qs", "6h", "4d"). "T" is a 10. */
export const parseCards = (...codes: string[]): Card[] =>
  codes.map((code) => {
    const rank = (code[0] === "T" ? "10" : code[0]) as Rank;
    const suit = SUIT[code[1]];
    return { rank, suit, id: `0-${suit}-${rank}` };
  });
