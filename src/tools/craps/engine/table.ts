/**
 * The table as a state machine. You put chips on spots, then roll; each roll
 * settles every bet that's decided, moves Come bets to their numbers and sets
 * or clears the point.
 *
 * Every new bet is graded the moment you make it. Chips you've put down since
 * the last roll can be taken back (undo), and they only count in your stats
 * once the dice are thrown.
 */
import {
  LAY_ODDS,
  maxLay,
  maxOdds,
  outcome,
  parseSpot,
  staysUpOnWin,
  upfrontVig,
  type Rules,
  type SpotId,
} from "./bets";
import { isPoint, total, type Dice, type PointNum } from "./dice";
import { gradeBet } from "./grade";

export type Bets = Partial<Record<SpotId, number>>;

export interface Decision {
  id: SpotId;
  amount: number;
  /** The point when you made it (null on a come-out). */
  point: PointNum | null;
  edge: number;
  good: boolean;
  better: SpotId | null;
  /** Expected dollars given up versus the better bet. */
  cost: number;
}

export interface Settlement {
  id: SpotId;
  amount: number;
  result: "win" | "lose" | "push" | "move" | "vig";
  /** Dollars won (+) or lost (−) — 0 for pushes and moves. */
  net: number;
  to?: PointNum;
}

export type RollEvent = "natural" | "craps" | "pointSet" | "pointMade" | "sevenOut" | "noDecision";

export interface RollResult {
  dice: Dice;
  /** The point going into the roll. */
  point: PointNum | null;
  event: RollEvent;
  settlements: Settlement[];
  net: number;
  /** Bets you made before this roll, as graded. */
  decisions: Decision[];
}

export interface TableState {
  point: PointNum | null;
  bets: Bets;
  /** Chips put down since the last roll, oldest first — for undo. */
  placed: { id: SpotId; amount: number }[];
  /** Graded bets made since the last roll. */
  pending: Decision[];
  last: RollResult | null;
  /** Recent totals, newest last. */
  history: Dice[];
  rolls: number;
}

export function newTable(): TableState {
  return { point: null, bets: {}, placed: [], pending: [], last: null, history: [], rolls: 0 };
}

export const onTable = (bets: Bets) => Object.values(bets).reduce((a, b) => a + (b ?? 0), 0);

const cents = (x: number) => Math.round(x * 100) / 100;

/** The flat bet an odds spot sits behind, and its number. */
function oddsBase(state: TableState, id: SpotId): { flat: number; n: PointNum; lay: boolean } | null {
  const { kind, n } = parseSpot(id);
  const b = state.bets;
  if (kind === "passOdds" && state.point) return { flat: b.pass ?? 0, n: state.point, lay: false };
  if (kind === "dontPassOdds" && state.point) return { flat: b.dontPass ?? 0, n: state.point, lay: true };
  if (kind === "comeOdds") return { flat: b[`come${n!}`] ?? 0, n: n!, lay: false };
  if (kind === "dontComeOdds") return { flat: b[`dontCome${n!}`] ?? 0, n: n!, lay: true };
  return null;
}

/** Most this spot can hold right now, or 0 if you can't bet it. */
export function limitFor(state: TableState, id: SpotId, rules: Rules): number {
  const { kind } = parseSpot(id);
  const on = state.point !== null;
  switch (kind) {
    case "pass":
    case "dontPass":
      return on ? 0 : Infinity;
    case "come":
    case "dontCome":
      return on ? Infinity : 0;
    case "comePoint":
    case "dontComePoint":
      return 0; // Come bets get here by rolling, not by placing
    case "passOdds":
    case "dontPassOdds":
    case "comeOdds":
    case "dontComeOdds": {
      const base = oddsBase(state, id);
      if (!base || base.flat === 0) return 0;
      return base.lay ? maxLay(rules, base.n, base.flat) : maxOdds(rules, base.n, base.flat);
    }
    default:
      return Infinity;
  }
}

/**
 * How much one click adds. Bets are sized so they pay in whole dollars:
 * Place 6/8 in $6s, and odds in steps of your flat bet (laid so they'd win it).
 */
export function stepFor(state: TableState, id: SpotId, chip: number): number {
  const { kind } = parseSpot(id);
  if (kind === "place") {
    const { n } = parseSpot(id);
    if (n === 6 || n === 8) return (chip * 6) / 5;
  }
  if (kind === "lay") return chip * 2;
  const base = oddsBase(state, id);
  if (base && base.flat > 0) {
    if (!base.lay) return base.flat;
    return cents(base.flat / LAY_ODDS[base.n]);
  }
  return chip;
}

export function canBet(state: TableState, id: SpotId, rules: Rules): boolean {
  return (state.bets[id] ?? 0) < limitFor(state, id, rules) - 0.001;
}

