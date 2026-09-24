// Deterministic stand-in ledger shown until the sheet feed loads (or if it fails).
import { fmtUnits } from "./format";
import { LEAGUES, type GradedPick, type PendingPick, type ResultTag } from "./picks";

const PICK_SEEDS: Record<string, string[]> = {
  NFL: [
    "Bengals −3.5",
    "Under 41.5 — HOU/TEN",
    "Seahawks +6.5",
    "Lions ML",
    "Dolphins −2.5",
    "Over 44.0 — KC/LAC",
    "Ravens −7.5",
    "Jets ML",
    "Packers −1.5",
    "Under 38.0 — NYG/WAS",
  ],
  NCAAF: [
    "Oregon −14.5",
    "Under 52.5 — LSU/BAMA",
    "Kansas St +3.0",
    "Utah ML",
    "Tulane −6.5",
    "Over 61.0 — TTU/BAY",
    "Iowa −2.5",
    "Boise St −9.0",
  ],
  MLB: [
    "Mariners −1.5",
    "Under 7.5 — SD/SF",
    "Guardians ML",
    "Rays +1.5",
    "Over 8.5 — COL/ARI",
    "Astros ML",
    "Brewers −1.5",
    "Mets ML",
  ],
  NBA: ["Thunder −4.5", "Under 221.5 — BOS/NYK", "Magic +5.5", "Nuggets ML"],
  NCAAB: ["Houston −8.5", "Under 138.0 — VIR/UNC", "Purdue −5.0"],
  NHL: ["Panthers ML", "Under 5.5 — NYR/CAR", "Oilers −1.5"],
};

const IN_SEASON: Record<string, number[]> = {
  NFL: [9, 10, 11, 12, 1],
  NCAAF: [9, 10, 11, 12],
  MLB: [4, 5, 6, 7, 8, 9],
  NBA: [10, 11, 12, 1, 2, 3, 4],
  NCAAB: [11, 12, 1, 2, 3],
  NHL: [10, 11, 12, 1, 2, 3, 4],
};

let cached: GradedPick[] | null = null;

export function sampleLedger(): GradedPick[] {
  if (cached) return cached;
  const seedIdx: Record<string, number> = { NFL: 0, NCAAF: 0, MLB: 0, NBA: 0, NCAAB: 0, NHL: 0 };
  let rand = 20260921;
  const next = () => (rand = (rand * 1103515245 + 12345) % 2147483648) / 2147483648;

  const rows: GradedPick[] = [];
  const cursor = new Date(Date.UTC(2026, 8, 20));
  for (let d = 0; d < 700 && rows.length < 320; d++) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth() + 1;
    const day = cursor.getUTCDate();
    const active = LEAGUES.filter((c) => IN_SEASON[c].includes(m));
    if (active.length) {
      const count = next() < 0.22 ? 0 : next() < 0.55 ? 1 : next() < 0.85 ? 2 : 3;
      const used: string[] = [];
      for (let k = 0; k < count; k++) {
        const pool = active.filter((c) => !used.includes(c));
        if (!pool.length) break;
        const league = pool[Math.floor(next() * pool.length)];
        used.push(league);
        const seeds = PICK_SEEDS[league];
        const pick = seeds[seedIdx[league] % seeds.length];
        seedIdx[league]++;
        const roll = next();
        const tag: ResultTag = roll < 0.05 ? "PUSH" : roll < 0.63 ? "WIN" : "LOSS";
        const stake = [1, 1, 1.5, 2][Math.floor(next() * 4)];
        const u = tag === "WIN" ? Number((stake * 0.93).toFixed(2)) : tag === "LOSS" ? -stake : 0;
        rows.push({
          season: String(m >= 8 ? y : y - 1),
          date: String(m).padStart(2, "0") + "/" + String(day).padStart(2, "0") + "/" + String(y).slice(2),
          sortKey: y * 10000 + m * 100 + day,
          league,
          pick,
          tag,
          stake,
          u,
          delta: fmtUnits(u),
        });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  cached = rows;
  return rows;
}

export const SAMPLE_CARD: PendingPick[] = [
  {
    time: "1:00",
    league: "NFL",
    pick: "Bengals −3.5",
    game: "Cincinnati vs. Cleveland",
    line: "−110",
    units: "2.0u",
    dateLabel: "09/21/26",
    sortKey: 0,
  },
  {
    time: "1:00",
    league: "NFL",
    pick: "Under 41.5",
    game: "Houston vs. Tennessee",
    line: "−105",
    units: "1.0u",
    dateLabel: "09/21/26",
    sortKey: 0,
  },
  {
    time: "3:30",
    league: "NCAAF",
    pick: "Oregon −14.5",
    game: "Oregon at Washington",
    line: "−108",
    units: "1.5u",
    dateLabel: "09/21/26",
    sortKey: 0,
  },
  {
    time: "7:10",
    league: "MLB",
    pick: "Mariners −1.5",
    game: "Seattle vs. Texas",
    line: "+102",
    units: "1.0u",
    dateLabel: "09/21/26",
    sortKey: 0,
  },
  {
    time: "8:20",
    league: "NFL",
    pick: "Lions ML",
    game: "Detroit at Green Bay",
    line: "+124",
    units: "1.0u",
    dateLabel: "09/21/26",
    sortKey: 0,
  },
];
