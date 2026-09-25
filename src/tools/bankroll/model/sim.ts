// Monte Carlo seasons for a bettor with a fixed edge. Pure TypeScript — no React.

export type Sizing = "flat" | "percent";

export interface SimInput {
  /** True win probability, 0–1 (pushes ignored). */
  winRate: number;
  /** Average price in American odds, e.g. -110 or +150. */
  odds: number;
  /** Bets in the season. */
  bets: number;
  /** Starting bankroll in dollars. */
  bankroll: number;
  /** Stake per bet as a fraction of bankroll, e.g. 0.02 for 2%. */
  unit: number;
  /** flat: stake is unit × starting bankroll every bet. percent: unit × current bankroll. */
  sizing: Sizing;
  /** Number of simulated seasons. */
  seasons: number;
  seed?: number;
}

export interface SimResult {
  /** Ending bankroll of every season, sorted ascending. */
  finals: Float64Array;
  /** Percentile bands of the bankroll after each bet (length bets + 1). */
  bands: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  /** A handful of individual seasons to draw as lines. */
  samples: number[][];
  pProfit: number;
  pLoss: number;
  pBust: number;
  /** Chance of ever being down half the starting bankroll at some point. */
  pHalf: number;
  mean: number;
  median: number;
  medianDrawdown: number;
  medianLosingStreak: number;
}

/** Profit per $1 staked on a win. -110 → 0.909, +150 → 1.5. */
export function payout(odds: number): number {
  if (odds >= 100) return odds / 100;
  if (odds <= -100) return 100 / -odds;
  return 1; // treat anything inside ±100 as even money
}

/** Win rate you need to break even at this price. -110 → 52.38%. */
export function breakEven(odds: number): number {
  return 1 / (1 + payout(odds));
}

/** Expected return per $1 staked. */
export function roi(winRate: number, odds: number): number {
  return winRate * payout(odds) - (1 - winRate);
}

/** Full Kelly stake as a fraction of bankroll (0 when there's no edge). */
export function kelly(winRate: number, odds: number): number {
  const b = payout(odds);
  return Math.max(0, (b * winRate - (1 - winRate)) / b);
}

/** Fewest wins that finish a flat-staked season ahead: wins·b − (n − wins) > 0 ⇔ wins > n / (1 + b). */
export function winsToProfit(odds: number, bets: number): number {
  return Math.floor(bets / (1 + payout(odds)) + 1e-9) + 1;
}

/** Exact chance of finishing a flat-staked season ahead, from the binomial distribution. */
export function probProfitFlat(winRate: number, odds: number, bets: number): number {
  const need = winsToProfit(odds, bets);
  let p = 0;
  let logC = 0; // log C(n, k), built up incrementally
  const lw = Math.log(winRate);
  const ll = Math.log(1 - winRate);
  for (let k = 0; k <= bets; k++) {
    if (k > 0) logC += Math.log(bets - k + 1) - Math.log(k);
    if (k >= need) p += Math.exp(logC + k * lw + (bets - k) * ll);
  }
  return Math.min(1, p);
}

/** Small seeded RNG (mulberry32) so the same inputs always draw the same seasons. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (sorted: ArrayLike<number>, q: number) => {
  const n = sorted.length;
  if (!n) return 0;
  const i = Math.min(n - 1, Math.max(0, Math.round(q * (n - 1))));
  return sorted[i];
};

/** Bust = can't cover the next bet. Flat staking: bankroll below one unit. Percent staking: below 1% of the start. */
export function simulate(input: SimInput): SimResult {
  const { winRate, odds, bets, bankroll, unit, sizing, seasons } = input;
  const b = payout(odds);
  const next = rng(input.seed ?? 1);
  const flatStake = unit * bankroll;
  const bustLine = sizing === "flat" ? flatStake - 1e-9 : bankroll * 0.01;
  const SAMPLE_COUNT = 24;

  // Bankroll after bet t for every season, stored per checkpoint to build bands.
  const at = checkpoints(bets);
  const grid = at.map(() => new Float64Array(seasons));

  const finals = new Float64Array(seasons);
  const drawdowns = new Float64Array(seasons);
  const streaks = new Float64Array(seasons);
  const samples: number[][] = [];
  let busts = 0;
  let halves = 0;
  let sum = 0;

  for (let s = 0; s < seasons; s++) {
    let bank = bankroll;
    let peak = bankroll;
    let dd = 0;
    let streak = 0;
    let worst = 0;
    let busted = false;
    let halved = false;
    let c = 1;
    grid[0][s] = bank;
    const keep = s < SAMPLE_COUNT;
    const path = keep ? [bank] : null;

    for (let t = 1; t <= bets; t++) {
      if (!busted) {
        const stake = sizing === "flat" ? flatStake : unit * bank;
        if (next() < winRate) {
          bank += stake * b;
          streak = 0;
        } else {
          bank -= stake;
          streak++;
          if (streak > worst) worst = streak;
        }
        if (bank > peak) peak = bank;
        const d = (peak - bank) / peak;
        if (d > dd) dd = d;
        if (bank < bankroll * 0.5) halved = true;
        if (bank < bustLine) {
          busted = true;
          if (sizing === "flat") bank = Math.max(0, bank);
        }
      }
      if (path) path.push(bank);
      if (at[c] === t) grid[c++][s] = bank;
    }

    finals[s] = bank;
    drawdowns[s] = dd;
    streaks[s] = worst;
    sum += bank;
    if (busted) busts++;
    if (halved) halves++;
    if (path) samples.push(path);
  }

  const bands: SimResult["bands"] = { p5: [], p25: [], p50: [], p75: [], p95: [] };
  for (let c = 0; c < at.length; c++) {
    const col = grid[c].sort();
    bands.p5.push(quantile(col, 0.05));
    bands.p25.push(quantile(col, 0.25));
    bands.p50.push(quantile(col, 0.5));
    bands.p75.push(quantile(col, 0.75));
    bands.p95.push(quantile(col, 0.95));
  }

  finals.sort();
  let ahead = 0;
  let behind = 0;
  for (const f of finals) {
    if (f > bankroll + 1e-9) ahead++;
    else if (f < bankroll - 1e-9) behind++;
  }

  return {
    finals,
    bands,
    samples,
    pProfit: ahead / seasons,
    pLoss: behind / seasons,
    pBust: busts / seasons,
    pHalf: halves / seasons,
    mean: sum / seasons,
    median: quantile(finals, 0.5),
    medianDrawdown: quantile(drawdowns.sort(), 0.5),
    medianLosingStreak: quantile(streaks.sort(), 0.5),
  };
}

/** Bet index at each band checkpoint (matches `bands` arrays). Capped at 200 to keep long seasons light. */
export function checkpoints(bets: number): number[] {
  const steps = Math.min(bets, 200);
  return Array.from({ length: steps + 1 }, (_, i) => Math.round((i * bets) / steps));
}

/**
 * Where the win/loss line falls for flat staking: halfway between the best losing (or break-even) season and the
 * worst winning one. Possible results are `lattice` apart.
 */
export function flatEdge(odds: number, bets: number, stake: number): { edge: number; lattice: number } {
  const b = payout(odds);
  const need = winsToProfit(odds, bets);
  const lattice = stake * (1 + b);
  const firstWin = stake * (need * (1 + b) - bets);
  return { edge: firstWin - lattice / 2, lattice };
}
