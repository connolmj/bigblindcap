/**
 * The bets grouped the way players think of them — Place 6 and Place 8 are
 * one row, Pass and Come another. Used by the edge chart and the guide.
 */
import { betMath, parseSpot, type Kind, type Rules, type SpotId } from "../engine/bets";
import { GOOD_EDGE } from "../engine/grade";

export interface BetRow {
  label: string;
  /** The bet whose numbers stand for the row. */
  id: SpotId;
  kinds: Kind[];
  nums?: number[];
  note: string;
}

export const BET_ROWS: BetRow[] = [
  {
    label: "Odds (behind Pass / Come)",
    id: "comeOdds6",
    kinds: ["passOdds", "comeOdds"],
    note: "True odds: 2:1 · 3:2 · 6:5",
  },
  {
    label: "Lay odds (behind Don't)",
    id: "dontComeOdds6",
    kinds: ["dontPassOdds", "dontComeOdds"],
    note: "True odds: 1:2 · 2:3 · 5:6",
  },
  { label: "Don't Pass / Don't Come", id: "dontPass", kinds: ["dontPass", "dontCome"], note: "1 to 1 · 12 pushes" },
  { label: "Pass Line / Come", id: "pass", kinds: ["pass", "come"], note: "1 to 1" },
  { label: "Place 6 or 8", id: "place6", kinds: ["place"], nums: [6, 8], note: "7 to 6" },
  { label: "Buy 4 or 10", id: "buy4", kinds: ["buy"], note: "2 to 1 less 5%" },
  { label: "Lay 4 or 10", id: "lay4", kinds: ["lay"], note: "1 to 2 less 5%" },
  { label: "Field", id: "field", kinds: ["field"], note: "1 to 1 · 2 and 12 pay more" },
  { label: "Place 5 or 9", id: "place5", kinds: ["place"], nums: [5, 9], note: "7 to 5" },
  { label: "Place 4 or 10", id: "place4", kinds: ["place"], nums: [4, 10], note: "9 to 5" },
  { label: "Big 6 or 8", id: "big6", kinds: ["big"], note: "1 to 1" },
  { label: "Hard 6 or 8", id: "hard6", kinds: ["hard"], nums: [6, 8], note: "9 to 1" },
  { label: "Hard 4 or 10", id: "hard4", kinds: ["hard"], nums: [4, 10], note: "7 to 1" },
  { label: "Any Craps", id: "anyCraps", kinds: ["anyCraps"], note: "7 to 1 · one roll" },
  { label: "Yo (11) or Ace-Deuce (3)", id: "yo", kinds: ["yo", "aceDeuce"], note: "15 to 1 · one roll" },
  { label: "Horn", id: "horn", kinds: ["horn"], note: "4 bets in 1 · one roll" },
  { label: "Aces (2) or Boxcars (12)", id: "aces", kinds: ["aces", "boxcars"], note: "30 to 1 · one roll" },
  { label: "Any 7", id: "any7", kinds: ["any7"], note: "4 to 1 · one roll" },
];

export const rowFor = (id: SpotId) => {
  const { kind, n } = parseSpot(id);
  const k = kind === "comePoint" ? "come" : kind === "dontComePoint" ? "dontCome" : kind;
  return BET_ROWS.find((r) => r.kinds.includes(k) && (!r.nums || (n !== undefined && r.nums.includes(n))));
};

export const rowsByEdge = (rules: Rules) =>
  BET_ROWS.map((r) => ({ ...r, math: betMath(r.id, rules) }))
    .map((r) => ({ ...r, good: r.math.edge <= GOOD_EDGE + 1e-9 }))
    .sort((a, b) => a.math.edge - b.math.edge);
