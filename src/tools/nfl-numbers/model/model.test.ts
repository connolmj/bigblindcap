import { describe, expect, test } from "vitest";
import { buildNflNumbers } from "./build";
import {
  BREAKEVEN,
  atLeast,
  atSpread,
  bySeason,
  exactly,
  favMargins,
  filterGames,
  inBucket,
  keyNumbers,
  share,
  summarize,
  within,
  SPREAD_BUCKETS,
  type Filter,
} from "./stats";
import { FLAG, toGame, type Game } from "./types";

const HEAD =
  "game_id,season,game_type,gameday,away_team,home_team,location,result,total,overtime,spread_line,total_line,div_game,roof";

describe("buildNflNumbers", () => {
  const csv = [
    HEAD,
    // Out of date order on purpose: the rematch is only a rematch once sorted.
    "c,2020,REG,2020-12-01,DAL,NYG,Home,-7,41,0,-3.5,44.5,1,outdoors",
    "a,2020,REG,2020-09-13,NYG,DAL,Home,3,37,1,6,48,1,dome",
    "b,2020,REG,2020-10-01,KC,BUF,Neutral,0,40,1,,,0,closed",
    "d,2020,WC,2021-01-10,DAL,NYG,Home,10,30,0,1,40,1,open",
    "e,2021,REG,2021-09-12,NYG,DAL,Home,,,,3,45,1,dome",
  ].join("\n");
  const d = buildNflNumbers(csv, "now");

  test("one row per finished game, in date order", () => {
    expect(d.updated).toBe("now");
    expect(d.games).toHaveLength(4);
    expect(d.games[0]).toEqual([2020, FLAG.DIVISION | FLAG.OVERTIME | FLAG.INDOORS, 3, 37, 6, 48]);
  });

  test("flags neutral sites, closed roofs, missing lines and playoffs", () => {
    expect(d.games[1]).toEqual([2020, FLAG.NEUTRAL | FLAG.OVERTIME | FLAG.INDOORS, 0, 40, null, null]);
    expect(toGame(d.games[3]).playoff).toBe(true);
    expect(toGame(d.games[3]).indoors).toBe(false);
  });

  test("a division pair's later meetings that season are rematches", () => {
    expect(d.games.map((g) => toGame(g).rematch)).toEqual([false, false, true, true]);
  });
});

const game = (o: Partial<Game>): Game => ({
  season: 2020,
  playoff: false,
  neutral: false,
  division: false,
  rematch: false,
  overtime: false,
  indoors: false,
  margin: 0,
  points: 40,
  spread: null,
  total: null,
  ...o,
});

