/**
 * NFL final margins, for the key-numbers chart. nflverse games.csv → public/data/margins.json,
 * built by scripts/update-margins.ts; the page only reads the JSON.
 */
import { parseCsv } from "../../../data/csv";

/** public/data/margins.json */
export interface MarginsData {
  updated: string;
  seasons: MarginSeason[];
}

export interface MarginSeason {
  year: number;
  /** Finished games, regular season and playoffs. */
  games: number;
  /** counts[m] = games decided by exactly m points (0 = tie). */
  counts: number[];
}

export function buildMargins(csv: string, updated: string): MarginsData {
  const [head, ...body] = parseCsv(csv);
  const season = head.indexOf("season");
  const result = head.indexOf("result");
  const bySeason = new Map<number, number[]>();
  for (const r of body) {
    const raw = r[result];
    if (raw === undefined || raw.trim() === "") continue; // not played yet
    const year = Number(r[season]);
    const m = Math.abs(Number(raw));
    const counts = bySeason.get(year) ?? [];
    while (counts.length <= m) counts.push(0);
    counts[m]++;
    bySeason.set(year, counts);
  }
  const seasons = [...bySeason.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, counts]) => ({ year, games: counts.reduce((a, b) => a + b, 0), counts }));
  return { updated, seasons };
}

export interface MarginTable {
  from: number;
  to: number;
  games: number;
  /** share[m] = fraction of games decided by exactly m points. */
  share: number[];
}

/** Adds up the seasons from `from` to `to`, inclusive. */
export function combineMargins(seasons: MarginSeason[], from: number, to: number): MarginTable {
  const counts: number[] = [];
  let games = 0;
  for (const s of seasons) {
    if (s.year < from || s.year > to) continue;
    games += s.games;
    s.counts.forEach((n, m) => (counts[m] = (counts[m] ?? 0) + n));
  }
  return { from, to, games, share: Array.from(counts, (n) => (n ?? 0) / (games || 1)) };
}

/** Margins ranked by how often they happen, most common first (ties left out). */
export function keyNumbers(t: MarginTable, count: number): { margin: number; share: number }[] {
  return t.share
    .map((share, margin) => ({ margin, share }))
    .filter((x) => x.margin > 0)
    .sort((a, b) => b.share - a.share)
    .slice(0, count);
}
