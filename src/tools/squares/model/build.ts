/**
 * Builds public/data/squares.json from nflverse play-by-play: the score at the end of
 * every quarter of every NFL game since 1999, plus every Super Bowl back to I.
 * Pure — the download lives in scripts/update-squares.ts.
 */
import { TEAMS } from "../../survivor/model/teams";
import type { SquaresData, SuperBowl } from "./types";

/** One season of nflverse play-by-play, gzipped CSV. */
export const pbpUrl = (season: number) =>
  `https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_${season}.csv.gz`;

/** First season nflverse has play-by-play for. */
export const FIRST_PBP_SEASON = 1999;

/** A score after Q1, at the half, after Q3 and at the final (overtime included). [home, away] each. */
export type Linescore = [number, number][];

export interface GameScore {
  id: string;
  season: number;
  type: string; // REG / POST
  date: string;
  home: string;
  away: string;
  q: Linescore;
}

/** The play-by-play columns we read. */
const COLS = [
  "game_id",
  "season",
  "season_type",
  "game_date",
  "home_team",
  "away_team",
  "qtr",
  "total_home_score",
  "total_away_score",
  "home_score",
  "away_score",
] as const;

/**
 * Folds play-by-play rows into one linescore per game. Scores only go up, so the score
 * after quarter N is the highest running score on any play in quarters 1..N.
 */
export class PbpReducer {
  private idx: number[] | null = null;
  private games = new Map<string, GameScore>();

  header(cols: string[]) {
    this.idx = COLS.map((c) => {
      const i = cols.indexOf(c);
      if (i < 0) throw new Error(`play-by-play is missing column ${c}`);
      return i;
    });
  }

  row(cells: string[]) {
    if (!this.idx) throw new Error("header() first");
    const [id, season, type, date, home, away, qtr, th, ta, fh, fa] = this.idx.map((i) => cells[i]);
    const q = Number(qtr);
    const h = Number(th);
    const a = Number(ta);
    let g = this.games.get(id);
    if (!g) {
      g = {
        id,
        season: Number(season),
        type,
        date,
        home,
        away,
        q: [
          [0, 0],
          [0, 0],
          [0, 0],
          [Number(fh), Number(fa)],
        ],
      };
      this.games.set(id, g);
    }
    if (!(q >= 1) || th === "NA" || ta === "NA" || !Number.isFinite(h) || !Number.isFinite(a)) return;
    for (let k = Math.min(q, 4) - 1; k < 3; k++) {
      if (h > g.q[k][0]) g.q[k][0] = h;
      if (a > g.q[k][1]) g.q[k][1] = a;
    }
  }

  result(): GameScore[] {
    return [...this.games.values()].filter((g) => Number.isFinite(g.q[3][0]) && Number.isFinite(g.q[3][1]));
  }
}

/** Splits CSV text into rows, keeping quoted commas and quoted newlines inside their field. */
export function* csvRows(lines: Iterable<string>): Generator<string[]> {
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quoted) {
        if (c === '"' && line[i + 1] === '"') {
          field += '"';
          i++;
        } else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"') quoted = true;
      else if (c === ",") {
        row.push(field);
        field = "";
      } else field += c;
    }
    if (quoted) {
      field += "\n";
      continue;
    }
    row.push(field);
    yield row;
    row = [];
    field = "";
  }
}

// Codes nflverse used before teams moved, plus the ones in TEAMS.
const OLD_NICKS: Record<string, string> = { STL: "Rams", SD: "Chargers", OAK: "Raiders", LAR: "Rams" };
export const nick = (code: string) => TEAMS[code]?.nick ?? OLD_NICKS[code] ?? code;

/**
 * Super Bowls I–XXXIII, before play-by-play. Cumulative score after each quarter,
 * [AFC/AFL team, NFC/NFL team].
 */
