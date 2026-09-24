// The whole book — sports + equities — reduced to the numbers the Home and
// Equities pages show. Pure function: data in, numbers out.
import { BOOK_START, type HistoryPoint, type HistoryStart, type Position } from "./equities";
import { SPORTS_START, sportsBefore, tally, type GradedPick, type Tally } from "./picks";

export interface BookInput {
  graded: GradedPick[];
  positions: Position[];
  history: HistoryPoint[];
  histStart: HistoryStart | null;
  today?: Date;
}

export interface Book {
  /** Positions with `start` filled in (explicit > History day one > today). */
  positions: Position[];
  sports: Tally;
  sportsRoi: number;
  sportsNow: number;
  eqNow: number;
  eqStart: number;
  eqDelta: number;
  eqRoi: number;
  totalNow: number;
  allUp: number;
  allRoi: number;
  ytdUp: number;
  ytdRoi: number;
  year: number;
  /** Date key tracking began, if the History tab has it. */
  trackKey: number | null;
}

export function computeBook({ graded, positions, history, histStart: hs, today = new Date() }: BookInput): Book {
  const rows = positions.map((r) => ({ ...r }));
  const hasExplicit = rows.some((r) => r.start != null && r.start > 0);
  for (const r of rows) {
    if (r.start != null && r.start > 0) continue;
    const fromHist = hs?.tickers[r.ticker.toUpperCase()];
    r.start = fromHist != null ? fromHist : r.units;
  }
  const eqNow = rows.reduce((a, r) => a + r.units, 0);
  const eqStart = !hasExplicit && hs && hs.eq != null ? hs.eq : rows.reduce((a, r) => a + (r.start ?? 0), 0);
  const eqDelta = eqNow - eqStart;

  const sports = tally(graded);
  const sportsNow = SPORTS_START + sports.u;
  const totalNow = eqNow + sportsNow;

  // Year to date: compare against Jan 1 (or day one, if tracking began this year).
  const year = today.getFullYear();
  const jan1 = year * 10000 + 101;
  const sportsJan1 = sportsBefore(graded, jan1);
  let eqJan1 = eqStart;
  if (hs && hs.key < jan1) {
    const prior = history.filter((x) => x.key < jan1);
    if (prior.length) eqJan1 = prior[prior.length - 1].eq;
  }
  const allStart = eqStart + SPORTS_START;
  const allUp = totalNow - allStart;
  const ytdStart = eqJan1 + sportsJan1;
  const ytdUp = totalNow - ytdStart;

  return {
    positions: rows,
    sports,
    sportsRoi: sports.risked ? (sports.u / sports.risked) * 100 : 0,
    sportsNow,
    eqNow,
    eqStart,
    eqDelta,
    eqRoi: eqStart ? (eqDelta / eqStart) * 100 : 0,
    totalNow,
    allUp,
    allRoi: allStart ? (allUp / allStart) * 100 : 0,
    ytdUp,
    ytdRoi: ytdStart ? (ytdUp / ytdStart) * 100 : 0,
    year,
    trackKey: hs ? hs.key : null,
  };
}

export { BOOK_START };
