/** public/data/squares.json */
export interface SquaresData {
  updated: string;
  nfl: {
    from: number;
    to: number;
    games: number;
    /** 8 digits per game — last digit of each score after Q1, half, Q3, final: home then away. */
    digits: string;
  };
  superBowls: SuperBowl[];
}

export interface SuperBowl {
  /** The season it capped, e.g. 1966 for Super Bowl I. */
  season: number;
  teams: [string, string];
  /** Cumulative score after Q1, at the half, after Q3 and at the final (with overtime). */
  q: [number, number][];
}