/** Put chips on a spot. Returns the same state if the spot can't take any more. */
export function placeChips(state: TableState, id: SpotId, chip: number, rules: Rules): TableState {
  const have = state.bets[id] ?? 0;
  const room = limitFor(state, id, rules) - have;
  const amount = cents(Math.min(stepFor(state, id, chip), room));
  if (amount <= 0.001) return state;

  const total = cents(have + amount);
  const pending = [...state.pending];
  const i = pending.findIndex((d) => d.id === id);
  if (i >= 0) {
    const d = pending[i];
    const amt = cents(d.amount + amount);
    pending.splice(i, 1);
    pending.push({ ...d, amount: amt, cost: d.cost === 0 ? 0 : (d.cost / d.amount) * amt });
  } else {
    const g = gradeBet(id, state.point, rules);
    pending.push({
      id,
      amount,
      point: state.point,
      edge: g.edge,
      good: g.good,
      better: g.better,
      cost: g.costPer * amount,
    });
  }
  return {
    ...state,
    bets: { ...state.bets, [id]: total },
    placed: [...state.placed, { id, amount }],
    pending,
  };
}

/** Odds come down with the bet they sit behind. */
function dropOrphanOdds(bets: Bets): Bets {
  const out = { ...bets };
  for (const id of Object.keys(out) as SpotId[]) {
    const { kind, n } = parseSpot(id);
    const flat =
      kind === "passOdds"
        ? out.pass
        : kind === "dontPassOdds"
          ? out.dontPass
          : kind === "comeOdds"
            ? out[`come${n!}`]
            : kind === "dontComeOdds"
              ? out[`dontCome${n!}`]
              : 1;
    if (!flat) delete out[id];
  }
  return out;
}

function takeBack(state: TableState, id: SpotId, amount: number): TableState {
  const bets = { ...state.bets };
  const left = cents((bets[id] ?? 0) - amount);
  if (left > 0) bets[id] = left;
  else delete bets[id];
  const pending = state.pending
    .map((d) => {
      if (d.id !== id) return d;
      const amt = cents(d.amount - amount);
      return { ...d, amount: amt, cost: d.amount ? (d.cost / d.amount) * amt : 0 };
    })
    .filter((d) => d.amount > 0);
  return { ...state, bets: dropOrphanOdds(bets), pending };
}

/** Take back the last chips you put down. */
export function undo(state: TableState): TableState {
  const last = state.placed[state.placed.length - 1];
  if (!last) return state;
  const next = takeBack(state, last.id, last.amount);
  // Dropped odds take their own chips with them.
  const placed = state.placed.slice(0, -1).filter((p) => next.bets[p.id] !== undefined);
  return { ...next, placed, pending: next.pending.filter((d) => next.bets[d.id] !== undefined) };
}

/** Take back everything put down since the last roll. */
export function clearNew(state: TableState): TableState {
  let s = state;
  while (s.placed.length) s = undo(s);
  return s;
}

/** Roll the dice and settle the table. */
export function roll(state: TableState, dice: Dice, rules: Rules): TableState {
  const point = state.point;
  const t = total(dice);
  const settlements: Settlement[] = [];
  const bets: Bets = {};
  const add = (id: SpotId, amount: number) => (bets[id] = cents((bets[id] ?? 0) + amount));

  // Commission on Buy and Lay bets made this roll, at upfront-vig tables.
  for (const p of state.placed) {
    const vig = cents(upfrontVig(p.id, rules) * p.amount);
    if (vig > 0) settlements.push({ id: p.id, amount: p.amount, result: "vig", net: -vig });
  }

  for (const [id, amount] of Object.entries(state.bets) as [SpotId, number][]) {
    const o = outcome(id, dice, point, rules);
    switch (o.type) {
      case "win": {
        let net = cents(o.profit * amount);
        if (staysUpOnWin(id)) {
          net = cents(net - upfrontVig(id, rules) * amount); // the bet is bought again
          add(id, amount);
        }
        settlements.push({ id, amount, result: "win", net });
        break;
      }
      case "lose":
        settlements.push({ id, amount, result: "lose", net: -amount });
        break;
      case "push":
        settlements.push({ id, amount, result: "push", net: 0 });
        break;
      case "move": {
        const dont = parseSpot(id).kind === "dontCome";
        if (id === "pass" || id === "dontPass") add(id, amount);
        else {
          add(dont ? `dontCome${o.to}` : `come${o.to}`, amount);
          settlements.push({ id, amount, result: "move", net: 0, to: o.to });
        }
        break;
      }
      case "stay":
        add(id, amount);
    }
  }

  let event: RollEvent;
  let next: PointNum | null = point;
  if (point === null) {
    if (isPoint(t)) {
      event = "pointSet";
      next = t;
    } else event = t === 7 || t === 11 ? "natural" : "craps";
  } else if (t === point) {
    event = "pointMade";
    next = null;
  } else if (t === 7) {
    event = "sevenOut";
    next = null;
  } else event = "noDecision";

  const net = cents(settlements.reduce((a, s) => a + s.net, 0));
  return {
    point: next,
    bets: dropOrphanOdds(bets),
    placed: [],
    pending: [],
    last: { dice, point, event, settlements, net, decisions: state.pending },
    history: [...state.history, dice].slice(-24),
    rolls: state.rolls + 1,
  };
}
