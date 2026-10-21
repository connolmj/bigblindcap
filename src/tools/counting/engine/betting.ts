/**
 * Bet with the count. Each +1 of true count is worth about half a percent to
 * you; off the top of a shoe these rules give the house about 0.4%. So the
 * edge turns yours around +1, and the bet goes up from +2.
 */
export const BET_OPTIONS = [1, 2, 4, 6, 8] as const;

/** The bet ramp: units to bet at each true count (a 1-to-8 spread). */
export function betFor(tc: number): number {
  if (tc <= 1) return 1;
  if (tc === 2) return 2;
  if (tc === 3) return 4;
  if (tc === 4) return 6;
  return 8;
}

/** Your rough edge, in percent, at a true count. Positive means you have it. */
export const edgeAt = (tc: number) => -0.4 + 0.5 * tc;

export const RAMP: { tc: string; units: number }[] = [
  { tc: "+1 or less", units: 1 },
  { tc: "+2", units: 2 },
  { tc: "+3", units: 4 },
  { tc: "+4", units: 6 },
  { tc: "+5 or more", units: 8 },
];
