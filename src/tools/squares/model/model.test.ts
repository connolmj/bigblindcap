import { describe, expect, test } from "vitest";
import { buildSquaresData, csvRows, earlySuperBowls, PbpReducer, type GameScore } from "./build";
import {
  BOXES,
  boxOdds,
  boxValue,
  cashChance,
  parseDigits,
  rankBoxes,
  superBowlDigits,
  superBowlNumber,
  type Split,
} from "./odds";

const EVEN: Split = [0.25, 0.25, 0.25, 0.25];

describe("play-by-play → linescores", () => {
  const header =
    "game_id,season,season_type,game_date,home_team,away_team,qtr,total_home_score,total_away_score,home_score,away_score,desc";
  const plays = [
    'g1,2024,POST,2025-02-09,PHI,KC,1,0,0,40,22,"Kickoff, returned"',
    "g1,2024,POST,2025-02-09,PHI,KC,1,7,0,40,22,TD",
    "g1,2024,POST,2025-02-09,PHI,KC,2,24,0,40,22,TD",
    "g1,2024,POST,2025-02-09,PHI,KC,3,34,6,40,22,TD",
    "g1,2024,POST,2025-02-09,PHI,KC,4,40,22,40,22,END",
    "g1,2024,POST,2025-02-09,PHI,KC,4,NA,NA,40,22,timeout",
  ];

  test("score after each quarter, final from the final-score columns", () => {
    const r = new PbpReducer();
    const rows = [...csvRows([header, ...plays])];
    r.header(rows[0]);
    rows.slice(1).forEach((row) => r.row(row));
    const [g] = r.result();
    expect(g.q).toEqual([
      [7, 0],
      [24, 0],
      [34, 6],
      [40, 22],
    ]);
  });

  test("a scoreless quarter carries the score forward", () => {
    const r = new PbpReducer();
    r.header(header.split(","));
    r.row("g2,2024,REG,2024-09-08,NE,NYJ,1,3,0,13,10,x".split(","));
    r.row("g2,2024,REG,2024-09-08,NE,NYJ,3,3,7,13,10,x".split(","));
    r.row("g2,2024,REG,2024-09-08,NE,NYJ,5,13,10,13,10,x".split(","));
    expect(r.result()[0].q).toEqual([
      [3, 0],
      [3, 0],
      [3, 7],
      [13, 10],
    ]);
  });

  test("quoted commas and newlines stay in their field", () => {
    const rows = [...csvRows(['a,"b, c",d', 'e,"f', 'g",h'])];
    expect(rows).toEqual([
      ["a", "b, c", "d"],
      ["e", "f\ng", "h"],
    ]);
  });

  test("Super Bowl is the last playoff game of the season", () => {
    const game = (id: string, type: string, date: string): GameScore => ({
      id,
      season: 2024,
      type,
      date,
      home: "PHI",
      away: "KC",
      q: [
        [7, 0],
        [24, 0],
        [34, 6],
        [40, 22],
      ],
    });
    const d = buildSquaresData(
      [game("a", "REG", "2024-12-01"), game("b", "POST", "2025-01-26"), game("c", "POST", "2025-02-09")],
      "t",
    );
    expect(d.nfl.games).toBe(3);
    expect(d.nfl.digits).toBe("70404602".repeat(3));
    const last = d.superBowls.at(-1)!;
    expect(last.season).toBe(2024);
    expect(last.teams).toEqual(["Eagles", "Chiefs"]);
  });

  test("early Super Bowls add up to the known finals", () => {
    const sbs = earlySuperBowls();
    expect(sbs).toHaveLength(33);
    expect(sbs[0].q[3]).toEqual([10, 35]); // I
    expect(sbs[19].q[3]).toEqual([10, 46]); // XX
    expect(sbs[32].q[3]).toEqual([34, 19]); // XXXIII
    for (const sb of sbs)
      for (let q = 1; q < 4; q++) {
        expect(sb.q[q][0]).toBeGreaterThanOrEqual(sb.q[q - 1][0]);
        expect(sb.q[q][1]).toBeGreaterThanOrEqual(sb.q[q - 1][1]);
      }
  });
});

describe("box odds", () => {
  // 7-0 after Q1, 14-3 at the half, 17-10 after Q3, 27-10 final
  const one = parseDigits("70437070");

  test("each game is counted both ways round", () => {
    const o = boxOdds(one);
    expect(o.p[0][70]).toBe(0.5);
    expect(o.p[0][7]).toBe(0.5);
    // 7-0 in Q1 and the final (and 7-0 in Q3) is still one game won
    expect(o.any[70]).toBe(0.5);
    expect(o.any[34]).toBe(0.5);
  });

  test("every quarter's chances add to 1 and the grid is symmetric", () => {
    const o = boxOdds(parseDigits("70437070" + "33669901" + "00000000"));
    for (const q of o.p) {
      expect(q.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) expect(q[r * 10 + c]).toBe(q[c * 10 + r]);
    }
  });

  test("the average box is worth what it costs", () => {
    const o = boxOdds(parseDigits("70437070" + "33669901"));
    const total = Array.from({ length: BOXES }, (_, b) => boxValue(o, b, [0.2, 0.2, 0.2, 0.4])).reduce((s, v) => s + v);
    expect(total / BOXES).toBeCloseTo(1, 12);
  });

  test("a box that hits every final at full payout is worth 100x", () => {
    const o = boxOdds(parseDigits("12345677" + "98765477"));
    expect(boxValue(o, 77, [0, 0, 0, 1])).toBe(100);
    expect(rankBoxes(o, EVEN)[0][0]).toBe(77);
  });

  test("reverses: a quarter pays the straight box and its reverse", () => {
    // 7–0 then 3–1 then 7–0 then 7–7, home first; counted both ways round
    const o = boxOdds(parseDigits("70317077"));
    expect(o.any[70]).toBe(0.5);
    expect(o.anyRev[70]).toBe(1); // hits straight one way round, as the reverse the other
    expect(cashChance(o, 0, 70, true)).toBe(1);
    expect(cashChance(o, 0, 70, false)).toBe(0.5);
    expect(cashChance(o, 3, 77, true)).toBe(1); // doubles are their own reverse
  });

  test("reverses spread a box's value but don't change it on symmetric odds", () => {
    const o = boxOdds(parseDigits("70437070" + "33669901"));
    for (let b = 0; b < BOXES; b++) expect(boxValue(o, b, EVEN, 0.2)).toBeCloseTo(boxValue(o, b, EVEN), 12);
  });

  test("with lopsided odds, the reverse share moves value to the reverse box", () => {
    const o = boxOdds(parseDigits("70707070"));
    o.p[0][70] = 1; // pretend only home-7, away-0 ever happens
    o.p[0][7] = 0;
    expect(boxValue(o, 7, [1, 0, 0, 0], 0.2)).toBeCloseTo(20, 12);
    expect(boxValue(o, 70, [1, 0, 0, 0], 0.2)).toBeCloseTo(80, 12);
  });

  test("Super Bowl digits", () => {
    const d = superBowlDigits([
      {
        season: 1966,
        teams: ["Chiefs", "Packers"],
        q: [
          [0, 7],
          [10, 14],
          [10, 28],
          [10, 35],
        ],
      },
    ]);
    expect([...d]).toEqual([0, 7, 0, 4, 0, 8, 0, 5]);
  });

  test("Roman numerals", () => {
    expect(superBowlNumber(1966)).toBe("I");
    expect(superBowlNumber(1999)).toBe("XXXIV");
    expect(superBowlNumber(2012)).toBe("XLVII");
    expect(superBowlNumber(2025)).toBe("LX");
  });
});
