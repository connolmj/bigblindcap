import { cardValue } from "../engine/cards";
import { ACTION_LABEL, explain } from "../engine/explain";
import { handTotal } from "../engine/hand";
import type { Decision, RoundState } from "../engine/round";
import type { Recommendation } from "../engine/strategy";

interface Props {
  round: RoundState;
  onShowChart: (rec: Recommendation) => void;
}

export default function Feedback({ round, onShowChart }: Props) {
  const last = round.decisions[round.decisions.length - 1];

  if (!last) {
    if (round.phase === "settled") {
      return (
        <div className="feedback feedback--neutral">
          <p className="feedback__why">No decision this time — deal the next hand.</p>
        </div>
      );
    }
    const hand = round.hands[0];
    const { total, soft } = handTotal(hand.cards);
    const up = round.dealer[0];
    return (
      <div className="feedback feedback--neutral">
        <div className="feedback__head">
          <span className="feedback__title">Your move</span>
        </div>
        <p className="feedback__why">
          You have {soft ? "soft " : ""}
          {total} against the dealer's {up.rank === "A" ? "Ace" : cardValue(up)}. What does basic strategy say?
        </p>
      </div>
    );
  }

  const earlier = round.decisions.slice(0, -1);
  return (
    <div>
      <DecisionCard decision={last} onShowChart={onShowChart} />
      {round.phase === "settled" && earlier.length > 0 && (
        <ol className="recap" aria-label="Earlier decisions this hand">
          {earlier.map((d, i) => (
            <RecapRow key={i} decision={d} />
          ))}
        </ol>
      )}
    </div>
  );
}

function DecisionCard({ decision, onShowChart }: { decision: Decision; onShowChart: Props["onShowChart"] }) {
  const { spot, why } = explain(decision.recommendation, handTotal(decision.cards).total);
  const right = decision.recommendation.action;
  return (
    <div className={decision.correct ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <div className="feedback__head">
        <span className="feedback__icon" aria-hidden="true">
          {decision.correct ? "✓" : "✕"}
        </span>
        <span className="feedback__title">
          {decision.correct ? (
            <>
              Correct — <ActionChip action={right} />
            </>
          ) : (
            <>
              You chose <ActionChip action={decision.chosen} muted /> · the play is <ActionChip action={right} />
            </>
          )}
        </span>
        <span className="feedback__spot">{spot}</span>
      </div>
      <p className="feedback__why">{why}</p>
      <button className="linkish" onClick={() => onShowChart(decision.recommendation)}>
        See it on the chart →
      </button>
    </div>
  );
}

function RecapRow({ decision }: { decision: Decision }) {
  const { spot } = explain(decision.recommendation, handTotal(decision.cards).total);
  return (
    <li className={decision.correct ? "recap__row is-right" : "recap__row is-wrong"}>
      <span aria-hidden="true">{decision.correct ? "✓" : "✕"}</span>
      <span className="recap__spot">{spot}</span>
      <span>
        {ACTION_LABEL[decision.chosen]}
        {!decision.correct && ` → ${ACTION_LABEL[decision.recommendation.action]}`}
      </span>
    </li>
  );
}

export function ActionChip({ action, muted }: { action: Recommendation["action"]; muted?: boolean }) {
  return <span className={`chip chip--${action}${muted ? " is-muted" : ""}`}>{ACTION_LABEL[action]}</span>;
}
