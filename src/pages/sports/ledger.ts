// Data layer for the Sports page: reads the picks Google Sheet (as CSV)
// and reduces it to the numbers the page shows. No React in here.

export const LEAGUES = ["NFL", "NCAAF", "MLB", "NBA", "NCAAB", "NHL"];
export const CURRENT_SEASON = "2026";
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1MXI-E8nCXdapBxh6hl3f2-Lb-NYeTbTISQX_zhzK5og/gviz/tq?tqx=out:csv&gid=1393032348";

export type ResultTag = "WIN" | "LOSS" | "PUSH";

export interface GradedPick {
  season: string;
  date: string;
  sortKey: number;
  league: string;
  pick: string;
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

export function fmtUnits(u: number): string {
  return (u > 0 ? "+" : u < 0 ? "−" : "") + Math.abs(u).toFixed(2) + "u";
}

export function fmtRecord(t: Tally): string {
  return t.w + "–" + t.l + (t.p ? "–" + t.p : "");
}

// -110 -> 0.909 profit per unit; +124 -> 1.24. Blank falls back to -110.
export function payout(line: string): number {
  const n = parseFloat(String(line).replace(/[^0-9+\-.]/g, ""));
  if (!isFinite(n) || n === 0) return 0.909;
  return n > 0 ? n / 100 : 100 / Math.abs(n);
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      out.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

export function normalizeDate(raw: string) {
  const s = String(raw).trim();
  let y: number, m: number, d: number;
  let mt = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (mt) {
    y = +mt[1];
    m = +mt[2];
    d = +mt[3];
  } else {
    mt = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
    if (!mt) return null;
    m = +mt[1];
    d = +mt[2];
    y = +mt[3];
    if (y < 100) y += 2000;
  }
  if (!m || !d) return null;
  return {
    label: String(m).padStart(2, "0") + "/" + String(d).padStart(2, "0") + "/" + String(y).slice(2),
    sortKey: y * 10000 + m * 100 + d,
    season: String(m >= 8 ? y : y - 1),
  };
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
