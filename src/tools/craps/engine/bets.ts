/**
 * Every bet on the layout: what it pays, when it wins, and its exact house edge.
 *
 * One function — `outcome` — says what a bet does on a roll. The table uses
 * it to settle real rolls, and `betMath` runs it over all 36 rolls to count
 * each bet's odds. So the numbers in the guide are the same rules the felt
 * pays by.
 */
import { ALL_ROLLS, isHard, POINTS, total, ways, type Dice, type PointNum } from "./dice";

export type OddsRule = "2x" | "345x" | "5x" | "10x";
/** When the 5% commission on Buy and Lay bets is charged. */
export type Vig = "win" | "upfront";

export interface Rules {
  odds: OddsRule;
  /** Field pays this many to 1 on a 12 (2 always pays double). */
  field12: 2 | 3;
  vig: Vig;
}

export const DEFAULT_RULES: Rules = { odds: "345x", field12: 3, vig: "win" };

export const ODDS_NAME: Record<OddsRule, string> = {
  "2x": "2× odds",
  "345x": "3-4-5× odds",
  "5x": "5× odds",
  "10x": "10× odds",
};

type N = PointNum;
export type SpotId =
  | "pass"
  | "passOdds"
  | "dontPass"
  | "dontPassOdds"
  | "come"
  | "dontCome"
  | `come${N}`
  | `comeOdds${N}`
  | `dontCome${N}`
  | `dontComeOdds${N}`
  | `place${N}`
  | "buy4"
  | "buy10"
  | "lay4"
  | "lay10"
  | "field"
  | "big6"
  | "big8"
  | "hard4"
  | "hard6"
  | "hard8"
  | "hard10"
  | "any7"
  | "anyCraps"
  | "yo"
  | "aces"
  | "aceDeuce"
  | "boxcars"
  | "horn";

export type Kind =
  | "pass"
  | "passOdds"
  | "dontPass"
  | "dontPassOdds"
  | "come"
  | "dontCome"
  | "comePoint"
  | "comeOdds"
  | "dontComePoint"
  | "dontComeOdds"
  | "place"
  | "buy"
  | "lay"
  | "field"
  | "big"
  | "hard"
  | "any7"
  | "anyCraps"
  | "yo"
  | "aces"
  | "aceDeuce"
  | "boxcars"
  | "horn";

const PREFIXES: [string, Kind][] = [
  ["dontComeOdds", "dontComeOdds"],
  ["dontCome", "dontComePoint"],
  ["comeOdds", "comeOdds"],
  ["come", "comePoint"],
  ["place", "place"],
  ["buy", "buy"],
  ["lay", "lay"],
  ["big", "big"],
  ["hard", "hard"],
];

/** "comeOdds6" → { kind: "comeOdds", n: 6 } */
export function parseSpot(id: SpotId): { kind: Kind; n?: PointNum } {
  const m = /^([a-zA-Z]+?)(\d+)$/.exec(id);
  if (m) {
    const kind = PREFIXES.find(([p]) => p === m[1])?.[1];
    if (kind) return { kind, n: Number(m[2]) as PointNum };
  }
  return { kind: id as Kind };
}

// ---------- Payouts, as "to 1" ratios ----------

/** Odds pay what the dice say: 2 to 1, 3 to 2, 6 to 5. */
export const TRUE_ODDS: Record<N, number> = { 4: 2, 5: 3 / 2, 6: 6 / 5, 8: 6 / 5, 9: 3 / 2, 10: 2 };
/** Laying odds is the other side: risk 2 to win 1 on the 4, and so on. */
export const LAY_ODDS: Record<N, number> = { 4: 1 / 2, 5: 2 / 3, 6: 5 / 6, 8: 5 / 6, 9: 2 / 3, 10: 1 / 2 };
export const PLACE_PAYS: Record<N, number> = { 4: 9 / 5, 5: 7 / 5, 6: 7 / 6, 8: 7 / 6, 9: 7 / 5, 10: 9 / 5 };
export const HARD_PAYS: Record<4 | 6 | 8 | 10, number> = { 4: 7, 6: 9, 8: 9, 10: 7 };
export const VIG = 0.05;

const PROP_PAYS = { any7: 4, anyCraps: 7, yo: 15, aceDeuce: 15, aces: 30, boxcars: 30 };

/** Commission per $1 bet, charged when the bet is made (upfront tables only). */
export function upfrontVig(id: SpotId, rules: Rules): number {
  if (rules.vig !== "upfront") return 0;
  const { kind, n } = parseSpot(id);
  if (kind === "buy") return VIG;
  if (kind === "lay") return VIG * LAY_ODDS[n!];
  return 0;
}

