/**
 * nflverse games.csv → public/data/nfl-numbers.json: one small row per finished game.
 * Runs in scripts/update-nfl-numbers.ts, never in the browser.
 */
import { parseCsv } from "../../../data/csv";
import { FLAG, type GameRow, type NflNumbersData } from "./types";

const numOrNull = (s: string | undefined) => (s === undefined || s.trim() === "" ? null : Number(s));

export function buildNflNumbers(csv: string, updated: string): NflNumbersData {
  const [head, ...body] = parseCsv(csv);
  const col = (name: string) => {
    const i = head.indexOf(name);
    if (i < 0) throw new Error(`games.csv has no ${name} column`);
    return i;
  };
  const c = {
    season: col("season"),
    type: col("game_type"),
    date: col("gameday"),
    home: col("home_team"),
    away: col("away_team"),
    location: col("location"),
    result: col("result"),
    total: col("total"),
    overtime: col("overtime"),
    spread: col("spread_line"),
    totalLine: col("total_line"),
    div: col("div_game"),
    roof: col("roof"),
  };
  const played = body
    .filter((r) => r.length > c.result && r[c.result].trim() !== "")
    .sort((a, b) => a[c.date].localeCompare(b[c.date]));

  // Division pairs already met this season, keyed "season:AAA-BBB".
  const met = new Set<string>();
  const games = played.map((r): GameRow => {
    let flags = 0;
    if (r[c.type] !== "REG") flags |= FLAG.PLAYOFF;
    if (r[c.location] === "Neutral") flags |= FLAG.NEUTRAL;
    if (r[c.overtime] === "1") flags |= FLAG.OVERTIME;
    if (r[c.roof] === "dome" || r[c.roof] === "closed") flags |= FLAG.INDOORS;
    if (r[c.div] === "1") {
      flags |= FLAG.DIVISION;
      const pair = `${r[c.season]}:${[r[c.home], r[c.away]].sort().join("-")}`;
      if (met.has(pair)) flags |= FLAG.REMATCH;
      met.add(pair);
    }
    return [
      Number(r[c.season]),
      flags,
      Number(r[c.result]),
      Number(r[c.total]),
      numOrNull(r[c.spread]),
      numOrNull(r[c.totalLine]),
    ];
  });
  return { updated, games };
}
