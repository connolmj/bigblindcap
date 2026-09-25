/**
 * The one table: each row is a team. The left columns show the selected
 * week's numbers (line, win %, pick %, future value); the right side is the
 * whole season, one column per week. Click a cell to pick that team that week.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { TEAM_CODES } from "../model/teams";
import type { Survivor } from "./useSurvivor";
import { fmtSpread, fvScores, pct, teamName } from "./format";
import TeamChip from "./TeamChip";

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

type SortKey = "team" | "spread" | "win" | "pick" | "fv";

const STATS: { key: Exclude<SortKey, "team">; label: string; short: string; title: string }[] = [
  { key: "spread", label: "Line", short: "Line", title: "Points favoured by (− = favourite)" },
  { key: "win", label: "Win", short: "Win", title: "Chance to win" },
  { key: "pick", label: "Pick", short: "Pick", title: "Estimated share of survivor entries picking this team" },
  {
    key: "fv",
    label: "Future value",
    short: "FV",
    title: "Future value, 0–100: how much saving this team helps your later weeks (100 = the team most worth saving)",
  },
];

/** Win % → cell shade. Greens above 50%, faint reds below. */
function shade(win: number): string {
  if (win >= 0.5) {
    const k = Math.min((win - 0.5) / 0.4, 1);
    return `oklch(${(0.97 - k * 0.3).toFixed(3)} ${(0.03 + k * 0.1).toFixed(3)} 150)`;
  }
  const k = Math.min((0.5 - win) / 0.3, 1);
  return `oklch(${(0.975 - k * 0.04).toFixed(3)} ${(k * 0.04).toFixed(3)} 25)`;
}

interface Props {
  s: Survivor;
  week: number;
  onWeek: (w: number) => void;
  showPlan: boolean;
}

