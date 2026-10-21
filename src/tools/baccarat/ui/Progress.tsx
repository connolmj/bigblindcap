import { fmtNet } from "../../blackjack/ui/HandView";
import { pct } from "../engine/explain";
import { BET_LABEL, BETS, exactOdds, type Winner } from "../engine/payouts";
import { HISTORY, type Stats } from "./stats";

const ROWS = 6;
const LETTER: Record<Winner, string> = { banker: "B", player: "P", tie: "T" };

/** How the hands have gone: who won against the long-run odds, your bets, and the scoreboard. */
export default function Progress({ stats }: { stats: Stats }) {
  if (stats.hands === 0) return null;
  const o = exactOdds();
  const expected: Record<Winner, number> = { banker: o.banker, player: o.player, tie: o.tie };

  return (
    <>
      <section className="progress">
        <div className="progress__col">
          <h3 className="eyebrow">Who won · vs the long run</h3>
          {BETS.map((w) => {
            const share = stats.wins[w] / stats.hands;
            return (
              <div key={w} className="progress__row bac-progress__row">
                <span className="progress__label">{BET_LABEL[w]}</span>
                <span className="progress__bar bac-results__bar" aria-hidden="true">
                  <span className={`bac-results__fill bac-results__fill--${w}`} style={{ width: `${share * 100}%` }} />
                  <span className="bac-results__mark" style={{ left: `${expected[w] * 100}%` }} />
                </span>
                <span className="progress__pct">{pct(share, 0)}</span>
              </div>
            );
          })}
          <p className="progress__empty">
            The tick marks the long-run share: {pct(o.banker, 1)} · {pct(o.player, 1)} · {pct(o.tie, 1)}.
          </p>
        </div>
        <div className="progress__col">
          <h3 className="eyebrow">Your bets</h3>
          <ol className="progress__misses">
            {BETS.filter((b) => stats.byBet[b].n > 0).map((b) => {
              const { n, net } = stats.byBet[b];
              return (
                <li key={b}>
                  <span>
                    {BET_LABEL[b]} · {n} {n === 1 ? "hand" : "hands"}
                  </span>
                  <span className={net > 0 ? "is-win" : net < 0 ? "is-loss" : ""}>
                    {fmtNet(Math.round(net * 100) / 100)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
      <Scoreboard history={stats.history} />
    </>
  );
}

/** The bead plate casinos light up: one dot per hand, top to bottom, then the next column. */
function Scoreboard({ history }: { history: Winner[] }) {
  const cols = Math.ceil(HISTORY / ROWS);
  return (
    <section className="bac-board">
      <h3 className="eyebrow">Scoreboard · last {HISTORY} hands</h3>
      <div
        className="bac-board__grid"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        role="img"
        aria-label={`Last ${history.length} results: ${history.map((w) => LETTER[w]).join(" ")}`}
      >
        {Array.from({ length: cols * ROWS }, (_, i) => {
          const w = history[i];
          return (
            <span key={i} className={w ? `bac-board__dot bac-board__dot--${w}` : "bac-board__dot"}>
              {w ? LETTER[w] : ""}
            </span>
          );
        })}
      </div>
      <p className="progress__empty">For fun, like the boards in a casino. Past hands don't predict the next one.</p>
    </section>
  );
}
