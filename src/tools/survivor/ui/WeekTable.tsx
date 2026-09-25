import { useMemo, useState } from "react";
import { TEAM_CODES } from "../model/teams";
import type { Survivor } from "./useSurvivor";
import { fmtSpread, fvStars, pct, teamName } from "./format";
import TeamChip from "./TeamChip";

type SortKey = "win" | "spread" | "pick" | "fv" | "team";

const COLUMNS: { key: SortKey; label: string; short: string; title: string }[] = [
  { key: "team", label: "Team", short: "Team", title: "Sort by team" },
  { key: "spread", label: "Spread", short: "Line", title: "Points favoured by (− = favourite)" },
  { key: "win", label: "Win %", short: "Win", title: "Chance to win this game" },
  { key: "pick", label: "Pick %", short: "Pick", title: "Estimated share of survivor entries picking this team" },
  { key: "fv", label: "Future value", short: "Save", title: "How much saving this team helps your later weeks" },
];

export default function WeekTable({ s, week }: { s: Survivor; week: number }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "win", desc: true });
  const [showAll, setShowAll] = useState(false);
  const fv = useMemo(() => s.futureValue(week), [s, week]);
  const lastWeek = 18;

  const rows = useMemo(() => {
    const list = Object.values(s.slate[week] ?? {});
    const val = (r: (typeof list)[number]): number | string => {
      switch (sort.key) {
        case "team":
          return r.team;
        case "spread":
          return r.spread;
        case "pick":
          return r.pick;
        case "fv":
          return fv[r.team] ?? -1;
        default:
          return r.win;
      }
    };
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      const c = typeof x === "string" ? x.localeCompare(y as string) : (x as number) - (y as number);
      return sort.desc ? -c : c;
    });
  }, [s.slate, week, sort, fv]);

  // Keep it short: favourites only, plus anything you've picked this week.
  const shown = showAll ? rows : rows.filter((r) => r.win >= 0.5 || s.picks[week] === r.team);
  const hidden = rows.length - shown.length;

  const byes = TEAM_CODES.filter((t) => !s.slate[week]?.[t]);

  const header = ({ key, label, short, title }: (typeof COLUMNS)[number]) => (
    <th key={key} scope="col" aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button
        className={sort.key === key ? "wt__sort is-active" : "wt__sort"}
        title={title}
        onClick={() => setSort((p) => ({ key, desc: p.key === key ? !p.desc : key !== "team" }))}
      >
        <span className="wt__label">{label}</span>
        <span className="wt__label-short">{short}</span>
        <span className="wt__arrow" aria-hidden="true">
          {sort.key === key ? (sort.desc ? "↓" : "↑") : ""}
        </span>
      </button>
    </th>
  );

  return (
    <div className="wt">
      <table className="wt__table">
        <thead>
          <tr>
            {header(COLUMNS[0])}
            <th scope="col" className="wt__opp-head">
              Opp
            </th>
            {COLUMNS.slice(1).map(header)}
            <th scope="col">
              <span className="visually-hidden">Pick</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => {
            const usedIn = s.usedWeek[r.team];
            const pickedHere = s.picks[week] === r.team;
            const usedElsewhere = usedIn !== undefined && !pickedHere;
            const stars = fvStars(fv[r.team] ?? 0);
            const cls = ["wt__row"];
            if (pickedHere) cls.push("is-picked");
            if (usedElsewhere) cls.push("is-used");
            return (
              <tr key={r.team} className={cls.join(" ")}>
                <td>
                  <TeamChip team={r.team} full />
                  <span className="wt__opp-inline">
                    {r.neutral ? "vs " : r.home ? "vs " : "@"}
                    {r.opp}
                  </span>
                </td>
                <td className="wt__opp">
                  {r.neutral ? "vs " : r.home ? "" : "@"}
                  {r.opp}
                </td>
                <td className="wt__num">
                  {fmtSpread(r.spread)}
                  {r.line === "projected" && (
                    <span className="wt__proj" title="Projected — no sportsbook line yet">
                      proj
                    </span>
                  )}
                </td>
                <td className="wt__num">
                  <span className="wt__win">
                    <span className="wt__bar" aria-hidden="true">
                      <span style={{ width: pct(r.win), opacity: r.win >= 0.5 ? 1 : 0.35 }} />
                    </span>
                    {pct(r.win)}
                  </span>
                </td>
                <td className="wt__num wt__muted">{r.pick < 0.005 ? "<1%" : pct(r.pick)}</td>
                <td
                  className="wt__fv"
                  title={
                    fv[r.team] !== undefined && week < lastWeek
                      ? `Saving ${teamName(r.team)} is worth ${fv[r.team] >= 0.005 ? "+" + pct(fv[r.team]) : "~0%"} to your odds for weeks ${week + 1}–${lastWeek}`
                      : undefined
                  }
                >
                  <span aria-label={`${stars} of 3`}>
                    {"★★★".slice(0, stars)}
                    <span className="wt__star-off">{"★★★".slice(stars)}</span>
                  </span>
                </td>
                <td className="wt__action">
                  {r.result ? (
                    <span className={`wt__result is-${r.result}`}>
                      {r.result} {r.score}
                    </span>
                  ) : null}
                  {usedElsewhere ? (
                    <button
                      className="wt__btn is-used"
                      onClick={() => s.togglePick(week, r.team)}
                      title="Move this pick here"
                    >
                      Used W{usedIn}
                    </button>
                  ) : (
                    <button
                      className={pickedHere ? "wt__btn is-picked" : "wt__btn"}
                      onClick={() => s.togglePick(week, r.team)}
                      aria-pressed={pickedHere}
                    >
                      {pickedHere ? "✓ Picked" : "Pick"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {(hidden > 0 || showAll) && (
        <button className="wt__more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show favourites only" : `Show all ${rows.length} teams (+${hidden} underdogs)`}
        </button>
      )}
      {byes.length > 0 && (
        <p className="wt__byes">
          <span className="eyebrow">Bye</span> {byes.join(", ")}
        </p>
      )}
    </div>
  );
}
