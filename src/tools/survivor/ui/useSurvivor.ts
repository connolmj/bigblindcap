import { useCallback, useEffect, useMemo, useState } from "react";
import { bestPlan, futureValues, type Plan } from "../model/plan";
import { TEAM_CODES } from "../model/teams";
import type { SurvivorData } from "../model/types";
import { buildSlate, currentWeek, winTable, type Slate } from "./slate";

/** week → team you picked (or plan to pick) that week */
export type Picks = Record<number, string>;

const storageKey = (season: number) => `bbc.survivor.${season}.picks`;

function loadPicks(season: number): Picks {
  try {
    return JSON.parse(localStorage.getItem(storageKey(season)) ?? "{}");
  } catch {
    return {};
  }
}

export interface Survivor {
  data: SurvivorData;
  slate: Slate;
  current: number;
  picks: Picks;
  /** team → week you used it */
  usedWeek: Record<string, number>;
  togglePick: (week: number, team: string) => void;
  reset: () => void;
  /** Best plan for the weeks you haven't picked yet (from this week on). */
  plan: Plan;
  /** Chance of surviving every remaining week with your picks + the plan. */
  survival: number;
  futureValue: (week: number) => Record<string, number>;
}

export function useSurvivorData() {
  const [data, setData] = useState<SurvivorData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/data/survivor.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError(true));
  }, []);
  return { data, error };
}

export function useSurvivor(data: SurvivorData): Survivor {
  const slate = useMemo(() => buildSlate(data, new Date()), [data]);
  const current = useMemo(() => currentWeek(slate), [slate]);
  const win = useMemo(() => winTable(slate), [slate]);
  const [picks, setPicks] = useState<Picks>(() => loadPicks(data.season));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(data.season), JSON.stringify(picks));
    } catch {
      // Private browsing etc. — the tool still works, it just won't remember.
    }
  }, [picks, data.season]);

  const usedWeek = useMemo(
    () => Object.fromEntries(Object.entries(picks).map(([w, t]) => [t, Number(w)])) as Record<string, number>,
    [picks],
  );

  const togglePick = useCallback((week: number, team: string) => {
    setPicks((p) => {
      const next = { ...p };
      if (next[week] === team) {
        delete next[week];
        return next;
      }
      // A team can only be used once: moving it frees its old week.
      for (const [w, t] of Object.entries(next)) if (t === team) delete next[Number(w)];
      next[week] = team;
      return next;
    });
  }, []);

  const reset = useCallback(() => setPicks({}), []);

  // Only games that haven't kicked off can still be planned.
  const open = useCallback((w: number, t: string) => !slate[w]?.[t]?.started, [slate]);

  const plan = useMemo(() => {
    const weeks: number[] = [];
    for (let w = current; w <= 18; w++) if (!picks[w]) weeks.push(w);
    return bestPlan(win, weeks, TEAM_CODES, new Set(Object.values(picks)), open);
  }, [win, current, picks, open]);

  const survival = useMemo(() => {
    let s = plan.survival;
    for (let w = current; w <= 18; w++) {
      const tw = picks[w] ? slate[w]?.[picks[w]] : undefined;
      if (tw && !tw.started) s *= tw.win;
    }
    return s;
  }, [plan, picks, slate, current]);

  const futureValue = useCallback(
    (week: number) => {
      const earlier = new Set<string>();
      const later: Picks = {};
      for (const [w, t] of Object.entries(picks)) {
        const n = Number(w);
        if (n < week) earlier.add(t);
        if (n > week) later[n] = t;
      }
      return futureValues(win, week, 18, TEAM_CODES, earlier, later);
    },
    [win, picks],
  );

  return { data, slate, current, picks, usedWeek, togglePick, reset, plan, survival, futureValue };
}
