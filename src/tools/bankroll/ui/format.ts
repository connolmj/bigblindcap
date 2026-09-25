// "−" is a true minus sign, not a hyphen — same as the rest of the site.

const money = (n: number) => "$" + Math.round(Math.abs(n)).toLocaleString("en-US");

/** $1,250 / −$40 */
export const fmtMoney = (n: number) => (Math.round(n) < 0 ? "−" : "") + money(n);

/** +$138 / −$40 / $0 */
export const fmtSigned = (n: number) => (Math.round(n) > 0 ? "+" : Math.round(n) < 0 ? "−" : "") + money(n);

export function fmtPct(x: number, digits = 0): string {
  if (x > 0 && x < 0.001) return "<0.1%";
  if (x < 1 && x > 0.999) return ">99.9%";
  const v = (x * 100).toFixed(digits);
  return (v.startsWith("-") ? "−" + v.slice(1) : v) + "%";
}

/** −110 / +150 */
export const fmtOdds = (o: number) => (o > 0 ? "+" : "−") + Math.abs(o);
