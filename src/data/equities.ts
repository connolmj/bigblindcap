// Equities: the "Equities" tab (current positions) and the optional "History"
// tab (one row per snapshot: date, equities total, and a column per ticker).
import { normalizeDate, num, parseCsv } from "./csv";

export const BOOK_START = 3000;
export const CRYPTO = ["BTC", "ETH", "XRP", "CRV", "TRAC", "TAO", "SOL", "DOGE", "ADA", "LINK", "AVAX"];

export interface Position {
  ticker: string;
  type: string;
  units: number;
  /** Units on day one, if known. */
  start: number | null;
}

export interface HistoryPoint {
  key: number;
  eq: number;
}

export interface HistoryStart {
  key: number;
  eq: number | null;
  tickers: Record<string, number>;
}

// Last known snapshot of the Equities tab, shown only if the sheet can't be reached.
export const EQ_SAMPLE: Position[] = (
  [
    ["RSKD", 160.31],
    ["AMPL", 131.4],
    ["HIMS", 125.43],
    ["NG", 116.55],
    ["SNAP", 56.2],
    ["MELI", 54.79],
    ["CCJ", 43.93],
    ["BLND", 36.91],
    ["BKKT", 29.19],
    ["GSG", 23.15],
    ["WRD", 14.8],
    ["AIRS", 10.12],
    ["OPEN", 16.56],
    ["BTC", 1170.68],
    ["ETH", 483.98],
    ["XRP", 31.59],
    ["CRV", 214.44],
    ["TRAC", 21.64],
    ["TAO", 12.16],
    ["Cash", 100],
  ] as [string, number][]
).map(([ticker, units]) => ({ ticker, type: "", units, start: units }));

export function parseEquities(text: string): Position[] {
  const t = parseCsv(text);
  if (!t.length) return [];
  const h = t[0].map((x) => x.trim().toLowerCase());
  const col = (names: string[]) => h.findIndex((x) => names.includes(x));
  const iT = Math.max(0, col(["ticker", "symbol", "name"]));
  const iK = col(["type", "class", "kind"]);
  const iU = col(["units", "unit", "$ amount", "amount", "value"]);
  const iS = col(["start", "starting units", "start units", "cost", "basis"]);
  const rows: Position[] = [];
  for (const r of t.slice(1)) {
    const ticker = String(r[iT] || "").trim();
    const units = num(r[iU >= 0 ? iU : 1]);
    if (!ticker || units == null || ticker.toLowerCase() === "sports") continue;
    const start = iS >= 0 ? num(r[iS]) : null;
    rows.push({ ticker, type: iK >= 0 ? String(r[iK] || "").trim() : "", units, start });
  }
  return rows;
}

export function parseHistory(text: string): { history: HistoryPoint[]; histStart: HistoryStart | null } | null {
  const t = parseCsv(text);
  if (!t.length) return null;
  const h = t[0].map((x) => x.trim().toLowerCase());
  const iD = h.indexOf("date");
  const iE = h.indexOf("equities");
  if (iD < 0 || iE < 0) return null;
  // Open and Close rows can share a date; keep the last row per day (the close).
  const iS = h.indexOf("session");
  const perDay: Record<number, HistoryPoint> = {};
  for (const r of t.slice(1)) {
    const d = normalizeDate(r[iD]);
    const v = num(r[iE]);
    if (!d || v == null) continue;
    const isClose = iS < 0 || /close|daily/i.test(r[iS] || "");
    if (!perDay[d.sortKey] || isClose) perDay[d.sortKey] = { key: d.sortKey, eq: v };
  }
  const history = Object.values(perDay).sort((a, b) => a.key - b.key);

  // Day one = earliest dated row; its ticker columns are each position's start.
  let first: { key: number; row: string[] } | null = null;
  for (const r of t.slice(1)) {
    const d = normalizeDate(r[iD]);
    if (d && (!first || d.sortKey < first.key)) first = { key: d.sortKey, row: r };
  }
  let histStart: HistoryStart | null = null;
  if (first) {
    const tickers: Record<string, number> = {};
    h.forEach((name, i) => {
      if (i === iD || i === iE || !name) return;
      const v = num(first!.row[i]);
      if (v != null) tickers[name.toUpperCase()] = v;
    });
    histStart = { key: first.key, eq: num(first.row[iE]), tickers };
  }
  return { history, histStart };
}

export type Kind = "Stock" | "Crypto" | "Cash";

export function kindOf(p: Position): Kind {
  const t = p.ticker.toUpperCase().replace(/-USD$/, "");
  const typed = (p.type || "").toLowerCase();
  if (t === "CASH" || typed === "cash") return "Cash";
  if (typed === "crypto" || CRYPTO.includes(t)) return "Crypto";
  return "Stock";
}

export const displayTicker = (p: Position) =>
  p.ticker.toUpperCase() === "CASH" ? "Cash" : p.ticker.toUpperCase().replace(/-USD$/, "");
