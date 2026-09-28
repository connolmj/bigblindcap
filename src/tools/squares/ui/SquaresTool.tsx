import { useEffect, useMemo, useState } from "react";
import {
  BOXES,
  QUARTERS,
  boxOdds,
  boxValue,
  cashChance,
  parseDigits,
  reverseOf,
  rankBoxes,
  superBowlDigits,
  superBowlNumber,
  type BoxOdds,
  type Split,
} from "../model/odds";
import type { SquaresData } from "../model/types";
import { fmtMoney, fmtPct } from "../../bankroll/ui/format";
import "./squares.css";

type Source = "nfl" | "sb";
type View = "value" | 0 | 1 | 2 | 3;

const PRICE_PRESETS = [5, 10, 20, 50, 100];
const SPLITS: { label: string; split: Split }[] = [
  { label: "25 · 25 · 25 · 25", split: [0.25, 0.25, 0.25, 0.25] },
  { label: "20 · 20 · 20 · 40", split: [0.2, 0.2, 0.2, 0.4] },
  { label: "12.5 · 25 · 12.5 · 50", split: [0.125, 0.25, 0.125, 0.5] },
  { label: "Half & final", split: [0, 0.5, 0, 0.5] },
];
/** Share of each quarter's prize that goes to the reverse box. */
const REVERSE_PRESETS = [0, 0.1, 0.2, 0.25, 0.5];
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

const boxName = (box: number) => `${Math.floor(box / 10)}–${box % 10}`;
const fmtX = (v: number) => (v >= 9.95 ? v.toFixed(0) : v.toFixed(1)) + "×";
/** Grid cells: 12% / 4.1% / <0.1% / 0% */
const fmtChance = (p: number) => (p <= 0 ? "0%" : p < 0.0005 ? "<0.1%" : (p * 100).toFixed(p < 0.0995 ? 1 : 0) + "%");

function useSquaresData() {
  const [data, setData] = useState<SquaresData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/data/squares.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError(true));
  }, []);
  return { data, error };
}

