/**
 * Reshapes the season data into lookups the page needs:
 * for each week, each team's game from that team's point of view.
 */
import type { WinTable } from "../model/plan";
import type { Game, SurvivorData } from "../model/types";

export interface TeamWeek {
  team: string;
  opp: string;
  home: boolean;
  neutral: boolean;
  /** Points this team is favoured by (negative = underdog). */
  spread: number;
  win: number;
  pick: number;
  line: Game["line"];
  kickoff: Date;
  started: boolean;
  /** "W" / "L" / "T" once final, else null. */
  result: "W" | "L" | "T" | null;
  score: string | null;
}

export type Slate = Record<number, Record<string, TeamWeek>>;

/** US Eastern time → real Date. DST runs 2nd Sunday of March → 1st Sunday of November. */
export function easternToDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time || "13:00").split(":").map(Number);
  const nthSunday = (month: number, n: number) => {
    const first = new Date(Date.UTC(y, month, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + (n - 1) * 7;
  };
  const dstStart = Date.UTC(y, 2, nthSunday(2, 2), 7); // 2am EST = 07:00 UTC
  const dstEnd = Date.UTC(y, 10, nthSunday(10, 1), 6); // 2am EDT = 06:00 UTC
  const asEst = Date.UTC(y, m - 1, d, hh + 5, mm);
  const offset = asEst >= dstStart && asEst < dstEnd ? 4 : 5;
  return new Date(Date.UTC(y, m - 1, d, hh + offset, mm));
}

export function buildSlate(data: SurvivorData, now: Date): Slate {
  const slate: Slate = {};
  for (const { week, games } of data.weeks) {
    const byTeam: Record<string, TeamWeek> = {};
    for (const g of games) {
      const kickoff = easternToDate(g.date, g.time);
      const final = g.homeScore !== null && g.awayScore !== null;
      const side = (home: boolean): TeamWeek => {
        const mine = home ? g.homeScore : g.awayScore;
        const theirs = home ? g.awayScore : g.homeScore;
        return {
          team: home ? g.home : g.away,
          opp: home ? g.away : g.home,
          home,
          neutral: g.neutral,
          spread: home ? g.spread : -g.spread,
          win: home ? g.homeWin : 1 - g.homeWin,
          pick: home ? g.homePick : g.awayPick,
          line: g.line,
          kickoff,
          started: kickoff.getTime() <= now.getTime() || final,
          result: final ? (mine! > theirs! ? "W" : mine! < theirs! ? "L" : "T") : null,
          score: final ? `${mine}–${theirs}` : null,
        };
      };
      byTeam[g.home] = side(true);
      byTeam[g.away] = side(false);
    }
    slate[week] = byTeam;
  }
  return slate;
}

/** The first week that still has a game left to kick off (18 once the season is over). */
export function currentWeek(slate: Slate): number {
  for (let w = 1; w <= 18; w++) {
    if (Object.values(slate[w] ?? {}).some((tw) => !tw.started)) return w;
  }
  return 18;
}

export function winTable(slate: Slate): WinTable {
  const t: WinTable = {};
  for (const [w, teams] of Object.entries(slate)) {
    t[Number(w)] = Object.fromEntries(Object.values(teams).map((tw) => [tw.team, tw.win]));
  }
  return t;
}
