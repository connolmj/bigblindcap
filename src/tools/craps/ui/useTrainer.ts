/**
 * All the game's React state in one hook, like the other trainers'.
 * Components read from it and call its functions; the rules live in ../engine.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { playChip, playCorrect, playDice, playWrong } from "../../blackjack/ui/sound";
import { load, save } from "../../blackjack/ui/storage";
import type { SpotId } from "../engine/bets";
import { rollDice } from "../engine/dice";
import { clearNew, newTable, placeChips, roll as rollTable, undo as undoTable, type TableState } from "../engine/table";
import { DEFAULT_SETTINGS, rulesOf, type Settings } from "./settings";
import { EMPTY_STATS, recordDecision, recordRoll, type Stats } from "./stats";

const STATS_KEY = "bbc.craps.stats";
const SETTINGS_KEY = "bbc.craps.settings";

export interface Trainer {
  table: TableState;
  /** Increments every roll — used as a React key to replay the dice animation. */
  rollId: number;
  stats: Stats;
  settings: Settings;
  place: (id: SpotId) => void;
  undo: () => void;
  clear: () => void;
  roll: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetStats: () => void;
}

export function useTrainer(): Trainer {
  const [settings, setSettings] = useState<Settings>(() => load(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [stats, setStats] = useState<Stats>(() => load(STATS_KEY, EMPTY_STATS));
  const [table, setTable] = useState<TableState>(newTable);
  const [rollId, setRollId] = useState(0);
  const rules = useMemo(() => rulesOf(settings), [settings]);

  useEffect(() => save(SETTINGS_KEY, settings), [settings]);
  useEffect(() => save(STATS_KEY, stats), [stats]);

  const place = useCallback(
    (id: SpotId) => {
      const next = placeChips(table, id, settings.chip, rules);
      if (next === table) return;
      const isNew = !table.pending.some((d) => d.id === id);
      setTable(next);
      if (!isNew) return playChip();
      const d = next.pending[next.pending.length - 1];
      if (d.good) playCorrect();
      else playWrong();
    },
    [table, settings.chip, rules],
  );

  const undo = useCallback(() => setTable((t) => undoTable(t)), []);
  const clear = useCallback(() => setTable((t) => clearNew(t)), []);

  const roll = useCallback(() => {
    const next = rollTable(table, rollDice(), rules);
    setTable(next);
    setRollId((n) => n + 1);
    setStats((s) => recordRoll(table.pending.reduce(recordDecision, s), next.last!.net));
    playDice();
  }, [table, rules]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const resetStats = useCallback(() => setStats(EMPTY_STATS), []);

  return { table, rollId, stats, settings, place, undo, clear, roll, updateSettings, resetStats };
}
