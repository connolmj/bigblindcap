import { ACTION_LABEL, evDigits, explain, fmtEv, fmtPct } from "../engine/explain";
import { describe, evaluate } from "../engine/hand";
import type { Decision, RoundState } from "../engine/round";
import type { Action, Analysis } from "../engine/strategy";

interface Props {
  round: RoundState;
  onShowChart: () => void;
}

export default function Feedback({ round, onShowChart }: Props) {
  const d = round.decision;
  if (!d) {
    return (
      <div className="feedback feedback--neutral">
        <div className="feedback__head">
          <span className="feedback__title">Your move</span>
        </div>
        <p className="feedback__why">
          You have {describe(evaluate(round.player)).replace(/^\w/, (c) => c.toLowerCase())}. The dealer's cards are
          face down. Play or fold?
        </p>
      </div>
    );
  }
  return <DecisionCard decision={d} onShowChart={onShowChart} />;
}

function DecisionCard({ decision, onShowChart }: { decision: Decision; onShowChart: () => void }) {
  const a = decision.analysis;
  const { spot, why, math } = explain(a);
  return (
    <div className={decision.correct ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <div className="feedback__head">
        <span className="feedback__icon" aria-hidden="true">
          {decision.correct ? "✓" : "✕"}
        </span>
        <span className="feedback__title">
          {decision.correct ? (
            <>
              Correct — <ActionChip action={a.action} />
            </>
          ) : (
            <>
              You chose <ActionChip action={decision.chosen} muted /> · the play is <ActionChip action={a.action} />
            </>
          )}
        </span>
        <span className="feedback__spot">{spot}</span>
        <button className="linkish" onClick={onShowChart}>
          See it on the chart →
        </button>
      </div>
      <p className="feedback__why">{why}</p>
      <WhyMath analysis={a} math={math} />
    </div>
  );
}

/** The numbers behind the call: where the dealer's hands fall, and Play vs Fold side by side. */
function WhyMath({ analysis: a, math }: { analysis: Analysis; math: string }) {
  const segments = [
    { key: "fails", share: a.dealerFails, label: "Dealer doesn't qualify", pays: "+1" },
    { key: "win", share: a.win, label: "You win", pays: "+2" },
    { key: "tie", share: a.tie, label: "Tie", pays: "±0" },
    { key: "lose", share: a.lose, label: "Dealer wins", pays: "−2" },
  ].filter((s) => s.share > 0);

  // Both EVs drawn on one scale centred on zero: ±2 antes, wider for hands that earn a big ante bonus.
  const scale = Math.max(2, Math.ceil(Math.abs(a.playEv)));
  const x = (ev: number) => `${((ev + scale) / (2 * scale)) * 100}%`;

  return (
    <div className="tcp-why">
      <div className="tcp-why__block">
        <div className="eyebrow">If you play: the dealer's {(18424).toLocaleString("en-US")} possible hands</div>
        <div
          className="tcp-split"
          role="img"
          aria-label={segments.map((s) => `${s.label} ${fmtPct(s.share)}`).join(", ")}
        >
          {segments.map((s) => (
            <span key={s.key} className={`tcp-split__seg is-${s.key}`} style={{ flexGrow: s.share }} />
          ))}
        </div>
        <ul className="tcp-split__legend">
          {segments.map((s) => (
            <li key={s.key}>
              <span className={`tcp-split__dot is-${s.key}`} aria-hidden="true" />
              {s.label} <b>{fmtPct(s.share)}</b> <span className="tcp-split__pays">{s.pays}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="tcp-why__block">
        <div className="eyebrow">Average result per hand, in antes</div>
        <div className="tcp-ev">
          {(["play", "fold"] as const).map((act) => {
            const ev = act === "play" ? a.playEv : a.foldEv;
            const best = a.action === act;
            return (
              <div key={act} className={best ? "tcp-ev__row is-best" : "tcp-ev__row"}>
                <span className="tcp-ev__name">{ACTION_LABEL[act]}</span>
                <span className="tcp-ev__track">
                  <span className="tcp-ev__zero" />
                  <span
                    className="tcp-ev__bar"
                    style={ev < 0 ? { left: x(ev), right: "50%" } : { left: "50%", right: `calc(100% - ${x(ev)})` }}
                  />
                </span>
                <span className="tcp-ev__num">{fmtEv(ev, evDigits(a))}</span>
              </div>
            );
          })}
        </div>
        <p className="tcp-why__math">{math}</p>
      </div>
    </div>
  );
}

export function ActionChip({ action, muted }: { action: Action; muted?: boolean }) {
  return <span className={`chip chip--${action}${muted ? " is-muted" : ""}`}>{ACTION_LABEL[action]}</span>;
}