export default function SurvivorTable({ s, week, onWeek, showPlan }: Props) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "win", desc: true });
  const fv = useMemo(() => s.futureValue(week), [s, week]);
  const fvScore = useMemo(() => fvScores(fv), [fv]);
  const scroller = useRef<HTMLDivElement>(null);
  const heads = useRef<Record<number, HTMLTableCellElement | null>>({});
  const lastSticky = useRef<HTMLTableCellElement>(null);

  // Keep the selected week's column in view, just right of the frozen columns.
  // On first load always line it up there, so past weeks start off to the left.
  const firstScroll = useRef(true);
  useEffect(() => {
    const el = scroller.current;
    const th = heads.current[week];
    const edge = lastSticky.current;
    if (!el || !th || !edge) return;
    const frozen = getComputedStyle(edge).position === "sticky" ? edge.offsetLeft + edge.offsetWidth : 0;
    const left = th.offsetLeft - frozen;
    const visible =
      th.offsetLeft >= el.scrollLeft + frozen && th.offsetLeft + th.offsetWidth <= el.scrollLeft + el.clientWidth;
    if (firstScroll.current) {
      firstScroll.current = false;
      el.scrollLeft = Math.max(0, left);
    } else if (!visible) el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [week]);

  const teams = useMemo(() => {
    const tw = s.slate[week] ?? {};
    const val = (t: string): number | string => {
      const g = tw[t];
      if (sort.key === "team") return t;
      if (!g) return -Infinity; // bye weeks sink to the bottom
      if (sort.key === "fv") return fv[t] ?? -1;
      return sort.key === "spread" ? g.spread : sort.key === "pick" ? g.pick : g.win;
    };
    return [...TEAM_CODES].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (typeof x === "string") return sort.desc ? (y as string).localeCompare(x) : x.localeCompare(y as string);
      if (x === y) return 0;
      if (x === -Infinity) return 1;
      if (y === -Infinity) return -1;
      return sort.desc ? (y as number) - x : x - (y as number);
    });
  }, [s.slate, week, sort, fv]);

  const sortBtn = (key: SortKey, label: string, title: string, short = label) => (
    <button
      className={sort.key === key ? "st__sort is-active" : "st__sort"}
      title={title}
      onClick={() => setSort((p) => ({ key, desc: p.key === key ? !p.desc : key !== "team" }))}
    >
      <span className="st__label">{label}</span>
      <span className="st__label-short">{short}</span>
      {sort.key === key && <span aria-hidden="true">{sort.desc ? "↓" : "↑"}</span>}
    </button>
  );

  return (
    <div className="st">
      <div className="st__legend">
        <span className="st__key" style={{ background: shade(0.85) }} /> Big favourite
        <span className="st__key" style={{ background: shade(0.62) }} /> Slight
        <span className="st__key" style={{ background: shade(0.3) }} /> Underdog
        <span className="st__key st__key--proj">62</span> Projected
        <span className="st__key st__key--plan" /> Suggested
        <span className="st__tip">Tap a week number to see that week's numbers.</span>
      </div>

      <div className="st__scroll" ref={scroller}>
        <table className="st__table">
          <thead>
            <tr className="st__groups">
              <th className="st__f st__f0" />
              <th className="st__f st__f1 st__group" colSpan={4}>
                Week {week}
              </th>
              <th className="st__group st__group--season" colSpan={18}>
                Season
              </th>
            </tr>
            <tr>
              <th scope="col" className="st__f st__f0 st__teamhead">
                {sortBtn("team", "Team", "Sort A–Z")}
              </th>
              {STATS.map((c, i) => (
                <th
                  key={c.key}
                  scope="col"
                  className={`st__f st__f${i + 1} st__stathead`}
                  ref={i === STATS.length - 1 ? lastSticky : undefined}
                  aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}
                >
                  {sortBtn(c.key, c.label, c.title, c.short)}
                </th>
              ))}
              {WEEKS.map((w) => (
                <th
                  key={w}
                  scope="col"
                  ref={(el) => {
                    heads.current[w] = el;
                  }}
                  className={[
                    "st__week",
                    w < s.current ? "is-past" : "",
                    w === s.current ? "is-current" : "",
                    w === week ? "is-selected" : "",
                  ].join(" ")}
                >
                  <button onClick={() => onWeek(w)} title={`Show week ${w}'s numbers`} aria-pressed={w === week}>
                    {w}
                  </button>
                </th>
              ))}
            </tr>
            <tr className="st__picks">
              <th scope="row" className="st__f st__f0">
                Your pick
              </th>
              <td className="st__f st__f1 st__pickstat" colSpan={4}>
                {s.picks[week] ? `Week ${week}: ${s.picks[week]}` : ""}
              </td>
              {WEEKS.map((w) => {
                const t = s.picks[w];
                const planned = showPlan ? s.plan.picks[w] : undefined;
                const tw = t ? s.slate[w]?.[t] : undefined;
                return (
                  <td key={w} className={w === week ? "is-selected" : ""}>
                    {t ? (
                      <span className={`st__pick ${tw?.result === "W" ? "is-won" : tw?.result ? "is-lost" : ""}`}>
                        {t}
                      </span>
                    ) : planned ? (
                      <span className="st__pick is-plan" title="Suggested plan">
                        {planned}
                      </span>
                    ) : (
                      <span className="st__pick is-empty">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const used = s.usedWeek[team];
              const g = s.slate[week]?.[team];
              const score = fvScore[team];
              return (
                <tr key={team} className={used !== undefined ? "is-used" : ""}>
                  <th scope="row" className="st__f st__f0 st__team">
                    <TeamChip team={team} />
                    {used !== undefined && (
                      <span className="st__usedtag" title={`You picked ${team} in week ${used}`}>
                        W{used}
                      </span>
                    )}
                  </th>
                  {g ? (
                    <>
                      <td className="st__f st__f1 st__num">{fmtSpread(g.spread)}</td>
                      <td className="st__f st__f2 st__num st__win">{pct(g.win)}</td>
                      <td className="st__f st__f3 st__num st__muted">{g.pick < 0.005 ? "<1%" : pct(g.pick)}</td>
                      <td
                        className="st__f st__f4 st__fv"
                        title={
                          week < 18
                            ? `Saving ${teamName(team)} is worth ${(fv[team] ?? 0) >= 0.005 ? "+" + pct(fv[team]) : "~0%"} to your odds for weeks ${week + 1}–18`
                            : undefined
                        }
                      >
                        {score === undefined ? (
                          "—"
                        ) : (
                          <span className="st__fvscore" style={{ "--fv": score } as CSSProperties}>
                            {score}
                          </span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="st__f st__f1 st__byestats" colSpan={4}>
                      Bye in week {week}
                    </td>
                  )}
                  {WEEKS.map((w) => {
                    const tw = s.slate[w]?.[team];
                    if (!tw) {
                      return (
                        <td
                          key={w}
                          className={`st__cell is-bye${w === week ? " is-selected" : ""}${used !== undefined ? " is-crossed" : ""}`}
                        >
                          BYE
                        </td>
                      );
                    }
                    const picked = s.picks[w] === team;
                    const planned = showPlan && !picked && s.plan.picks[w] === team;
                    const crossed = used !== undefined && !picked;
                    const cls = ["st__cell"];
                    if (w < s.current) cls.push("is-past");
                    if (w === week) cls.push("is-selected");
                    if (picked) cls.push("is-picked");
                    if (planned) cls.push("is-plan");
                    if (crossed) cls.push("is-crossed");
                    if (tw.line === "projected") cls.push("is-proj");
                    return (
                      <td key={w} className={cls.join(" ")} style={picked ? undefined : { background: shade(tw.win) }}>
                        <button
                          onClick={() => s.togglePick(w, team)}
                          aria-pressed={picked}
                          aria-label={`Week ${w}: ${teamName(team)} ${tw.home ? "vs" : "at"} ${tw.opp}, ${pct(tw.win)} to win${picked ? ", picked" : ""}`}
                          title={`W${w} ${team} ${tw.home ? "vs" : "@"} ${tw.opp} · ${fmtSpread(tw.spread)} · ${pct(tw.win)} to win${tw.line === "projected" ? " (projected)" : ""}${tw.score ? ` · Final ${tw.result} ${tw.score}` : ""}`}
                        >
                          <span className="st__opp">
                            {tw.home ? "" : "@"}
                            {tw.opp}
                          </span>
                          <span className="st__cellwin">{picked ? "✓" : Math.round(tw.win * 100)}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
