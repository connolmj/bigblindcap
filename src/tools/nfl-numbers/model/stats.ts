/**
 * Everything the NFL Key Numbers page shows, worked out in the browser from the per-game rows
 * so any mix of seasons, game types and matchups can be looked at.
 *
 * Spreads follow nflverse: `spread` is how many points the home team was favored by,
 * `margin` is home score − away score, so the home side covers when margin > spread.
 */
import type { Game } from "./types";

/** Win rate needed to break even laying −110. */
export const BREAKEVEN = 110 / 210;

/** `hits` out of `of` — kept as counts so the page can show the sample behind every rate. */
export interface Rate {
  hits: number;
  of: number;
}

export const share = (r: Rate) => (r.of ? r.hits / r.of : NaN);

export interface Side {
  /** Won outright; ties left out. */
  wins: Rate;
  /** Covered the closing spread; pushes left out. */
  covers: Rate;
}

export interface Summary {
  games: number;
  /** marginCounts[m] = games decided by exactly m points (0 = tie). */
  marginCounts: number[];
  avgMargin: number;
  /** Standard deviation of (home margin − closing spread): how far results land from the line. */
  missSd: number;
  /** Home teams (neutral sites left out). */
  homeWins: Rate;
  homeMargin: number;
  /** What the market made the home team, on average. */
  homeSpread: number;
  overtime: Rate;
  /** Games with a favorite (pick'ems left out). */
  favWins: Rate;
  favCovers: Rate;
  /** Landed exactly on the spread, out of all games with a favorite. */
  pushes: Rate;
  /** Favorite won but by less than the spread, out of all games with a favorite. */
  favWinNoCover: Rate;
  homeDogs: Side;
  roadDogs: Side;
  dogs: Side;
  /** Pushes left out. */
  overs: Rate;
  avgPoints: number;
  /** Average closing total. */
  avgTotal: number;
  /** pointsCounts[p] = games where both teams scored p points between them. */
  pointsCounts: number[];
}

const rate = (): Rate => ({ hits: 0, of: 0 });
const side = (): Side => ({ wins: rate(), covers: rate() });
const count = (r: Rate, hit: boolean) => {
  r.of++;
  if (hit) r.hits++;
};
const bump = (a: number[], i: number) => {
  while (a.length <= i) a.push(0);
  a[i]++;
};
const mean = (sum: number, n: number) => (n ? sum / n : NaN);

/** The underdog's result in one game, from its side: did it win, did it cover. */
function scoreDog(s: Side, dogMargin: number, dogLine: number) {
  if (dogMargin !== 0) count(s.wins, dogMargin > 0);
  if (dogMargin + dogLine !== 0) count(s.covers, dogMargin + dogLine > 0);
}

export function summarize(games: Game[]): Summary {
  const s: Summary = {
    games: games.length,
    marginCounts: [],
    avgMargin: NaN,
    missSd: NaN,
    homeWins: rate(),
    homeMargin: NaN,
    homeSpread: NaN,
    overtime: rate(),
    favWins: rate(),
    favCovers: rate(),
    pushes: rate(),
    favWinNoCover: rate(),
    homeDogs: side(),
    roadDogs: side(),
    dogs: side(),
    overs: rate(),
    avgPoints: NaN,
    avgTotal: NaN,
    pointsCounts: [],
  };
  let marginSum = 0;
  let pointsSum = 0;
  let homeN = 0;
  let homeSum = 0;
  let homeLineN = 0;
  let homeLineSum = 0;
  const misses: number[] = [];
  let totalN = 0;
  let totalSum = 0;

  for (const g of games) {
    const m = Math.abs(g.margin);
    bump(s.marginCounts, m);
    marginSum += m;
    bump(s.pointsCounts, g.points);
    pointsSum += g.points;
    count(s.overtime, g.overtime);

    if (!g.neutral) {
      homeN++;
      homeSum += g.margin;
      count(s.homeWins, g.margin > 0);
      if (g.spread !== null) {
        homeLineN++;
        homeLineSum += g.spread;
      }
    }

    if (g.spread !== null) {
      misses.push(g.margin - g.spread);
      if (g.spread !== 0) {
        const line = Math.abs(g.spread);
        const favMargin = g.spread > 0 ? g.margin : -g.margin;
        if (favMargin !== 0) count(s.favWins, favMargin > 0);
        if (favMargin !== line) count(s.favCovers, favMargin > line);
        count(s.pushes, favMargin === line);
        count(s.favWinNoCover, favMargin > 0 && favMargin < line);
        scoreDog(s.dogs, -favMargin, line);
        if (!g.neutral) scoreDog(g.spread < 0 ? s.homeDogs : s.roadDogs, -favMargin, line);
      }
    }

    if (g.total !== null) {
      totalN++;
      totalSum += g.total;
      if (g.points !== g.total) count(s.overs, g.points > g.total);
    }
  }

  s.avgMargin = mean(marginSum, games.length);
  s.avgPoints = mean(pointsSum, games.length);
  s.homeMargin = mean(homeSum, homeN);
  s.homeSpread = mean(homeLineSum, homeLineN);
  s.avgTotal = mean(totalSum, totalN);
  if (misses.length) {
    const avg = misses.reduce((a, b) => a + b, 0) / misses.length;
    s.missSd = Math.sqrt(misses.reduce((a, b) => a + (b - avg) ** 2, 0) / misses.length);
  }
  return s;
}