export type Outcome =
  | { type: "win"; profit: number } // per $1 bet, after any on-win commission
  | { type: "lose" }
  | { type: "push" } // money back, the bet comes down
  | { type: "stay" } // no action this roll
  | { type: "move"; to: PointNum }; // a Come / Don't Come bet travels to its number

const WIN = (profit: number): Outcome => ({ type: "win", profit });
const LOSE: Outcome = { type: "lose" };
const PUSH: Outcome = { type: "push" };
const STAY: Outcome = { type: "stay" };

/**
 * What a bet does on this roll. `point` is the point before the roll (null on
 * a come-out). Conventions, as at most casinos: Place, Buy and Hardway bets
 * and the odds on Come bets are "off" on the come-out roll; Lay bets, Big 6/8
 * and Don't Come odds always work.
 */
export function outcome(id: SpotId, dice: Dice, point: PointNum | null, rules: Rules): Outcome {
  const t = total(dice);
  const on = point !== null;
  const { kind, n } = parseSpot(id);

  const comeOut = (): Outcome =>
    t === 7 || t === 11 ? WIN(1) : t <= 3 || t === 12 ? LOSE : { type: "move", to: t as N };
  const dontComeOut = (): Outcome =>
    t === 2 || t === 3 ? WIN(1) : t === 12 ? PUSH : t === 7 || t === 11 ? LOSE : { type: "move", to: t as N };
  /** Wins if `x` rolls before a 7. */
  const before7 = (x: number, pays: number): Outcome => (t === x ? WIN(pays) : t === 7 ? LOSE : STAY);
  /** Wins if a 7 rolls before `x`. */
  const sevenFirst = (x: number, pays: number): Outcome => (t === 7 ? WIN(pays) : t === x ? LOSE : STAY);

  switch (kind) {
    case "pass":
      return on ? before7(point, 1) : comeOut();
    case "dontPass":
      return on ? sevenFirst(point, 1) : dontComeOut();
    case "passOdds":
      return on ? before7(point, TRUE_ODDS[point]) : PUSH;
    case "dontPassOdds":
      return on ? sevenFirst(point, LAY_ODDS[point]) : PUSH;
    case "come":
      return comeOut();
    case "dontCome":
      return dontComeOut();
    case "comePoint":
      return before7(n!, 1);
    case "dontComePoint":
      return sevenFirst(n!, 1);
    case "comeOdds": {
      const o = before7(n!, TRUE_ODDS[n!]);
      return !on && o.type !== "stay" ? PUSH : o; // off on the come-out: money back
    }
    case "dontComeOdds":
      return sevenFirst(n!, LAY_ODDS[n!]);
    case "place":
      return on ? before7(n!, PLACE_PAYS[n!]) : STAY;
    case "buy":
      return on ? before7(n!, TRUE_ODDS[n!] - (rules.vig === "win" ? VIG : 0)) : STAY;
    case "lay":
      return sevenFirst(n!, LAY_ODDS[n!] * (rules.vig === "win" ? 1 - VIG : 1));
    case "big":
      return before7(n!, 1);
    case "hard":
      if (!on) return STAY;
      if (t === 7) return LOSE;
      if (t !== n) return STAY;
      return isHard(dice) ? WIN(HARD_PAYS[n as 4 | 6 | 8 | 10]) : LOSE;
    case "field":
      if (t === 2) return WIN(2);
      if (t === 12) return WIN(rules.field12);
      return [3, 4, 9, 10, 11].includes(t) ? WIN(1) : LOSE;
    case "any7":
      return t === 7 ? WIN(PROP_PAYS.any7) : LOSE;
    case "anyCraps":
      return t === 2 || t === 3 || t === 12 ? WIN(PROP_PAYS.anyCraps) : LOSE;
    case "yo":
      return t === 11 ? WIN(PROP_PAYS.yo) : LOSE;
    case "aceDeuce":
      return t === 3 ? WIN(PROP_PAYS.aceDeuce) : LOSE;
    case "aces":
      return t === 2 ? WIN(PROP_PAYS.aces) : LOSE;
    case "boxcars":
      return t === 12 ? WIN(PROP_PAYS.boxcars) : LOSE;
    case "horn":
      // A quarter on each of 2, 3, 11 and 12: the winning quarter is paid, the other three lose.
      if (t === 2 || t === 12) return WIN((30 - 3) / 4);
      if (t === 3 || t === 11) return WIN((15 - 3) / 4);
      return LOSE;
  }
}

/** Bets that stay up after they win (you're paid, the bet keeps working). */
export function staysUpOnWin(id: SpotId): boolean {
  const { kind } = parseSpot(id);
  return kind === "place" || kind === "buy" || kind === "lay" || kind === "big" || kind === "hard";
}

