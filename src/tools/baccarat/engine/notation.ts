import type { Card, Rank, Suit } from "../../blackjack/engine/cards";

const SUIT: Record<string, Suit> = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" };
let n = 0;

/** Cards from shorthand: parseCards("Ks", "7h"). "T" is a 10; the suit is optional (defaults to spades). */
export const parseCards = (...codes: string[]): Card[] =>
  codes.map((code) => {
    const rank = (code[0] === "T" ? "10" : code[0]) as Rank;
    const suit = SUIT[code[1] ?? "s"];
    return { rank, suit, id: `t${n++}` };
  });
