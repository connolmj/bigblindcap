/**
 * Two six-sided dice. Every bet on the table comes down to these 36 equally
 * likely rolls, so the odds below are counted, not simulated.
 */
export type Die = 1 | 2 | 3 | 4 | 5 | 6;
export type Dice = [Die, Die];
export type Rng = () => number;

export const POINTS = [4, 5, 6, 8, 9, 10] as const;
export type PointNum = (typeof POINTS)[number];

export const isPoint = (t: number): t is PointNum => (POINTS as readonly number[]).includes(t);

const die = (rng: Rng) => (Math.floor(rng() * 6) + 1) as Die;
export const rollDice = (rng: Rng = Math.random): Dice => [die(rng), die(rng)];

export const total = (d: Dice) => d[0] + d[1];
/** Both dice the same, e.g. 3-3 is a "hard" 6. */
export const isHard = (d: Dice) => d[0] === d[1];

/** All 36 ordered rolls. */
export const ALL_ROLLS: Dice[] = ([1, 2, 3, 4, 5, 6] as Die[]).flatMap((a) =>
  ([1, 2, 3, 4, 5, 6] as Die[]).map((b) => [a, b] as Dice),
);

/** Ways to roll a total out of 36: 1 for 2 and 12, up to 6 for 7. */
export const ways = (t: number) => (t < 2 || t > 12 ? 0 : 6 - Math.abs(7 - t));

/** What the stickman calls each total. */
export const ROLL_NAME: Record<number, string> = {
  2: "Aces",
  3: "Ace-deuce",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
  10: "Ten",
  11: "Yo-leven",
  12: "Boxcars",
};
