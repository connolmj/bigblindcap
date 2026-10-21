/**
 * All the game's React state in one hook, like the other trainers'.
 * Components read from it and call its functions; the rules live in ../engine.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { legalActions } from "../../blackjack/engine/round";
import type { Action } from "../../blackjack/engine/strategy";
import { DEALER_DELAY } from "../../blackjack/ui/settings";
import { playCorrect, playWrong } from "../../blackjack/ui/sound";
import { load, save } from "../../blackjack/ui/storage";
import {
  act as actIn,
  handOver,
  newSession,
  nextHand as nextIn,
  placeBet,
  stepDealer,
  submitCount,
  type Session,
} from "../engine/session";
import { DEFAULT_SETTINGS, SOMETIMES_EVERY, type Settings } from "./settings";
import { EMPTY_STATS, recordDecision, recordHand, type Stats } from "./stats";

const STATS_KEY = "bbc.blackjack.counting.stats";
const SETTINGS_KEY = "bbc.blackjack.counting.settings";

const NO_MOVES: Record<Action, boolean> = { hit: false, stand: false, double: false, split: false };

export interface Trainer {
  session: Session;
  /** Increments every deal — used as a React key to reset animations. */
  roundId: number;
  legal: Record<Action, boolean>;
  stats: Stats;
  settings: Settings;
  count: (answer: number) => void;
  bet: (units: number) => void;
  act: (action: Action) => void;
  nextHand: () => void;
  newShoe: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
}

export function useTrainer(): Trainer {
  const [settings, setSettings] = useState<Settings>(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [stats, setStats] = useState<Stats>(() => load(STATS_KEY, EMPTY_STATS));
  const [session, setSession] = useState<Session>(() => newSession());
  const [roundId, setRoundId] = useState(0);

  useEffect(() => save(SETTINGS_KEY, settings), [settings]);
  useEffect(() => save(STATS_KEY, stats), [stats]);

  // Record each finished hand's result exactly once.
  const recorded = useRef(-1);
  useEffect(() => {
    if (handOver(session) && recorded.current !== roundId) {
      recorded.current = roundId;
      setStats((s) => recordHand(s, session.round!.net ?? 0));
    }
  }, [session, roundId]);

  // The dealer's turn plays out one card at a time so you can watch (and count) it.
  const round = session.round;
  useEffect(() => {
    if (session.phase !== "play" || round?.phase !== "dealer") return;
    const firstStep = round.dealer.length === 2; // give the hole-card flip a moment
    const delay = DEALER_DELAY[settings.speed] + (firstStep ? 250 : 0);
    const t = setTimeout(() => setSession((s) => stepDealer(s)), delay);
    return () => clearTimeout(t);
  }, [session.phase, round, settings.speed]);

  const apply = useCallback((next: Session) => {
    const decision = next.decisions[next.decisions.length - 1];
    setSession(next);
    setStats((s) => recordDecision(s, decision));
    if (decision.correct) playCorrect();
    else playWrong();
  }, []);

  const count = useCallback(
    (answer: number) => {
      if (session.phase === "count") apply(submitCount(session, answer));
    },
    [session, apply],
  );

  const bet = useCallback(
    (units: number) => {
      if (session.phase !== "bet") return;
      apply(placeBet(session, units));
      setRoundId((id) => id + 1);
    },
    [session, apply],
  );

  const act = useCallback(
    (action: Action) => {
      if (session.phase === "play" && session.round && legalActions(session.round)[action]) {
        apply(actIn(session, action));
      }
    },
    [session, apply],
  );

  const nextHand = useCallback(() => {
    if (!handOver(session)) return;
    const ask =
      settings.countCheck === "every" ||
      (settings.countCheck === "sometimes" && (session.hands + 1) % SOMETIMES_EVERY === 0);
    setSession(nextIn(session, ask));
  }, [session, settings.countCheck]);

  const newShoe = useCallback(() => {
    // Only between hands, so a hand in progress isn't thrown away.
    if (session.phase === "play" && !handOver(session)) return;
    setSession(newSession());
  }, [session]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const resetStats = useCallback(() => setStats(EMPTY_STATS), []);

  const legal = session.phase === "play" && session.round ? legalActions(session.round) : NO_MOVES;
  return {
    session,
    roundId,
    legal,
    stats,
    settings,
    count,
    bet,
    act,
    nextHand,
    newShoe,
    updateSettings,
    resetStats,
  };
}
