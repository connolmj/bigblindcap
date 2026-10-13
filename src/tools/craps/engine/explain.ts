/**
 * Names, payouts and the "why" behind every bet. Numbers come from betMath(),
 * so they always match the table rules in play.
 */
import {
  betMath,
  HARD_PAYS,
  LAY_ODDS,
  lineWithOddsEdge,
  ODDS_NAME,
  parseSpot,
  TRUE_ODDS,
  type Rules,
  type SpotId,
} from "./bets";
import { ways, type PointNum } from "./dice";
import { GOOD_EDGE } from "./grade";
import type { RollEvent, RollResult } from "./table";

export const pct = (x: number, digits = 2) => `${(x * 100).toFixed(digits)}%`;

/** "$5", "$7.50" */
export const money = (n: number) => {
  const a = Math.abs(n);
  return "$" + (Number.isInteger(Math.round(a * 100) / 100) ? a.toFixed(0) : a.toFixed(2));
};

/** "+$12", "−$7.50", "±$0" */
export const fmtMoney = (n: number) => (Math.abs(n) < 0.005 ? "±$0" : (n > 0 ? "+" : "−") + money(n));

const PROP_LABEL = {
  any7: "Any 7",
  anyCraps: "Any Craps",
  yo: "Yo (11)",
  aces: "Aces (2)",
  aceDeuce: "Ace-Deuce (3)",
  boxcars: "Boxcars (12)",
  horn: "Horn",
};

export function spotLabel(id: SpotId): string {
  const { kind, n } = parseSpot(id);
  switch (kind) {
    case "pass":
      return "Pass Line";
    case "passOdds":
      return "Pass Line odds";
    case "dontPass":
      return "Don't Pass";
    case "dontPassOdds":
      return "Don't Pass odds";
    case "come":
      return "Come";
    case "dontCome":
      return "Don't Come";
    case "comePoint":
      return `Come ${n}`;
    case "comeOdds":
      return `Come ${n} odds`;
    case "dontComePoint":
      return `Don't Come ${n}`;
    case "dontComeOdds":
      return `Don't Come ${n} odds`;
    case "place":
      return `Place ${n}`;
    case "buy":
      return `Buy ${n}`;
    case "lay":
      return `Lay ${n}`;
    case "field":
      return "Field";
    case "big":
      return `Big ${n}`;
    case "hard":
      return `Hard ${n}`;
    default:
      return PROP_LABEL[kind];
  }
}

/** Ratio as table talk: 1.5 → "3 to 2", 7/6 → "7 to 6". */
export function ratio(x: number): string {
  for (let d = 1; d <= 6; d++) {
    const n = x * d;
    if (Math.abs(n - Math.round(n)) < 1e-9) return `${Math.round(n)} to ${d}`;
  }
  return `${x.toFixed(2)} to 1`;
}

export function paysText(id: SpotId, rules: Rules): string {
  const { kind, n } = parseSpot(id);
  switch (kind) {
    case "pass":
    case "dontPass":
    case "come":
    case "dontCome":
    case "comePoint":
    case "dontComePoint":
    case "big":
      return "1 to 1";
    case "passOdds":
    case "comeOdds":
      return n ? ratio(TRUE_ODDS[n]) : "2:1 · 3:2 · 6:5";
    case "dontPassOdds":
    case "dontComeOdds":
      return n ? ratio(LAY_ODDS[n]) : "1:2 · 2:3 · 5:6";
    case "place":
      return n === 6 || n === 8 ? "7 to 6" : n === 5 || n === 9 ? "7 to 5" : "9 to 5";
    case "buy":
      return rules.vig === "win" ? "2 to 1, less 5% on wins" : "2 to 1, 5% up front";
    case "lay":
      return rules.vig === "win" ? "1 to 2, less 5% on wins" : "1 to 2, 5% up front";
    case "field":
      return `1 to 1 · 2 pays 2× · 12 pays ${rules.field12}×`;
    case "hard":
      return `${HARD_PAYS[n as 4 | 6 | 8 | 10]} to 1`;
    case "any7":
      return "4 to 1";
    case "anyCraps":
      return "7 to 1";
    case "yo":
    case "aceDeuce":
      return "15 to 1";
    case "aces":
    case "boxcars":
      return "30 to 1";
    case "horn":
      return "27 to 4 on 2/12 · 3 to 1 on 3/11";
  }
}

