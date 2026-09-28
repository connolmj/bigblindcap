/**
 * Rebuilds public/data/squares.json (Super Bowl Squares) from nflverse play-by-play.
 * Downloads every season since 1999 (~20 MB each), so it's run by hand, not on a schedule:
 *   npm run update-squares
 */
import { writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";
import {
  buildSquaresData,
  csvRows,
  FIRST_PBP_SEASON,
  PbpReducer,
  pbpUrl,
  type GameScore,
} from "../src/tools/squares/model/build";

const OUT = "public/data/squares.json";

async function season(year: number): Promise<GameScore[] | null> {
  const res = await fetch(pbpUrl(year));
  if (res.status === 404) return null;
  if (!res.ok || !res.body) throw new Error(`nflverse ${year}: ${res.status}`);
  const lines = createInterface({
    input: Readable.fromWeb(res.body as never).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  const reducer = new PbpReducer();
  let first = true;
  const buffered: string[] = [];
  for await (const line of lines) buffered.push(line);
  for (const row of csvRows(buffered)) {
    if (first) {
      reducer.header(row);
      first = false;
    } else reducer.row(row);
  }
  return reducer.result();
}

const games: GameScore[] = [];
for (let y = FIRST_PBP_SEASON; y <= new Date().getFullYear(); y++) {
  const g = await season(y);
  if (!g) break;
  games.push(...g);
  console.log(`${y}: ${g.length} games`);
}

const data = buildSquaresData(games, new Date().toISOString());
writeFileSync(OUT, JSON.stringify(data) + "\n");
console.log(
  `Wrote ${OUT}: ${data.nfl.games} games ${data.nfl.from}–${data.nfl.to}, ${data.superBowls.length} Super Bowls.`,
);
