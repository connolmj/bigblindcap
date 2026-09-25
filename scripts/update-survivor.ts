/**
 * Refreshes public/data/survivor.json from nflverse's free NFL schedule/odds file.
 * Run by .github/workflows/update-survivor.yml a few times a week, or by hand:
 *   npx tsx scripts/update-survivor.ts
 * Only rewrites the file when the numbers actually changed.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { buildSurvivorData, NFLVERSE_GAMES_URL } from "../src/tools/survivor/model/build";

const OUT = "public/data/survivor.json";

const res = await fetch(NFLVERSE_GAMES_URL);
if (!res.ok) throw new Error(`nflverse download failed: ${res.status}`);
const data = buildSurvivorData(await res.text(), new Date().toISOString());

// Compare everything except the timestamp, so unchanged data doesn't trigger a redeploy.
const strip = (d: object) => JSON.stringify({ ...d, updated: "" });
if (existsSync(OUT) && strip(JSON.parse(readFileSync(OUT, "utf8"))) === strip(data)) {
  console.log("No changes.");
} else {
  writeFileSync(OUT, JSON.stringify(data) + "\n");
  const totalGames = data.weeks.reduce((n, w) => n + w.games.length, 0);
  console.log(
    `Wrote ${OUT}: ${data.season} season, ${totalGames} games, market lines through week ${data.lastMarketWeek}.`,
  );
}
