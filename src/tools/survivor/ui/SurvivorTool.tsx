import { useState } from "react";
import SurvivorTable from "./SurvivorTable";
import { useSurvivor, useSurvivorData } from "./useSurvivor";
import type { SurvivorData } from "../model/types";
import "./survivor.css";

export default function SurvivorTool() {
  const { data, error } = useSurvivorData();
  return (
    <div className="sv">
      <header className="sv__intro">
        <div className="eyebrow">Tools · NFL</div>
        <h1 className="sv__title">Survivor Grid</h1>
        <p className="sv__lede">
          Plan your survivor pool season. See each week's favourites, how popular they'll be, and which teams are worth
          saving — then click to lock in picks. Your picks stay in this browser.
        </p>
        <p className="sv__rules">One pick a week · A tie is a loss · Each team once</p>
      </header>
      {error && <p className="sv__notice">Couldn't load this week's numbers. Please refresh in a minute.</p>}
      {!data && !error && <p className="sv__notice">Loading the schedule…</p>}
      {data && <Loaded data={data} />}
    </div>
  );
}

function Loaded({ data }: { data: SurvivorData }) {
  const s = useSurvivor(data);
  const [week, setWeek] = useState(s.current);
  const [showPlan, setShowPlan] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const picked = Object.keys(s.picks).length;
  const updated = new Date(data.updated).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <>
      <div className="sv__status">
        <span>
          <strong>{data.season}</strong> season · Week {s.current}
        </span>
        <span>
          Sportsbook lines through week {data.lastMarketWeek}, projected after · Updated {updated}
        </span>
      </div>

      <section className="sv__summary">
        <div className="sv__stat">
          <div className="eyebrow">Weeks picked</div>
          <div className="sv__big">{picked}</div>
          <div className="sv__meta">of 18</div>
        </div>
        <div className="sv__stat">
          <div className="eyebrow">Odds to survive week {s.current}–18</div>
          <div className="sv__big">
            {s.survival > 0 ? (s.survival < 0.001 ? "<0.1%" : (s.survival * 100).toFixed(1) + "%") : "—"}
          </div>
          <div className="sv__meta">Your picks + the suggested plan</div>
        </div>
        <div className="sv__actions">
          <button
            className={showPlan ? "sv__btn is-on" : "sv__btn"}
            onClick={() => setShowPlan((v) => !v)}
            aria-pressed={showPlan}
          >
            {showPlan ? "Hide suggested plan" : "Show suggested plan"}
          </button>
          {confirmReset ? (
            <span className="sv__confirm">
              Clear all picks?
              <button
                className="sv__btn sv__btn--danger"
                onClick={() => {
                  s.reset();
                  setConfirmReset(false);
                }}
              >
                Clear
              </button>
              <button className="sv__btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </span>
          ) : (
            <button className="sv__btn" onClick={() => setConfirmReset(true)} disabled={!picked}>
              Reset my picks
            </button>
          )}
        </div>
      </section>

      <section className="sv__section">
        <div className="sv__section-head">
          <h2 className="sv__h2">Week {week}</h2>
          <div className="sv__weeknav">
            <button onClick={() => setWeek((w) => Math.max(1, w - 1))} disabled={week <= 1} aria-label="Previous week">
              ←
            </button>
            <select value={week} onChange={(e) => setWeek(Number(e.target.value))} aria-label="Week">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                <option key={w} value={w}>
                  Week {w}
                  {w === s.current ? " (this week)" : ""}
                </option>
              ))}
            </select>
            <button onClick={() => setWeek((w) => Math.min(18, w + 1))} disabled={week >= 18} aria-label="Next week">
              →
            </button>
          </div>
        </div>
        {showPlan && s.plan.picks[week] && !s.picks[week] && (
          <p className="sv__hint">
            Suggested for week {week}: <strong>{s.plan.picks[week]}</strong> — the pick that gives your whole season the
            best odds. Click any cell to pick a team; it's crossed out for the rest of the season.
          </p>
        )}
        <SurvivorTable s={s} week={week} onWeek={setWeek} showPlan={showPlan} />
      </section>

      <details className="sv__how">
        <summary>How the numbers work</summary>
        <dl>
          <dt>Spread & win %</dt>
          <dd>
            Real sportsbook lines where they're posted (usually this week and next), from the free{" "}
            <a className="underlined" href="https://github.com/nflverse/nfldata" target="_blank" rel="noopener">
              nflverse
            </a>{" "}
            data. Win % comes from the moneyline with the bookmaker's margin removed. Checked against ~3,000 past games,
            it's well calibrated.
          </dd>
          <dt>Projected weeks</dt>
          <dd>
            Later weeks have no lines yet, so we project them from team power ratings built from every line posted this
            season (recent weeks count most), starting from last season's. Backtested, projections land about 4.7 points
            from the line the market eventually sets — treat far-off weeks as a rough guide. Refreshed several times a
            week.
          </dd>
          <dt>Pick %</dt>
          <dd>
            An estimate — there's no free feed of real survivor picks. The public piles onto the biggest favourites, so
            popularity rises steeply with win %. A popular pick that loses knocks out lots of your rivals; an unpopular
            one that loses mostly knocks out you.
          </dd>
          <dt>Future value & the suggested plan</dt>
          <dd>
            The plan finds the one-team-per-week path with the best odds of surviving every remaining week. Future value
            is how much worse that path gets if you use a team now, scored 0–100 for the week you're viewing: 100 is the
            team most worth saving, 0 means saving it doesn't help. Hover a score to see the actual boost to your odds.
          </dd>
        </dl>
        <p className="sv__disclaimer">For entertainment and planning only. Not betting advice.</p>
      </details>
    </>
  );
}
