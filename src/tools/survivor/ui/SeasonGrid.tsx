import { useEffect, useMemo, useRef, useState } from "react";
import { TEAM_CODES } from "../model/teams";
import type { Survivor } from "./useSurvivor";
import { pct, teamName } from "./format";
import TeamChip from "./TeamChip";

const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

/** Win % → cell shade. Greens above 50%, faint reds below. */
function shade(win: number): string {
  if (win >= 0.5) {
    const k = Math.min((win - 0.5) / 0.4, 1);
    return `oklch(${(0.97 - k * 0.3).toFixed(3)} ${(0.03 + k * 0.1).toFixed(3)} 150)`;
  }
  const k = Math.min((0.5 - win) / 0.3, 1);
  return `oklch(${(0.975 - k * 0.04).toFixed(3)} ${(k * 0.04).toFixed(3)} 25)`;
}

export default function SeasonGrid({
  s,
  showPlan,
  week,
  onWeek,
}: {
  s: Survivor;
  showPlan: boolean;
  week: number;
  onWeek: (w: number) => void;
}) {
  const [order, setOrder] = useState<"best" | "az">("best");
  const scroller = useRef<HTMLDivElement>(null);
  const currentHead = useRef<HTMLTableCellElement>(null);
  const corner = useRef<HTMLTableCellElement>(null);

  // Start scrolled so the current week is the first column you see.
  useEffect(() => {
    const el = scroller.current;
    const th = currentHead.current;
    if (el && th) el.scrollLeft = Math.max(0, th.offsetLeft - (corner.current?.offsetWidth ?? 0));
  }, []);

  const teams = useMemo(() => {
    const list = [...TEAM_CODES];
    if (order === "az") return list.sort();
    // Best remaining outlook: average win % from this week on.
    const avg = (t: string) => {
      let sum = 0;
      let n = 0;
      for (let w = s.current; w <= 18; w++) {
        const tw = s.slate[w]?.[t];
        if (tw) {
          sum += tw.win;
          n++;
        }
      }
      return n ? sum / n : 0;
    };
    return list.sort((a, b) => avg(b) - avg(a));
  }, [order, s.slate, s.current]);

  return (
    <div className="grid">
      <div className="grid__bar">
        <div className="segmented segmented--small">
          <button className={order === "best" ? "is-selected" : ""} onClick={() => setOrder("best")}>
            Best outlook
          </button>
          <button className={order === "az" ? "is-selected" : ""} onClick={() => setOrder("az")}>
            A–Z
          </button>
        </div>
        <div className="grid__legend">
          <span className="grid__key" style={{ background: shade(0.85) }} /> Big favourite
          <span className="grid__key" style={{ background: shade(0.62) }} /> Slight
          <span className="grid__key" style={{ background: shade(0.3) }} /> Underdog
          <span className="grid__key grid__key--proj">62</span> Projected
        </div>
      </div>

      <div className="grid__scroll" ref={scroller}>
        <table className="grid__table">
          <thead>
            <tr>
              <th className="grid__corner" scope="col" ref={corner}>
                Week
              </th>
              {WEEKS.map((w) => (
                <th
                  key={w}
                  scope="col"
                  ref={w === s.current ? currentHead : undefined}
                  className={[
                    "grid__week",
                    w < s.current ? "is-past" : "",
                    w === s.current ? "is-current" : "",
                    w === week ? "is-selected" : "",
                  ].join(" ")}
                >
                  <button onClick={() => onWeek(w)} title={`Show week ${w} in the table`}>
                    {w}
                  </button>
                </th>
              ))}
            </tr>
            <tr className="grid__picks">
              <th scope="row" className="grid__corner">
                Your pick
              </th>
              {WEEKS.map((w) => {
                const t = s.picks[w];
                const planned = showPlan ? s.plan.picks[w] : undefined;
                const tw = t ? s.slate[w]?.[t] : undefined;
                return (
                  <td key={w} className={w < s.current ? "is-past" : ""}>
                    {t ? (
                      <span className={`grid__pick ${tw?.result === "W" ? "is-won" : tw?.result ? "is-lost" : ""}`}>
                        {t}
                      </span>
                    ) : planned ? (
                      <span className="grid__pick is-plan">{planned}</span>
                    ) : (
                      <span className="grid__pick is-empty">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const used = s.usedWeek[team];
              return (
                <tr key={team} className={used !== undefined ? "is-used" : ""}>
                  <th scope="row" className="grid__team">
                    <TeamChip team={team} />
                  </th>
                  {WEEKS.map((w) => {
                    const tw = s.slate[w]?.[team];
                    if (!tw) {
                      return (
                        <td key={w} className="grid__cell is-bye">
                          BYE
                        </td>
                      );
                    }
                    const picked = s.picks[w] === team;
                    const planned = showPlan && !picked && s.plan.picks[w] === team;
                    const crossed = used !== undefined && !picked;
                    const cls = ["grid__cell"];
                    if (w < s.current) cls.push("is-past");
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
                          title={`W${w} ${team} ${tw.home ? "vs" : "@"} ${tw.opp} · ${pct(tw.win)} to win${tw.line === "projected" ? " (projected)" : ""}`}
                        >
                          <span className="grid__opp">
                            {tw.home ? "" : "@"}
                            {tw.opp}
                          </span>
                          <span className="grid__win">{picked ? "✓" : Math.round(tw.win * 100)}</span>
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
