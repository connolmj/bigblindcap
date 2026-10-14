/** public/data/nfl-numbers.json, built by scripts/update-nfl-numbers.ts. */
export interface NflNumbersData {
  updated: string;
  /** One row per finished game, oldest first. */
  games: GameRow[];
}

/**
 * [season, flags, home score − away score, total points, closing spread, closing total].
 * The spread is how many points the home team was favored by (negative = home underdog);
 * it and the total are null when nflverse has no line.
 */
export type GameRow = [number, number, number, number, number | null, number | null];

/** Bits in GameRow[1]. */
export const FLAG = {
  PLAYOFF: 1,
  NEUTRAL: 2,
  DIVISION: 4,
  /** A division game after the pair's first meeting that season (the rematch, or a playoff third game). */
  REMATCH: 8,
  OVERTIME: 16,
  /** Dome, or a retractable roof that was closed. */
  INDOORS: 32,
} as const;

export interface Game {
  season: number;
  playoff: boolean;
  neutral: boolean;
  division: boolean;
  rematch: boolean;
  overtime: boolean;
  indoors: boolean;
  /** Home score − away score. */
  margin: number;
  points: number;
  /** Points the home team was favored by at the close. */
  spread: number | null;
  total: number | null;
}

export function toGame([season, f, margin, points, spread, total]: GameRow): Game {
  return {
    season,
    playoff: (f & FLAG.PLAYOFF) !== 0,
    neutral: (f & FLAG.NEUTRAL) !== 0,
    division: (f & FLAG.DIVISION) !== 0,
    rematch: (f & FLAG.REMATCH) !== 0,
    overtime: (f & FLAG.OVERTIME) !== 0,
    indoors: (f & FLAG.INDOORS) !== 0,
    margin,
    points,
    spread,
    total,
  };
}
