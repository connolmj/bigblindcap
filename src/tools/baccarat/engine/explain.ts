/**
 * The "why" behind each step of a hand. Bet numbers come from exactOdds();
 * draw reasons quote the rule and a way to remember it.
 */
import type { Card } from "../../blackjack/engine/cards";
import { cardPoints } from "./hand";
import { BET_LABEL, bestBet, betReturn, exactOdds, TIE_PAYS, type Bet, type Commission } from "./payouts";
import type { Step } from "./round";
import type { DrawAction, DrawSpot } from "./rules";

export const pct = (x: number, digits = 2) => `${(x * 100).toFixed(digits)}%`;

/** "Banker 5 vs Player's 3rd card 4", "Player 5", "Banker 6, Player stood" */
export function spotLabel(spot: DrawSpot): string {
  if (spot.side === "player") return `Player ${spot.total}`;
  if (spot.playerThird === null) return `Banker ${spot.total}, Player stood`;
  return `Banker ${spot.total} vs Player's 3rd card ${spot.playerThird}`;
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

/** A neutral note on the bet you placed: what it pays, how often it wins, and its house edge here. */
export function betNote(bet: Bet, commission: Commission): string {
  const o = exactOdds();
  const edge = (b: Bet) => pct(-betReturn(b, commission));
  const best = bestBet(commission);
  if (bet === "tie") {
    return (
      `Tie pays ${TIE_PAYS} to 1 and comes in ${pct(o.tie, 1)} of the time, about once every ${Math.round(1 / o.tie)} hands. ` +
      `That's a ${edge("tie")} house edge, more than ten times ${BET_LABEL[best]}'s ${edge(best)}.`
    );
  }
  const wins = bet === "banker" ? o.banker : o.player;
  const lowest =
    bet === best ? " — the lowest on this table" : `, a little more than ${BET_LABEL[best]}'s ${edge(best)}`;
  const pays =
    bet === "player"
      ? "pays 1 to 1"
      : commission === "standard"
        ? "pays 0.95 to 1 after the 5% commission"
        : "pays 1 to 1, but a winning 6 pays half";
  return `${BET_LABEL[bet]} wins ${pct(wins, 1)} of hands and ${pays}. House edge ${edge(bet)}${lowest}.`;
}

/** One line for each step of the hand: what the rule said, and why. */
export function stepText(step: Step): { title: string; why: string } {
  if (step.kind === "natural") {
    const who =
      step.side === "both"
        ? `Both hands have naturals, ${step.player} and ${step.banker}`
        : step.side === "player"
          ? `Player has a natural ${step.player}`
          : `Banker has a natural ${step.banker}`;
    return { title: `${who} — nobody draws.`, why: "An 8 or 9 on the first two cards ends the hand." };
  }
  const who = step.spot.side === "player" ? "Player" : "Banker";
  const did = step.action === "draw" ? `draws ${cardWord(step.card)}` : "stands";
  return { title: `${who} ${step.spot.total} — ${did}`, why: whyDraw(step.spot, step.action) };
}

/** "a 7", "an Ace", "a K (counts 0)" */
function cardWord(card?: Card): string {
  if (!card) return "";
  const name = card.rank === "A" ? "an Ace" : card.rank === "8" ? "an 8" : `a ${card.rank}`;
  return cardPoints(card) === 0 ? `${name} (counts 0)` : name;
}
