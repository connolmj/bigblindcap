import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BREAKEVEN,
  METRICS,
  SPREAD_BUCKETS,
  atLeast,
  atSpread,
  bySeason,
  exactly,
  favMargins,
  filterGames,
  inBucket,
  keyNumbers,
  share,
  summarize,
  within,
  type Filter,
  type GameType,
  type Matchup,
  type Rate,
  type Setting,
  type Summary,
} from "../model/stats";
import { toGame, type Game, type NflNumbersData } from "../model/types";
import { fairOdds } from "../../../learn/sports-betting/model/odds";
import { fmtOdds, fmtPct } from "../../bankroll/ui/format";
import { BarChart, TrendChart, type Bar } from "./Charts";
import "./nfl-numbers.css";

const FIRST = 1999;
/** Below this many games a rate gets a "small sample" warning. */
const SMALL = 100;

const TYPES: { id: GameType; label: string }[] = [
  { id: "all", label: "All games" },
  { id: "reg", label: "Regular season" },
  { id: "post", label: "Playoffs" },
];

const MATCHUPS: { id: Matchup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "div", label: "Division" },
  { id: "nondiv", label: "Non-division" },
  { id: "first", label: "Division, 1st meeting" },
  { id: "rematch", label: "Division rematch" },
];

const SETTINGS: { id: Setting; label: string }[] = [
  { id: "all", label: "Anywhere" },
  { id: "indoors", label: "Indoors" },
  { id: "outdoors", label: "Outdoors" },
];

interface Era {
  id: string;
  label: string;
  short: string;
  from: number;
  to: number;
}

/** 2015 moved the extra point back to a 33-yard kick; 2020 played without fans. */
function eras(last: number): Era[] {
  return [
    { id: "recent", label: "2020 – now", short: "2020–now", from: 2020, to: last },
    { id: "mid", label: "2015 – 2019", short: "2015–19", from: 2015, to: 2019 },
    { id: "old", label: "1999 – 2014", short: "1999–2014", from: FIRST, to: 2014 },
    { id: "all", label: "All since 1999", short: "All years", from: FIRST, to: last },
    { id: "this", label: "This season", short: String(last), from: last, to: last },
  ];
}

const LINES = Array.from({ length: 28 }, (_, i) => 1 + i / 2); // 1 … 14.5

// ---------- Formatting ----------

