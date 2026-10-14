/**
 * Rebuilds public/data/nfl-numbers.json (every finished NFL game since 1999: score, closing
 * spread and total, a few flags) from nflverse's free schedule file, for Tools → NFL Key Numbers.
 * The daily survivor Action runs it too, so the current season stays fresh.
 *   npm run update-nfl-numbers
 */
import { writeFileSync } from "node:fs";
import { buildNflNumbers } from "../src/tools/nfl-numbers/model/build";
import { NFLVERSE_GAMES_URL } from "../src/tools/survivor/model/build";

const OUT = "public/data/nfl-numbers.json";

const res = await fetch(NFLVERSE_GAMES_URL);
if (!res.ok) throw new Error(`nflverse download failed: ${res.status}`);
const data = buildNflNumbers(await res.text(), new Date().toISOString());
// One game per line keeps the daily diff readable.
writeFileSync(
  OUT,
  `{"updated":${JSON.stringify(data.updated)},"games":[\n${data.games.map((g) => JSON.stringify(g)).join(",\n")}\n]}\n`,
);
const first = data.games[0][0];
const last = data.games.at(-1)![0];
console.log(`Wrote ${OUT}: ${first}–${last}, ${data.games.length} games.`);
