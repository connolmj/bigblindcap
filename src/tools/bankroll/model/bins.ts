// Histogram bins for end-of-season results, and axis ticks.

export interface Bin {
  lo: number;
  hi: number;
  count: number;
  /** The end bins also hold the trimmed-off tail beyond them. */
  open?: "below" | "above";
}

/** 1, 2 or 5 × a power of ten, at least `raw`. */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const e = 1e-9; // 0.08 / 4 must round to 0.02, not 0.05
  return (f <= 1 + e ? 1 : f <= 2 + e ? 2 : f <= 5 + e ? 5 : 10) * p;
}

export function ticks(lo: number, hi: number, count = 5): number[] {
  const step = niceStep((hi - lo) / count);
  const out: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step)
    out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

export interface BinOptions {
  /** A bin edge sits exactly here, so every bar is all-win or all-loss. */
  edge: number;
  /** Gap between possible results (flat staking). Bin widths become a whole multiple of it. */
  lattice?: number;
  target?: number;
  /** Share of seasons folded into each end bin (default 0.5%). */
  trim?: number;
}

/**
 * Bins over sorted profits. The outer `trim` on each side folds into the end bins so one freak season can't squash
 * the chart.
 */
export function binProfits(sorted: ArrayLike<number>, { edge, lattice, target = 36, trim = 0.005 }: BinOptions): Bin[] {
  const n = sorted.length;
  if (!n) return [];
  const q = (x: number) => sorted[Math.min(n - 1, Math.max(0, Math.round(x * (n - 1))))];
  const lo = q(trim);
  const hi = q(1 - trim);
  const raw = Math.max(hi - lo, 1e-9) / target;
  const width = lattice && lattice > 0 ? Math.max(1, Math.ceil(raw / lattice)) * lattice : niceStep(raw);

  const first = Math.floor((lo - edge) / width + 1e-9);
  const last = Math.floor((hi - edge) / width + 1e-9);
  const count = last - first + 1;
  const bins: Bin[] = Array.from({ length: count }, (_, i) => ({
    lo: edge + (first + i) * width,
    hi: edge + (first + i + 1) * width,
    count: 0,
  }));
  for (let i = 0; i < n; i++) {
    const k = Math.floor((sorted[i] - edge) / width + 1e-9) - first;
    bins[Math.min(count - 1, Math.max(0, k))].count++;
  }
  if (sorted[0] < bins[0].lo) bins[0].open = "below";
  if (sorted[n - 1] >= bins[count - 1].hi) bins[count - 1].open = "above";
  return bins;
}
