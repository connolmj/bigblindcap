/** One game, as stored in public/data/survivor.json. */
export interface Game {
  home: string;
  away: string;
  /** Kickoff, Eastern time: "2026-09-27" and "13:00". */
  date: string;
  time: string;
  neutral: boolean;
  /**
   * Points the HOME team is favoured by (negative = away team favoured).
   * Same convention as nflverse's spread_line.
   */
  spread: number;
  /** Chance the home team wins, 0–1. */
  homeWin: number;
  /** "market" = a real sportsbook line; "projected" = our model, no line posted yet. */
  line: "market" | "projected";
  /** Estimated share of survivor entries picking each side this week, 0–1. */
  homePick: number;
  awayPick: number;
  homeScore: number | null;
  awayScore: number | null;
}

export interface Week {
  week: number;
  games: Game[];
}

export interface SurvivorData {
  season: number;
  /** When the numbers last changed (ISO timestamp). */
  updated: string;
  /** Latest week with real sportsbook lines. */
  lastMarketWeek: number;
  model: { sigma: number; hfa: number };
  /** Power rating per team: points better than an average team on a neutral field. */
  ratings: Record<string, number>;
  weeks: Week[];
}
