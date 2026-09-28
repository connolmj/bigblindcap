import { describe, expect, test } from "vitest";
import { applyPlay, parseTeams, SeasonReducer, stateIndex, type State } from "./retro";
import { afterBunt, combine, stealBreakEven, value } from "./odds";
import type { Season } from "./types";

const at = (bases: number, outs = 0): State => ({ bases, outs });
const play = (s: State, text: string) => {
  const r = applyPlay(s, text)!;
  return { bases: r.bases, outs: r.outs, runs: r.runs };
};

describe("following the bases through a play", () => {
  test("hits put the batter on and move runners only as written", () => {
    expect(play(at(0), "S8/G6M")).toEqual({ bases: 1, outs: 0, runs: 0 });
    expect(play(at(1), "D9/L9L.1-3")).toEqual({ bases: 6, outs: 0, runs: 0 });
    expect(play(at(2), "S7/L7.2-H")).toEqual({ bases: 1, outs: 0, runs: 1 });
    expect(play(at(7), "HR/F78XD.3-H;2-H;1-H")).toEqual({ bases: 0, outs: 0, runs: 4 });
    expect(play(at(0), "T8/L8XD")).toEqual({ bases: 4, outs: 0, runs: 0 });
    expect(play(at(0), "DGR/F78XD")).toEqual({ bases: 2, outs: 0, runs: 0 });
  });

  test("outs, double plays and force-outs", () => {
    expect(play(at(0), "63/G6")).toEqual({ bases: 0, outs: 1, runs: 0 });
    expect(play(at(1, 1), "64(1)3/GDP/G6")).toEqual({ bases: 0, outs: 3, runs: 0 });
    expect(play(at(1), "54(1)/FO/G5")).toEqual({ bases: 1, outs: 1, runs: 0 });
    expect(play(at(3), "3(B)63(1)/GDP/G3.2-3")).toEqual({ bases: 4, outs: 2, runs: 0 });
    expect(play(at(4, 1), "9/SF/F9D.3-H")).toEqual({ bases: 0, outs: 2, runs: 1 });
    expect(play(at(2), "FC5/G56.2X3(52)")).toEqual({ bases: 1, outs: 1, runs: 0 });
  });

  test("strikeouts, walks and the forced runners a walk moves", () => {
    expect(play(at(0), "K")).toEqual({ bases: 0, outs: 1, runs: 0 });
    expect(play(at(0), "K+WP.B-1")).toEqual({ bases: 1, outs: 0, runs: 0 });
    expect(play(at(1), "W")).toEqual({ bases: 3, outs: 0, runs: 0 });
    expect(play(at(7), "W.3-H;2-3;1-2")).toEqual({ bases: 7, outs: 0, runs: 1 });
    expect(play(at(7), "HP")).toEqual({ bases: 7, outs: 0, runs: 1 });
    expect(play(at(4), "IW")).toEqual({ bases: 5, outs: 0, runs: 0 });
  });

  test("steals, caught stealing, pickoffs and errors", () => {
    expect(play(at(1), "SB2")).toEqual({ bases: 2, outs: 0, runs: 0 });
    expect(play(at(3), "SB3;SB2")).toEqual({ bases: 6, outs: 0, runs: 0 });
    expect(play(at(1), "CS2(26)")).toEqual({ bases: 0, outs: 1, runs: 0 });
    expect(play(at(1), "CS2(2E6).1-3")).toEqual({ bases: 4, outs: 0, runs: 0 });
    expect(play(at(1, 1), "K+CS2(26)/DP")).toEqual({ bases: 0, outs: 3, runs: 0 });
    expect(play(at(1), "PO1(13)")).toEqual({ bases: 0, outs: 1, runs: 0 });
    expect(play(at(4), "WP.3-H")).toEqual({ bases: 0, outs: 0, runs: 1 });
    expect(play(at(0), "E5/G56.B-2(E5/TH)")).toEqual({ bases: 2, outs: 0, runs: 0 });
    expect(play(at(1), "S8.1X3(85)")).toEqual({ bases: 1, outs: 1, runs: 0 });
    expect(play(at(1), "S8.1X3(8E5)")).toEqual({ bases: 5, outs: 0, runs: 0 });
  });

  test("NP is no play", () => {
    expect(applyPlay(at(0), "NP")).toBeNull();
  });
});

