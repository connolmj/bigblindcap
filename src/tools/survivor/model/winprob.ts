/**
 * Turning spreads and moneylines into win probabilities.
 *
 * SIGMA: NFL final margins vary around the spread with a standard deviation of
 * about 11.8 points. Fitted on 3,089 games (2015–2026) against de-vigged
 * moneylines; checked against actual results (e.g. 9–12 point favourites won
 * 80.7% of the time, the model says 80.5%).
 */
export const SIGMA = 11.8;

/** Standard normal CDF (Abramowitz–Stegun 7.1.26 via erf). */
export function normalCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(x) / Math.SQRT2));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Chance the team favoured by `spread` points wins. */
export function spreadToWin(spread: number): number {
  return normalCdf(spread / SIGMA);
}

/** American odds → implied probability (still includes the bookmaker's margin). */
export function impliedProb(moneyline: number): number {
  return moneyline > 0 ? 100 / (moneyline + 100) : -moneyline / (-moneyline + 100);
}

/** Home win chance from both moneylines, with the bookmaker's margin removed. */
export function moneylineToHomeWin(homeMl: number, awayMl: number): number {
  const h = impliedProb(homeMl);
  const a = impliedProb(awayMl);
  return h / (h + a);
}
