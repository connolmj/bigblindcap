/**
 * All the game's React state in one hook, like the other trainers'.
 * Components read from it and call its functions; the rules live in ../engine.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { load, save } from "../../blackjack/ui/storage";
import type { Bet } from "../engine/payouts";
import { drawStep, finish, placeBet, startRound, type RoundState } from "../engine/round";
import { prepareShoe } from "../engine/scenario";
import { DEFAULT_SETTINGS, OPENING_PAUSE, STEP_DELAY, type Settings } from "./settings";
import { EMPTY_STATS, recordHand, type Stats } from "./stats";

// v2: the trainer stopped grading draw calls, so the stats changed shape.
const STATS_KEY = "bbc.baccarat.v2.stats";
const SETTINGS_KEY = "bbc.baccarat.settings";

/** Wait for the opening four cards to land before the first third-card rule plays. */
const OPENING_DEAL = 800;

export interface Trainer {
  round: RoundState;
  /** Increments every deal — used as a React key to reset animations. */
  roundId: number;
  stats: Stats;
  settings: Settings;
  bet: (bet: Bet) => void;
  /** Play the rest of the hand now instead of waiting for each card. */
  skip: () => void;
  nextHand: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
}

const deal = (s: Settings) => startRound(prepareShoe(), s.commission);
const drawing = (r: RoundState) => r.phase === "playerDraw" || r.phase === "bankerDraw";

export function useTrainer(): Trainer {
  const [settings, setSettings] = useState<Settings>(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [stats, setStats] = useState<Stats>(() => load(STATS_KEY, EMPTY_STATS));
  const [round, setRound] = useState<RoundState>(() => deal(settings));
  const [roundId, setRoundId] = useState(0);

  useEffect(() => save(SETTINGS_KEY, settings), [settings]);
  useEffect(() => save(STATS_KEY, stats), [stats]);

  // Record each finished hand's result exactly once.
  const recorded = useRef(-1);
  useEffect(() => {
    if (round.phase === "settled" && recorded.current !== roundId) {
      recorded.current = roundId;
      setStats((s) => recordHand(s, round.bet!, round.winner!, round.net ?? 0));
    }
  }, [round, roundId]);

  // A commission change applies to the hand on the table if nothing's been bet yet.
  useEffect(() => {
    setRound((r) =>
      r.phase === "bet" && r.commission !== settings.commission ? { ...r, commission: settings.commission } : r,
    );
  }, [settings.commission]);

  // The third-card rules play out one at a time, slowly enough to follow, like a dealer working the hand.
  useEffect(() => {
    if (!drawing(round)) return;
    const first = round.steps.length === 0;
    const t = setTimeout(() => setRound(drawStep), first ? OPENING_PAUSE : STEP_DELAY[settings.speed]);
    return () => clearTimeout(t);
  }, [round, settings.speed]);

  const bet = useCallback(
    (b: Bet) => {
      if (round.phase === "bet") setRound(placeBet(round, b));
    },
    [round],
  );

  const skip = useCallback(() => setRound((r) => (drawing(r) ? finish(r) : r)), []);

  const nextHand = useCallback(() => {
    if (round.phase !== "settled") return;
    setRound(deal(settings));
    setRoundId((id) => id + 1);
  }, [round.phase, settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const resetStats = useCallback(() => setStats(EMPTY_STATS), []);

  return { round, roundId, stats, settings, bet, skip, nextHand, updateSettings, resetStats };
}
