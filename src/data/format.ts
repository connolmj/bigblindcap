// Number formatting shared by every page. "−" is a true minus sign, not a hyphen.

export function fmtUnits(u: number): string {
  const r = Math.round(u * 100) / 100;
  return (r > 0 ? "+" : r < 0 ? "−" : "") + Math.abs(r).toFixed(2) + "u";
}

export function fmtPct(n: number): string {
  const r = Math.round(n * 10) / 10;
  return (r < 0 ? "−" : "") + Math.abs(r).toFixed(1) + "%";
}

/** 3,012.40u */
export function fmtBig(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "u";
}

/** 3,012 */
export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function fmtRecord(t: { w: number; l: number; p: number }): string {
  return t.w + "–" + t.l + (t.p ? "–" + t.p : "");
}

/** Sort key 20260922 → "Sep 22, 2026" */
export function fmtKeyDate(key: number): string {
  return new Date(keyToMs(key)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function keyToMs(k: number): number {
  return Date.UTC(Math.floor(k / 10000), Math.floor((k % 10000) / 100) - 1, k % 100);
}

/** Green when up, red when down, plain when flat. Returns a CSS class. */
export function toneClass(d: number): string {
  return d > 0.005 ? "is-win" : d < -0.005 ? "is-loss" : "";
}
