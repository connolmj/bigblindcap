import { useDeferredValue, useMemo, useState } from "react";
import { binProfits } from "../model/bins";
import { breakEven, flatEdge, kelly, payout, roi, simulate, type Sizing } from "../model/sim";
import { BankrollPaths, OutcomeHistogram } from "./Charts";
import { fmtMoney, fmtOdds, fmtPct, fmtSigned } from "./format";
import "./bankroll.css";

const SEASONS = 10000;
const ODDS_PRESETS = [-120, -110, -105, 100, 150];
const BET_PRESETS = [50, 100, 250, 500, 1000];
const UNIT_PRESETS = [1, 2, 5, 10, 25];

interface Inputs {
  winRate: number; // percent
  odds: number;
  bets: number;
  bankroll: number;
  unit: number; // percent of bankroll
  sizing: Sizing;
  seed: number;
}

/** Roughly how many flat bets before you're 95% sure to be ahead (normal approximation). */
function betsToBeSure(p: number, odds: number): number | null {
  const b = payout(odds);
  const mu = p * b - (1 - p);
  if (mu <= 0) return null;
  const sd = Math.sqrt(p * (1 - p)) * (1 + b);
  return Math.ceil(Math.pow((1.645 * sd) / mu, 2));
}

export default function BankrollTool() {
  const [inp, setInp] = useState<Inputs>({
    winRate: 56,
    odds: -110,
    bets: 100,
    bankroll: 1000,
    unit: 2,
    sizing: "flat",
    seed: 1,
  });
  const [oddsText, setOddsText] = useState("-110");
  const set = (patch: Partial<Inputs>) => setInp((s) => ({ ...s, ...patch }));
  const run = useDeferredValue(inp);

  const result = useMemo(
    () =>
      simulate({
        winRate: run.winRate / 100,
        odds: run.odds,
        bets: run.bets,
        bankroll: run.bankroll,
        unit: run.unit / 100,
        sizing: run.sizing,
        seasons: SEASONS,
        seed: run.seed,
      }),
    [run],
  );

  const stake = (run.unit / 100) * run.bankroll;
  const { edge, lattice } =
    run.sizing === "flat" ? flatEdge(run.odds, run.bets, stake) : { edge: 0, lattice: undefined };
  const bins = useMemo(
    () =>
      binProfits(
        result.finals.map((f) => f - run.bankroll),
        { edge, lattice },
      ),
    [result, run.bankroll, run.sizing, edge, lattice],
  );

  const p = inp.winRate / 100;
  const be = breakEven(inp.odds);
  const ev = roi(p, inp.odds);
  const k = kelly(p, inp.odds);
  const sure = betsToBeSure(p, inp.odds);
  const stale = run !== inp;

  return (
    <div className="br">
      <header className="br__intro">
        <div className="eyebrow">Tools · Bankroll</div>
        <h1 className="br__title">Edge vs. Variance</h1>
        <p className="br__lede">
          A winning bettor can still lose a season. Set your win rate, price, number of bets and bet size, and we'll
          play out {SEASONS.toLocaleString("en-US")} seasons to show every way yours could end — including broke.
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
          value={fmtPct(result.pProfit)}
          meta={`${fmtPct(result.pLoss)} finish down`}
        />
        <Stat
          label="Go broke"
          value={fmtPct(result.pBust, result.pBust > 0 && result.pBust < 0.1 ? 1 : 0)}
          tone={result.pBust >= 0.01 ? "loss" : undefined}
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
        pLoss={result.pLoss}
        pBust={result.pBust}
        mean={result.mean}
        median={result.median}
        kellyFrac={kelly(run.winRate / 100, run.odds)}
        sure={sure}
      />

      <section className="br__section">
        <div className="br__section-head">
          <h2 className="br__h2">How {run.bets.toLocaleString("en-US")}-bet seasons end</h2>
          <div className="br__legend">
            <span className="br__key br__key--up" /> Finished ahead
            <span className="br__key br__key--down" /> Finished down
          </div>
        </div>
        <p className="br__sub">
          Profit or loss at the end of each of {SEASONS.toLocaleString("en-US")} simulated seasons.
        </p>
        <OutcomeHistogram bins={bins} seasons={SEASONS} edge={edge} mean={result.mean - run.bankroll} />
      </section>

      <section className="br__section">
        <div className="br__section-head">
          <h2 className="br__h2">Your bankroll, bet by bet</h2>
          <button className="br__btn" onClick={() => set({ seed: inp.seed + 1 })}>
            Deal new seasons
          </button>
        </div>
        <div className="br__legend">
          <span className="br__key br__key--line" /> Median
          <span className="br__key br__key--inner" /> Middle 50%
          <span className="br__key br__key--outer" /> Middle 90%
          <span className="br__key br__key--path" /> {result.samples.length} sample seasons (red ended down)
        </div>
        <BankrollPaths result={result} bets={run.bets} bankroll={run.bankroll} />
      </section>

      <details className="br__how">
        <summary>How this works</summary>
        <dl>
          <dt>The simulation</dt>
          <dd>
            Every bet wins with your win-rate chance and pays at your average line. Pushes are left out. We play{" "}
            {SEASONS.toLocaleString("en-US")} seasons with the same inputs; press <em>Deal new seasons</em> to reshuffle
            them.
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
        `Betting ${inp.unit}% a bet, ${fmtPct(pBust, pBust < 0.1 ? 1 : 0)} of seasons go broke before they're over. A winning bettor who's broke can't collect on the edge.`,
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
