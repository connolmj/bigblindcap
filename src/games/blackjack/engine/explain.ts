/**
 * Turns a chart lookup into a plain-English "why".
 *
 * Numbers used here:
 * - DEALER_BUST: how often the dealer busts with each up card (6 decks, stands
 *   on soft 17, after checking for blackjack). Verified by simulating 400k hands.
 * - Your bust chance when hitting a hard total is the share of ranks that would
 *   push you over 21 (e.g. hard 16 busts on 6,7,8,9,10,J,Q,K = 8 of 13 ≈ 62%).
 */
import { withArticle } from "./cards";
import type { Action, Recommendation } from "./strategy";

export const DEALER_BUST: Record<number, number> = {
  2: 35,
  3: 37,
  4: 40,
  5: 42,
  6: 42,
  7: 26,
  8: 24,
  9: 23,
  10: 23,
  11: 17,
};

export const ACTION_LABEL: Record<Action, string> = {
  hit: "Hit",
  stand: "Stand",
  double: "Double",
  split: "Split",
};

/** Share of the 13 ranks that bust a hard total if you take one card. */
export function hitBustChance(hardTotal: number): number {
  if (hardTotal <= 11) return 0;
  const safe = 21 - hardTotal; // highest card value you can take (Ace counts 1)
  const bustingRanks = 13 - Math.min(safe, 9) - (safe >= 10 ? 4 : 0);
  return Math.round((Math.max(bustingRanks, 0) / 13) * 100);
}

const weak = (up: number) => up >= 2 && up <= 6;

export interface Explanation {
  /** e.g. "Hard 16 vs 10" */
  spot: string;
  /** The reasoning, 1–3 sentences. */
  why: string;
}

export function spotLabel(rec: Recommendation): string {
  const up = rec.upValue === 11 ? "A" : String(rec.upValue);
  if (rec.table === "pair") {
    const name = rec.rowKey === 11 ? "Aces" : `${rec.rowKey}s`;
    return `Pair of ${name} vs ${up}`;
  }
  if (rec.table === "soft") return `Soft ${rec.rowKey} (A,${rec.rowKey - 11}) vs ${up}`;
  if (rec.rowKey === 8) return `Hard 8 or less vs ${up}`;
  if (rec.rowKey === 17) return `Hard 17+ vs ${up}`;
  return `Hard ${rec.rowKey} vs ${up}`;
}

export function explain(rec: Recommendation, handTotal: number): Explanation {
  return { spot: spotLabel(rec), why: reason(rec, handTotal) };
}

