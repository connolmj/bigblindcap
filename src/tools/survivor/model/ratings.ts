/**
 * Team power ratings implied by betting lines.
 *
 * Every posted line says: spread = homeField + rating(home) − rating(away).
 * With a few weeks of lines we solve for the ratings that best explain them
 * (weighted least squares), leaning on last season's ratings as a starting
 * point. Recent lines count more, since they carry the latest injury and form
 * news.
 *
 * Backtested on 2023–2025: projected spreads 2–16 weeks out were 4.65 points
 * (RMSE) from the line the market eventually posted, vs 5.5 using last
 * season's ratings alone. Settings below are the best from that backtest.
 */
export const RATING_SETTINGS = {
  /** How strongly ratings are pulled toward the prior (per team). */
  priorWeight: 0.5,
  /** Older lines count less: weight = e^(−decay × weeks old). */
  decay: 0.3,
  /** Last season's ratings are shrunk this much toward average before use. */
  carryOver: 0.4,
  /** Decay used when fitting last season as a whole. */
  priorDecay: 0.15,
};

export interface LineObs {
  home: string;
  away: string;
  week: number;
  neutral: boolean;
  spread: number;
}

export interface Ratings {
  ratings: Record<string, number>;
  hfa: number;
}

/** Solve A·x = b by Gaussian elimination with partial pivoting. */
export function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (f === 0) continue;
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

export function fitRatings(
  teams: string[],
  lines: LineObs[],
  opts: { prior?: Ratings; priorWeight?: number; decay: number; latestWeek: number },
): Ratings {
  const n = teams.length;
  const idx = new Map(teams.map((t, i) => [t, i]));
  const size = n + 1; // ratings + home-field advantage
  const A = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const b = new Array<number>(size).fill(0);

  for (const g of lines) {
    const h = idx.get(g.home);
    const a = idx.get(g.away);
    if (h === undefined || a === undefined) continue;
    const w = Math.exp(-opts.decay * Math.max(0, opts.latestWeek - g.week));
    const x: [number, number][] = [
      [h, 1],
      [a, -1],
    ];
    if (!g.neutral) x.push([n, 1]);
    for (const [i, xi] of x) {
      b[i] += w * xi * g.spread;
      for (const [j, xj] of x) A[i][j] += w * xi * xj;
    }
  }

  // Pull toward the prior (or toward average with a typical home field).
  const prior = opts.prior ?? { ratings: {}, hfa: 1.8 };
  // A tiny minimum keeps the math solvable for a team with no lines yet.
  const pw = Math.max(opts.priorWeight ?? 0, 1e-3);
  teams.forEach((t, i) => {
    A[i][i] += pw;
    b[i] += pw * (prior.ratings[t] ?? 0);
  });
  A[n][n] += 0.5;
  b[n] += 0.5 * prior.hfa;

  // Ratings are relative, so pin their average to zero.
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) A[i][j] += 1000;

  const sol = solve(A, b);
  return { ratings: Object.fromEntries(teams.map((t, i) => [t, sol[i]])), hfa: sol[n] };
}

export function projectSpread(r: Ratings, home: string, away: string, neutral: boolean): number {
  return (neutral ? 0 : r.hfa) + (r.ratings[home] ?? 0) - (r.ratings[away] ?? 0);
}
