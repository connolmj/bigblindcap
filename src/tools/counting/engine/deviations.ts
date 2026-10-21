/**
 * Count plays: the spots where the count changes the right move. These are
 * the "Illustrious 18" for 6 decks, dealer stands on soft 17 (insurance is
 * the 18th; this table has none). Each spot has a true-count index: at that
 * count or higher, make the `atOrAbove` play; below it, the `below` play.
 * One of the two is always the basic strategy play.
 */
import { cardValue } from "../../blackjack/engine/cards";
import {
  cellFor,
  lookup,
  recommend,
  resolveCell,
  type Cell,
  type Recommendation,
  type Situation,
  type TableName,
} from "../../blackjack/engine/strategy";

export interface Deviation {
  table: Extract<TableName, "hard" | "pair">;
  /** Hard total, or the pair's card value. */
  row: number;
  /** Dealer up card, Ace = 11. */
  up: number;
  index: number;
  atOrAbove: Cell;
  below: Cell;
}

const d = (table: Deviation["table"], row: number, up: number, index: number, atOrAbove: Cell, below: Cell) => ({
  table,
  row,
  up,
  index,
  atOrAbove,
  below,
});

export const DEVIATIONS: Deviation[] = [
  d("hard", 16, 10, 0, "S", "H"),
  d("hard", 15, 10, 4, "S", "H"),
  d("pair", 10, 5, 5, "P", "S"),
  d("pair", 10, 6, 4, "P", "S"),
  d("hard", 10, 10, 4, "D", "H"),
  d("hard", 12, 3, 2, "S", "H"),
  d("hard", 12, 2, 3, "S", "H"),
  d("hard", 11, 11, 1, "D", "H"),
  d("hard", 9, 2, 1, "D", "H"),
  d("hard", 10, 11, 4, "D", "H"),
  d("hard", 9, 7, 3, "D", "H"),
  d("hard", 16, 9, 5, "S", "H"),
  d("hard", 13, 2, -1, "S", "H"),
  d("hard", 12, 4, 0, "S", "H"),
  d("hard", 12, 5, -2, "S", "H"),
  d("hard", 12, 6, -1, "S", "H"),
  d("hard", 13, 3, -2, "S", "H"),
];

export function findDeviation(table: TableName, row: number, up: number): Deviation | undefined {
  return DEVIATIONS.find((v) => v.table === table && v.row === row && v.up === up);
}

export interface Advice {
  /** The right play at this count. */
  rec: Recommendation;
  /** What basic strategy alone says. */
  basic: Recommendation;
  /** Set when this is a count spot, whether or not the count reached the index. */
  deviation?: Deviation;
  /** True when the count changed the play. */
  deviates: boolean;
}

export function advise(s: Situation, tc: number): Advice {
  const basic = recommend(s);
  const { table, rowKey } = lookup(s);
  const deviation = findDeviation(table, rowKey, cardValue(s.dealerUp));
  if (!deviation) return { rec: basic, basic, deviates: false };
  const cell = tc >= deviation.index ? deviation.atOrAbove : deviation.below;
  const rec = { ...basic, cell, action: resolveCell(cell, s.canDouble) };
  return { rec, basic, deviation, deviates: rec.action !== basic.action };
}

/** The chart's play for a spot — used by tests to check each deviation against basic strategy. */
export const basicCell = (v: Deviation) => cellFor(v.table, v.row, v.up);