/** How the trainer files each bet in the progress panel. */
export type Group = "line" | "odds" | "numbers" | "field" | "hard" | "props";

export const GROUP_LABEL: Record<Group, string> = {
  line: "Pass, Don't, Come",
  odds: "Odds",
  numbers: "Place, Buy, Lay",
  field: "Field & Big 6/8",
  hard: "Hardways",
  props: "One-roll props",
};

export function groupOf(id: SpotId): Group {
  const { kind } = parseSpot(id);
  if (kind === "pass" || kind === "dontPass" || kind === "come" || kind === "dontCome") return "line";
  if (kind.endsWith("Odds")) return "odds";
  if (kind === "place" || kind === "buy" || kind === "lay") return "numbers";
  if (kind === "field" || kind === "big") return "field";
  if (kind === "hard") return "hard";
  return "props";
}

const NUM_WORD: Record<number, string> = { 4: "4", 5: "5", 6: "6", 8: "8", 9: "9", 10: "10" };

/** Why this bet is (or isn't) worth making, in a sentence or three. */
export function whyBet(id: SpotId, rules: Rules, point: PointNum | null): string {
  const { kind, n } = parseSpot(id);
  const e = (x: SpotId) => pct(betMath(x, rules, point ?? undefined).edge);
  const comboEdge = pct(lineWithOddsEdge(rules, false), 2);
  switch (kind) {
    case "pass":
      return `A ${e("pass")} house edge — one of the best bets in the casino. Once a point is set, back it with odds: they pay true odds, so with ${ODDS_NAME[rules.odds]} your edge across the whole bet drops to ${comboEdge}.`;
    case "come":
      return `A Come bet is a Pass Line bet made after the point: 7 or 11 wins, 2, 3 or 12 loses, anything else becomes its own point. Same ${e("come")} edge, and you can add odds once it moves.`;
    case "dontPass":
      return `The lowest edge of any flat bet: ${e("dontPass")}. A 12 on the come-out is a push ("bar 12") — that's the house's whole edge. Once a point is set you're the favourite; lay odds behind it.`;
    case "dontCome":
      return `A Don't Pass bet made after the point: 2 or 3 wins, 12 pushes, 7 or 11 loses, and anything else becomes a number you want the 7 to beat. ${e("dontCome")} edge.`;
    case "passOdds":
    case "comeOdds":
      return `Odds pay exactly what the dice say — 2 to 1 on 4 and 10, 3 to 2 on 5 and 9, 6 to 5 on 6 and 8. Zero house edge: the only fair bet in the casino. Take as much as you can afford.`;
    case "dontPassOdds":
    case "dontComeOdds":
      return `Laying odds is the zero-edge side bet for Don't players: you risk more than you win (2 to win 1 on the 4 and 10), because the 7 is now more likely than the number. No house edge.`;
    case "place": {
      const w = ways(n!);
      if (n === 6 || n === 8)
        return `The ${n} rolls ${w} ways to the 7's 6, so fair odds are 6 to 5; Place pays 7 to 6. That small gap is a ${e(id)} edge — the best number bet. Bet in $6 units so it pays in whole dollars.`;
      if (n === 5 || n === 9)
        return `Pays 7 to 5 against fair odds of 3 to 2 — a ${e(id)} edge. A Come bet that lands on the ${NUM_WORD[n!]} with odds behind it covers the same number for far less.`;
      return `Pays 9 to 5 against fair odds of 2 to 1 — a ${e(id)} edge. ${
        betMath(`buy${n as 4 | 10}`, rules).edge <= GOOD_EDGE
          ? `Buy the ${n} instead: it pays 2 to 1 less a 5% commission on wins, a ${e(`buy${n as 4 | 10}`)} edge.`
          : `A Come bet with odds is the cheaper way to get on the ${n}.`
      }`;
    }
    case "buy":
      return rules.vig === "win"
        ? `Buying the ${n} gets true 2 to 1 odds for a 5% commission, taken only when you win. That's a ${e(id)} edge — much better than placing it (${e(`place${n!}`)}).`
        : `Buying gets true 2 to 1 odds, but this table takes the 5% commission up front — win or lose. That makes it ${e(id)}. Where the vig is only charged on wins it drops to 1.67%.`;
    case "lay":
      return rules.vig === "win"
        ? `Laying the ${n} bets a 7 comes first, at true odds of 1 to 2, less 5% of what you win. A ${e(id)} edge.`
        : `Laying the ${n} pays true 1 to 2 odds, but with the 5% commission charged up front it's ${e(id)}. A Don't Come bet with lay odds does the same job for less.`;
    case "field": {
      return `The Field wins on 7 of the 11 numbers — but they're the ones that roll least: only 16 of 36 rolls. Even with the 2${rules.field12 === 3 ? " and 12" : ""} paying extra it's a ${e("field")} edge, and it's settled every roll, so the edge bites fast.`;
    }
    case "big":
      return `Big ${n} pays even money for exactly what Place ${n} pays 7 to 6 on. ${e(id)} versus ${e(`place${n!}`)} — there's never a reason to make it.`;
    case "hard": {
      const easy = ways(n!) - 1;
      return `Hard ${n} needs ${n! / 2}-${n! / 2} before a 7 or an easy ${n}: 1 way to win against ${6 + easy} to lose. It pays ${HARD_PAYS[n as 4 | 6 | 8 | 10]} to 1 when fair odds are ${6 + easy} to 1 — a ${e(id)} edge.`;
    }
    case "any7":
      return `The 7 rolls 6 times in 36 — fair odds are 5 to 1, and it pays 4 to 1. A ${e(id)} edge, the worst bet on the table.`;
    case "anyCraps":
      return `2, 3 or 12 roll 4 times in 36 — fair odds 8 to 1, paid 7 to 1. ${e(id)}.`;
    case "yo":
      return `11 rolls 2 ways in 36 — fair odds 17 to 1, paid 15 to 1. ${e(id)}, settled in a single roll.`;
    case "aceDeuce":
      return `3 rolls 2 ways in 36 — fair odds 17 to 1, paid 15 to 1. ${e(id)}.`;
    case "aces":
    case "boxcars":
      return `${kind === "aces" ? "Aces (1-1)" : "Boxcars (6-6)"} rolls once in 36 — fair odds 35 to 1, paid 30 to 1. ${e(id)}.`;
    case "horn":
      return `Four bets in one: a quarter each on 2, 3, 11 and 12. Whichever hits is paid; the other three lose. ${e(id)}.`;
    default:
      return "";
  }
}

export const EVENT_TITLE: Record<RollEvent, (r: RollResult) => string> = {
  natural: (r) => `${r.dice[0] + r.dice[1]} — winner on the come-out`,
  craps: (r) => `Craps ${r.dice[0] + r.dice[1]}`,
  pointSet: (r) => `The point is ${r.dice[0] + r.dice[1]}`,
  pointMade: (r) => `Winner! Point ${r.point} made`,
  sevenOut: () => "Seven out",
  noDecision: (r) =>
    `${r.dice[0] + r.dice[1]}${r.dice[0] === r.dice[1] ? " the hard way" : ""} — point is still ${r.point}`,
};

export const EVENT_DETAIL: Record<RollEvent, string> = {
  natural: "Pass Line wins, Don't Pass loses. New come-out.",
  craps: "Pass Line loses. Don't Pass wins on 2 or 3; 12 is a push.",
  pointSet: "Pass Line now needs the point before a 7.",
  pointMade: "Pass Line wins, Don't Pass loses. New come-out.",
  sevenOut: "Pass Line and numbers lose, Don't wins. New shooter.",
  noDecision: "Line bets ride. Number and one-roll bets settle.",
};
