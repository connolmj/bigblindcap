// Sports picks: parse the picks tab of the sheet and reduce it to records and units.

import { normalizeDate, parseCsv } from "./csv";
import { fmtUnits } from "./format";

export const LEAGUES = ["NFL", "NCAAF", "MLB", "NBA", "NCAAB", "NHL"];
export const CURRENT_SEASON = "2026";
/** Sports bankroll at day one, in units. */
export const SPORTS_START = 150;

export type ResultTag = "WIN" | "LOSS" | "PUSH";

export interface GradedPick {
  season: string;
  date: string;
  sortKey: number;
  league: string;
  pick: string;
  odds: string;
  tag: ResultTag;
  stake: number;
  u: number;
  delta: string;
}

export interface PendingPick {
  time: string;
  league: string;
  pick: string;
  game: string;
  line: string;
  units: string;
  dateLabel: string;
  sortKey: number;
}

export interface SheetRows {
  graded: GradedPick[];
  pending: PendingPick[];
}

export interface Tally {
  w: number;
  l: number;
  p: number;
  u: number;
  risked: number;
  n: number;
}

// Expected sheet header (order does not matter, extra columns ignored):
// date, league, pick, line, stake, result, game, time
const FIELD_ALIASES: Record<string, string[]> = {
  date: ["date", "day"],
  league: ["league", "lg", "sport"],
  pick: ["pick", "selection", "bet"],
  line: ["line", "odds", "price"],
  stake: ["stake", "units", "unit", "risk"],
  result: ["result", "res", "outcome", "w/l", "grade"],
  game: ["game", "matchup", "match"],
  time: ["time", "start", "kickoff", "first pitch"],
};

// -110 -> 0.909 profit per unit; +124 -> 1.24. Blank falls back to -110.
export function payout(line: string): number {
  const n = parseFloat(String(line).replace(/[^0-9+\-.]/g, ""));
  if (!isFinite(n) || n === 0) return 0.909;
  return n > 0 ? n / 100 : 100 / Math.abs(n);
}

// Display form of the sheet's line: 150 -> "+150", -110 -> "−110", blank -> "—".
// Sheets turns a typed "+150" into the number 150, so the sign is added back here.
export function fmtOdds(line: string): string {
  const n = parseFloat(String(line).replace(/[^0-9+\-.]/g, ""));
  if (!isFinite(n) || n === 0) return "—";
  return n > 0 ? "+" + n : "−" + Math.abs(n);
}

export function parseSheet(text: string): SheetRows {
  const table = parseCsv(text);
  const graded: GradedPick[] = [];
  const pending: PendingPick[] = [];
  if (!table.length) return { graded, pending };
  const header = table[0].map((h) => h.trim().toLowerCase());
  const idx: Record<string, number> = {};
  Object.keys(FIELD_ALIASES).forEach((key) => {
    idx[key] = header.findIndex((h) => FIELD_ALIASES[key].includes(h));
  });
  const cell = (r: string[], key: string) => (idx[key] >= 0 && r[idx[key]] != null ? String(r[idx[key]]).trim() : "");

  table.slice(1).forEach((r) => {
    const pick = cell(r, "pick");
    if (!pick) return;
    const when = normalizeDate(cell(r, "date"));
    const league = cell(r, "league").toUpperCase() || "—";
    const line = cell(r, "line");
    const stakeRaw = parseFloat(cell(r, "stake").replace(/[^0-9.]/g, ""));
    const stake = isFinite(stakeRaw) && stakeRaw > 0 ? stakeRaw : 1;
    const resRaw = cell(r, "result").toUpperCase();
    const tag: ResultTag | "" = /^W/.test(resRaw)
      ? "WIN"
      : /^L/.test(resRaw)
        ? "LOSS"
        : /^(P|T)/.test(resRaw)
          ? "PUSH"
          : "";

    if (!tag) {
      pending.push({
        time: cell(r, "time") || "—",
        league,
        pick,
        game: cell(r, "game"),
        line: line || "—",
        units: stake.toFixed(1) + "u",
        dateLabel: when ? when.label : "",
        sortKey: when ? when.sortKey : 0,
      });
      return;
    }
    const u = tag === "WIN" ? Number((stake * payout(line)).toFixed(2)) : tag === "LOSS" ? -stake : 0;
    graded.push({
      season: when ? when.season : CURRENT_SEASON,
      date: when ? when.label : "—",
      sortKey: when ? when.sortKey : 0,
      league,
      pick,
      odds: fmtOdds(line),
      tag,
      stake,
      u,
      delta: fmtUnits(u),
    });
  });
  graded.sort((a, b) => b.sortKey - a.sortKey);
  pending.sort((a, b) => a.sortKey - b.sortKey);
  return { graded, pending };
}

/** Sports bankroll just before date key `k` (picks graded on earlier days). */
export function sportsBefore(graded: GradedPick[], k: number): number {
  return SPORTS_START + graded.reduce((s, p) => s + (p.sortKey && p.sortKey < k ? p.u : 0), 0);
}

// Every headline figure is a reduction of the ledger below it.
export function tally(rows: GradedPick[]): Tally {
  return rows.reduce(
    (a, r) => {
      if (r.tag === "WIN") a.w++;
      else if (r.tag === "LOSS") a.l++;
      else a.p++;
      a.u += r.u;
      a.risked += r.stake;
      a.n++;
      return a;
    },
    { w: 0, l: 0, p: 0, u: 0, risked: 0, n: 0 },
  );
}

export function inScope(p: { league: string; season?: string }, sport: string, season: string) {
  return (sport === "ALL" || p.league === sport) && (season === "ALL" || p.season === season);
}

// Seasons and leagues both come from the rows themselves, so a new season or
// a league the sheet has never carried before appears without a code change.
export function seasonsPresent(graded: GradedPick[], pending: PendingPick[]): string[] {
  const seen = new Set<string>();
  graded.forEach((p) => p.season && seen.add(p.season));
  pending.forEach((p) => p.dateLabel && seen.add("20" + p.dateLabel.slice(6, 8)));
  const list = [...seen].sort((a, b) => Number(b) - Number(a));
  return list.length ? list : [CURRENT_SEASON];
}

export function leaguesPresent(graded: GradedPick[], pending: PendingPick[]): string[] {
  const seen = new Set<string>();
  graded.forEach((p) => p.league && seen.add(p.league));
  pending.forEach((p) => p.league && seen.add(p.league));
  const found = [...seen].filter((c) => c !== "—");
  const known = LEAGUES.filter((c) => found.includes(c));
  const extra = found.filter((c) => !LEAGUES.includes(c)).sort();
  const list = known.concat(extra);
  return list.length ? list : LEAGUES;
}
