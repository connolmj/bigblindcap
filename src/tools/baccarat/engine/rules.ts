/**
 * The drawing rules ("the tableau"). Nobody chooses whether to draw in
 * baccarat — the dealer follows these rules exactly — but knowing them is
 * knowing how the game works, so the trainer drills them.
 */
export type Side = "player" | "banker";
export type DrawAction = "draw" | "stand";

/** One third-card decision. */
export interface DrawSpot {
  side: Side;
  /** That hand's two-card total. */
  total: number;
  /** For the Banker: the points on the Player's third card, or null if the Player stood. */
  playerThird: number | null;
}

/** Player draws on 0–5 and stands on 6–7. */
export const playerDraws = (total: number) => total <= 5;

/** The Banker's rule. */
export function bankerDraws(total: number, playerThird: number | null): boolean {
  if (playerThird === null) return total <= 5; // Player stood: Banker plays the same rule as the Player.
  switch (total) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThird !== 8;
    case 4:
      return playerThird >= 2 && playerThird <= 7;
    case 5:
      return playerThird >= 4 && playerThird <= 7;
    case 6:
      return playerThird === 6 || playerThird === 7;
    default:
      return false;
  }
}

export function correctDraw(spot: DrawSpot): DrawAction {
  const draws = spot.side === "player" ? playerDraws(spot.total) : bankerDraws(spot.total, spot.playerThird);
  return draws ? "draw" : "stand";
}