/** Games decided by `n` points or fewer (ties included). */
export function within(s: Summary, n: number): Rate {
  let hits = 0;
  for (let m = 0; m <= n && m < s.marginCounts.length; m++) hits += s.marginCounts[m];
  return { hits, of: s.games };
}

/** Games decided by `n` points or more. */
export function atLeast(s: Summary, n: number): Rate {
  const r = within(s, n - 1);
  return { hits: s.games - r.hits, of: s.games };
}

export const exactly = (s: Summary, n: number): Rate => ({ hits: s.marginCounts[n] ?? 0, of: s.games });

/** Margins ranked by how often they happen, most common first (ties left out). */
export function keyNumbers(s: Summary, count: number): number[] {
  return s.marginCounts
    .map((n, m) => ({ n, m }))
    .filter((x) => x.m > 0 && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, count)
    .map((x) => x.m);
}

// ---------- Filters ----------

export type GameType = "all" | "reg" | "post";
export type Matchup = "all" | "div" | "nondiv" | "first" | "rematch";
export type Setting = "all" | "indoors" | "outdoors";

export interface Filter {
  from: number;
  to: number;
  type: GameType;
  matchup: Matchup;
  setting: Setting;
}

export function matches(g: Game, f: Filter): boolean {
  if (g.season < f.from || g.season > f.to) return false;
  if (f.type === "reg" && g.playoff) return false;
  if (f.type === "post" && !g.playoff) return false;
  if (f.setting === "indoors" && !g.indoors) return false;
  if (f.setting === "outdoors" && g.indoors) return false;
  switch (f.matchup) {
    case "div":
      return g.division;
    case "nondiv":
      return !g.division;
    case "first":
      return g.division && !g.rematch;
    case "rematch":
      return g.rematch;
    default:
      return true;
  }
}

export const filterGames = (games: Game[], f: Filter) => games.filter((g) => matches(g, f));

// ---------- Spreads ----------

/** Games that closed with the favorite laying exactly `line` points. */
export const atSpread = (games: Game[], line: number) =>
  games.filter((g) => g.spread !== null && Math.abs(g.spread) === line);

/** The favorite's final margin (negative = the underdog won) → games, for games with a favorite. */
export function favMargins(games: Game[]): Map<number, number> {
  const out = new Map<number, number>();
  for (const g of games) {
    if (g.spread === null || g.spread === 0) continue;
    const m = g.spread > 0 ? g.margin : -g.margin;
    out.set(m, (out.get(m) ?? 0) + 1);
  }
  return out;
}

export interface SpreadBucket {
  label: string;
  lo: number;
  hi: number;
}

export const SPREAD_BUCKETS: SpreadBucket[] = [
  { label: "1 – 3", lo: 0.5, hi: 3 },
  { label: "3.5 – 6.5", lo: 3.5, hi: 6.5 },
  { label: "7 – 9.5", lo: 7, hi: 9.5 },
  { label: "10 – 13.5", lo: 10, hi: 13.5 },
  { label: "14 +", lo: 14, hi: Infinity },
];

export function inBucket(games: Game[], b: SpreadBucket): Game[] {
  return games.filter((g) => g.spread !== null && Math.abs(g.spread) >= b.lo && Math.abs(g.spread) <= b.hi);
}

// ---------- Season by season ----------

export interface Metric {
  id: string;
  label: string;
  /** "pct" values are shares (0–1); "pts" values are points. */
  kind: "pct" | "pts";
  get: (s: Summary) => number;
  /** A line worth drawing across the chart, and what it is. */
  ref?: { value: number; label: string };
}

export const METRICS: Metric[] = [
  { id: "within7", label: "Within 7", kind: "pct", get: (s) => share(within(s, 7)) },
  { id: "on3", label: "Decided by 3", kind: "pct", get: (s) => share(exactly(s, 3)) },
  { id: "on7", label: "Decided by 7", kind: "pct", get: (s) => share(exactly(s, 7)) },
  {
    id: "homeWins",
    label: "Home team wins",
    kind: "pct",
    get: (s) => share(s.homeWins),
    ref: { value: 0.5, label: "50%" },
  },
  {
    id: "homeMargin",
    label: "Home margin",
    kind: "pts",
    get: (s) => s.homeMargin,
    ref: { value: 0, label: "Even" },
  },
  {
    id: "dogCovers",
    label: "Dogs cover",
    kind: "pct",
    get: (s) => share(s.dogs.covers),
    ref: { value: BREAKEVEN, label: "52.4% to profit" },
  },
  { id: "points", label: "Points per game", kind: "pts", get: (s) => s.avgPoints },
  { id: "overs", label: "Overs", kind: "pct", get: (s) => share(s.overs), ref: { value: 0.5, label: "50%" } },
  { id: "overtime", label: "Overtime", kind: "pct", get: (s) => share(s.overtime) },
];

/** One Summary per season, oldest first. */
export function bySeason(games: Game[]): { season: number; summary: Summary }[] {
  const groups = new Map<number, Game[]>();
  for (const g of games) {
    const list = groups.get(g.season);
    if (list) list.push(g);
    else groups.set(g.season, [g]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([season, list]) => ({ season, summary: summarize(list) }));
}