const dash = "—";
const fmtRate = (r: Rate, digits = 1) => (r.of ? fmtPct(share(r), digits) : dash);
const fmtSignedPts = (v: number) =>
  Number.isFinite(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}` : dash;
const fmtPts = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : dash);
const fmtLine = (l: number) => (l % 1 ? l.toFixed(1) : String(l));
const fmtCount = (n: number) => n.toLocaleString("en-US");

/** "+1.9" in percentage points between two rates, or between two point values. */
function fmtDelta(a: number, b: number, kind: "pct" | "pts"): string | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const d = kind === "pct" ? (a - b) * 100 : a - b;
  const r = Math.round(d * 10) / 10;
  return r === 0 ? "No change" : `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(1)}${kind === "pct" ? " pts" : ""}`;
}

function useNflNumbers() {
  const [data, setData] = useState<NflNumbersData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/data/nfl-numbers.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError(true));
  }, []);
  return { data, error };
}

export default function NflNumbersTool() {
  const { data, error } = useNflNumbers();
  return (
    <div className="nn">
      <header className="nn__intro">
        <div className="eyebrow">Tools · NFL</div>
        <h1 className="nn__title">NFL Key Numbers &amp; Trends</h1>
        <p className="nn__lede">
          How close NFL games finish, how often favorites win and cover at every number, what home field and underdogs
          are really worth, and how all of it has shifted — from every game and closing line since 1999.
        </p>
      </header>
      {error && <p className="nn__notice">Couldn't load the game history. Please refresh in a minute.</p>}
      {!data && !error && <p className="nn__notice">Loading every final score…</p>}
      {data && <Loaded data={data} />}
    </div>
  );
}

function Loaded({ data }: { data: NflNumbersData }) {
  const games = useMemo(() => data.games.map(toGame), [data]);
  const last = games.at(-1)!.season;
  const ERAS = useMemo(() => eras(last), [last]);
  const lastPartial = useMemo(() => {
    const playoffs = games.filter((g) => g.season === last && g.playoff).length;
    return playoffs < (last >= 2020 ? 13 : 11);
  }, [games, last]);

  const [from, setFrom] = useState(2020);
  const [to, setTo] = useState(last);
  const [compareId, setCompareId] = useState("old");
  const [type, setType] = useState<GameType>("all");
  const [matchup, setMatchup] = useState<Matchup>("all");
  const [setting, setSetting] = useState<Setting>("all");

  const f: Filter = { from, to, type, matchup, setting };
  const sel = useMemo(
    () => filterGames(games, { from, to, type, matchup, setting }),
    [games, from, to, type, matchup, setting],
  );
  const s = useMemo(() => summarize(sel), [sel]);

  const cmpEra = ERAS.find((e) => e.id === compareId);
  const cmpOn = !!cmpEra && !(cmpEra.from === from && cmpEra.to === to);
  const cs = useMemo(
    () =>
      cmpOn ? summarize(filterGames(games, { from: cmpEra!.from, to: cmpEra!.to, type, matchup, setting })) : null,
    [games, cmpOn, cmpEra, type, matchup, setting],
  );
  const cmpLabel = cmpEra?.short ?? "";
  const range = from === to ? String(from) : `${from}–${to}`;

  const pickEra = (e: Era) => {
    setFrom(e.from);
    setTo(e.to);
  };
  const seasons = Array.from({ length: last - FIRST + 1 }, (_, i) => FIRST + i);

  const ctx: Ctx = { s, cs, cmpLabel, range };

  return (
    <>
      <section className="nn__filters" aria-label="Which games">
        <Field label="Seasons">
          <div className="nn__chips">
            {ERAS.map((e) => (
              <button
                key={e.id}
                className={from === e.from && to === e.to ? "nn__chip is-on" : "nn__chip"}
                onClick={() => pickEra(e)}
              >
                {e.label}
              </button>
            ))}
          </div>
          <div className="nn__row">
            <SeasonSelect
              label="From season"
              value={from}
              options={seasons}
              onChange={(v) => (setFrom(v), v > to && setTo(v))}
            />
            <span className="nn__help">to</span>
            <SeasonSelect
              label="To season"
              value={to}
              options={seasons}
              onChange={(v) => (setTo(v), v < from && setFrom(v))}
            />
          </div>
        </Field>

        <Field label="Compare against">
          <div className="nn__chips">
            <button className={!cmpEra ? "nn__chip is-on" : "nn__chip"} onClick={() => setCompareId("off")}>
              Off
            </button>
            {ERAS.filter((e) => e.id !== "this").map((e) => (
              <button
                key={e.id}
                className={compareId === e.id ? "nn__chip is-on" : "nn__chip"}
                onClick={() => setCompareId(e.id)}
              >
                {e.label}
              </button>
            ))}
          </div>
          <p className="nn__help">
            {cmpEra && !cmpOn
              ? "Same seasons as above — pick different ones to see the change."
              : "Changes show next to each number, and as ticks on the charts."}
          </p>
        </Field>

        <Field label="Games">
          <Seg label="Games" options={TYPES} value={type} onChange={setType} />
        </Field>

        <Field label="Matchup">
          <Seg label="Matchup" options={MATCHUPS} value={matchup} onChange={setMatchup} />
        </Field>

        <Field label="Played">
          <Seg label="Played" options={SETTINGS} value={setting} onChange={setSetting} />
        </Field>

        <p className="nn__count">
          <strong>{fmtCount(s.games)}</strong> games, {range}
          {from <= last && to >= last && lastPartial ? ` (${last} so far)` : ""}
          {cmpOn && cs ? ` · comparing ${fmtCount(cs.games)} games, ${cmpLabel}` : ""}
        </p>
      </section>

      {s.games === 0 ? (
        <p className="nn__notice">No games match these filters.</p>
      ) : (
        <>
          <Margins ctx={ctx} />
          <Spreads ctx={ctx} sel={sel} />
          <HomeAndDogs ctx={ctx} />
          <Totals ctx={ctx} />
          <Division games={games} f={f} matchup={matchup} />
        </>
      )}
      <Seasons games={games} f={f} last={last} lastPartial={lastPartial} />
      <HowItWorks updated={data.updated} />
    </>
  );
}

interface Ctx {
  s: Summary;
  cs: Summary | null;
  cmpLabel: string;
  range: string;
}

// ---------- 1. Margins ----------

function Margins({ ctx }: { ctx: Ctx }) {
  const { s, cs, cmpLabel } = ctx;
  const [n, setN] = useState(7);
  const keys = keyNumbers(s, 4);
  const MAX = 20;
  const bars: Bar[] = Array.from({ length: MAX + 1 }, (_, i) => {
    const m = i + 1;
    const rate = m > MAX ? atLeast(s, m) : exactly(s, m);
    const crate = cs && (m > MAX ? atLeast(cs, m) : exactly(cs, m));
    const name = m > MAX ? `${MAX + 1}+ points` : `Exactly ${m}`;
    return {
      key: m,
      tick: m > MAX ? `${MAX + 1}+` : m % 2 && m !== 3 && m !== 7 ? "" : String(m),
      value: share(rate),
      compare: crate ? share(crate) : undefined,
      tone: keys.includes(m) ? "key" : "plain",
      labelled: keys.includes(m),
      tip: (
        <>
          <strong>
            {name}: {fmtRate(rate)}
          </strong>
          <span>{fmtCount(rate.hits)} games</span>
          {crate && (
            <span>
              {cmpLabel}: {fmtRate(crate)}
            </span>
          )}
        </>
      ),
    };
  });

  return (
    <Section n={1} title="How close games finish" sub="Final margin, either team.">
      <div className="nn__tiles">
        <Tile label="Within 3" rate={within(s, 3)} cmp={cs && within(cs, 3)} cmpLabel={cmpLabel} />
        <Tile label="One score (8 or less)" rate={within(s, 8)} cmp={cs && within(cs, 8)} cmpLabel={cmpLabel} />
        <Tile label="14 or more" rate={atLeast(s, 14)} cmp={cs && atLeast(cs, 14)} cmpLabel={cmpLabel} />
        <Tile
          label="Average margin"
          value={fmtPts(s.avgMargin)}
          delta={cs && fmtDelta(s.avgMargin, cs.avgMargin, "pts")}
          cmpLabel={cmpLabel}
          note="points"
        />
      </div>

      <div className="nn__within">
        <label className="nn__within-label" htmlFor="nn-within">
          <strong>{fmtRate(within(s, n))}</strong> of games finished within{" "}
          <strong>
            {n} point{n === 1 ? "" : "s"}
          </strong>
          {cs && (
            <span className="nn__muted">
              {" "}
              · {cmpLabel}: {fmtRate(within(cs, n))}
            </span>
          )}
        </label>
        <input
          id="nn-within"
          className="nn__slider"
          type="range"
          min={1}
          max={21}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
        />
      </div>

      <h3 className="nn__h3">How often each margin happens</h3>
      <BarChart bars={bars} xTitle="Final margin (points)" label="Share of games decided by each margin" />
      <Legend items={[["key", "Most common margins"], !!cs && ["compare", cmpLabel]]} />
      <Takeaway>
        <p>
          {keys.slice(0, 2).join(" and ")} are the key numbers: {fmtRate(exactly(s, keys[0]))} of games land on{" "}
          {keys[0]} and {fmtRate(exactly(s, keys[1]))} on {keys[1]}. Getting a half point onto or off them is worth the
          most.
        </p>
        <p>
          Since the extra point moved back in 2015, 7 shows up less and 6 shows up more: missed kicks and two-point
          tries break up the touchdown-and-kick margins.
        </p>
      </Takeaway>
    </Section>
  );
}

// ---------- 2. Spreads ----------

function Spreads({ ctx, sel }: { ctx: Ctx; sel: Game[] }) {
  const { s } = ctx;
  const [line, setLine] = useState(3);
  const at = useMemo(() => atSpread(sel, line), [sel, line]);
  const ls = useMemo(() => summarize(at), [at]);
  const fm = useMemo(() => favMargins(at), [at]);
  const buckets = useMemo(() => SPREAD_BUCKETS.map((b) => ({ b, s: summarize(inBucket(sel, b)) })), [sel]);
  const p = share(ls.favWins);

  const LO = -21;
  const HI = 28;
  const total = ls.pushes.of; // every game with a favorite
  const binOf = (m: number) => Math.min(HI + 1, Math.max(LO - 1, m));
  const counts = new Map<number, number>();
  for (const [m, c] of fm) counts.set(binOf(m), (counts.get(binOf(m)) ?? 0) + c);
  const bars: Bar[] = [];
  for (let m = LO - 1; m <= HI + 1; m++) {
    const c = counts.get(m) ?? 0;
    const label =
      m <= LO - 1
        ? `Underdog by ${-LO + 1}+`
        : m >= HI + 1
          ? `Favorite by ${HI + 1}+`
          : m > 0
            ? `Favorite by ${m}`
            : m < 0
              ? `Underdog by ${-m}`
              : "Tie";
    bars.push({
      key: m,
      tick:
        m < LO
          ? `≤−${-LO + 1}`
          : m > HI
            ? `${HI + 1}+`
            : m % 7 === 0 && m > LO
              ? m > 0
                ? `+${m}`
                : m < 0
                  ? `−${-m}`
                  : "0"
              : "",
      value: total ? c / total : 0,
      tone: m > line ? "key" : m === line ? "accent" : "plain",
      tip: (
        <>
          <strong>
            {label}: {total ? fmtPct(c / total, 1) : dash}
          </strong>
          <span>
            {fmtCount(c)} game{c === 1 ? "" : "s"} ·{" "}
            {m > line ? "favorite covers" : m === line ? "push" : "underdog covers"}
          </span>
        </>
      ),
    });
  }

  return (
    <Section
      n={2}
      title="Spreads & favorites"
      sub="Closing lines. Pick a spread to see how games at that number finished."
    >
      <div className="nn__picker">
        <button
          className="nn__step"
          onClick={() => setLine(Math.max(1, line - 0.5))}
          aria-label="Smaller spread"
          disabled={line <= 1}
        >
          −
        </button>
        <div className="nn__line">
          <span className="eyebrow">Favorite by</span>
          <span className="nn__line-num">{fmtLine(line)}</span>
        </div>
        <button
          className="nn__step"
          onClick={() => setLine(Math.min(14.5, line + 0.5))}
          aria-label="Bigger spread"
          disabled={line >= 14.5}
        >
          +
        </button>
        <input
          className="nn__slider nn__slider--line"
          type="range"
          min={0}
          max={LINES.length - 1}
          value={LINES.indexOf(line)}
          onChange={(e) => setLine(LINES[Number(e.target.value)])}
          aria-label="Closing spread"
        />
      </div>

      {ls.games === 0 ? (
        <p className="nn__notice">No games closed at {fmtLine(line)} with these filters.</p>
      ) : (
        <>
          <div className="nn__tiles">
            <Tile
              label="Favorite wins outright"
              rate={ls.favWins}
              note={
                Number.isFinite(p) && p > 0 && p < 1
                  ? `fair moneyline ${fmtOdds(Math.round(fairOdds(p)))} / ${fmtOdds(Math.round(fairOdds(1 - p)))}`
                  : undefined
              }
            />
            <Tile label="Favorite covers" rate={ls.favCovers} note="pushes left out" />
            <Tile
              label="Underdog covers"
              rate={ls.dogs.covers}
              note="pushes left out"
              good={share(ls.dogs.covers) >= BREAKEVEN}
            />
            <Tile
              label={line % 1 ? "Wins, doesn't cover" : "Push"}
              rate={line % 1 ? ls.favWinNoCover : ls.pushes}
              note={line % 1 ? "favorite won by less than the spread" : `lands exactly on ${line}`}
            />
          </div>
          {ls.games < SMALL && (
            <p className="nn__warn">
              Only {ls.games} games closed at {fmtLine(line)} — treat these as rough.
            </p>
          )}
          <h3 className="nn__h3">Where the favorite finished</h3>
          <BarChart
            bars={bars}
            xTitle="Favorite's final margin (negative = underdog won)"
            label={`Final margins of ${fmtLine(line)}-point favorites`}
          />
          <Legend
            items={[["key", "Favorite covers"], !(line % 1) && ["accent", "Push"], ["plain", "Underdog covers"]]}
          />
        </>
      )}

      <h3 className="nn__h3">By size of spread</h3>
      <div className="nn__table-wrap">
        <table className="nn__table">
          <thead>
            <tr>
              <th>Favorite by</th>
              <th>Games</th>
              <th>Favorite wins</th>
              <th>Wins, doesn't cover</th>
              <th>Underdog covers</th>
            </tr>
          </thead>
          <tbody>
            {buckets.map(({ b, s: bs }) => (
              <tr key={b.label}>
                <th>{b.label}</th>
                <td>{fmtCount(bs.pushes.of)}</td>
                <td>{fmtRate(bs.favWins)}</td>
                <td>{fmtRate(bs.favWinNoCover)}</td>
                <RateCell rate={bs.dogs.covers} />
              </tr>
            ))}
            <tr className="nn__total">
              <th>All</th>
              <td>{fmtCount(s.pushes.of)}</td>
              <td>{fmtRate(s.favWins)}</td>
              <td>{fmtRate(s.favWinNoCover)}</td>
              <RateCell rate={s.dogs.covers} />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="nn__note">Green: at or above the {fmtPct(BREAKEVEN, 1)} it takes to profit at −110.</p>
    </Section>
  );
}

// ---------- 3. Home field and underdogs ----------

function HomeAndDogs({ ctx }: { ctx: Ctx }) {
  const { s, cs, cmpLabel } = ctx;
  const rows: { label: string; get: (x: Summary) => { wins: Rate; covers: Rate } }[] = [
    { label: "Home underdogs", get: (x) => x.homeDogs },
    { label: "Road underdogs", get: (x) => x.roadDogs },
    { label: "All underdogs", get: (x) => x.dogs },
  ];
  return (
    <Section n={3} title="Home field & underdogs" sub="Neutral-site games are left out of home and road.">
      <div className="nn__tiles">
        <Tile label="Home team wins" rate={s.homeWins} cmp={cs?.homeWins} cmpLabel={cmpLabel} />
        <Tile
          label="Home team's average margin"
          value={fmtSignedPts(s.homeMargin)}
          delta={cs && fmtDelta(s.homeMargin, cs.homeMargin, "pts")}
          cmpLabel={cmpLabel}
          note="points, what actually happened"
        />
        <Tile
          label="Home team's average spread"
          value={fmtSignedPts(s.homeSpread)}
          delta={cs && fmtDelta(s.homeSpread, cs.homeSpread, "pts")}
          cmpLabel={cmpLabel}
          note="points, what the market expected"
        />
      </div>

      <div className="nn__table-wrap">
        <table className="nn__table">
          <thead>
            <tr>
              <th />
              <th>Games</th>
              <th>Win outright</th>
              <th>Cover</th>
              {cs && <th className="nn__cmp-col">Cover, {cmpLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = r.get(s);
              return (
                <tr key={r.label}>
                  <th>{r.label}</th>
                  <td>{fmtCount(v.wins.of)}</td>
                  <td>{fmtRate(v.wins)}</td>
                  <RateCell rate={v.covers} />
                  {cs && <RateCell rate={r.get(cs).covers} muted />}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Takeaway>
        <p>
          Home underdogs win outright about {fmtPct(share(s.homeDogs.wins))} of the time but cover{" "}
          {fmtRate(s.homeDogs.covers)} — the market already prices them. Underdogs as a group cover{" "}
          {fmtRate(s.dogs.covers)}, {share(s.dogs.covers) >= BREAKEVEN ? "above" : "short of"} the{" "}
          {fmtPct(BREAKEVEN, 1)} needed at −110.
        </p>
        <p>
          Home field used to be worth about 3 points. It fell to about 2 after 2019, and the 2020 season, played mostly
          without fans, was close to even.
        </p>
      </Takeaway>
    </Section>
  );
}

// ---------- 4. Totals ----------

function Totals({ ctx }: { ctx: Ctx }) {
  const { s, cs, cmpLabel } = ctx;
  const LO = 20;
  const HI = 65;
  const sum = (from: number, to: number, x: Summary) =>
    x.pointsCounts.slice(from, to + 1).reduce((a, b) => a + (b ?? 0), 0);
  const top = s.pointsCounts
    .map((n, p) => ({ n, p }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5)
    .map((x) => x.p);
  const bars: Bar[] = [];
  for (let p = LO - 1; p <= HI + 1; p++) {
    const c = p < LO ? sum(0, LO - 1, s) : p > HI ? sum(HI + 1, 999, s) : (s.pointsCounts[p] ?? 0);
    const cc = cs && (p < LO ? sum(0, LO - 1, cs) : p > HI ? sum(HI + 1, 999, cs) : (cs.pointsCounts[p] ?? 0));
    const name = p < LO ? `Under ${LO} points` : p > HI ? `${HI + 1}+ points` : `${p} points`;
    bars.push({
      key: p,
      tick: p < LO ? `<${LO}` : p > HI ? `${HI + 1}+` : p % 5 === 0 && p > LO && p < HI ? String(p) : "",
      value: c / s.games,
      compare: cs ? cc! / cs.games : undefined,
      tone: top.includes(p) ? "key" : "plain",
      labelled: top.slice(0, 3).includes(p),
      tip: (
        <>
          <strong>
            {name}: {fmtPct(c / s.games, 1)}
          </strong>
          <span>{fmtCount(c)} games</span>
          {cs && (
            <span>
              {cmpLabel}: {fmtPct(cc! / cs.games, 1)}
            </span>
          )}
        </>
      ),
    });
  }
  return (
    <Section n={4} title="Totals" sub="Both teams' points added up, against the closing over/under.">
      <div className="nn__tiles">
        <Tile
          label="Points per game"
          value={fmtPts(s.avgPoints)}
          delta={cs && fmtDelta(s.avgPoints, cs.avgPoints, "pts")}
          cmpLabel={cmpLabel}
        />
        <Tile
          label="Average closing total"
          value={fmtPts(s.avgTotal)}
          delta={cs && fmtDelta(s.avgTotal, cs.avgTotal, "pts")}
          cmpLabel={cmpLabel}
        />
        <Tile label="Overs" rate={s.overs} cmp={cs?.overs} cmpLabel={cmpLabel} note="pushes left out" />
        <Tile label="Overtime" rate={s.overtime} cmp={cs?.overtime} cmpLabel={cmpLabel} />
      </div>
      <h3 className="nn__h3">Most common final totals</h3>
      <BarChart bars={bars} xTitle="Total points scored" label="Share of games by total points scored" />
      <Legend items={[["key", `Top 5: ${[...top].sort((a, b) => a - b).join(", ")}`], !!cs && ["compare", cmpLabel]]} />
    </Section>
  );
}

// ---------- 5. Division games ----------

function Division({ games, f, matchup }: { games: Game[]; f: Filter; matchup: Matchup }) {
  const cols = useMemo(
    () =>
      (["div", "nondiv", "first", "rematch"] as Matchup[]).map((m) => ({
        m,
        s: summarize(filterGames(games, { ...f, matchup: m })),
      })),
    [games, f.from, f.to, f.type, f.setting],
  );
  const heads: Record<string, string> = {
    div: "Division",
    nondiv: "Non-division",
    first: "1st meeting",
    rematch: "Rematch",
  };
  const rows: { label: string; cell: (s: Summary) => ReactNode }[] = [
    { label: "Games", cell: (s) => fmtCount(s.games) },
    { label: "Average margin", cell: (s) => fmtPts(s.avgMargin) },
    { label: "Miss vs. spread (std. dev.)", cell: (s) => fmtPts(s.missSd) },
    { label: "Within 3", cell: (s) => fmtRate(within(s, 3)) },
    { label: "14 or more", cell: (s) => fmtRate(atLeast(s, 14)) },
    { label: "Underdog covers", cell: (s) => fmtRate(s.dogs.covers) },
    { label: "Home margin", cell: (s) => fmtSignedPts(s.homeMargin) },
    { label: "Overs", cell: (s) => fmtRate(s.overs) },
  ];
  const [d, nd] = cols;
  return (
    <Section
      n={5}
      title="Division games"
      sub={`Rivals who play twice a year, against everyone else.${matchup !== "all" ? " This table ignores the Matchup filter." : ""}`}
    >
      <div className="nn__table-wrap">
        <table className="nn__table">
          <thead>
            <tr>
              <th />
              {cols.map((c) => (
                <th key={c.m} className={c.m === "first" || c.m === "rematch" ? "nn__sub-col" : undefined}>
                  {heads[c.m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th>{r.label}</th>
                {cols.map((c) => (
                  <td key={c.m} className={c.m === "first" || c.m === "rematch" ? "nn__sub-col" : undefined}>
                    {r.cell(c.s)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Takeaway>
        <p>
          Division games finish {d.s.missSd < nd.s.missSd ? "a little closer to" : "about as close to"} the spread (
          {fmtPts(d.s.missSd)} vs. {fmtPts(nd.s.missSd)} points) with fewer blowouts, and underdogs cover{" "}
          {fmtRate(d.s.dogs.covers)} vs. {fmtRate(nd.s.dogs.covers)}. That makes extra points on a division underdog
          worth a bit more — but it's a tiebreaker, not a system.
        </p>
      </Takeaway>
    </Section>
  );
}

// ---------- 6. Season by season ----------

function Seasons({ games, f, last, lastPartial }: { games: Game[]; f: Filter; last: number; lastPartial: boolean }) {
  const [id, setId] = useState("within7");
  const metric = METRICS.find((m) => m.id === id)!;
  const series = useMemo(
    () => bySeason(filterGames(games, { ...f, from: FIRST, to: last })),
    [games, f.type, f.matchup, f.setting, last],
  );
  const points = series.map((x) => ({
    season: x.season,
    value: metric.get(x.summary),
    games: x.summary.games,
    partial: x.season === last && lastPartial,
  }));
  return (
    <Section
      n={6}
      title="Season by season"
      sub="Every season with the Games, Matchup and Played filters. Shaded: the seasons picked above."
    >
      <div className="nn__chips nn__metrics">
        {METRICS.map((m) => (
          <button key={m.id} className={id === m.id ? "nn__chip is-on" : "nn__chip"} onClick={() => setId(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <TrendChart
        points={points}
        kind={metric.kind}
        refLine={metric.ref}
        range={[f.from, f.to]}
        label={`${metric.label} by season`}
      />
      {lastPartial && (
        <p className="nn__note">Hollow dot: {last} so far. One season is a small sample — look for runs of years.</p>
      )}
    </Section>
  );
}

function HowItWorks({ updated }: { updated: string }) {
  return (
    <details className="nn__how">
      <summary>How this works</summary>
      <dl>
        <dt>The data</dt>
        <dd>
          Every finished NFL game since 1999 — final score, closing spread and closing total — from the free{" "}
          <a className="underlined" href="https://github.com/nflverse/nfldata" target="_blank" rel="noreferrer">
            nflverse
          </a>{" "}
          schedule file, refreshed daily in season.
        </dd>
        <dt>Covers and pushes</dt>
        <dd>
          A cover rate leaves pushes out, the way a sportsbook refunds them. At −110 you need to win{" "}
          {fmtPct(BREAKEVEN, 1)} of bets to break even, so a 51% cover rate still loses money.
        </dd>
        <dt>Home and road</dt>
        <dd>
          Neutral-site games (international games, most Super Bowls) count in every total but not as home or road.
        </dd>
        <dt>Division rematch</dt>
        <dd>
          A division game after the two teams' first meeting that season, including a third meeting in the playoffs.
        </dd>
        <dt>Miss vs. spread</dt>
        <dd>
          How far final margins land from the closing spread, as a standard deviation. Smaller means games stay closer
          to the number, so each extra point you get or give matters more.
        </dd>
        <dt>Indoors</dt>
        <dd>Domes, and retractable roofs that were closed.</dd>
      </dl>
      <p className="nn__disclaimer">
        Past results, not a forecast. A trend that beats 50% over a few hundred games can easily be luck. For education
        and entertainment only. Updated{" "}
        {new Date(updated).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
      </p>
    </details>
  );
}

// ---------- Small pieces ----------

function Section({ n, title, sub, children }: { n: number; title: string; sub: string; children: ReactNode }) {
  return (
    <section className="nn__section">
      <div className="nn__section-head">
        <span className="nn__num">{n}</span>
        <h2 className="nn__h2">{title}</h2>
      </div>
      <p className="nn__sub">{sub}</p>
      {children}
    </section>
  );
}

function Tile({
  label,
  rate,
  cmp,
  value,
  delta,
  cmpLabel,
  note,
  good,
}: {
  label: string;
  rate?: Rate;
  cmp?: Rate | null;
  value?: string;
  delta?: string | null;
  cmpLabel?: string;
  note?: string;
  good?: boolean;
}) {
  const d = rate && cmp ? fmtDelta(share(rate), share(cmp), "pct") : delta;
  return (
    <div className="nn__tile">
      <div className="eyebrow">{label}</div>
      <div className={`nn__big${good ? " is-win" : ""}`}>{rate ? fmtRate(rate) : value}</div>
      <div className="nn__meta">
        {rate && (
          <span className={rate.of < SMALL ? "nn__small" : undefined}>
            {fmtCount(rate.hits)} of {fmtCount(rate.of)}
            {rate.of < SMALL ? " · small sample" : ""}
          </span>
        )}
        {!rate && note && <span>{note}</span>}
        {d && (
          <span className="nn__delta">
            {d} vs. {cmpLabel}
          </span>
        )}
        {rate && note && <span>{note}</span>}
      </div>
    </div>
  );
}

function RateCell({ rate, muted }: { rate: Rate; muted?: boolean }) {
  const v = share(rate);
  const cls = [muted ? "nn__cmp-col" : "", v >= BREAKEVEN ? "is-win" : ""].filter(Boolean).join(" ");
  return (
    <td className={cls || undefined} title={`${fmtCount(rate.hits)} of ${fmtCount(rate.of)}`}>
      {fmtRate(rate)}
    </td>
  );
}

/** Swatches under a chart; `false` entries are skipped. */
function Legend({ items }: { items: ([string, string] | false)[] }) {
  return (
    <div className="nn-legend">
      {items
        .filter((x) => x !== false)
        .map(([tone, label]) => (
          <span key={tone + label}>
            <i className={`nn-swatch is-${tone}`} />
            {label}
          </span>
        ))}
    </div>
  );
}

function Takeaway({ children }: { children: ReactNode }) {
  return <div className="nn__takeaway">{children}</div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="nn__field">
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  );
}

function SeasonSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (v: number) => void;
}) {
  return (
    <select className="nn__select" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function Seg<T extends string>({
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
    <div className="nn__seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
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
