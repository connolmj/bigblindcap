/**
 * Reads Retrosheet event files (https://www.retrosheet.org) far enough to follow the
 * bases and outs through every play, and tallies how often a run scored from each
 * base-out state. Pure — the download lives in scripts/update-runs.ts.
 *
 * Event format: https://www.retrosheet.org/eventfile.htm
 */
import type { Season } from "./types";

/** Chadwick Baseball Bureau's mirror of the Retrosheet event files. */
const RETRO = "https://raw.githubusercontent.com/chadwickbureau/retrosheet/master/seasons";
export const teamsUrl = (year: number) => `${RETRO}/${year}/TEAM${year}`;
export const eventsUrl = (year: number, team: string, league: string) => `${RETRO}/${year}/${year}${team}.EV${league}`;

/** First season the table covers. */
export const FIRST_SEASON = 2000;

/** Home teams from a TEAMyyyy file — "NYA,A,New York,Yankees" — skipping the All-Star sides. */
export function parseTeams(text: string): { team: string; league: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.split(","))
    .filter((c) => c.length >= 2 && /^[AN]$/.test(c[1]) && !/^(ALS|NLS)$/.test(c[0]))
    .map(([team, league]) => ({ team, league }));
}

/** 0–23: outs * 8 + bases, bases a bitmask (1 = first, 2 = second, 4 = third). */
export const stateIndex = (bases: number, outs: number) => outs * 8 + bases;

export interface State {
  bases: number;
  outs: number;
}

export interface PlayResult extends State {
  runs: number;
  /** Things that don't add up — a runner moved off an empty base, or a forced runner the file didn't move. */
  oddities: number;
}

/** Where a runner ends up: 0 = out, 1–3 = that base, 4 = scored. */
type Dest = 0 | 1 | 2 | 3 | 4;
/** Runner keys: 0 = batter, 1–3 = the runner who started on that base. */
type Moves = Map<number, Dest>;

const baseOf = (c: string): Dest => (c === "H" ? 4 : (Number(c) as Dest));
const runnerOf = (c: string) => (c === "B" ? 0 : Number(c));

/**
 * One play's text (the last field of a `play` record) applied to the state before it.
 * Returns null for NP (no play — a substitution break).
 */
