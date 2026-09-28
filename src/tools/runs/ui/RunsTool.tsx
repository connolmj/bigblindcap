import { useEffect, useMemo, useState } from "react";
import { BASE_ORDER, baseName, combine, OUTS, outsName, value, type Metric, type Table } from "../model/odds";
import type { RunsData } from "../model/types";
import { fmtPct } from "../../bankroll/ui/format";
import "./runs.css";

const METRICS: { id: Metric; label: string }[] = [
  { id: "score", label: "Chance to score" },
  { id: "runs", label: "Expected runs" },
];

const fmtValue = (v: number, metric: Metric) => (metric === "score" ? fmtPct(v, 1) : v.toFixed(2));

function useRunsData() {
  const [data, setData] = useState<RunsData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/data/runs.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError(true));
  }, []);
  return { data, error };
}

export default function RunsTool() {
  const { data, error } = useRunsData();
  return (
    <div className="rn">
      <header className="rn__intro">
        <div className="eyebrow">Tools · MLB</div>
        <h1 className="rn__title">Run Scoring Odds</h1>
        <p className="rn__lede">
          Runners on, outs on the board — how often does a run come home? Every base-out situation in baseball, and how
          often teams actually scored from it, from every major-league play since 2000.
        </p>
      </header>
      {error && <p className="rn__notice">Couldn't load the play-by-play. Please refresh in a minute.</p>}
      {!data && !error && <p className="rn__notice">Loading every half-inning…</p>}
      {data && <Loaded data={data} />}
    </div>
  );
}

function Loaded({ data }: { data: RunsData }) {
  const first = data.seasons[0].year;
  const last = data.seasons.at(-1)!.year;
  const [metric, setMetric] = useState<Metric>("score");
  const table = useMemo(() => combine(data.seasons, first, last), [data, first, last]);

  return (
    <section className="rn__section">
      <div className="rn__section-head">
        <Seg label="Show" options={METRICS} value={metric} onChange={setMetric} />
        <p className="rn__sub">
          {metric === "score"
            ? "Chance at least one run scores before the inning ends."
            : "Average runs scored from here to the end of the inning."}
        </p>
      </div>
      <Grid table={table} metric={metric} />
      <p className="rn__disclaimer">
        Every MLB regular-season play, {first}–{last}. The information used here was obtained free of charge from and is
        copyrighted by Retrosheet. Interested parties may contact Retrosheet at{" "}
        <a href="https://www.retrosheet.org" target="_blank" rel="noreferrer">
          www.retrosheet.org
        </a>
        .
      </p>
    </section>
  );
}

function Grid({ table, metric }: { table: Table; metric: Metric }) {
  const max = Math.max(...BASE_ORDER.flatMap((b) => OUTS.map((o) => value(table, b, o, metric))));
  return (
    <div className="rn__grid-wrap">
      <table className="rn__grid">
        <thead>
          <tr>
            <th className="rn__corner">Runners</th>
            {OUTS.map((o) => (
              <th key={o}>{outsName(o)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {BASE_ORDER.map((b) => (
            <tr key={b}>
              <th>
                <span className="rn__rowhead">
                  <Diamond bases={b} size={22} />
                  {baseName(b)}
                </span>
              </th>
              {OUTS.map((o) => {
                const v = value(table, b, o, metric);
                return (
                  <td key={o} style={{ background: tint(v, max) }}>
                    {fmtValue(v, metric)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A little infield: second at the top, first on the right, third on the left. */
function Diamond({ bases, size }: { bases: number; size: number }) {
  const base = (x: number, y: number, on: boolean, key: string) => (
    <rect
      key={key}
      x={x - 4}
      y={y - 4}
      width={8}
      height={8}
      transform={`rotate(45 ${x} ${y})`}
      className={on ? "rn__base is-on" : "rn__base"}
    />
  );
  return (
    <svg className="rn__diamond" width={size} height={size * 0.75} viewBox="0 0 40 30" aria-hidden="true">
      {base(30, 17, (bases & 1) !== 0, "1")}
      {base(20, 7, (bases & 2) !== 0, "2")}
      {base(10, 17, (bases & 4) !== 0, "3")}
    </svg>
  );
}

function Seg<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="rn__seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          className={value === o.id ? "is-on" : ""}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Green that deepens with the odds. */
function tint(v: number, max: number): string {
  if (v <= 0 || max <= 0) return "transparent";
  return `oklch(0.6 0.12 150 / ${(0.05 + 0.65 * (v / max)).toFixed(3)})`;
}
