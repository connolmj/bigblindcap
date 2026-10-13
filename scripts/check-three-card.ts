/**
 * Checks the Three Card Poker strategy against every possible deal: all 22,100
 * hands you could get × the 18,424 the dealer could hold from what's left.
 *
 * Prints whether "play Q-6-4 or better" matches the exactly-counted best move
 * for every hand, and the house edge of Ante & Play when you follow it — the
 * numbers written into src/tools/three-card/engine/paytable.ts — along with
 * what three popular "simpler" ways to play cost instead.
 * Takes ~10 seconds: npm run check-three-card
 */
import { buildShoe } from "../src/tools/blackjack/engine/cards";
import { CATEGORIES, evaluate, evaluateValues, QUALIFY_SCORE } from "../src/tools/three-card/engine/hand";
import { ANTE_BONUS } from "../src/tools/three-card/engine/paytable";
import { THRESHOLD } from "../src/tools/three-card/engine/strategy";

/** Other ways people play: the weakest hand each one plays. */
const OTHERS: Record<string, number> = {
  "Never fold": 0,
  "Mimic the dealer (Q-high)": QUALIFY_SCORE,
  "King-high or better": evaluateValues([13, 3, 2], false).score,
};

const deck = buildShoe(1);
// Score of every 3-card combo, looked up by card indexes (i < j < k).
const at = (i: number, j: number, k: number) => i * 2704 + j * 52 + k;
const scores = new Int32Array(52 * 52 * 52);
const combos: [number, number, number][] = [];
for (let i = 0; i < 52; i++)
  for (let j = i + 1; j < 52; j++)
    for (let k = j + 1; k < 52; k++) {
      scores[at(i, j, k)] = evaluate([deck[i], deck[j], deck[k]]).score;
      combos.push([i, j, k]);
    }
const bonusOf = (score: number) => ANTE_BONUS[CATEGORIES[score >> 12]] ?? 0;

let mismatches = 0;
let returned = 0;
let action = 0;
const others = Object.fromEntries(Object.keys(OTHERS).map((k) => [k, 0]));
for (const [a, b, c] of combos) {
  const mine = scores[at(a, b, c)];
  const bonus = bonusOf(mine);
  const rest = [...Array(52).keys()].filter((x) => x !== a && x !== b && x !== c);
  let total = 0;
  let n = 0;
  for (let i = 0; i < rest.length; i++)
    for (let j = i + 1; j < rest.length; j++)
      for (let k = j + 1; k < rest.length; k++) {
        const dealer = scores[at(rest[i], rest[j], rest[k])];
        n++;
        if (dealer < QUALIFY_SCORE) total += 1 + bonus;
        else if (mine > dealer) total += 2 + bonus;
        else if (mine < dealer) total += -2 + bonus;
        else total += bonus;
      }
  const playEv = total / n;
  const play = playEv > -1;
  if (play !== mine >= THRESHOLD.score) mismatches++;
  returned += play ? playEv : -1;
  for (const [name, min] of Object.entries(OTHERS)) others[name] += mine >= min ? playEv : -1;
  action += play ? 2 : 1;
}

console.log(`Hands where Q-6-4 disagrees with the exact best move: ${mismatches} of ${combos.length}`);
console.log(`Return per ante:       ${((returned / combos.length) * 100).toFixed(3)}%`);
console.log(`Return per unit bet:   ${((returned / action) * 100).toFixed(3)}%`);
for (const [name, total] of Object.entries(others))
  console.log(`  ${name.padEnd(28)} ${((total / combos.length) * 100).toFixed(3)}% per ante`);
if (mismatches) process.exit(1);