const EARLY_SUPER_BOWLS: [number, string, string, string][] = [
  // season, team A, team B, quarter-by-quarter points "a1 a2 a3 a4 / b1 b2 b3 b4"
  [1966, "Chiefs", "Packers", "0 10 0 0 / 7 7 14 7"],
  [1967, "Raiders", "Packers", "0 7 0 7 / 3 13 10 7"],
  [1968, "Jets", "Colts", "0 7 6 3 / 0 0 0 7"],
  [1969, "Chiefs", "Vikings", "3 13 7 0 / 0 0 7 0"],
  [1970, "Colts", "Cowboys", "0 6 0 10 / 3 10 0 0"],
  [1971, "Dolphins", "Cowboys", "0 3 0 0 / 3 7 7 7"],
  [1972, "Dolphins", "Redskins", "7 7 0 0 / 0 0 0 7"],
  [1973, "Dolphins", "Vikings", "14 3 7 0 / 0 0 0 7"],
  [1974, "Steelers", "Vikings", "0 2 7 7 / 0 0 0 6"],
  [1975, "Steelers", "Cowboys", "7 0 0 14 / 7 3 0 7"],
  [1976, "Raiders", "Vikings", "0 16 3 13 / 0 0 7 7"],
  [1977, "Broncos", "Cowboys", "0 0 10 0 / 10 3 7 7"],
  [1978, "Steelers", "Cowboys", "7 14 0 14 / 7 7 3 14"],
  [1979, "Steelers", "Rams", "3 7 7 14 / 7 6 6 0"],
  [1980, "Raiders", "Eagles", "14 0 10 3 / 0 3 0 7"],
  [1981, "Bengals", "49ers", "0 0 7 14 / 7 13 0 6"],
  [1982, "Dolphins", "Redskins", "7 10 0 0 / 0 10 3 14"],
  [1983, "Raiders", "Redskins", "7 14 14 3 / 0 3 6 0"],
  [1984, "Dolphins", "49ers", "10 6 0 0 / 7 21 10 0"],
  [1985, "Patriots", "Bears", "3 0 0 7 / 13 10 21 2"],
  [1986, "Broncos", "Giants", "10 0 0 10 / 7 2 17 13"],
  [1987, "Broncos", "Redskins", "10 0 0 0 / 0 35 0 7"],
  [1988, "Bengals", "49ers", "0 3 10 3 / 3 0 3 14"],
  [1989, "Broncos", "49ers", "3 0 7 0 / 13 14 14 14"],
  [1990, "Bills", "Giants", "3 9 0 7 / 3 7 7 3"],
  [1991, "Bills", "Redskins", "0 0 10 14 / 0 17 14 6"],
  [1992, "Bills", "Cowboys", "7 3 7 0 / 14 14 3 21"],
  [1993, "Bills", "Cowboys", "3 10 0 0 / 6 0 14 10"],
  [1994, "Chargers", "49ers", "7 3 8 8 / 14 14 14 7"],
  [1995, "Steelers", "Cowboys", "0 7 0 10 / 10 3 7 7"],
  [1996, "Patriots", "Packers", "14 0 7 0 / 10 17 8 0"],
  [1997, "Broncos", "Packers", "7 10 7 7 / 7 7 3 7"],
  [1998, "Broncos", "Falcons", "7 10 0 17 / 3 3 0 13"],
];

export function earlySuperBowls(): SuperBowl[] {
  return EARLY_SUPER_BOWLS.map(([season, a, b, pts]) => {
    const [pa, pb] = pts.split(" / ").map((s) => s.split(" ").map(Number));
    let ca = 0;
    let cb = 0;
    const q = pa.map((_, i): [number, number] => [(ca += pa[i]), (cb += pb[i])]);
    return { season, teams: [a, b], q };
  });
}

/** The Super Bowl is the last playoff game of each season. */
export function superBowlsFromPbp(games: GameScore[]): SuperBowl[] {
  const last = new Map<number, GameScore>();
  for (const g of games) {
    if (g.type !== "POST") continue;
    const cur = last.get(g.season);
    if (!cur || g.date > cur.date) last.set(g.season, g);
  }
  return [...last.values()]
    .sort((x, y) => x.season - y.season)
    .map((g) => ({ season: g.season, teams: [nick(g.home), nick(g.away)], q: g.q.map(([h, a]) => [h, a]) }));
}

/** Last digits of each game, 8 per game: Q1 home, Q1 away, half home, half away, Q3…, final… */
export function encodeDigits(games: GameScore[]): string {
  return games.map((g) => g.q.map(([h, a]) => `${h % 10}${a % 10}`).join("")).join("");
}

export function buildSquaresData(games: GameScore[], updated: string): SquaresData {
  const sorted = [...games].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : x.id < y.id ? -1 : 1));
  const seasons = sorted.map((g) => g.season);
  return {
    updated,
    nfl: {
      from: Math.min(...seasons),
      to: Math.max(...seasons),
      games: sorted.length,
      digits: encodeDigits(sorted),
    },
    superBowls: [...earlySuperBowls(), ...superBowlsFromPbp(sorted)],
  };
}
