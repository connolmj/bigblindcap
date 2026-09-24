/**
 * All the game's React state in one hook. Components just read from it and
 * call its functions; the rules themselves live in ../engine.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { applyAction, dealerStep, legalActions, startRound, type RoundState } from "../engine/round";
import { prepareShoe } from "../engine/scenario";
import type { Action } from "../engine/strategy";
import { DEALER_DELAY, DEFAULT_SETTINGS, type Settings } from "./settings";
import { EMPTY_STATS, recordDecision, recordHand, type Stats } from "./stats";
import { playCorrect, playWrong } from "./sound";
import { load, save } from "./storage";

const STATS_KEY = "bbc.blackjack.l1.stats";
const SETTINGS_KEY = "bbc.blackjack.l1.settings";

export interface Trainer {
  round: RoundState;
  /** Increments every deal — used as a React key to reset animations. */
  roundId: number;
  legal: Record<Action, boolean>;
  stats: Stats;
  settings: Settings;
  act: (action: Action) => void;
  nextHand: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
}

export function useTrainer(): Trainer {
  const [settings, setSettings] = useState<Settings>(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [stats, setStats] = useState<Stats>(() => load(STATS_KEY, EMPTY_STATS));
  const [round, setRound] = useState<RoundState>(() => startRound(prepareShoe(settings.dealMode)));
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

  // The dealer's turn plays out one card at a time so you can watch it.
  useEffect(() => {
    if (round.phase !== "dealer") return;
    const firstStep = round.dealer.length === 2; // give the hole-card flip a moment
    const delay = DEALER_DELAY[settings.speed] + (firstStep ? 250 : 0);
    const t = setTimeout(() => setRound((r) => dealerStep(r)), delay);
    return () => clearTimeout(t);
  }, [round, settings.speed]);

  const act = useCallback(
    (action: Action) => {
      if (!legalActions(round)[action]) return;
      const next = applyAction(round, action);
      const decision = next.decisions[next.decisions.length - 1];
      setRound(next);
      setStats((s) => recordDecision(s, decision));
      if (decision.correct) playCorrect();
      else playWrong();
    },
    [round],
  );

  const nextHand = useCallback(() => {
    if (round.phase !== "settled") return;
    setRound(startRound(prepareShoe(settings.dealMode)));
    setRoundId((id) => id + 1);
  }, [round.phase, settings.dealMode]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const resetStats = useCallback(() => setStats(EMPTY_STATS), []);

  return { round, roundId, legal: legalActions(round), stats, settings, act, nextHand, updateSettings, resetStats };
}
