/**
 * Rebuilds public/data/runs.json (MLB Run Scoring Odds) from Retrosheet play-by-play.
 * Downloads every home team's event file for every season since 2000, so it's run by
 * hand once a season, after Retrosheet publishes the new year:
 *   npm run update-runs
 * Pass a year to print one season's tallies without writing anything: npm run update-runs -- 2024
 */
import { writeFileSync } from "node:fs";
import { eventsUrl, FIRST_SEASON, parseTeams, SeasonReducer, teamsUrl } from "../src/tools/runs/model/retro";
import type { RunsData, Season } from "../src/tools/runs/model/types";

const OUT = "public/data/runs.json";

async function get(url: string): Promise<string | null> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (res.ok) return res.text();
    if (attempt >= 3) throw new Error(`${url}: ${res.status}`);
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

async function season(year: number): Promise<Season | null> {
  const teams = await get(teamsUrl(year));
  if (!teams) return null;
  const reducer = new SeasonReducer();
  const files = await Promise.all(parseTeams(teams).map(({ team, league }) => get(eventsUrl(year, team, league))));
  for (const text of files) if (text) for (const line of text.split(/\r?\n/)) reducer.line(line);
  const s = reducer.result(year);
  console.log(
    `${year}: ${s.halfInnings} half-innings, ${reducer.totalRuns} runs, ` +
      `${reducer.oddities} oddities in ${reducer.plays} plays`,
  );
  return s;
}

const only = Number(process.argv[2]);
if (only) {
  const s = await season(only);
  if (s)
    for (let i = 0; i < 24; i++)
      console.log(i >> 3, i & 7, s.n[i], (s.scored[i] / s.n[i]).toFixed(3), (s.runs[i] / s.n[i]).toFixed(3));
} else {
  const seasons: Season[] = [];
  for (let y = FIRST_SEASON; y <= new Date().getFullYear(); y++) {
    const s = await season(y);
    if (s) seasons.push(s);
  }
  const data: RunsData = { updated: new Date().toISOString(), seasons };
  writeFileSync(OUT, JSON.stringify(data) + "\n");
  console.log(`Wrote ${OUT}: ${seasons[0].year}–${seasons.at(-1)!.year}.`);
}
