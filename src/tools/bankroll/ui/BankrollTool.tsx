import { useDeferredValue, useMemo, useState } from "react";
import { binProfits } from "../model/bins";
import {
  breakEven,
  exactOdds,
  flatEdge,
  kelly,
  maxSafeUnit,
  payout,
  roi,
  simulate,
  simulateSeason,
  type Season,
  type Sizing,
} from "../model/sim";
import { OutcomeHistogram, SeasonLine } from "./Charts";
import { fmtMoney, fmtOdds, fmtPct, fmtSigned } from "./format";
import "./bankroll.css";

const SEASONS = 10000;
const ODDS_PRESETS = [-120, -115, -110, -105, 100];
const BET_PRESETS = [50, 100, 250, 500, 1000];
const UNIT_PRESETS = [1, 2, 3, 5, 10, 25];
/** Win-rate columns in the table, in points either side of yours. */
const WIN_OFFSETS = [-4, -2, 0, 2, 4];

interface Inputs {
  winRate: number; // percent
  odds: number;
  bets: number;
  bankroll: number;
  unit: number; // percent of bankroll
  sizing: Sizing;
}

const staking = (i: Inputs, winRate = i.winRate, unit = i.unit) => ({
  winRate: winRate / 100,
  odds: i.odds,
  bets: i.bets,
  bankroll: i.bankroll,
  unit: unit / 100,
  sizing: i.sizing,
});

/** Roughly how many flat bets before you're 95% sure to be ahead (normal approximation). */
function betsToBeSure(p: number, odds: number): number | null {
  const b = payout(odds);
  const mu = p * b - (1 - p);
  if (mu <= 0) return null;
  const sd = Math.sqrt(p * (1 - p)) * (1 + b);
  return Math.ceil(Math.pow((1.645 * sd) / mu, 2));
}

/** Risk of ruin: "0%" once it rounds away, one decimal while small. */
function fmtRisk(x: number): string {
  if (x < 0.0005) return "0%";
  if (x > 0.9995) return "100%";
  return fmtPct(x, x < 0.1 ? 1 : 0);
}

/** Share of sorted values strictly below v. */
function shareBelow(sorted: Float64Array, v: number): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < v - 1e-9) lo = mid + 1;
    else hi = mid;
  }
  return lo / sorted.length;
}