describe("a season's tallies", () => {
  const game = [
    "id,XXX202404050",
    "play,1,0,a,00,,S8/G6M",
    "play,1,0,b,00,,NP",
    "play,1,0,b,00,,D9/L9L.1-H",
    "play,1,0,c,00,,K",
    "play,1,0,d,00,,63/G6",
    "play,1,0,e,00,,8/F8",
    "play,1,1,f,00,,K",
    "play,1,1,g,00,,K",
    "play,1,1,h,00,,K",
    "play,10,0,i,00,,NP",
    "radj,x,2",
    "play,10,0,i,00,,S8/G6M.2-H",
    "play,10,0,j,00,,K",
    "play,10,0,k,00,,K",
    "play,10,0,l,00,,K",
    "radj,y,2",
    "play,10,1,m,00,,HR/F78XD.2-H",
  ];

  test("credits every state with the runs still to come, skipping unfinished innings", () => {
    const r = new SeasonReducer();
    game.forEach((l) => r.line(l));
    const s = r.result(2024);
    expect(s.halfInnings).toBe(3); // the walk-off half never made three outs
    const empty0 = stateIndex(0, 0);
    expect(s.n[empty0]).toBe(2);
    expect(s.scored[empty0]).toBe(1);
    expect(s.runs[empty0]).toBe(1);
    // Runner on second: once after the double (nothing more scored), once as the
    // extra-innings runner placed after the NP that opened the 10th (he scored).
    expect(s.n[stateIndex(2, 0)]).toBe(2);
    expect(s.scored[stateIndex(2, 0)]).toBe(1);
    expect(s.runs[stateIndex(2, 0)]).toBe(1);
    expect(s.scored[stateIndex(2, 1)]).toBe(0);
    expect(r.totalRuns).toBe(4);
  });

  test("team list skips the All-Star sides", () => {
    expect(parseTeams("ALS,A,American League,All-Stars (A)\nNYA,A,New York,Yankees\nSDN,N,San Diego,Padres\n")).toEqual(
      [
        { team: "NYA", league: "A" },
        { team: "SDN", league: "N" },
      ],
    );
  });
});

describe("odds", () => {
  const season = (year: number, fill: (i: number) => [number, number, number]): Season => {
    const rows = Array.from({ length: 24 }, (_, i) => fill(i));
    return {
      year,
      halfInnings: 10,
      n: rows.map((r) => r[0]),
      scored: rows.map((r) => r[1]),
      runs: rows.map((r) => r[2]),
    };
  };
  const seasons = [season(2023, () => [100, 30, 50]), season(2024, () => [100, 50, 70]), season(2025, () => [1, 1, 1])];

  test("combines a range of seasons", () => {
    const t = combine(seasons, 2023, 2024);
    expect(t.halfInnings).toBe(20);
    expect(value(t, 0, 0, "score")).toBeCloseTo(0.4);
    expect(value(t, 7, 2, "runs")).toBeCloseTo(0.6);
    expect(value(t, 0, 3, "runs")).toBe(0);
  });

  test("steal break-even and bunts", () => {
    const re: Record<string, number> = { "1-0": 0.9, "2-0": 1.1, "0-1": 0.25 };
    const t = combine([season(2024, (i) => [100, 0, (re[`${i & 7}-${i >> 3}`] ?? 0) * 100])], 2024, 2024);
    expect(stealBreakEven(t, 1, 0, "runs")).toBeCloseTo((0.9 - 0.25) / (1.1 - 0.25));
    expect(stealBreakEven(t, 4, 0, "runs")).toBeNull(); // runner on third: nowhere to steal
    expect(stealBreakEven(t, 5, 0, "runs")).toBeNull(); // runner on first & third: the lead is on third
    expect(stealBreakEven(t, 0, 0, "runs")).toBeNull();
    expect(afterBunt(1, 0)).toEqual({ bases: 2, outs: 1 });
    expect(afterBunt(3, 1)).toEqual({ bases: 6, outs: 2 });
    expect(afterBunt(4, 0)).toBeNull();
    expect(afterBunt(1, 2)).toBeNull();
  });
});
