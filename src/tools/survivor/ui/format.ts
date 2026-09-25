import { TEAMS } from "../model/teams";

export const pct = (x: number) => `${Math.round(x * 100)}%`;

/** −7 / +3.5 / PK, from this team's point of view. */
export function fmtSpread(spread: number): string {
  if (Math.abs(spread) < 0.25) return "PK";
  const v = Math.abs(spread) % 1 === 0 ? Math.abs(spread).toFixed(0) : Math.abs(spread).toFixed(1);
  return (spread > 0 ? "−" : "+") + v;
}

export const teamName = (t: string) => `${TEAMS[t]?.name ?? t} ${TEAMS[t]?.nick ?? ""}`.trim();

/**
 * Future value → a 0–100 score for the week you're looking at.
 * 100 = the team most worth saving; 0 = saving it doesn't help your later weeks.
 */
export function fvScores(fv: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(fv));
  return Object.fromEntries(
    Object.entries(fv).map(([t, v]) => [t, max > 0 ? Math.round((Math.max(v, 0) / max) * 100) : 0]),
  );
}