// ---------- The math ----------

export interface BetMath {
  /** Chance the bet is decided as a win / loss / push. */
  win: number;
  lose: number;
  push: number;
  /** Average profit per $1 bet. */
  ev: number;
  /** House edge: average loss per $1 risked (bet plus any upfront commission). */
  edge: number;
  /** Average rolls until it's decided. */
  rolls: number;
  /** Average loss per $1, per roll it's working. */
  perRoll: number;
}

interface Tally {
  win: number;
  lose: number;
  push: number;
  ev: number;
  rolls: number;
}

/** A bet that sits until it's decided, the same way every roll. */
function settleOver(id: SpotId, point: PointNum, rules: Rules): Tally {
  const t: Tally = { win: 0, lose: 0, push: 0, ev: 0, rolls: 0 };
  let stay = 0;
  for (const d of ALL_ROLLS) {
    const o = outcome(id, d, point, rules);
    const p = 1 / 36;
    if (o.type === "win") {
      t.win += p;
      t.ev += p * o.profit;
    } else if (o.type === "lose") {
      t.lose += p;
      t.ev -= p;
    } else if (o.type === "push") t.push += p;
    else stay += p;
  }
  const decided = 1 - stay;
  return {
    win: t.win / decided,
    lose: t.lose / decided,
    push: t.push / decided,
    ev: t.ev / decided,
    rolls: 1 / decided,
  };
}

/** Pass / Come / Don't Pass / Don't Come: one come-out roll, then maybe a point to beat. */
function settleLine(id: "pass" | "dontPass" | "come" | "dontCome", rules: Rules): Tally {
  const dont = id === "dontPass" || id === "dontCome";
  const t: Tally = { win: 0, lose: 0, push: 0, ev: 0, rolls: 1 };
  for (const d of ALL_ROLLS) {
    const o = outcome(dont ? "dontCome" : "come", d, null, rules);
    const p = 1 / 36;
    if (o.type === "win") {
      t.win += p;
      t.ev += p * o.profit;
    } else if (o.type === "lose") {
      t.lose += p;
      t.ev -= p;
    } else if (o.type === "push") t.push += p;
    else if (o.type === "move") {
      const later = settleOver(dont ? `dontCome${o.to}` : `come${o.to}`, o.to, rules);
      t.win += p * later.win;
      t.lose += p * later.lose;
      t.ev += p * later.ev;
      t.rolls += p * later.rolls;
    }
  }
  return t;
}

/** Odds bets depend on the point; a typical point stands in when there isn't one yet. */
export function betMath(id: SpotId, rules: Rules, point: PointNum = 6): BetMath {
  const { kind, n } = parseSpot(id);
  const t =
    kind === "pass" || kind === "dontPass" || kind === "come" || kind === "dontCome"
      ? settleLine(kind, rules)
      : settleOver(id, n ?? point, rules);
  const risk = 1 + upfrontVig(id, rules);
  const ev = t.ev - upfrontVig(id, rules);
  const edge = Math.max(0, -ev / risk);
  return { win: t.win, lose: t.lose, push: t.push, ev, edge, rolls: t.rolls, perRoll: edge / t.rolls };
}

// ---------- Odds limits ----------

const ODDS_MULT: Record<OddsRule, Record<N, number>> = {
  "2x": { 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2 },
  "345x": { 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3 },
  "5x": { 4: 5, 5: 5, 6: 5, 8: 5, 9: 5, 10: 5 },
  "10x": { 4: 10, 5: 10, 6: 10, 8: 10, 9: 10, 10: 10 },
};

/** Most you can take in odds behind a flat bet on the point. */
export const maxOdds = (rules: Rules, n: N, flat: number) => ODDS_MULT[rules.odds][n] * flat;

/**
 * Most you can lay behind a Don't bet. The lay limit is set by what it would
 * win: on 3-4-5× tables you may win up to 3×/4×/5× — which works out to laying
 * 6× your flat bet on every number.
 */
export const maxLay = (rules: Rules, n: N, flat: number) => (ODDS_MULT[rules.odds][n] * flat) / LAY_ODDS[n];

/** The house edge across a Pass (or Don't Pass) bet and full odds, counting all money risked. */
export function lineWithOddsEdge(rules: Rules, dont: boolean): number {
  const flat = betMath(dont ? "dontPass" : "pass", rules);
  // Average extra money in action: odds go up only once a point is set.
  let extra = 0;
  for (const n of POINTS) extra += (ways(n) / 36) * (dont ? maxLay(rules, n, 1) : maxOdds(rules, n, 1));
  return flat.edge / (1 + extra);
}
