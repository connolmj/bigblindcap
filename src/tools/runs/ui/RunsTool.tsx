import { useEffect, useMemo, useState } from "react";
import {
  afterBunt,
  BASE_ORDER,
  baseName,
  combine,
  OUTS,
  outsName,
  stateIndex,
  stealBreakEven,
  value,
  type Metric,
  type Table,
} from "../model/odds";
import type { RunsData } from "../model/types";
import { fmtPct } from "../../bankroll/ui/format";
import "./runs.css";

const METRICS: { id: Metric; label: string }[] = [
  { id: "score", label: "Chance to score" },
  { id: "runs", label: "Expected runs" },
];

const fmtValue = (v: number, metric: Metric) => (metric === "score" ? fmtPct(v, 1) : v.toFixed(2));
const fmtCount = (n: number) => n.toLocaleString("en-US");
const yearsLabel = (from: number, to: number) => (from === to ? `${from}` : `${from}–${String(to).slice(-2)}`);

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
  const presets = [
    { from: last, to: last, label: `${last} season` },
    { from: Math.max(first, 2023), to: last, label: `${yearsLabel(Math.max(first, 2023), last)} · pitch clock` },
    { from: last - 9, to: last, label: `Last 10 (${yearsLabel(last - 9, last)})` },
    { from: first, to: last, label: `All (${yearsLabel(first, last)})` },
  ];
  const [range, setRange] = useState<[number, number]>([presets[1].from, presets[1].to]);
  const [metric, setMetric] = useState<Metric>("score");
  const [pick, setPick] = useState({ bases: 3, outs: 1 });

  const table = useMemo(() => combine(data.seasons, range[0], range[1]), [data, range]);
  const isPreset = (p: { from: number; to: number }) => p.from === range[0] && p.to === range[1];

  return (
    <>
      <section className="rn__inputs" aria-label="Options">
        <Field label="Seasons">
          <div className="rn__chips">
            {presets.map((p) => (
              <button
                key={p.label}
                className={isPreset(p) ? "rn__chip is-on" : "rn__chip"}
                onClick={() => setRange([p.from, p.to])}
              >
                {p.label}
              </button>
            ))}
            <select
              className={presets.some(isPreset) ? "rn__select" : "rn__select is-on"}
              value={range[0] === range[1] && range[0] !== last ? range[0] : ""}
              onChange={(e) => e.target.value && setRange([Number(e.target.value), Number(e.target.value)])}
              aria-label="One season"
            >
              <option value="">One season…</option>
              {data.seasons
                .map((s) => s.year)
                .reverse()
                .map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
            </select>
          </div>
          <p className="rn__help">
            {fmtCount(table.halfInnings)} half-innings
            {range[0] <= 2020 && range[1] >= 2020 ? " (2020 was 60 games)" : ""}
          </p>
        </Field>
        <Field label="Show">
          <Seg label="Show" options={METRICS} value={metric} onChange={setMetric} />
          <p className="rn__help">
            {metric === "score"
              ? "How often at least one run scored before the inning ended."
              : "Average runs scored from here to the end of the inning."}
          </p>
        </Field>
      </section>

      <Situation table={table} metric={metric} bases={pick.bases} outs={pick.outs} />

      <section className="rn__section">
        <h2 className="rn__h2">Every situation</h2>
        <p className="rn__sub">
          {metric === "score" ? "Chance of scoring at least one run" : "Runs expected"} the rest of the inning, by who's
          on base and how many are out. Tap a box for the details.
        </p>
        <Grid table={table} metric={metric} pick={pick} onPick={setPick} />
      </section>

      <div className="rn__takeaway">
        <p>
          A runner on third with nobody out scores <strong>{fmtPct(value(table, 4, 0, "score"))}</strong> of the time;
          with two out, just <strong>{fmtPct(value(table, 4, 2, "score"))}</strong>. Outs matter more than bases.
        </p>
        <p>
          That's why the sacrifice bunt has fallen out of favor. Even a perfect one — runner on 1st and nobody out, to
          runner on 2nd and one out — takes the chance of scoring from {fmtPct(value(table, 1, 0, "score"))} to{" "}
          {fmtPct(value(table, 2, 1, "score"))} and expected runs from {value(table, 1, 0, "runs").toFixed(2)} to{" "}
          {value(table, 2, 1, "runs").toFixed(2)}.
        </p>
      </div>

      <details className="rn__how">
        <summary>How this works</summary>
        <dl>
          <dt>The data</dt>
          <dd>
            Every regular-season play since {data.seasons[0].year}, from Retrosheet's play-by-play files. We follow the
            runners and outs through each half-inning and note every situation it passed through, then count whether a
            run scored before the third out.
          </dd>
          <dt>Chance to score</dt>
          <dd>
            Of all the times a half-inning reached this situation, the share in which at least one more run crossed the
            plate before it ended. Runs already in don't count.
          </dd>
          <dt>Expected runs</dt>
          <dd>
            The average number of runs scored from this situation to the end of the inning — the "run expectancy"
            analysts use to value every play. A play's worth is the change in expected runs it causes, plus any runs
            that score on it.
          </dd>
          <dt>What's left out</dt>
          <dd>
            Half-innings that never reached three outs — walk-offs and games called early — since their ending was cut
            short. The extra-innings runner placed on second (since 2020) counts like any other runner on second.
          </dd>
          <dt>Steal break-even</dt>
          <dd>
            How often a steal must succeed to be worth it: a success moves the runner up a base, a caught stealing
            removes him and adds an out. Below that rate, the attempts cost more than they gain.
          </dd>
        </dl>
        <p className="rn__disclaimer">
          The information used here was obtained free of charge from and is copyrighted by Retrosheet. Interested
          parties may contact Retrosheet at{" "}
          <a href="https://www.retrosheet.org" target="_blank" rel="noreferrer">
            www.retrosheet.org
          </a>
          . League averages, not a forecast for any one team. Updated{" "}
          {new Date(data.updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        </p>
      </details>
    </>
  );
}

function Situation({ table, metric, bases, outs }: { table: Table; metric: Metric; bases: number; outs: number }) {
  const i = stateIndex(bases, outs);
  const score = value(table, bases, outs, "score");
  const runs = value(table, bases, outs, "runs");
  const steal = stealBreakEven(table, bases, outs, metric);
  const bunt = afterBunt(bases, outs);
  const lead = bases & 2 ? "third" : "second";
  return (
    <section className="rn__pick" aria-label="Situation">
      <div className="rn__pick-head">
        <Diamond bases={bases} size={56} />
        <div>
          <div className="eyebrow">Situation</div>
          <div className="rn__pick-name">
            {baseName(bases)}, {outsName(outs)}
          </div>
          <p className="rn__help">Seen {fmtCount(table.n[i])} times</p>
        </div>
      </div>
      <div className="rn__stats">
        <div className="rn__stat">
          <div className="eyebrow">Chance to score</div>
          <div className="rn__big">{fmtPct(score, 1)}</div>
          <div className="rn__meta">{oneIn(score)}</div>
        </div>
        <div className="rn__stat">
          <div className="eyebrow">Expected runs</div>
          <div className="rn__big">{runs.toFixed(2)}</div>
          <div className="rn__meta">rest of the inning</div>
        </div>
        {steal !== null && (
          <div className="rn__stat">
            <div className="eyebrow">Steal {lead} break-even</div>
            <div className="rn__big">{fmtPct(steal)}</div>
            <div className="rn__meta">success rate needed, by {metric === "score" ? "chance to score" : "runs"}</div>
          </div>
        )}
        {bunt && (
          <div className="rn__stat">
            <div className="eyebrow">After a sacrifice bunt</div>
            <div className="rn__big">
              {fmtValue(value(table, bunt.bases, bunt.outs, metric), metric)}
              <span
                className={deltaClass(
                  value(table, bunt.bases, bunt.outs, metric) - (metric === "score" ? score : runs),
                )}
              >
                {fmtDelta(value(table, bunt.bases, bunt.outs, metric) - (metric === "score" ? score : runs), metric)}
              </span>
            </div>
            <div className="rn__meta">
              {baseName(bunt.bases).toLowerCase()}, {outsName(bunt.outs)}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Grid({
  table,
  metric,
  pick,
  onPick,
}: {
  table: Table;
  metric: Metric;
  pick: { bases: number; outs: number };
  onPick: (p: { bases: number; outs: number }) => void;
}) {
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
                const on = pick.bases === b && pick.outs === o;
                return (
                  <td key={o} className={on ? "is-on" : undefined} style={{ background: tint(v, max) }}>
                    <button
                      onClick={() => onPick({ bases: b, outs: o })}
                      aria-label={`${baseName(b)}, ${outsName(o)}`}
                      aria-pressed={on}
                    >
                      {fmtValue(v, metric)}
                    </button>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rn__field">
      <div className="eyebrow">{label}</div>
      {children}
    </div>
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

function oneIn(p: number): string {
  if (p <= 0) return "Never";
  const n = 1 / p;
  return n < 1.5 ? "Most innings" : `About 1 inning in ${n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n)}`;
}

function fmtDelta(d: number, metric: Metric): string {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
  return ` ${sign}${metric === "score" ? (Math.abs(d) * 100).toFixed(1) + " pts" : Math.abs(d).toFixed(2)}`;
}

const deltaClass = (d: number) => (d >= 0 ? "rn__delta is-up" : "rn__delta is-down");

/** Green that deepens with the odds. */
function tint(v: number, max: number): string {
  if (v <= 0 || max <= 0) return "transparent";
  return `oklch(0.6 0.12 150 / ${(0.05 + 0.65 * (v / max)).toFixed(3)})`;
}
