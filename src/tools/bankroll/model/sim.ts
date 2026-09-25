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

  const finals = new Float64Array(seasons);
  const drawdowns = new Float64Array(seasons);
  const streaks = new Float64Array(seasons);
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
    }

    finals[s] = bank;
    drawdowns[s] = dd;
    streaks[s] = worst;
    sum += bank;
    if (busted) busts++;
    if (halved) halves++;
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

export type Staking = Pick<SimInput, "winRate" | "odds" | "bets" | "bankroll" | "unit" | "sizing">;

/**
 * Exact chances of going broke, finishing ahead and finishing down — no simulation noise.
 * The bankroll after w wins and l losses doesn't depend on their order (flat: add/subtract stakes; percent: multiply),
 * so we walk every (wins, losses) pair, absorbing probability the first time the bankroll crosses the bust line.
 * O(bets²) — about half a million steps for a 1,000-bet season.
 */
export function exactOdds({ winRate, odds, bets, bankroll, unit, sizing }: Staking): {
  pBust: number;
  pProfit: number;
  pLoss: number;
} {
  const b = payout(odds);
  const stake = unit * bankroll;
  const bustLine = sizing === "flat" ? stake - 1e-9 : bankroll * 0.01;
  const upF = Math.log(1 + unit * b);
  const downF = Math.log(1 - Math.min(unit, 0.999999));
  const bank = (w: number, l: number) =>
    sizing === "flat" ? bankroll + w * stake * b - l * stake : bankroll * Math.exp(w * upF + l * downF);

  let prob = new Float64Array(bets + 2);
  let next = new Float64Array(bets + 2);
  prob[0] = 1;
  let pBust = 0;
  for (let t = 0; t < bets; t++) {
    next.fill(0, 0, t + 2);
    for (let w = 0; w <= t; w++) {
      const p = prob[w];
      if (!p) continue;
      next[w + 1] += p * winRate;
      next[w] += p * (1 - winRate);
    }
    for (let w = 0; w <= t + 1; w++) {
      if (next[w] && bank(w, t + 1 - w) < bustLine) {
        pBust += next[w];
        next[w] = 0;
      }
    }
    [prob, next] = [next, prob];
  }
  let pProfit = 0;
  let pLoss = pBust;
  for (let w = 0; w <= bets; w++) {
    const f = bank(w, bets - w);
    if (f > bankroll + 1e-9) pProfit += prob[w];
    else if (f < bankroll - 1e-9) pLoss += prob[w];
  }
  return { pBust: Math.min(1, pBust), pProfit: Math.min(1, pProfit), pLoss: Math.min(1, pLoss) };
}

export interface Season {
  /** Bankroll after each bet (length bets + 1). */
  path: number[];
  wins: number;
  losses: number;
  /** Bet number on which the bankroll went broke, if it did. */
  bustAt: number | null;
  /** Largest peak-to-trough drop in dollars. */
  worstDrop: number;
  longestLosingRun: number;
}

/** One season, bet by bet — same rules as `simulate`. */
export function simulateSeason(input: Staking, seed: number): Season {
  const { winRate, odds, bets, bankroll, unit, sizing } = input;
  const b = payout(odds);
  const next = rng(seed);
  const flatStake = unit * bankroll;
  const bustLine = sizing === "flat" ? flatStake - 1e-9 : bankroll * 0.01;
  let bank = bankroll;
  let peak = bankroll;
  let worstDrop = 0;
  let run = 0;
  let longest = 0;
  let wins = 0;
  let losses = 0;
  let bustAt: number | null = null;
  const path = [bank];
  for (let t = 1; t <= bets; t++) {
    if (bustAt == null) {
      const stake = sizing === "flat" ? flatStake : unit * bank;
      if (next() < winRate) {
        bank += stake * b;
        wins++;
        run = 0;
      } else {
        bank -= stake;
        losses++;
        if (++run > longest) longest = run;
      }
      if (bank > peak) peak = bank;
      if (peak - bank > worstDrop) worstDrop = peak - bank;
      if (bank < bustLine) {
        bustAt = t;
        if (sizing === "flat") bank = Math.max(0, bank);
      }
    }
    path.push(bank);
  }
  return { path, wins, losses, bustAt, worstDrop, longestLosingRun: longest };
}

/**
 * Largest bet size (as a fraction, on a 0.5% grid up to 30%) whose chance of going broke stays under `risk`.
 * Risk of ruin only grows with bet size, so a binary search is enough. Returns 0 if even 0.5% is too much.
 */
export function maxSafeUnit(input: Omit<Staking, "unit">, risk: number): number {
  let lo = 0; // steps of 0.5%: index 0 = none, 60 = 30%
  let hi = 60;
  if (exactOdds({ ...input, unit: hi * 0.005 }).pBust < risk) return hi * 0.005;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (exactOdds({ ...input, unit: mid * 0.005 }).pBust < risk) lo = mid;
    else hi = mid;
  }
  return lo * 0.005;
}
