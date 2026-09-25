import { describe, expect, test } from "vitest";
import { computeBook } from "./book";
import { parseCsv } from "./csv";
import { kindOf, parseEquities, parseHistory } from "./equities";
import { fmtPct, fmtUnits } from "./format";
import { fmtOdds, parseSheet, payout, tally } from "./picks";

test("parseCsv handles quoted commas", () => {
  expect(parseCsv('a,b\n"1,5",x')).toEqual([
    ["a", "b"],
    ["1,5", "x"],
  ]);
});

test("formatting", () => {
  expect(fmtUnits(1.006)).toBe("+1.01u");
  expect(fmtUnits(-2)).toBe("−2.00u");
  expect(fmtUnits(0.001)).toBe("0.00u");
  expect(fmtPct(-3.14)).toBe("−3.1%");
});

describe("picks", () => {
  const { graded, pending } = parseSheet(
    "date,league,pick,line,stake,result\n9/20/26,NFL,Bengals -3.5,-110,2,W\n9/21/26,MLB,Mets ML,+120,1,L\n9/25/26,NFL,Lions ML,+124,1,",
  );
  test("wins pay by the line, losses cost the stake", () => {
    expect(graded.map((g) => g.u)).toEqual([-1, 1.82]);
    expect(tally(graded)).toMatchObject({ w: 1, l: 1, risked: 3 });
  });
  test("ungraded rows go on the card", () => {
    expect(pending).toHaveLength(1);
    expect(pending[0].pick).toBe("Lions ML");
  });
});

describe("equities", () => {
  test("parses positions and skips the sports row", () => {
    const rows = parseEquities('Ticker,Units\nBTC,"$1,200.50"\nSports,150\nHIMS,130');
    expect(rows.map((r) => r.ticker)).toEqual(["BTC", "HIMS"]);
    expect(rows[0].units).toBe(1200.5);
  });
  test("kinds", () => {
    expect(kindOf({ ticker: "BTC-USD", type: "", units: 1, start: null })).toBe("Crypto");
    expect(kindOf({ ticker: "Cash", type: "", units: 1, start: null })).toBe("Cash");
    expect(kindOf({ ticker: "HIMS", type: "", units: 1, start: null })).toBe("Stock");
  });
  test("history keeps the close for each day and records day one", () => {
    const h = parseHistory(
      "Date,Session,Equities,BTC\n9/22/26,Open,100,90\n9/22/26,Close,110,95\n9/23/26,Close,120,99",
    )!;
    expect(h.history).toEqual([
      { key: 20260922, eq: 110 },
      { key: 20260923, eq: 120 },
    ]);
    expect(h.histStart?.key).toBe(20260922);
  });
});

test("computeBook: starts come from History day one", () => {
  const book = computeBook({
    graded: [],
    positions: [{ ticker: "BTC", type: "", units: 1100, start: null }],
    history: [{ key: 20260922, eq: 1000 }],
    histStart: { key: 20260922, eq: 1000, tickers: { BTC: 1000 } },
    today: new Date(2026, 9, 1),
  });
  expect(book.eqStart).toBe(1000);
  expect(book.eqDelta).toBe(100);
  expect(book.eqRoi).toBe(10);
  expect(book.totalNow).toBe(1250); // 1100 equities + 150 sports bankroll
});

describe("odds", () => {
  test("adds the plus sign to unsigned plus-money lines", () => {
    expect(fmtOdds("150")).toBe("+150");
    expect(fmtOdds("+150")).toBe("+150");
    expect(fmtOdds("-110")).toBe("−110");
    expect(fmtOdds("−110")).toBe("−110");
    expect(fmtOdds("")).toBe("—");
    expect(fmtOdds("PK")).toBe("PK");
  });
  test("pays typographic-minus lines as minus odds", () => {
    expect(payout("−110")).toBeCloseTo(0.909, 3);
    expect(payout("150")).toBe(1.5);
  });
});
