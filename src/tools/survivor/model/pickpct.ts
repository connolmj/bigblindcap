/**
 * Estimated pick popularity.
 *
 * There's no free public feed of real survivor pick percentages, so we
 * estimate them. Survivor players crowd onto the week's biggest favourites:
 * popularity rises steeply with win probability. We model each team's share
 * as proportional to e^(STEEPNESS × winProb) across everyone playing that week.
 * With this setting the week's top favourite typically draws about a third to
 * 45% of picks and teams under ~60% to win draw almost none. It can't know
 * which teams people have already used, so treat it as a rough guide.
 */
export const STEEPNESS = 15;

export function estimatePickShares(winProbs: Record<string, number>): Record<string, number> {
  const entries = Object.entries(winProbs);
  const weights = entries.map(([, p]) => Math.exp(STEEPNESS * (p - 0.5)));
  const total = weights.reduce((s, w) => s + w, 0);
  return Object.fromEntries(entries.map(([t], i) => [t, weights[i] / total]));
}