export default function SquaresTool() {
  const { data, error } = useSquaresData();
  return (
    <div className="sq">
      <header className="sq__intro">
        <div className="eyebrow">Tools · Super Bowl Squares</div>
        <h1 className="sq__title">Super Bowl Squares</h1>
        <p className="sq__lede">
          The numbers in a squares pool are drawn at random, but they aren't created equal. See how often every box has
          hit at the end of each quarter — across every NFL game or just the Super Bowl — and what your box is really
          worth against what you paid for it.
        </p>
      </header>
      {error && <p className="sq__notice">Couldn't load the score history. Please refresh in a minute.</p>}
      {!data && !error && <p className="sq__notice">Loading every final score…</p>}
      {data && <Loaded data={data} />}
    </div>
  );
}

function Loaded({ data }: { data: SquaresData }) {
  const [source, setSource] = useState<Source>("nfl");
  const [price, setPrice] = useState(10);
  const [splitIdx, setSplitIdx] = useState(1);
  const [box, setBox] = useState(70);
  const [view, setView] = useState<View>("value");
  const [reverse, setReverse] = useState(0);

  const odds = useMemo(
    () => ({
      nfl: boxOdds(parseDigits(data.nfl.digits)),
      sb: boxOdds(superBowlDigits(data.superBowls)),
    }),
    [data],
  );
  const o = odds[source];
  const split = SPLITS[splitIdx].split;
  const ranked = useMemo(() => rankBoxes(o, split, reverse), [o, split, reverse]);
  const pot = price * BOXES;
  const value = boxValue(o, box, split, reverse);
  const rev = reverseOf(box);
  const hasRev = reverse > 0 && rev !== box;
  const anyCash = reverse > 0 ? o.anyRev[box] : o.any[box];
  const rank = ranked.findIndex(([b]) => b === box) + 1;
  const winners = ranked.filter(([, v]) => v > 1).length;
  const row = Math.floor(box / 10);
  const col = box % 10;

  const sbCount = data.superBowls.length;
  const sources: { id: Source; label: string; meta: string }[] = [
    {
      id: "nfl",
      label: "Every NFL game",
      meta: `${data.nfl.games.toLocaleString("en-US")} games since ${data.nfl.from}`,
    },
    {
      id: "sb",
      label: "Super Bowls only",
      meta: `All ${sbCount}, I–${superBowlNumber(data.superBowls.at(-1)!.season)}`,
    },
  ];

  return (
    <>
      <section className="sq__inputs" aria-label="Your pool">
        <Field label="Score history">
          <Seg
            label="Score history"
            options={sources.map((s) => ({ id: s.id, label: s.label }))}
            value={source}
            onChange={setSource}
          />
          <p className="sq__help">{sources.find((s) => s.id === source)!.meta}</p>
        </Field>

        <Field label="Price per box" value={fmtMoney(price)}>
          <div className="sq__row">
            <input
              className="sq__num"
              type="number"
              min={1}
              value={price}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1) setPrice(Math.round(v));
              }}
              aria-label="Price per box in dollars"
            />
            <div className="sq__chips">
              {PRICE_PRESETS.map((p) => (
                <button key={p} className={price === p ? "sq__chip is-on" : "sq__chip"} onClick={() => setPrice(p)}>
                  ${p}
                </button>
              ))}
            </div>
          </div>
          <p className="sq__help">
            100 boxes sold → a <strong>{fmtMoney(pot)}</strong> pot
          </p>
        </Field>

        <Field label="Payouts (% of pot: Q1 · Half · Q3 · Final)">
          <div className="sq__chips">
            {SPLITS.map((s, i) => (
              <button
                key={s.label}
                className={splitIdx === i ? "sq__chip is-on" : "sq__chip"}
                onClick={() => setSplitIdx(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="sq__help">
            {QUARTERS.map((q, i) => (
              <span key={q}>
                {i > 0 && " · "}
                {q} <strong>{fmtMoney(pot * split[i])}</strong>
              </span>
            ))}
          </p>
        </Field>

        <Field label="Reverses (share of each prize)">
          <div className="sq__chips">
            {REVERSE_PRESETS.map((r) => (
              <button key={r} className={reverse === r ? "sq__chip is-on" : "sq__chip"} onClick={() => setReverse(r)}>
                {r === 0 ? "Off" : fmtPct(r)}
              </button>
            ))}
          </div>
          <p className="sq__help">
            {reverse === 0 ? (
              "Only the exact box wins. Turn on if your pool also pays the box with the numbers flipped."
            ) : (
              <>
                A {fmtMoney(pot * split[3])} final: 7–0 gets <strong>{fmtMoney(pot * split[3] * (1 - reverse))}</strong>
                , the reverse 0–7 gets <strong>{fmtMoney(pot * split[3] * reverse)}</strong>. Doubles like 7–7 keep it
                all.
              </>
            )}
          </p>
        </Field>
      </section>

      <section className="sq__box" aria-label="Your box">
        <div className="sq__box-head">
          <div>
            <div className="eyebrow">Your box</div>
            <div className="sq__pick">
              <DigitSelect label="Row team's last digit" value={row} onChange={(d) => setBox(d * 10 + col)} />
              <span className="sq__dash">–</span>
              <DigitSelect label="Column team's last digit" value={col} onChange={(d) => setBox(row * 10 + d)} />
            </div>
            <p className="sq__help">Pick your numbers here or tap a box in the grid.</p>
          </div>
          <div className="sq__stat">
            <div className="eyebrow">Worth</div>
            <div className={`sq__big ${value >= 1 ? "is-win" : "is-loss"}`}>{fmtCents(value * price)}</div>
            <div className="sq__meta">
              for your {fmtMoney(price)} · <strong>{fmtX(value)}</strong> your money
            </div>
          </div>
          <div className="sq__stat">
            <div className="eyebrow">{reverse > 0 ? "Cashes at least once" : "Wins at least once"}</div>
            <div className="sq__big">{fmtPct(anyCash, 1)}</div>
            <div className="sq__meta">{oneIn(anyCash)}</div>
          </div>
          <div className="sq__stat">
            <div className="eyebrow">Rank</div>
            <div className="sq__big">#{rank}</div>
            <div className="sq__meta">of 100 boxes</div>
          </div>
        </div>

        <div className="sq__table-wrap">
          <table className="sq__qtable">
            <thead>
              <tr>
                <th />
                {QUARTERS.map((q) => (
                  <th key={q}>{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>{hasRev ? "Chance to cash" : "Chance"}</th>
                {QUARTERS.map((q, i) => (
                  <td key={q}>{fmtPct(cashChance(o, i, box, reverse > 0), 1)}</td>
                ))}
              </tr>
              <tr>
                <th>Pays</th>
                {QUARTERS.map((q, i) => (
                  <td key={q}>{fmtMoney(pot * split[i] * (hasRev ? 1 - reverse : 1))}</td>
                ))}
              </tr>
              {hasRev && (
                <tr>
                  <th>Reverse pays</th>
                  {QUARTERS.map((q, i) => (
                    <td key={q}>{fmtMoney(pot * split[i] * reverse)}</td>
                  ))}
                </tr>
              )}
              <tr>
                <th>Worth</th>
                {QUARTERS.map((q, i) => (
                  <td key={q}>
                    {fmtCents(
                      pot * split[i] * (hasRev ? (1 - reverse) * o.p[i][box] + reverse * o.p[i][rev] : o.p[i][box]),
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {source === "sb" && <SuperBowlHits data={data} box={box} />}
      </section>

      <div className="sq__takeaway">
        <p>
          Only <strong>{winners} of 100</strong> boxes are worth more than they cost. The best, {boxName(ranked[0][0])},
          is worth <strong>{fmtX(ranked[0][1])}</strong> your money; the worst, {boxName(ranked[99][0])},{" "}
          {ranked[99][1] > 0
            ? `is worth ${fmtCents(ranked[99][1] * price)} for your ${fmtMoney(price)}.`
            : `has never paid a cent${ranked[98][1] > 0 ? "" : ` (${ranked.filter(([, v]) => v === 0).length} boxes haven't)`}.`}
        </p>
        <p>
          {source === "sb"
            ? `That's from just ${sbCount} games — one Super Bowl moves a box a lot, and many boxes have never hit. Switch to every NFL game for steadier numbers.`
            : "0, 7, 3 and 4 carry the grid — touchdowns and field goals. 2, 5, 8 and 9 rarely show up at the end of a quarter."}
        </p>
        {reverse > 0 && (
          <p>
            Reverses don't change what a box is worth — a box and its flip have hit equally often, since either team can
            end up on the rows. They spread the money out: you cash about twice as often, for smaller prizes.
          </p>
        )}
      </div>

      <section className="sq__section">
        <div className="sq__section-head">
          <h2 className="sq__h2">Every box</h2>
          <Seg
            label="Show"
            options={[{ id: "value", label: "Value" }, ...QUARTERS.map((q, i) => ({ id: i as View, label: q }))]}
            value={view}
            onChange={setView}
          />
        </div>
        <p className="sq__sub">
          {view === "value"
            ? "What each $1 in the box is worth with your payouts. 1.0× is break-even."
            : `Chance each box ${reverse > 0 ? "cashes, straight or reverse," : "wins"} ${view === 3 ? "at the final" : view === 1 ? "at the half" : `after ${QUARTERS[view]}`}.`}{" "}
          Rows are one team's last digit, columns the other's.
        </p>
        <Grid odds={o} split={split} reverse={reverse} view={view} box={box} onPick={setBox} />
      </section>

      <details className="sq__how">
        <summary>How this works</summary>
        <dl>
          <dt>The data</dt>
          <dd>
            The score at the end of every quarter of every NFL game since {data.nfl.from}, regular season and playoffs,
            from nflverse play-by-play — plus all {sbCount} Super Bowls. The final includes overtime, as most pools pay
            it.
          </dd>
          <dt>Rows and columns</dt>
          <dd>
            Which team gets the rows is a coin flip, so every game is counted both ways round. That makes 7–0 and 0–7
            the same box.
          </dd>
          <dt>Value</dt>
          <dd>
            A box's worth is each quarter's payout times the chance it hits, added up. With all 100 boxes sold and the
            whole pot paid out, the average box is worth exactly what it costs — so value shows how far above or below
            the average your numbers are. A box worth 2.0× has returned, on average, $2 for every $1 put in.
          </dd>
          <dt>Win at least once</dt>
          <dd>The chance your box hits in any of the four quarters of a single game.</dd>
          <dt>Reverses</dt>
          <dd>
            Some pools also pay the box with the digits flipped: if the score ends 7–0, box 0–7 gets a share of that
            quarter's prize. Doubles (0–0, 7–7) have no reverse and keep the whole prize.
          </dd>
        </dl>
        <p className="sq__disclaimer">
          Past scores, not a forecast. For education and entertainment only. Updated{" "}
          {new Date(data.updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
        </p>
      </details>
    </>
  );
}

function fmtCents(n: number): string {
  if (n >= 100) return fmtMoney(n);
  return "$" + n.toFixed(2);
}

function oneIn(p: number): string {
  if (p <= 0) return "Has never hit";
  const n = 1 / p;
  return n < 1.5 ? "Most games" : `About 1 game in ${n < 10 ? n.toFixed(1).replace(/\.0$/, "") : Math.round(n)}`;
}

function SuperBowlHits({ data, box }: { data: SquaresData; box: number }) {
  const a = Math.floor(box / 10);
  const b = box % 10;
  const hits = data.superBowls.flatMap((sb) =>
    sb.q
      .map(([x, y], i) => ({ x, y, i }))
      .filter(({ x, y }) => (x % 10 === a && y % 10 === b) || (x % 10 === b && y % 10 === a))
      .map(({ x, y, i }) => ({ sb, x, y, i })),
  );
  if (!hits.length) return <p className="sq__hits">This box has never hit in a Super Bowl.</p>;
  return (
    <p className="sq__hits">
      <strong>Super Bowl hits:</strong>{" "}
      {hits.map(({ sb, x, y, i }, k) => (
        <span key={k}>
          {k > 0 && " · "}
          {superBowlNumber(sb.season)} {QUARTERS[i]} ({sb.teams[0]} {x}–{y} {sb.teams[1]})
        </span>
      ))}
    </p>
  );
}

function Grid({
  odds,
  split,
  reverse,
  view,
  box,
  onPick,
}: {
  odds: BoxOdds;
  split: Split;
  reverse: number;
  view: View;
  box: number;
  onPick: (b: number) => void;
}) {
  const vals = DIGITS.flatMap((r) => DIGITS.map((c) => r * 10 + c)).map((b) =>
    view === "value" ? boxValue(odds, b, split, reverse) : cashChance(odds, view, b, reverse > 0),
  );
  const max = Math.max(...vals);
  return (
    <div className="sq__grid-wrap">
      <table className="sq__grid">
        <thead>
          <tr>
            <th className="sq__corner" aria-label="Row digit by column digit" />
            {DIGITS.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DIGITS.map((r) => (
            <tr key={r}>
              <th>{r}</th>
              {DIGITS.map((c) => {
                const b = r * 10 + c;
                const v = vals[b];
                return (
                  <td key={c} className={b === box ? "is-you" : undefined} style={{ background: tint(view, v, max) }}>
                    <button onClick={() => onPick(b)} aria-label={`Box ${r}–${c}`} aria-pressed={b === box}>
                      {view === "value" ? fmtX(v) : fmtChance(v)}
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

/** Value: green above break-even, red below, on a log scale. Chance: green that deepens with the odds. */
function tint(view: View, v: number, max: number): string {
  if (view === "value") {
    if (v <= 0) return "oklch(0.62 0.16 25 / 0.55)";
    const t = Math.log(v) / Math.log(Math.max(max, 2));
    if (t >= 0) return `oklch(0.6 0.12 150 / ${(0.06 + 0.64 * Math.min(1, t)).toFixed(3)})`;
    return `oklch(0.62 0.16 25 / ${(0.06 + 0.5 * Math.min(1, -Math.log(v) / Math.log(20))).toFixed(3)})`;
  }
  if (v <= 0) return "transparent";
  return `oklch(0.6 0.12 150 / ${(0.04 + 0.66 * Math.sqrt(v / max)).toFixed(3)})`;
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="sq__field">
      <div className="sq__field-head">
        <span className="eyebrow">{label}</span>
        {value && <span className="sq__value">{value}</span>}
      </div>
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
    <div className="sq__seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          role="radio"
          aria-checked={value === o.id}
          className={value === o.id ? "is-on" : ""}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DigitSelect({ label, value, onChange }: { label: string; value: number; onChange: (d: number) => void }) {
  return (
    <select className="sq__digit" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label}>
      {DIGITS.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </select>
  );
}
