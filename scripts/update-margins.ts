/**
 * Rebuilds public/data/margins.json (NFL final margins, for Learn → Sports Betting Basics)
 * from nflverse's free schedule file. Run by hand after a season:
 *   npm run update-margins
 */
import { writeFileSync } from "node:fs";
import { buildMargins } from "../src/learn/sports-betting/model/margins";
import { NFLVERSE_GAMES_URL } from "../src/tools/survivor/model/build";

const OUT = "public/data/margins.json";

const res = await fetch(NFLVERSE_GAMES_URL);
if (!res.ok) throw new Error(`nflverse download failed: ${res.status}`);
const data = buildMargins(await res.text(), new Date().toISOString());
writeFileSync(OUT, JSON.stringify(data) + "\n");
const games = data.seasons.reduce((n, s) => n + s.games, 0);
console.log(`Wrote ${OUT}: ${data.seasons[0].year}–${data.seasons.at(-1)!.year}, ${games} games.`);