export function applyPlay(before: State, text: string): PlayResult | null {
  const event = text.replace(/[#!?]/g, "");
  const dot = event.indexOf(".");
  const main = dot < 0 ? event : event.slice(0, dot);
  const advances = dot < 0 ? "" : event.slice(dot + 1);
  const basic = main.split("/")[0];
  if (basic === "NP") return null;

  const moves: Moves = new Map();
  let oddities = 0;
  for (const part of basic.split(/[+;]/)) {
    if (!implied(part, moves)) oddities++;
  }

  // Explicit advances override what the event implies: "1-3", "2-H(E5)", "1X2(26)".
  for (const adv of advances.split(";")) {
    const m = /^([B123])([-X])([123H])(.*)$/.exec(adv);
    if (!m) {
      if (adv) oddities++;
      continue;
    }
    const [, who, how, to, params] = m;
    // Out on the bases unless an error let him reach: "1X3(E5)" is safe at third.
    const safe = how === "-" || /E/.test(params);
    moves.set(runnerOf(who), safe ? baseOf(to) : 0);
  }

  let outs = before.outs;
  let runs = 0;
  const on: number[] = [];
  const settle = (d: Dest) => {
    if (d === 0) outs++;
    else if (d === 4) runs++;
    else on.push(d);
  };
  for (const r of [3, 2, 1]) {
    const occupied = (before.bases & (1 << (r - 1))) !== 0;
    const d = moves.get(r);
    if (!occupied) {
      if (d !== undefined) oddities++;
      continue;
    }
    settle(d ?? (r as Dest));
  }
  const b = moves.get(0);
  if (b !== undefined) settle(b);

  // Two runners on one base means the file skipped a forced advance (common on walks):
  // push the lead runner up.
  on.sort((x, y) => x - y);
  let bases = 0;
  let prev = 0;
  for (let d of on) {
    if (d <= prev) {
      d = prev + 1;
      oddities++;
    }
    prev = d;
    if (d >= 4) runs++;
    else bases |= 1 << (d - 1);
  }
  return { bases, outs, runs, oddities };
}

/** What one piece of the basic play says happened. False if we don't recognise it. */
function implied(part: string, moves: Moves): boolean {
  let m: RegExpExecArray | null;
  if (part === "") return true;
  // Plays that don't involve the batter: the advances say it all.
  if (/^(WP|PB|BK|DI|OA|FLE|OBS|NP)/.test(part)) return true;
  if ((m = /^SB([23H])/.exec(part))) {
    moves.set(m[1] === "H" ? 3 : Number(m[1]) - 1, baseOf(m[1]));
    return true;
  }
  // Caught stealing / picked off: out unless the fielders include an error.
  if ((m = /^(?:POCS|CS)([23H])(\(.*\))?/.exec(part))) {
    if (!/E/.test(m[2] ?? "")) moves.set(m[1] === "H" ? 3 : Number(m[1]) - 1, 0);
    return true;
  }
  if ((m = /^PO([123])(\(.*\))?/.exec(part))) {
    if (!/E/.test(m[2] ?? "")) moves.set(Number(m[1]), 0);
    return true;
  }
  if (/^K/.test(part)) return (moves.set(0, 0), true);
  if (/^(W|IW|I|HP|C)($|[^A-Z])/.test(part) || part === "IW") return (moves.set(0, 1), true);
  if (/^(HR|H)(\d|$)/.test(part)) return (moves.set(0, 4), true);
  if (/^DGR/.test(part)) return (moves.set(0, 2), true);
  if (/^S\d*$/.test(part)) return (moves.set(0, 1), true);
  if (/^D\d*$/.test(part)) return (moves.set(0, 2), true);
  if (/^T\d*$/.test(part)) return (moves.set(0, 3), true);
  if (/^(E|FC)\d*$/.test(part)) return (moves.set(0, 1), true);
  if (/^\d/.test(part)) {
    // Fielders: "63" batter out; "64(1)3" runner from first and batter out;
    // "54(1)" force at second, batter safe at first; "8(B)84(2)" batter and runner out.
    const outs = [...part.matchAll(/([\dE]+)(?:\(([B123])\))?/g)];
    for (const [, , who] of outs) if (who) moves.set(runnerOf(who), 0);
    const last = outs.at(-1);
    if (/E/.test(part)) moves.set(0, 1);
    else if (last && !last[2]) moves.set(0, 0);
    else if (!moves.has(0)) moves.set(0, 1);
    return true;
  }
  return false;
}

/**
 * Folds the lines of event files into a season's tallies. Only half-innings that reach
 * three outs count — a walk-off or a rain-shortened game ends one before its time.
 */
export class SeasonReducer {
  private n = Array(24).fill(0);
  private scored = Array(24).fill(0);
  private runs = Array(24).fill(0);
  private halfInnings = 0;
  /** Plays we couldn't follow cleanly, and all plays — a sanity check, not shipped. */
  oddities = 0;
  plays = 0;
  /** Every run we saw, complete half-innings or not — to check against the season's total. */
  totalRuns = 0;

  private half = "";
  private state: State = { bases: 0, outs: 0 };
  /** [state index before the play, runs on the play] for the half-inning so far. */
  private visits: [number, number][] = [];
  private radj = 0;
  private started = false;

  line(line: string) {
    const c = line.split(",");
    if (c[0] === "id") this.close();
    else if (c[0] === "radj") this.adjust(1 << (Number(c[2]) - 1));
    else if (c[0] === "play") this.play(`${c[1]}-${c[2]}`, c.slice(6).join(","));
  }

  /**
   * The extra-innings runner on second. The record comes just before the half-inning's
   * plays, or just after its opening NP.
   */
  private adjust(base: number) {
    if (this.half && !this.started) this.state.bases |= base;
    else this.radj |= base;
  }

  private play(half: string, text: string) {
    if (half !== this.half) {
      this.close();
      this.half = half;
      this.state = { bases: this.radj, outs: 0 };
      this.radj = 0;
    }
    if (this.state.outs >= 3) return;
    const r = applyPlay(this.state, text);
    if (!r) return;
    this.started = true;
    this.plays++;
    this.oddities += r.oddities;
    this.totalRuns += r.runs;
    // A pickoff throw or foul error that changes nothing isn't a new visit to the state.
    if (r.bases !== this.state.bases || r.outs !== this.state.outs || r.runs > 0)
      this.visits.push([stateIndex(this.state.bases, this.state.outs), r.runs]);
    this.state = { bases: r.bases, outs: Math.min(r.outs, 3) };
  }

  /** End of a half-inning: credit each state it passed through with the runs still to come. */
  private close() {
    if (this.half && this.state.outs === 3) {
      this.halfInnings++;
      let rest = this.visits.reduce((s, [, r]) => s + r, 0);
      for (const [i, r] of this.visits) {
        this.n[i]++;
        if (rest > 0) this.scored[i]++;
        this.runs[i] += rest;
        rest -= r;
      }
    }
    this.half = "";
    this.started = false;
    this.visits = [];
  }

  result(year: number): Season {
    this.close();
    return { year, halfInnings: this.halfInnings, n: this.n, scored: this.scored, runs: this.runs };
  }
}
