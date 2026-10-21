/**
 * The "why" behind each call: the count, the bet and the play.
 */
import { withArticle } from "../../blackjack/engine/cards";
import { ACTION_LABEL, explain, spotLabel } from "../../blackjack/engine/explain";
import { handTotal } from "../../blackjack/engine/hand";
import type { Cell } from "../../blackjack/engine/strategy";
import { betFor, edgeAt } from "./betting";
import type { Deviation } from "./deviations";
import { countCards, decksLeft, fmtCount, fmtDecks, hiLo } from "./hilo";
import type { Decision } from "./session";

/** What each call is filed under in the progress panel. */
export type Group = "count" | "bet" | "basic" | "deviation";

export const GROUP_LABEL: Record<Group, string> = {
  count: "Running count",
  bet: "Bet size",
  basic: "Basic strategy",
  deviation: "Count plays",
};

export function groupOf(d: Decision): Group {
  if (d.kind === "play") return d.advice.deviation ? "deviation" : "basic";
  return d.kind;
}

/** Short name for a decision, for the "most missed" list. */
export function decisionLabel(d: Decision): string {
  if (d.kind === "count") return "Running count";
  if (d.kind === "bet") return `Bet at true count ${fmtCount(d.tc)}`;
  const spot = spotLabel(d.advice.rec);
  return d.advice.deviation ? `${spot} (count play)` : spot;
}

const CELL_WORD: Record<Cell, string> = { H: "hit", S: "stand", D: "double", Ds: "double", P: "split" };

/** "16 vs 10: stand at +0 or more" */
export function deviationRule(v: Deviation): string {
  const hand = v.table === "pair" ? "10,10" : String(v.row);
  const up = v.up === 11 ? "A" : String(v.up);
  const atOrAbove = CELL_WORD[v.atOrAbove];
  const below = CELL_WORD[v.below];
  // Negative indexes read better from the low side: "hit below −1".
  return v.index < 0
    ? `${hand} vs ${up}: ${below} below ${fmtCount(v.index)}`
    : `${hand} vs ${up}: ${atOrAbove} at ${fmtCount(v.index)} or more`;
}

export function whyCount(d: Extract<Decision, { kind: "count" }>): string {
  const plus = d.lastHand.filter((c) => hiLo(c) === 1).length;
  const minus = d.lastHand.filter((c) => hiLo(c) === -1).length;
  const change = countCards(d.lastHand);
  const before = d.actual - change;
  return (
    `Last hand showed ${plus} low ${plus === 1 ? "card" : "cards"} (+1 each) and ${minus} high ` +
    `${minus === 1 ? "card" : "cards"} (−1 each): ${fmtCount(change)}. ` +
    `${fmtCount(before)} going in, so the running count is ${fmtCount(d.actual)}.`
  );
}

export function whyBet(d: Extract<Decision, { kind: "bet" }>): string {
  const decks = decksLeft(d.cardsLeft);
  const division = `${fmtCount(d.running)} ÷ ${fmtDecks(decks)} ${decks === 1 ? "deck" : "decks"} left`;
  const edge = edgeAt(d.tc);
  const edgeText = `${edge > 0 ? "+" : edge < 0 ? "−" : ""}${Math.abs(edge).toFixed(1)}%`;
  if (d.tc <= 1) {
    return (
      `True count: ${division} → ${fmtCount(d.tc)}. The house still has the edge (yours is about ${edgeText}), ` +
      `so bet the minimum: 1 unit.`
    );
  }
  return (
    `True count: ${division} → ${fmtCount(d.tc)}. The shoe is rich in 10s and Aces, which makes blackjacks and ` +
    `dealer busts more likely. Your edge is about ${edgeText}, so the ramp says ${betFor(d.tc)} units.`
  );
}

/** Why a count play changes the move — one reason per kind of change. */
function deviationReason(v: Deviation): string {
  if (v.table === "pair") {
    return `With this many 10s left, the dealer's ${v.up} busts so often that two hands starting from a 10 earn more than one 20.`;
  }
  if (v.atOrAbove === "D") {
    return `Extra 10s left make your one double-down card more likely to land a big total, so doubling pays.`;
  }
  if (v.index < 0) {
    return `With extra small cards left, your hit is unlikely to bust and the dealer's ${v.up} is unlikely to bust either, so taking a card wins out.`;
  }
  return `Extra 10s left mean a hit busts you more often, and the dealer busts more often too, so standing wins out.`;
}

export function whyPlay(d: Extract<Decision, { kind: "play" }>): string {
  const { advice, tc } = d;
  const v = advice.deviation;
  if (!v) return explain(advice.rec, handTotal(d.cards).total).why;
  const rule = deviationRule(v);
  const basicMove = ACTION_LABEL[advice.basic.action].toLowerCase();
  if (advice.rec.cell !== advice.basic.cell && !advice.deviates) {
    return `Count play — ${rule}. The true count is ${fmtCount(tc)}, but you can only double on your first two cards, so ${basicMove}.`;
  }
  if (advice.deviates) {
    return `Count play — ${rule}. The true count is ${fmtCount(tc)}, so it beats the basic play (${basicMove}). ${deviationReason(v)}`;
  }
  return `A count spot — ${rule}. The true count is ${fmtCount(tc)}, so the basic play stands: ${basicMove} against ${withArticle(v.up)}.`;
}
