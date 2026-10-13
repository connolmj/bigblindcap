/**
 * All the game's React state in one hook, like the other trainers'.
 * Components read from it and call its functions; the rules live in ../engine.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { playCorrect, playWrong } from "../../blackjack/ui/sound";
import { load, save } from "../../blackjack/ui/storage";
import type { Bet } from "../engine/payouts";
import { callDraw, placeBet, startRound, type RoundState } from "../engine/round";
import type { DrawAction } from "../engine/rules";
import { prepareShoe } from "../engine/scenario";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { EMPTY_STATS, recordDecision, recordHand, type Stats } from "./stats";

const STATS_KEY = "bbc.baccarat.stats";
const SETTINGS_KEY = "bbc.baccarat.settings";

export interface Trainer {
  round: RoundState;
  /** Increments every deal — used as a React key to reset animations. */
  roundId: number;
  stats: Stats;
  settings: Settings;
  bet: (bet: Bet) => void;
  draw: (action: DrawAction) => void;
  nextHand: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
}

const deal = (s: Settings) => startRound(prepareShoe(s.dealMode), s.commission);

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
      setStats((s) => recordHand(s, round.net ?? 0));
    }
  }, [round, roundId]);

  // A commission change applies to the hand on the table if nothing's been bet yet.
  useEffect(() => {
    setRound((r) =>
      r.phase === "bet" && r.commission !== settings.commission ? { ...r, commission: settings.commission } : r,
    );
  }, [settings.commission]);

  const apply = useCallback((next: RoundState) => {
    const decision = next.decisions[next.decisions.length - 1];
    setRound(next);
    setStats((s) => recordDecision(s, decision));
    if (decision.correct) playCorrect();
    else playWrong();
  }, []);

  const bet = useCallback(
    (b: Bet) => {
      if (round.phase === "bet") apply(placeBet(round, b));
    },
    [round, apply],
  );

  const draw = useCallback(
    (action: DrawAction) => {
      if (round.phase === "playerDraw" || round.phase === "bankerDraw") apply(callDraw(round, action));
    },
    [round, apply],
  );

  const nextHand = useCallback(() => {
    if (round.phase !== "settled") return;
    setRound(deal(settings));
    setRoundId((id) => id + 1);
  }, [round.phase, settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const resetStats = useCallback(() => setStats(EMPTY_STATS), []);

  return { round, roundId, stats, settings, bet, draw, nextHand, updateSettings, resetStats };
}