export default function BankrollTool() {
  const [inp, setInp] = useState<Inputs>({
    winRate: 56,
    odds: -110,
    bets: 100,
    bankroll: 1000,
    unit: 2,
    sizing: "flat",
  });
  const [oddsText, setOddsText] = useState("-110");
  const [season, setSeason] = useState<{ for: Inputs; s: Season } | null>(null);
  const set = (patch: Partial<Inputs>) => setInp((s) => ({ ...s, ...patch }));
  const run = useDeferredValue(inp);

  const result = useMemo(() => simulate({ ...staking(run), seasons: SEASONS, seed: 1 }), [run]);
  const exact = useMemo(() => exactOdds(staking(run)), [run]);

  const stake = (run.unit / 100) * run.bankroll;
  const { edge, lattice } =
    run.sizing === "flat" ? flatEdge(run.odds, run.bets, stake) : { edge: 0, lattice: undefined };
  const bins = useMemo(
    () =>
      binProfits(
        result.finals.map((f) => f - run.bankroll),
        // % staking has a very long right tail; fold more of it into the last bar.
        { edge, lattice, trim: run.sizing === "percent" ? 0.02 : 0.005 },
      ),
    [result, run.bankroll, run.sizing, edge, lattice],
  );

  const p = inp.winRate / 100;
  const be = breakEven(inp.odds);
  const ev = roi(p, inp.odds);
  const k = kelly(p, inp.odds);
  const stale = run !== inp;
  const mySeason = season && season.for === inp ? season.s : null;

  const runSeason = () => setSeason({ for: inp, s: simulateSeason(staking(inp), (Math.random() * 2 ** 32) >>> 0) });

  return (
    <div className="br">
      <header className="br__intro">
        <div className="eyebrow">Tools · Bankroll</div>
        <h1 className="br__title">Bankroll Management</h1>
        <p className="br__lede">
          The purpose of this tool is to illustrate the importance of bankroll management. A bettor with an edge can
          still go through periods of losses and have down seasons. Use this tool to determine your bet sizing,
          visualize the possibilities of returns over a time period, reduce likelihood of "going broke" and
          understanding your chances of finishing ahead.
        </p>
      </header>

      <section className="br__inputs" aria-label="Your betting profile">
        <Field label="Win rate" value={fmtPct(p, 1)}>
          <input
            type="range"
            min={45}
            max={70}
            step={0.5}
            value={inp.winRate}
            onChange={(e) => set({ winRate: Number(e.target.value) })}
            aria-label="Win rate"
          />
          <p className="br__help">
            Break-even at {fmtOdds(inp.odds)} is <strong>{fmtPct(be, 1)}</strong>
          </p>
        </Field>

        <Field label="Average line" value={fmtOdds(inp.odds)}>
          <div className="br__row">
            <input
              className="br__num"
              inputMode="numeric"
              value={oddsText}
              onChange={(e) => {
                setOddsText(e.target.value);
                const v = Number(e.target.value.replace("−", "-"));
                if (Number.isFinite(v) && Math.abs(v) >= 100 && Math.abs(v) <= 2000) set({ odds: Math.round(v) });
              }}
              onBlur={() => setOddsText(String(inp.odds))}
              aria-label="Average line in American odds"
            />
            <div className="br__chips">
              {ODDS_PRESETS.map((o) => (
                <button
                  key={o}
                  className={inp.odds === o ? "br__chip is-on" : "br__chip"}
                  onClick={() => {
                    set({ odds: o });
                    setOddsText(String(o));
                  }}
                >
                  {fmtOdds(o)}
                </button>
              ))}
            </div>
          </div>
        </Field>

        <Field label="Number of bets" value={inp.bets.toLocaleString("en-US")}>
          <input
            type="range"
            min={10}
            max={1000}
            step={10}
            value={inp.bets}
            onChange={(e) => set({ bets: Number(e.target.value) })}
            aria-label="Number of bets"
          />
          <div className="br__chips">
            {BET_PRESETS.map((n) => (
              <button
                key={n}
                className={inp.bets === n ? "br__chip is-on" : "br__chip"}
                onClick={() => set({ bets: n })}
              >
                {n}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Starting bankroll" value={fmtMoney(inp.bankroll)}>
          <input
            className="br__num br__num--wide"
            type="number"
            min={100}
            step={100}
            value={inp.bankroll}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1) set({ bankroll: Math.round(v) });
            }}
            aria-label="Starting bankroll in dollars"
          />
        </Field>

        <Field label="Bet size" value={`${inp.unit}% · ${fmtMoney((inp.unit / 100) * inp.bankroll)}`}>
          <input
            type="range"
            min={0.5}
            max={30}
            step={0.5}
            value={inp.unit}
            onChange={(e) => set({ unit: Number(e.target.value) })}
            aria-label="Bet size as a percent of bankroll"
          />
          <div className="br__chips">
            {UNIT_PRESETS.map((u) => (
              <button
                key={u}
                className={inp.unit === u ? "br__chip is-on" : "br__chip"}
                onClick={() => set({ unit: u })}
              >
                {u}%
              </button>
            ))}
          </div>
        </Field>

        <Field label="Staking">
          <div className="br__seg" role="radiogroup" aria-label="Staking">
            <button
              role="radio"
              aria-checked={inp.sizing === "flat"}
              className={inp.sizing === "flat" ? "is-on" : ""}
              onClick={() => set({ sizing: "flat" })}
            >
              Flat units
            </button>
            <button
              role="radio"
              aria-checked={inp.sizing === "percent"}
              className={inp.sizing === "percent" ? "is-on" : ""}
              onClick={() => set({ sizing: "percent" })}
            >
              % of current bankroll
            </button>
          </div>
          <p className="br__help">
            {inp.sizing === "flat"
              ? "Same dollar bet every time, sized off your starting bankroll."
              : "Each bet is re-sized to your bankroll right now — smaller after losses, bigger after wins."}
          </p>
        </Field>
      </section>

      <div className="br__run">
        <button className="br__primary" onClick={runSeason}>
          {mySeason ? "Run another season" : "Simulate one season"}
        </button>
        <span className="br__run-hint">
          {mySeason
            ? "Every click is a brand-new season with the same edge."
            : `Play ${inp.bets} bets at your edge and see how this season would have gone.`}
        </span>
      </div>

      {mySeason && (
        <SeasonCard
          season={mySeason}
          inp={inp}
          rank={stale ? null : shareBelow(result.finals, mySeason.path.at(-1)!)}
        />
      )}

      <div className="br__edge">
        <span>
          Edge <strong className={p > be ? "is-win" : "is-loss"}>{fmtSigned0((p - be) * 100)} pts</strong>
        </span>
        <span>
          Expected return <strong className={ev > 0 ? "is-win" : "is-loss"}>{fmtPct(ev, 1)}</strong> per bet
        </span>
        <span>
          Full Kelly <strong>{k > 0 ? fmtPct(k, 1) : "—"}</strong> of bankroll
        </span>
      </div>

      <section className={stale ? "br__stats is-stale" : "br__stats"}>
        <Stat
          label="Finish the season ahead"
          value={fmtPct(exact.pProfit)}
          meta={`${fmtPct(exact.pLoss)} finish down`}
        />
        <Stat
          label="Go broke"
          value={fmtRisk(exact.pBust)}
          tone={exact.pBust >= 0.01 ? "loss" : undefined}
          meta={`${fmtPct(result.pHalf)} lose half the bankroll along the way`}
        />
        <Stat
          label="Expected profit"
          value={fmtSigned(result.mean - run.bankroll)}
          meta={`Median season ${fmtSigned(result.median - run.bankroll)}`}
        />
        <Stat
          label="Typical rough patch"
          value={`−${fmtPct(result.medianDrawdown)}`}
          meta={`Peak-to-trough · longest losing run ${result.medianLosingStreak}`}
        />
      </section>

      <Takeaway
        inp={run}
        pLoss={exact.pLoss}
        pBust={exact.pBust}
        mean={result.mean}
        median={result.median}
        kellyFrac={kelly(run.winRate / 100, run.odds)}
        sure={betsToBeSure(run.winRate / 100, run.odds)}
      />

      <section className="br__section">
        <div className="br__section-head">
          <h2 className="br__h2">How {run.bets.toLocaleString("en-US")}-bet seasons end</h2>
          <div className="br__legend">
            <span className="br__key br__key--up" /> Finished ahead
            <span className="br__key br__key--down" /> Finished down
            {mySeason && !stale && (
              <>
                <span className="br__key br__key--mark" /> Your season
              </>
            )}
          </div>
        </div>
        <p className="br__sub">
          Profit or loss at the end of each of {SEASONS.toLocaleString("en-US")} simulated seasons.
        </p>
        <OutcomeHistogram
          bins={bins}
          seasons={SEASONS}
          edge={edge}
          mean={result.mean - run.bankroll}
          mark={mySeason && !stale ? mySeason.path.at(-1)! - run.bankroll : undefined}
        />
      </section>

      <RiskTable inp={run} stale={stale} />

      <details className="br__how">
        <summary>How this works</summary>
        <dl>
          <dt>The simulation</dt>
          <dd>
            Every bet wins with your win-rate chance and pays at your average line. Pushes are left out. The chart and
            the expected-profit and rough-patch numbers come from {SEASONS.toLocaleString("en-US")} simulated seasons.
            The chances of finishing ahead and of going broke, including every cell in the table, are worked out
            exactly.
          </dd>
          <dt>Going broke</dt>
          <dd>
            With flat units, you're broke when you can't cover your next bet. With % staking you never quite hit $0, so
            we call it broke once you're under 1% of where you started.
          </dd>
          <dt>Kelly</dt>
          <dd>
            The Kelly criterion is the bet size that grows a bankroll fastest over the long run: your edge divided by
            the payout. Bet more than that and you take on more risk for <em>less</em> growth. Most pros bet a fraction
            of Kelly because their true win rate is never known exactly.
          </dd>
        </dl>
        <p className="br__disclaimer">For education and entertainment only. Not betting advice.</p>
      </details>
    </div>
  );
}