function reason(rec: Recommendation, total: number): string {
  const { table, rowKey: row, upValue: up, action, cell } = rec;
  const dealer = withArticle(up);
  const bust = DEALER_BUST[up];
  const couldntDouble = (cell === "D" || cell === "Ds") && action !== "double";
  const noDoubleNote = couldntDouble
    ? ` You'd double here on your first two cards, but with more cards you can only ${action}.`
    : "";

  // ---- Pairs ----
  if (table === "pair") {
    switch (row) {
      case 11:
        return "Always split Aces. Together they're a clumsy soft 12; apart, each Ace is a great start where any 10 makes 21.";
      case 10:
        return "Never split 10s. A 20 wins about 8 times in 10 — breaking it up trades a near-sure winner for two hands that are only decent.";
      case 8:
        return up >= 9
          ? `Always split 8s — even against ${dealer}. 16 is the worst total in blackjack; two hands starting at 8 lose less money over time than one 16 does.`
          : "Always split 8s. Kept together they make 16, the worst total in blackjack. Split, each 8 is a fresh start that can reach 18.";
      case 5:
        return `Never split 5s — treat them as a hard 10. ${
          action === "double"
            ? `10 against ${dealer} is a strong doubling hand: any 10-value card gives you 20.`
            : `Against ${dealer} it's too strong to double into, so just hit.`
        }`;
      case 9:
        if (action === "stand") {
          return up === 7
            ? "Stand on 9,9 vs 7. Your 18 already beats the dealer's most likely finish (17, a 10 in the hole)."
            : `Stand on 9,9 vs ${up === 11 ? "an Ace" : "10"}. 18 is a reasonable hand, and two hands starting from 9 against a strong card would just lose twice as often.`;
        }
        return `Split 9s. 18 is good but not great, and ${dealer} is beatable — two hands starting at 9 win more in total than one 18.`;
      case 4:
        return action === "split"
          ? `Split 4s vs ${dealer}. The dealer busts ${bust}% of the time, and because you can double after splitting, catching a 6 or 7 on a 4 gives you a perfect double.`
          : "Don't split 4s here. 8 is a fine hand to hit, while two hands starting at 4 are weak.";
      default:
        // 2s, 3s, 6s, 7s
        return action === "split"
          ? `Split ${row}s vs ${dealer}. Each ${row} alone is a weak start, but the dealer is likely to struggle (busts ${bust}%), so getting more money on the table pays off — especially since you can double after splitting.`
          : `Don't split ${row}s vs ${dealer}. The dealer is too strong; splitting just makes two losing hands. Hit your ${row * 2} instead.`;
    }
  }

  // ---- Soft totals ----
  if (table === "soft") {
    if (row >= 19) {
      return `Stand on soft ${row}. It's already a strong hand — hitting mostly makes it worse.${
        row === 19 && up === 6 ? " (Some tables where the dealer hits soft 17 double this.)" : ""
      }`;
    }
    if (row === 18) {
      if (action === "double" || cell === "Ds") {
        return action === "double"
          ? `Double soft 18 vs ${dealer}. The dealer busts ${bust}% of the time, and one card can't bust you — so push more money out while you're the favourite.`
          : `Soft 18 vs ${dealer} is a double on two cards. With more cards, stand — 18 is good against a weak dealer.`;
      }
      if (action === "stand") {
        return up === 2
          ? "Stand on soft 18 vs 2. It's close, but 18 is ahead, and a 2 isn't weak enough to justify doubling."
          : `Stand on soft 18 vs ${dealer}. The dealer's most likely finish is ${up + 10}, so your 18 is already ahead.`;
      }
      return `Hit soft 18 vs ${dealer}. It feels wrong, but ${dealer} often ends on 19 or 20, so 18 loses more than it looks. You can't bust with one card, so improving is free.`;
    }
    // Soft 13–17
    if (action === "double") {
      return `Double soft ${row} vs ${dealer}. You can't bust with one card, and the dealer busts ${bust}% of the time — this is a spot to get more money out.`;
    }
    return `Hit soft ${row}. ${row === 17 ? "Soft 17 is weak — the dealer's 17 ties it at best." : `${row} won't win by standing.`} Your Ace means one card can't bust you, so hitting is free.${noDoubleNote}${
      !couldntDouble && weak(up)
        ? ` ${dealer[0].toUpperCase() + dealer.slice(1)} isn't weak enough to double soft ${row} into.`
        : ""
    }`;
  }

  // ---- Hard totals ----
  if (row === 17) {
    return `Stand on hard ${total}. Hitting busts ${hitBustChance(Math.max(total, 17))}% of the time or more — standing wins more.`;
  }
  if (row === 8) {
    return `Hit. You can't bust with one card, and ${total} is too low to win by standing.`;
  }
  if (row >= 9 && row <= 11) {
    if (action === "double") {
      return row === 11
        ? `Double 11 vs ${dealer}. Almost a third of the deck is 10-valued, giving you 21, and anything 7 or up leaves you 18+.`
        : row === 10
          ? `Double 10 vs ${dealer}. A 10-value card makes 20, and you're already ahead of what ${dealer} usually ends on.`
          : `Double 9 vs ${dealer}. The dealer busts ${bust}% of the time, and a good card gives you 19.`;
    }
    if (couldntDouble) return `Hit ${total}. You can't bust, and you need more.${noDoubleNote}`;
    return row === 11
      ? "Hit 11 vs an Ace. With 6 decks and a dealer who stands on soft 17, the Ace is just strong enough that doubling costs a bit more than hitting."
      : `Hit ${row} vs ${dealer}. You can't bust, but ${dealer} is too strong to double into.`;
  }

  // Hard 12–16
  const myBust = hitBustChance(row);
  if (action === "stand") {
    return `Stand. With ${row}, hitting busts ${myBust}% of the time, and ${dealer} busts ${bust}% — let the dealer take the risk.`;
  }
  if (row === 12 && (up === 2 || up === 3)) {
    return `Hit 12 vs ${dealer}. Only 10-value cards bust you (${myBust}%), and a ${up} only busts ${bust}% of the time — not weak enough to stand on 12.`;
  }
  if (row === 16 && up === 10) {
    return "Hit 16 vs 10. It's the worst spot in blackjack: standing only wins when the dealer busts (23%). Hitting loses slightly less, even though it busts often.";
  }
  return `Hit ${row} vs ${dealer}. The dealer will usually finish 17 or better (busts only ${bust}%), so standing on ${row} mostly loses. Hitting busts ${myBust}%, but it's still the better bet.`;
}
