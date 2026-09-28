/** public/data/runs.json */
export interface RunsData {
  updated: string;
  seasons: Season[];
}

/**
 * One regular season, tallied by base-out state. Every array has 24 entries, indexed by
 * `stateIndex(bases, outs)`: outs * 8 + bases, where bases is a bitmask (1 = first,
 * 2 = second, 4 = third).
 */
export interface Season {
  year: number;
  /** Complete half-innings (three outs made) the counts come from. */
  halfInnings: number;
  /** Times a half-inning passed through the state. */
  n: number[];
  /** …and at least one run scored from there to the end of the half-inning. */
  scored: number[];
  /** …and the total runs scored from there to the end of the half-inning. */
  runs: number[];
}