function fmtSigned0(n: number): string {
  const v = Math.abs(n).toFixed(1);
  return (n > 0.05 ? "+" : n < -0.05 ? "−" : "") + v;
}

function Field({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div className="br__field">
      <div className="br__field-head">
        <span className="eyebrow">{label}</span>
        {value && <span className="br__value">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, meta, tone }: { label: string; value: string; meta: string; tone?: "loss" }) {
  return (
    <div className="br__stat">
      <div className="eyebrow">{label}</div>
      <div className={tone === "loss" ? "br__big is-loss" : "br__big"}>{value}</div>
      <div className="br__meta">{meta}</div>
    </div>
  );
}

// ---------- One simulated season ----------

function SeasonCard({ season, inp, rank }: { season: Season; inp: Inputs; rank: number | null }) {
  const final = season.path.at(-1)!;
  const profit = final - inp.bankroll;
  const played = season.wins + season.losses;
  return (
    <section className="br__season" aria-label="Your simulated season">
      <div className="br__season-facts">
        <div>
          <div className="eyebrow">This season</div>
          <div className={`br__season-result ${profit > 0.5 ? "is-win" : profit < -0.5 ? "is-loss" : ""}`}>
            {fmtSigned(profit)}
          </div>
        </div>
        <span className="br__fact">
          Record{" "}
          <strong>
            {season.wins}–{season.losses}
          </strong>{" "}
          ({fmtPct(played ? season.wins / played : 0, 1)})
        </span>
        <span className="br__fact">
          Ended with <strong>{fmtMoney(final)}</strong>
        </span>
        <span className="br__fact">
          Worst drop <strong>−{fmtMoney(season.worstDrop)}</strong>
        </span>
        <span className="br__fact">
          Longest losing run <strong>{season.longestLosingRun}</strong>
        </span>
        {season.bustAt != null ? (
          <span className="br__fact">
            <strong className="is-loss">Went broke on bet {season.bustAt}</strong>
          </span>
        ) : (
          rank != null && (
            <span className="br__fact">
              Better than <strong>{fmtPct(rank)}</strong> of seasons
            </span>
          )
        )}
      </div>
      <SeasonLine path={season.path} bankroll={inp.bankroll} bustAt={season.bustAt} />
    </section>
  );
}

// ---------- Bet size × win rate ----------

function RiskTable({ inp, stale }: { inp: Inputs; stale: boolean }) {
  const [metric, setMetric] = useState<"bust" | "profit">("bust");
  const cols = useMemo(
    () => [...new Set(WIN_OFFSETS.map((d) => Math.min(75, Math.max(40, inp.winRate + d))))],
    [inp.winRate],
  );
  const rows = useMemo(() => [...new Set([...UNIT_PRESETS, inp.unit])].sort((a, b) => a - b), [inp.unit]);
  const grid = useMemo(() => rows.map((u) => cols.map((w) => exactOdds(staking(inp, w, u)))), [rows, cols, inp]);
  const safe = useMemo(() => {
    const { unit: _, ...rest } = staking(inp);
    return maxSafeUnit(rest, 0.01) * 100;
  }, [inp]);
  const be = breakEven(inp.odds);
  const k = kelly(inp.winRate / 100, inp.odds) * 100;
  const mine = grid[rows.indexOf(inp.unit)][cols.indexOf(inp.winRate)];

  return (
    <section className={stale ? "br__section is-stale" : "br__section"}>
      <div className="br__section-head">
        <h2 className="br__h2">Bet size vs. win rate</h2>
        <div className="br__seg" role="radiogroup" aria-label="Show">
          <button
            role="radio"
            aria-checked={metric === "bust"}
            className={metric === "bust" ? "is-on" : ""}
            onClick={() => setMetric("bust")}
          >
            Chance of going broke
          </button>
          <button
            role="radio"
            aria-checked={metric === "profit"}
            className={metric === "profit" ? "is-on" : ""}
            onClick={() => setMetric("profit")}
          >
            Chance of finishing ahead
          </button>
        </div>
      </div>
      <p className="br__sub">
        Over {inp.bets.toLocaleString("en-US")} bets at {fmtOdds(inp.odds)},{" "}
        {inp.sizing === "flat" ? "flat units" : "% of current bankroll"}. Your spot is outlined.
      </p>
      <div className="br__table-wrap">
        <table className="br__table">
          <thead>
            <tr>
              <th className="br__corner">Bet size</th>
              {cols.map((w) => {
                const edgePts = w - be * 100;
                return (
                  <th key={w} className={w === inp.winRate ? "is-you" : ""}>
                    {w}% win
                    <small>
                      {edgePts > 0.05 ? "+" : edgePts < -0.05 ? "−" : ""}
                      {Math.abs(edgePts).toFixed(1)} edge
                    </small>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <tr key={u}>
                <th className={u === inp.unit ? "is-you" : ""}>
                  {u}%<small>{fmtMoney((u / 100) * inp.bankroll)} a bet</small>
                </th>
                {cols.map((w, j) => {
                  const v = metric === "bust" ? grid[i][j].pBust : grid[i][j].pProfit;
                  const you = u === inp.unit && w === inp.winRate;
                  return (
                    <td
                      key={w}
                      className={you ? "br__cell is-you" : "br__cell"}
                      style={{ background: cellTint(metric, v) }}
                    >
                      {metric === "bust" ? fmtRisk(v) : fmtPct(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="br__table-note">
        <p>
          At <strong>{inp.winRate}%</strong> and <strong>{inp.unit}% a bet</strong>, you have a{" "}
          <strong>{fmtRisk(mine.pBust)}</strong> chance of going broke and a <strong>{fmtPct(mine.pProfit)}</strong>{" "}
          chance of finishing ahead.
        </p>
        {k > 0 ? (
          <p>
            {safe >= 30 ? (
              <>Even 30% a bet keeps your risk of going broke under 1% over this many bets.</>
            ) : safe > 0 ? (
              <>
                To keep the risk of going broke under 1% over {inp.bets.toLocaleString("en-US")} bets, bet no more than{" "}
                <strong>
                  {safe}% ({fmtMoney((safe / 100) * inp.bankroll)})
                </strong>
                .
              </>
            ) : (
              <>At this edge, even 0.5% a bet carries more than a 1% risk of going broke over this many bets.</>
            )}{" "}
            Full Kelly is {k.toFixed(1)}%; many pros bet half of that ({(k / 2).toFixed(1)}%) or less.
          </p>
        ) : (
          <p>
            With no edge at {inp.winRate}%, no bet size is safe — the only question is how fast the bankroll shrinks.
          </p>
        )}
      </div>
    </section>
  );
}

/** Red that deepens with risk of ruin, or green that deepens with the chance of finishing ahead. */
function cellTint(metric: "bust" | "profit", v: number): string {
  if (metric === "bust") {
    if (v < 0.0005) return "transparent";
    return `oklch(0.62 0.16 25 / ${(0.08 + 0.55 * Math.sqrt(v)).toFixed(3)})`;
  }
  return `oklch(0.6 0.12 150 / ${(0.04 + 0.5 * v * v).toFixed(3)})`;
}

function Takeaway({
  inp,
  pLoss,
  pBust,
  mean,
  median,
  kellyFrac,
  sure,
}: {
  inp: Inputs;
  pLoss: number;
  pBust: number;
  mean: number;
  median: number;
  kellyFrac: number;
  sure: number | null;
}) {
  const unit = inp.unit / 100;
  const lines: string[] = [];
  if (kellyFrac <= 0) {
    lines.push(
      `At ${fmtOdds(inp.odds)} you need to win ${fmtPct(breakEven(inp.odds), 1)} just to break even. At ${inp.winRate}% there's no edge, so the more you bet, the more surely you lose.`,
    );
  } else {
    const oneIn = pLoss > 0 ? Math.round(1 / pLoss) : 0;
    const mostlyBusts = pBust >= 0.01 && pBust >= pLoss * 0.6;
    lines.push(
      mostlyBusts
        ? `You have a real edge, yet ${fmtPct(pLoss)} of ${inp.bets}-bet seasons finish in the red — and most of those went broke. That's bet sizing, not bad picking.`
        : pLoss >= 0.02
          ? `You have a real edge, and still ${fmtPct(pLoss)} of ${inp.bets}-bet seasons finish in the red${oneIn >= 2 && oneIn <= 20 ? ` — about 1 in ${oneIn}` : ""}. That's variance, not bad picking.`
          : `Over ${inp.bets} bets your edge almost always shows through — only ${fmtPct(pLoss, 1)} of seasons finish down.`,
    );
    if (sure != null && sure > inp.bets)
      lines.push(
        `To be 95% sure of finishing ahead at this edge you'd need about ${sure.toLocaleString("en-US")} bets.`,
      );
    if (pBust >= 0.01)
      lines.push(
        `Betting ${inp.unit}% a bet, ${fmtRisk(pBust)} of seasons go broke before they're over. A winning bettor who's broke can't collect on the edge.`,
      );
    if (mean > inp.bankroll && median < inp.bankroll)
      lines.push(
        `The average season is up ${fmtSigned(mean - inp.bankroll)}, but that's carried by a few huge runs — the typical season finishes ${fmtSigned(median - inp.bankroll)}.`,
      );
    if (unit > kellyFrac * 1.02)
      lines.push(
        `${inp.unit}% is ${unit > 2 * kellyFrac ? "more than double" : "above"} full Kelly (${fmtPct(kellyFrac, 1)}). Past Kelly, bigger bets add risk and lower your long-run growth.`,
      );
    else if (pBust < 0.01 && unit <= kellyFrac / 2)
      lines.push(`At ${inp.unit}% a bet — half Kelly or less — a bad run hurts, but it won't end you.`);
  }
  return (
    <div className="br__takeaway">
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}
