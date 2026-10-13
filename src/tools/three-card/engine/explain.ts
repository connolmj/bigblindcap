/**
 * Turns an analysis into a plain-English "why". Every number quoted comes
 * from analyze(): the exact share of the dealer's 18,424 possible hands, given
 * the three cards you're holding.
 */
import { CATEGORY_NAME, describe, rankWord, shape, type HandValue } from "./hand";
import { ANTE_BONUS } from "./paytable";
import { THRESHOLD, type Action, type Analysis } from "./strategy";

export const ACTION_LABEL: Record<Action, string> = { play: "Play", fold: "Fold" };

/** How the progress panel groups hands. */
export type Group = "made" | "high" | "queen" | "weak";

export const GROUP_LABEL: Record<Group, string> = {
  made: "Pair or better",
  high: "Ace / King-high",
  queen: "Queen-high",
  weak: "Jack-high or less",
};

export function groupOf(hand: HandValue): Group {
  if (hand.category !== "high") return "made";
  const top = hand.ranks[0];
  if (top >= 13) return "high";
  if (top === 12) return "queen";
  return "weak";
}

/** "Q-6-3", "Pair", "Flush" — the name a missed hand is filed under. */
export function spotLabel(hand: HandValue): string {
  return hand.category === "high" ? shape(hand) : CATEGORY_NAME[hand.category];
}

/** +0.21u, −1.007u. Close calls get a third decimal so the gap shows. */
export function fmtEv(n: number, digits = 2): string {
  const s = Math.abs(n).toFixed(digits);
  if (Number(s) === 0) return "±0";
  return (n > 0 ? "+" : "−") + s + "u";
}

export const fmtPct = (share: number) => `${Math.round(share * 100)}%`;

/** Decimals to show for this hand's EVs: three when Play and Fold are within 0.05 of each other. */
export const evDigits = (a: Analysis) => (a.edge < 0.05 ? 3 : 2);

export interface Explanation {
  /** "Queen-high (Q-6-4)" */
  spot: string;
  /** 1–3 sentences on why. */
  why: string;
  /** The EV comparison, one line. */
  math: string;
}

export function explain(a: Analysis): Explanation {
  const hand = a.hand;
  const group = groupOf(hand);
  const digits = evDigits(a);
  const math = `Playing averages ${fmtEv(a.playEv, digits)} per ante; folding is always −1u. ${
    a.action === "play" ? "Playing" : "Folding"
  } saves ${fmtEv(a.edge, digits).replace(/^[+−]/, "")} a hand.`;
  return { spot: describe(hand), why: why(a, group), math };
}

function why(a: Analysis, group: Group): string {
  const hand = a.hand;
  const fails = fmtPct(a.dealerFails);
  // Of the hands where the dealer does qualify, how many you beat.
  const beat = fmtPct(a.win / (1 - a.dealerFails));
  const bonus = ANTE_BONUS[hand.category];

  switch (group) {
    case "made":
      return (
        `Always play a pair or better. The dealer misses qualifying ${fails} of the time, and when they do qualify your ` +
        `${CATEGORY_NAME[hand.category].toLowerCase()} still beats ${beat} of their hands.` +
        (bonus ? ` On top of that, the ante bonus pays ${bonus} to 1 on your ante whatever the dealer has.` : "")
      );
    case "high":
      return (
        `${rankWord(hand.ranks[0])}-high is worth playing. ${fails} of the time the dealer can't qualify, so your ante wins ` +
        `and your play bet comes back no matter what you hold. When they do qualify you still beat ${beat} of their hands.`
      );
    case "queen":
      return a.action === "play"
        ? `This is the close call. ${shape(hand)} is at or above ${shape(THRESHOLD)}, the weakest hand worth playing. ` +
            `You'll lose a little on average either way, but you beat ${beat} of the dealer's qualifying hands — ` +
            `just enough that a second unit at risk loses less than giving up the ante.`
        : `Just under the line. ${shape(THRESHOLD)} is the weakest hand worth playing, and ${shape(hand)} is below it. ` +
            `You'd beat only ${beat} of the dealer's qualifying hands, so putting a second unit at risk costs more than ` +
            `the ante you save by staying in.`;
    case "weak":
      return (
        `${rankWord(hand.ranks[0])}-high can never beat a dealer who qualifies — they need Queen-high or better. ` +
        `You'd only win when they miss (${fails} of the time), and that pays 1 unit; the other ${fmtPct(1 - a.dealerFails)} ` +
        `you'd lose 2. Fold and lose just the ante.`
      );
  }
}
