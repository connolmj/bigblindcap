/**
 * The odds math behind Sports Betting Basics: American odds, implied probability,
 * the vig on a two-way line, and how it compounds through a parlay.
 */
import { payout } from "../../../tools/bankroll/model/sim";

/** Chance a price implies, vig included. −110 → 52.38%, +150 → 40%. */
export function impliedProb(odds: number): number {
  return 1 / (1 + payout(odds));
}

/** Total returned per $1 staked on a win, stake included. −110 → 1.909, +150 → 2.5. */
export function toDecimal(odds: number): number {
  return 1 + payout(odds);
}

/** Profit on a winning $100 bet. −110 → 90.91, +150 → 150. */
export function profitOn100(odds: number): number {
  return 100 * payout(odds);
}

/** Stake needed to profit $100. −110 → 110, +150 → 66.67. */
export function riskToWin100(odds: number): number {
  return 100 / payout(odds);
}

/** Fair American price for a true probability, no vig. 0.5 → +100, 0.6 → −150. */
export function fairOdds(p: number): number {
  return p >= 0.5 ? -(100 * p) / (1 - p) : (100 * (1 - p)) / p;
}

export interface TwoWay {
  /** Implied chances of both sides added up — over 100% by the vig. */
  total: number;
  /** The book's cut of all money bet if action is balanced so it pays the same either way. */
  hold: number;
  /** Each side's chance with the vig taken out. */
  fair: [number, number];
}

/** −110 / −110 → total 104.76%, hold 4.55%, fair 50% / 50%. */
export function twoWay(a: number, b: number): TwoWay {
  const pa = impliedProb(a);
  const pb = impliedProb(b);
  const total = pa + pb;
  return { total, hold: 1 - 1 / total, fair: [pa / total, pb / total] };
}

export interface ParlayRow {
  legs: number;
  /** Chance every leg wins. */
  winChance: number;
  /** What a fair book would pay per $1 (stake included) — 1 / winChance. */
  fairDecimal: number;
  /** What the book pays per $1 (stake included) — each leg's decimal price multiplied. */
  bookDecimal: number;
  /** Expected profit per $1 staked. */
  ev: number;
}

/**
 * A parlay of `legs` coin flips each priced at `odds` on both sides (−110 / −110 and so on),
 * so every leg is truly 50/50 and the only thing working against you is the vig.
 */
export function coinFlipParlay(odds: number, legs: number): ParlayRow {
  const p = twoWay(odds, odds).fair[0];
  const winChance = p ** legs;
  const bookDecimal = toDecimal(odds) ** legs;
  return { legs, winChance, fairDecimal: 1 / winChance, bookDecimal, ev: winChance * bookDecimal - 1 };
}

/** The standard ladder of prices shown in the odds table. */
export const ODDS_LADDER = [
  -1000, -500, -400, -300, -250, -200, -175, -150, -130, -120, -110, -105, 100, 105, 110, 120, 130, 150, 175, 200, 250,
  300, 400, 500, 1000,
];
