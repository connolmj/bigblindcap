import { BANKER_HINT, betNote, pct, stepText } from "../engine/explain";
import { BET_LABEL, BETS, betReturn, type Bet, type Commission } from "../engine/payouts";
import type { RoundState, Step } from "../engine/round";

interface Props {
  round: RoundState;
  onShowChart: () => void;
}

/** No grading in baccarat — just what your bet is, and how the hand played out by the rules. */
export default function Feedback({ round, onShowChart }: Props) {
  if (round.phase === "bet" || !round.bet) {
    return (
      <div className="feedback feedback--neutral">
        <div className="feedback__head">
          <span className="feedback__title">Your bet</span>
        </div>
        <p className="feedback__why">
          Player, Banker or Tie? That's the only choice you make. After you bet, the table plays the hand by the drawing
          rules and shows you each one.
        </p>
      </div>
    );
  }

  return (
    <div className="feedback feedback--neutral bac-story" aria-live="polite">
      <div className="feedback__head">
        <span className="feedback__title">
          Your bet: <span className={`chip chip--${round.bet}`}>{BET_LABEL[round.bet]}</span>
        </span>
        <span className="feedback__spot">
          {round.commission === "standard" ? "5% commission table" : "No-commission table"}
        </span>
        <button className="linkish" onClick={onShowChart}>
          Drawing rules →
        </button>
      </div>
      <p className="feedback__why">{betNote(round.bet, round.commission)}</p>
      <EdgeBars commission={round.commission} chosen={round.bet} />

      <ol className="bac-steps" aria-label="How the hand played">
        {round.steps.map((s, i) => (
          <StepRow key={i} step={s} />
        ))}
        {round.phase !== "settled" && (
          <li className="bac-steps__row is-pending">
            {round.phase === "playerDraw"
              ? "Next: the Player's third-card rule…"
              : "Next: the Banker's third-card rule…"}
          </li>
        )}
      </ol>
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  const { title, why } = stepText(step);
  const side = step.kind === "natural" ? (step.side === "banker" ? "banker" : "player") : step.spot.side;
  const showHint =
    step.kind === "draw" && step.spot.side === "banker" && step.spot.playerThird !== null && step.spot.total >= 3;
  return (
    // A natural is known on the deal; hold its line until the four cards have landed, with the result.
    <li className={`bac-steps__row bac-steps__row--${side}${step.kind === "natural" ? " is-late" : ""}`}>
      <span className="bac-steps__title">{title}</span>
      <span className="bac-steps__why">
        {why}
        {showHint && step.spot.total <= 6 && <span className="bac-steps__hint"> {BANKER_HINT}.</span>}
      </span>
    </li>
  );
}

/** Each bet's average loss per unit, on one scale. */
function EdgeBars({ commission, chosen }: { commission: Commission; chosen: Bet }) {
  const edges = BETS.map((b) => ({ bet: b, edge: -betReturn(b, commission) }));
  const max = Math.max(...edges.map((e) => e.edge));
  return (
    <div className="bac-edges">
      <div className="eyebrow">House edge — what each bet loses on average, per unit</div>
      {edges.map(({ bet, edge }) => (
        <div key={bet} className={`bac-edges__row${bet === chosen ? " is-chosen" : ""}`}>
          <span className="bac-edges__name">{BET_LABEL[bet]}</span>
          <span className="bac-edges__track">
            <span className={`bac-edges__bar bac-edges__bar--${bet}`} style={{ width: `${(edge / max) * 100}%` }} />
          </span>
          <span className="bac-edges__num">{pct(edge)}</span>
        </div>
      ))}
    </div>
  );
}
