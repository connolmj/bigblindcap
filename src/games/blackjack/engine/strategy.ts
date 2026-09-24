/**
 * Basic strategy for: 6 decks, dealer stands on soft 17, double after split,
 * no surrender, dealer peeks for blackjack. (See rules.ts.)
 *
 * Each table is keyed by your hand, then read left-to-right across the dealer's
 * up card: 2 3 4 5 6 7 8 9 10 A.
 *
 *   H  = Hit
 *   S  = Stand
 *   D  = Double if allowed, otherwise Hit
 *   Ds = Double if allowed, otherwise Stand
 *   P  = Split
 */
import { cardValue, type Card } from "./cards";
import { handTotal, isPair } from "./hand";

export type Action = "hit" | "stand" | "double" | "split";
export type Cell = "H" | "S" | "D" | "Ds" | "P";
export type TableName = "hard" | "soft" | "pair";

/** Dealer up-card values in column order. Ace = 11. */
export const DEALER_UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

const row = (s: string) => s.trim().split(/\s+/) as Cell[];

// Hard totals — no Ace, or every Ace is forced to count as 1.
//                          2  3  4  5  6  7  8  9  10 A
export const HARD: Record<number, Cell[]> = {
  8: row("                   H  H  H  H  H  H  H  H  H  H"), // 8 or less
  9: row("                   H  D  D  D  D  H  H  H  H  H"),
  10: row("                  D  D  D  D  D  D  D  D  H  H"),
  11: row("                  D  D  D  D  D  D  D  D  D  H"),
  12: row("                  H  H  S  S  S  H  H  H  H  H"),
  13: row("                  S  S  S  S  S  H  H  H  H  H"),
  14: row("                  S  S  S  S  S  H  H  H  H  H"),
  15: row("                  S  S  S  S  S  H  H  H  H  H"),
  16: row("                  S  S  S  S  S  H  H  H  H  H"),
  17: row("                  S  S  S  S  S  S  S  S  S  S"), // 17 or more
};

// Soft totals — an Ace counting as 11. Row key is the total (A,7 = soft 18).
//                          2  3  4  5  6  7  8  9  10 A
export const SOFT: Record<number, Cell[]> = {
  13: row("                  H  H  H  D  D  H  H  H  H  H"), // A,2
  14: row("                  H  H  H  D  D  H  H  H  H  H"), // A,3
  15: row("                  H  H  D  D  D  H  H  H  H  H"), // A,4
  16: row("                  H  H  D  D  D  H  H  H  H  H"), // A,5
  17: row("                  H  D  D  D  D  H  H  H  H  H"), // A,6
  18: row("                  S  Ds Ds Ds Ds S  S  H  H  H"), // A,7
  19: row("                  S  S  S  S  S  S  S  S  S  S"), // A,8
  20: row("                  S  S  S  S  S  S  S  S  S  S"), // A,9
};

// Pairs — row key is the value of one card (11 = Aces).
//                          2  3  4  5  6  7  8  9  10 A
export const PAIRS: Record<number, Cell[]> = {
  11: row("                  P  P  P  P  P  P  P  P  P  P"), // A,A
  10: row("                  S  S  S  S  S  S  S  S  S  S"), // 10,10
  9: row("                   P  P  P  P  P  S  P  P  S  S"),
  8: row("                   P  P  P  P  P  P  P  P  P  P"),
  7: row("                   P  P  P  P  P  P  H  H  H  H"),
  6: row("                   P  P  P  P  P  H  H  H  H  H"),
  5: row("                   D  D  D  D  D  D  D  D  H  H"), // never split 5s: play as hard 10
  4: row("                   H  H  H  P  P  H  H  H  H  H"),
  3: row("                   P  P  P  P  P  P  H  H  H  H"),
  2: row("                   P  P  P  P  P  P  H  H  H  H"),
};

export interface Situation {
  cards: Card[];
  dealerUp: Card;
  canDouble: boolean;
  canSplit: boolean;
}

export interface Recommendation {
  action: Action;
  /** The raw chart entry, before "if allowed" is resolved. */
  cell: Cell;
  /** Where in the chart this came from — the UI highlights it. */
  table: TableName;
  rowKey: number;
  upValue: number;
}

export function columnIndex(upValue: number): number {
  return DEALER_UPCARDS.indexOf(upValue as (typeof DEALER_UPCARDS)[number]);
}

/** Which chart row applies to this hand. */
export function lookup(s: Situation): { table: TableName; rowKey: number } {
  if (s.canSplit && isPair(s.cards)) {
    return { table: "pair", rowKey: cardValue(s.cards[0]) };
  }
  const { total, soft } = handTotal(s.cards);
  if (soft && total >= 13 && total <= 20) return { table: "soft", rowKey: total };
  // A,A you can't split is soft 12: always hit, like hard 8 and under.
  if (soft && total === 12) return { table: "hard", rowKey: 8 };
  return { table: "hard", rowKey: Math.min(Math.max(total, 8), 17) };
}

export function cellFor(table: TableName, rowKey: number, upValue: number): Cell {
  const rows = table === "hard" ? HARD : table === "soft" ? SOFT : PAIRS;
  return rows[rowKey][columnIndex(upValue)];
}

export function resolveCell(cell: Cell, canDouble: boolean): Action {
  switch (cell) {
    case "H":
      return "hit";
    case "S":
      return "stand";
    case "P":
      return "split";
    case "D":
      return canDouble ? "double" : "hit";
    case "Ds":
      return canDouble ? "double" : "stand";
  }
}

export function recommend(s: Situation): Recommendation {
  const upValue = cardValue(s.dealerUp);
  const { table, rowKey } = lookup(s);
  const cell = cellFor(table, rowKey, upValue);
  return { action: resolveCell(cell, s.canDouble), cell, table, rowKey, upValue };
}
