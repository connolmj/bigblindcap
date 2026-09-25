/**
 * nflverse games.csv → the SurvivorData the page reads.
 * Runs in the scheduled GitHub Action (scripts/update-survivor.ts), never in the browser.
 */
import { parseCsv } from "../../../data/csv";
import { estimatePickShares } from "./pickpct";
import { fitRatings, projectSpread, RATING_SETTINGS, type LineObs, type Ratings } from "./ratings";
import { TEAM_CODES } from "./teams";
import type { Game, SurvivorData, Week } from "./types";
import { moneylineToHomeWin, SIGMA, spreadToWin } from "./winprob";

export const NFLVERSE_GAMES_URL = "https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv";

interface Row {
  season: number;
  week: number;
  type: string;
  date: string;
  time: string;
  home: string;
  away: string;
  neutral: boolean;
  spread: number | null;
  homeMl: number | null;
  awayMl: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

const numOrNull = (s: string | undefined) => (s === undefined || s.trim() === "" ? null : Number(s));

export function parseGames(csv: string): Row[] {
  const [head, ...body] = parseCsv(csv);
  const col = (name: string) => head.indexOf(name);
  const c = {
    season: col("season"),
    week: col("week"),
    type: col("game_type"),
    date: col("gameday"),
    time: col("gametime"),
    home: col("home_team"),
    away: col("away_team"),
    location: col("location"),
    spread: col("spread_line"),
    homeMl: col("home_moneyline"),
    awayMl: col("away_moneyline"),
    homeScore: col("home_score"),
    awayScore: col("away_score"),
  };
  return body.map((r) => ({
    season: Number(r[c.season]),
    week: Number(r[c.week]),
    type: r[c.type],
    date: r[c.date],
    time: r[c.time],
    home: r[c.home],
    away: r[c.away],
    neutral: r[c.location] === "Neutral",
    spread: numOrNull(r[c.spread]),
    homeMl: numOrNull(r[c.homeMl]),
    awayMl: numOrNull(r[c.awayMl]),
    homeScore: numOrNull(r[c.homeScore]),
    awayScore: numOrNull(r[c.awayScore]),
  }));
}

const toObs = (r: Row): LineObs => ({
  home: r.home,
  away: r.away,
  week: r.week,
  neutral: r.neutral,
  spread: r.spread!,
});

/** Ratings for `season`, starting from last season's (shrunk toward average). */
export function seasonRatings(rows: Row[], season: number): { ratings: Ratings; lastMarketWeek: number } {
  const s = RATING_SETTINGS;
  const lastYear = rows.filter((r) => r.season === season - 1 && r.type === "REG" && r.spread !== null);
  let prior: Ratings | undefined;
  if (lastYear.length) {
    const full = fitRatings(TEAM_CODES, lastYear.map(toObs), { decay: s.priorDecay, latestWeek: 18 });
    prior = {
      hfa: full.hfa,
      ratings: Object.fromEntries(Object.entries(full.ratings).map(([t, v]) => [t, v * s.carryOver])),
    };
  }
  const thisYear = rows.filter((r) => r.season === season && r.type === "REG" && r.spread !== null);
  const lastMarketWeek = thisYear.reduce((m, r) => Math.max(m, r.week), 0);
  const ratings = fitRatings(TEAM_CODES, thisYear.map(toObs), {
    prior,
    priorWeight: s.priorWeight,
    decay: s.decay,
    latestWeek: lastMarketWeek,
  });
  return { ratings, lastMarketWeek };
}

const round1 = (x: number) => Math.round(x * 10) / 10;
const round3 = (x: number) => Math.round(x * 1000) / 1000;
const roundHalf = (x: number) => Math.round(x * 2) / 2;

export function buildSurvivorData(csv: string, updated: string): SurvivorData {
  const rows = parseGames(csv);
  const season = rows.filter((r) => r.type === "REG").reduce((m, r) => Math.max(m, r.season), 0);
  const { ratings, lastMarketWeek } = seasonRatings(rows, season);

  const weeks: Week[] = [];
  for (let w = 1; w <= 18; w++) {
    const games: Game[] = rows
      .filter((r) => r.season === season && r.type === "REG" && r.week === w)
      .map((r) => {
        const market = r.spread !== null;
        const spread = market ? r.spread! : roundHalf(projectSpread(ratings, r.home, r.away, r.neutral));
        const homeWin =
          market && r.homeMl !== null && r.awayMl !== null
            ? moneylineToHomeWin(r.homeMl, r.awayMl)
            : spreadToWin(spread);
        return {
          home: r.home,
          away: r.away,
          date: r.date,
          time: r.time,
          neutral: r.neutral,
          spread,
          homeWin: round3(homeWin),
          line: market ? ("market" as const) : ("projected" as const),
          homePick: 0,
          awayPick: 0,
          homeScore: r.homeScore,
          awayScore: r.awayScore,
        };
      })
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    const shares = estimatePickShares(
      Object.fromEntries(games.flatMap((g) => [[g.home, g.homeWin] as const, [g.away, 1 - g.homeWin] as const])),
    );
    for (const g of games) {
      g.homePick = round3(shares[g.home]);
      g.awayPick = round3(shares[g.away]);
    }
    weeks.push({ week: w, games });
  }

  return {
    season,
    updated,
    lastMarketWeek,
    model: { sigma: SIGMA, hfa: round1(ratings.hfa) },
    ratings: Object.fromEntries(Object.entries(ratings.ratings).map(([t, v]) => [t, round1(v)])),
    weeks,
  };
}
