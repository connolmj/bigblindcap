/**
 * The "why" behind each call. Bet numbers come from exactOdds(); draw
 * reasons quote the rule and a way to remember it.
 */
import { BET_LABEL, betReturn, exactOdds, TIE_PAYS, type Bet, type Commission } from "./payouts";
import type { DrawAction, DrawSpot } from "./rules";

export const DRAW_LABEL: Record<DrawAction, string> = { draw: "Draw", stand: "Stand" };

export const pct = (x: number, digits = 2) => `${(x * 100).toFixed(digits)}%`;

/** "Banker 5 vs Player's 3rd card 4", "Player 5", "Banker 6, Player stood" */
export function spotLabel(spot: DrawSpot): string {
  if (spot.side === "player") return `Player ${spot.total}`;
  if (spot.playerThird === null) return `Banker ${spot.total}, Player stood`;
  return `Banker ${spot.total} vs Player's 3rd card ${spot.playerThird}`;
}

/** What a draw call is filed under in the progress panel. */
export type Group = "bet" | "player" | "bankerStood" | "bankerThird";

export const GROUP_LABEL: Record<Group, string> = {
  bet: "Choosing the bet",
  player: "Player draws",
  bankerStood: "Banker, Player stood",
  bankerThird: "Banker vs 3rd card",
};

export function drawGroup(spot: DrawSpot): Group {
  if (spot.side === "player") return "player";
  return spot.playerThird === null ? "bankerStood" : "bankerThird";
}

export function whyDraw(spot: DrawSpot, right: DrawAction): string {
  const t = spot.total;
  if (spot.side === "player") {
    return right === "draw"
      ? `The Player draws on any total from 0 to 5. ${t} is in that range, so a third card comes.`
      : `The Player stands on 6 or 7. With ${t}, no third card.`;
  }
  if (spot.playerThird === null) {
    return right === "draw"
      ? `When the Player stands, the Banker follows the Player's rule: draw on 0–5. Banker has ${t}, so it draws.`
      : `When the Player stands, the Banker follows the Player's rule: stand on 6 or 7. Banker has ${t}, so it stands.`;
  }
  const c = spot.playerThird;
  const verdict = right === "draw" ? "draws" : "stands";
  switch (t) {
    case 0:
    case 1:
    case 2:
      return `The Banker always draws on 0, 1 or 2, whatever the Player's third card.`;
    case 3:
      return `Banker 3 draws unless the Player's third card is an 8. It was ${pointWord(c)}, so the Banker ${verdict}.`;
    case 4:
      return `Banker 4 draws when the Player's third card is 2 through 7. It was ${pointWord(c)}, so the Banker ${verdict}.`;
    case 5:
      return `Banker 5 draws when the Player's third card is 4 through 7. It was ${pointWord(c)}, so the Banker ${verdict}.`;
    case 6:
      return `Banker 6 draws only when the Player's third card is a 6 or 7. It was ${pointWord(c)}, so the Banker ${verdict}.`;
    default:
      return `The Banker always stands on 7.`;
  }
}

/** A memory hook for the Banker 3–6 rows: the window narrows by two each step. */
export const BANKER_HINT = "Banker 3: all but 8 · 4: 2–7 · 5: 4–7 · 6: 6–7 · 7: stand";

const pointWord = (v: number) => (v === 0 ? "a 0 (10 or picture card)" : v === 8 ? "an 8" : `a ${v}`);

export function whyBet(chosen: Bet, best: Bet, commission: Commission): string {
  const o = exactOdds();
  const edge = (b: Bet) => pct(-betReturn(b, commission));
  const lead = chosen === best ? `${BET_LABEL[best]} is the best bet here.` : `${BET_LABEL[best]} is the better bet.`;

  if (chosen === "tie") {
    return (
      `Tie pays ${TIE_PAYS} to 1 but hits only ${pct(o.tie, 1)} of the time — fair odds would be about ${(1 / o.tie - 1).toFixed(1)} to 1. ` +
      `That gap is a ${edge("tie")} house edge, more than ten times the main bets. ${lead}`
    );
  }
  if (commission === "standard") {
    return (
      `${lead} The Banker wins ${pct(o.banker, 1)} of hands to the Player's ${pct(o.player, 1)}, because it draws last ` +
      `and its rule depends on the Player's third card. The 5% commission takes back most of that edge, not all: ` +
      `Banker costs ${edge("banker")} of each bet, Player ${edge("player")}.`
    );
  }
  return (
    `${lead} On a no-commission table, a Banker win with 6 pays only half — and that happens on ${pct(o.bankerSix, 1)} of hands. ` +
    `That costs more than the 5% commission it replaces, so Banker's edge rises to ${edge("banker")} and ` +
    `Player's ${edge("player")} is now the smaller one.`
  );
}
