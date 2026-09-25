/**
 * Season planning: which team to use in which week.
 *
 * Surviving every remaining week means winning all of them, so the chance of
 * surviving a plan is the product of its weekly win probabilities. Picking the
 * best plan — each team used at most once — is a classic "assignment problem"
 * (weeks ↔ teams), solved exactly by the Hungarian algorithm. We minimise the
 * sum of −log(win%), which is the same as maximising the product.
 */

/** win[week][team] = chance that team wins that week (missing = bye). */
export type WinTable = Record<number, Record<string, number>>;

const BLOCKED = 1e6;

/**
 * Hungarian algorithm for an n×m cost matrix with n ≤ m.
 * Returns, for each row, the column assigned to it. O(n²·m).
 */
export function hungarian(cost: number[][]): number[] {
  const n = cost.length;
  const m = cost[0]?.length ?? 0;
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const p = new Array<number>(m + 1).fill(0); // p[col] = row matched to col (1-based)
  const way = new Array<number>(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array<number>(m + 1).fill(Infinity);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0);
  }
  const rowToCol = new Array<number>(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) rowToCol[p[j] - 1] = j - 1;
  return rowToCol;
}

export interface Plan {
  /** week → team */
  picks: Record<number, string>;
  /** Chance of winning every week in the plan (0–1). */
  survival: number;
}

/**
 * Best plan for `weeks`, never using a team in `exclude`.
 * `allowed(week, team)` can veto individual picks (e.g. games already kicked off).
 */
export function bestPlan(
  win: WinTable,
  weeks: number[],
  teams: string[],
  exclude: Set<string>,
  allowed: (week: number, team: string) => boolean = () => true,
): Plan {
  const cols = teams.filter((t) => !exclude.has(t));
  if (!weeks.length) return { picks: {}, survival: 1 };
  if (cols.length < weeks.length) return { picks: {}, survival: 0 };
  const cost = weeks.map((w) =>
    cols.map((t) => {
      const p = win[w]?.[t];
      return p && p > 0 && allowed(w, t) ? -Math.log(p) : BLOCKED;
    }),
  );
  const assign = hungarian(cost);
  const picks: Record<number, string> = {};
  let logSurvival = 0;
  weeks.forEach((w, i) => {
    const c = assign[i];
    if (c < 0 || cost[i][c] >= BLOCKED) return;
    picks[w] = cols[c];
    logSurvival -= cost[i][c];
  });
  const complete = Object.keys(picks).length === weeks.length;
  return { picks, survival: complete ? Math.exp(logSurvival) : 0 };
}

/**
 * Future value: how much it costs your later weeks to use `team` now.
 * = best survival odds for weeks after `week` WITH the team available,
 *   divided by the same WITHOUT it, minus 1.  (0.25 → saving it is worth +25%.)
 */
export function futureValues(
  win: WinTable,
  week: number,
  lastWeek: number,
  teams: string[],
  exclude: Set<string>,
  fixedLater: Record<number, string> = {},
): Record<string, number> {
  const later: number[] = [];
  for (let w = week + 1; w <= lastWeek; w++) if (!fixedLater[w]) later.push(w);
  const taken = new Set([...exclude, ...Object.values(fixedLater)]);
  const base = bestPlan(win, later, teams, taken).survival;
  const out: Record<string, number> = {};
  for (const t of teams) {
    if (taken.has(t)) continue;
    const without = bestPlan(win, later, teams, new Set([...taken, t])).survival;
    out[t] = without > 0 ? base / without - 1 : 0;
  }
  return out;
}