describe("summarize", () => {
  const games = [
    game({ margin: 3, spread: 3, points: 41, total: 41 }), // home fav lands on the number; total lands too
    game({ margin: 7, spread: 3, points: 44, total: 41 }), // home fav covers; over
    game({ margin: -3, spread: 6, points: 37, total: 41 }), // road dog wins outright
    game({ margin: 2, spread: -4, points: 30, total: 41 }), // home dog wins outright; under
    game({ margin: 2, spread: 4, overtime: true }), // home fav wins, doesn't cover
    game({ margin: 0, spread: -1, neutral: true }), // tie at a neutral site
  ];
  const s = summarize(games);

  test("counts margins by absolute value", () => {
    expect(s.games).toBe(6);
    expect(s.marginCounts).toEqual([1, 0, 2, 2, 0, 0, 0, 1]);
    expect(s.avgMargin).toBeCloseTo(17 / 6, 10);
    expect(within(s, 3)).toEqual({ hits: 5, of: 6 });
    expect(atLeast(s, 3)).toEqual({ hits: 3, of: 6 });
    expect(exactly(s, 7)).toEqual({ hits: 1, of: 6 });
    expect(keyNumbers(s, 2)).toEqual([2, 3]);
  });

  test("home field skips neutral sites", () => {
    expect(s.homeWins).toEqual({ hits: 4, of: 5 });
    expect(s.homeMargin).toBeCloseTo(11 / 5, 10);
    expect(s.homeSpread).toBeCloseTo(12 / 5, 10);
  });

  test("favorites, pushes and the win-but-don't-cover", () => {
    expect(s.favWins).toEqual({ hits: 3, of: 5 }); // the tie is left out
    expect(s.favCovers).toEqual({ hits: 1, of: 5 }); // the push is left out
    expect(s.pushes).toEqual({ hits: 1, of: 6 });
    expect(s.favWinNoCover).toEqual({ hits: 1, of: 6 });
  });

  test("underdogs split by home and road", () => {
    expect(s.homeDogs).toEqual({ wins: { hits: 1, of: 1 }, covers: { hits: 1, of: 1 } });
    expect(s.roadDogs.wins).toEqual({ hits: 1, of: 4 });
    expect(s.roadDogs.covers).toEqual({ hits: 2, of: 3 });
    // The neutral-site dog counts toward all dogs only: tied, so no win/loss, but +1 covers.
    expect(s.dogs.wins).toEqual({ hits: 2, of: 5 });
    expect(s.dogs.covers).toEqual({ hits: 4, of: 5 });
  });

  test("totals and overtime", () => {
    expect(s.overs).toEqual({ hits: 1, of: 3 });
    expect(s.avgTotal).toBe(41);
    expect(s.avgPoints).toBeCloseTo((41 + 44 + 37 + 30 + 40 + 40) / 6, 10);
    expect(s.pointsCounts[40]).toBe(2);
    expect(s.overtime).toEqual({ hits: 1, of: 6 });
  });

  test("how far results land from the spread", () => {
    const t = summarize([game({ margin: 10, spread: 3 }), game({ margin: -4, spread: 3 })]);
    expect(t.missSd).toBe(7);
  });

  test("an empty list doesn't divide by zero", () => {
    const e = summarize([]);
    expect(e.games).toBe(0);
    expect(Number.isNaN(e.avgMargin)).toBe(true);
    expect(Number.isNaN(share(e.overs))).toBe(true);
  });
});

describe("filters and slices", () => {
  const all: Filter = { from: 2000, to: 2030, type: "all", matchup: "all", setting: "all" };
  const games = [
    game({ season: 2010, division: true }),
    game({ season: 2020, division: true, rematch: true, indoors: true }),
    game({ season: 2020, playoff: true, spread: 7, margin: 10 }),
    game({ season: 2021, spread: -7, margin: -7 }),
    game({ season: 2021, spread: 3.5, margin: 3 }),
  ];

  test("seasons, game type, matchup and setting", () => {
    expect(filterGames(games, { ...all, from: 2020 })).toHaveLength(4);
    expect(filterGames(games, { ...all, type: "post" })).toHaveLength(1);
    expect(filterGames(games, { ...all, type: "reg" })).toHaveLength(4);
    expect(filterGames(games, { ...all, matchup: "div" })).toHaveLength(2);
    expect(filterGames(games, { ...all, matchup: "nondiv" })).toHaveLength(3);
    expect(filterGames(games, { ...all, matchup: "first" })).toEqual([games[0]]);
    expect(filterGames(games, { ...all, matchup: "rematch" })).toEqual([games[1]]);
    expect(filterGames(games, { ...all, setting: "indoors" })).toEqual([games[1]]);
    expect(filterGames(games, { ...all, setting: "outdoors" })).toHaveLength(4);
  });

  test("spread lookups use the favorite's side", () => {
    expect(atSpread(games, 7)).toHaveLength(2);
    expect(favMargins(games)).toEqual(
      new Map([
        [10, 1],
        [7, 1],
        [3, 1],
      ]),
    );
    expect(inBucket(games, SPREAD_BUCKETS[1])).toHaveLength(1);
    expect(inBucket(games, SPREAD_BUCKETS[2])).toHaveLength(2);
  });

  test("one summary per season, in order", () => {
    expect(bySeason(games).map((x) => [x.season, x.summary.games])).toEqual([
      [2010, 1],
      [2020, 2],
      [2021, 2],
    ]);
  });

  test("breakeven at −110", () => {
    expect(BREAKEVEN).toBeCloseTo(0.5238, 4);
  });
});
