import { TEAMS } from "../model/teams";

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** −7 / +3.5 / PK, from this team's point of view. */
export function fmtSpread(spread: number): string {
  if (Math.abs(spread) < 0.25) return "PK";
  const v = Math.abs(spread) % 1 === 0 ? Math.abs(spread).toFixed(0) : Math.abs(spread).toFixed(1);
  return (spread > 0 ? "−" : "+") + v;
}

export const teamName = (t: string) => `${TEAMS[t]?.name ?? t} ${TEAMS[t]?.nick ?? ""}`.trim();

/** Future value → 0–3 stars. */
export function fvStars(fv: number): number {
  return fv >= 0.2 ? 3 : fv >= 0.08 ? 2 : fv >= 0.02 ? 1 : 0;
}
