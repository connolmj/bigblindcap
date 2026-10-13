/**
 * All the game's React state in one hook, like the blackjack trainer's.
 * Components read from it and call its functions; the rules live in ../engine.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { playCorrect, playWrong } from "../../blackjack/ui/sound";
import { load, save } from "../../blackjack/ui/storage";
import { decide, revealStep, startRound, type RoundState } from "../engine/round";
import { prepareDeck } from "../engine/scenario";
import type { Action } from "../engine/strategy";
import { DEFAULT_SETTINGS, REVEAL_DELAY, type Settings } from "./settings";
import { EMPTY_STATS, recordDecision, recordHand, type Stats } from "./stats";

const STATS_KEY = "bbc.threecard.stats";
const SETTINGS_KEY = "bbc.threecard.settings";

export interface Trainer {
  round: RoundState;
  /** Increments every deal — used as a React key to reset animations. */
  roundId: number;
  stats: Stats;
  settings: Settings;
  act: (action: Action) => void;
  nextHand: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
}

const deal = (s: Settings) => startRound(prepareDeck(s.dealMode), s.pairPlus === "off" ? null : s.pairPlus);

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
      setStats((s) => recordHand(s, round.payout?.net ?? 0));
    }
  }, [round, roundId]);

  // Switching which hands to deal takes effect at once if you haven't acted on this hand yet.
  const lastMode = useRef(settings.dealMode);
  useEffect(() => {
    if (lastMode.current === settings.dealMode) return;
    lastMode.current = settings.dealMode;
    if (round.phase !== "decide") return;
    setRound(deal(settings));
    setRoundId((id) => id + 1);
  }, [settings.dealMode]);

  // The dealer's cards turn over one at a time so you can watch.
  useEffect(() => {
    if (round.phase !== "reveal") return;
    const delay = REVEAL_DELAY[settings.speed] + (round.revealed === 0 ? 200 : 0);
    const t = setTimeout(() => setRound((r) => revealStep(r)), delay);
    return () => clearTimeout(t);
  }, [round, settings.speed]);

  const act = useCallback(
    (action: Action) => {
      if (round.phase !== "decide") return;
      const next = decide(round, action);
      const decision = next.decision!;
      setRound(next);
      setStats((s) => recordDecision(s, decision));
      if (decision.correct) playCorrect();
      else playWrong();
    },
    [round],
  );

  const nextHand = useCallback(() => {
    if (round.phase !== "settled") return;
    setRound(deal(settings));
    setRoundId((id) => id + 1);
  }, [round.phase, settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const resetStats = useCallback(() => setStats(EMPTY_STATS), []);

  return { round, roundId, stats, settings, act, nextHand, updateSettings, resetStats };
}
