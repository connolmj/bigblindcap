import type { ReactNode } from "react";
import { BANKER_HINT, DRAW_LABEL, pct, spotLabel, whyBet, whyDraw } from "../engine/explain";
import { BET_LABEL, BETS, betReturn, type Bet, type Commission } from "../engine/payouts";
import type { Decision, RoundState } from "../engine/round";
import type { DrawAction } from "../engine/rules";

interface Props {
  round: RoundState;
  onShowChart: () => void;
}

export default function Feedback({ round, onShowChart }: Props) {
  const last = round.decisions[round.decisions.length - 1];
  if (!last) {
    return (
      <div className="feedback feedback--neutral">
        <div className="feedback__head">
          <span className="feedback__title">Your bet</span>
        </div>
        <p className="feedback__why">
          Player, Banker or Tie? Pick the bet with the smallest house edge — then call each third card as the dealer
          would.
        </p>
      </div>
    );
  }
  const earlier = round.decisions.slice(0, -1);
  return (
    <div>
      {last.kind === "bet" ? <BetCard d={last} /> : <DrawCard d={last} onShowChart={onShowChart} />}
      {earlier.length > 0 && (
        <ol className="recap" aria-label="Earlier calls this hand">
          {earlier.map((d, i) => (
            <RecapRow key={i} d={d} />
          ))}
        </ol>
      )}
    </div>
  );
}

function Head({
  correct,
  children,
  spot,
  action,
}: {
  correct: boolean;
  children: ReactNode;
  spot: string;
  action?: ReactNode;
}) {
  return (
    <div className="feedback__head">
      <span className="feedback__icon" aria-hidden="true">
        {correct ? "✓" : "✕"}
      </span>
      <span className="feedback__title">{children}</span>
      <span className="feedback__spot">{spot}</span>
      {action}
    </div>
  );
}

function BetCard({ d }: { d: Extract<Decision, { kind: "bet" }> }) {
  return (
    <div className={d.correct ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <Head correct={d.correct} spot={d.commission === "standard" ? "5% commission table" : "No-commission table"}>
        {d.correct ? (
          <>
            Best bet — <BetChip bet={d.best} />
          </>
        ) : (
          <>
            You bet <BetChip bet={d.chosen} muted /> · the best bet is <BetChip bet={d.best} />
          </>
        )}
      </Head>
      <p className="feedback__why">{whyBet(d.chosen, d.best, d.commission)}</p>
      <EdgeBars commission={d.commission} chosen={d.chosen} best={d.best} />
    </div>
  );
}

/** Each bet's average loss per unit, on one scale. */
function EdgeBars({ commission, chosen, best }: { commission: Commission; chosen: Bet; best: Bet }) {
  const edges = BETS.map((b) => ({ bet: b, edge: -betReturn(b, commission) }));
  const max = Math.max(...edges.map((e) => e.edge));
  return (
    <div className="bac-edges">
      <div className="eyebrow">House edge — what each bet loses on average, per unit</div>
      {edges.map(({ bet, edge }) => (
        <div
          key={bet}
          className={`bac-edges__row${bet === best ? " is-best" : ""}${bet === chosen ? " is-chosen" : ""}`}
        >
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

function DrawCard({ d, onShowChart }: { d: Extract<Decision, { kind: "draw" }>; onShowChart: () => void }) {
  const who = d.spot.side === "banker" ? "Banker" : "Player";
  return (
    <div className={d.correct ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <Head
        correct={d.correct}
        spot={spotLabel(d.spot)}
        action={
          <button className="linkish" onClick={onShowChart}>
            See it on the chart →
          </button>
        }
      >
        {d.correct ? (
          <>
            Correct — {who} <DrawChip action={d.right} />
          </>
        ) : (
          <>
            You said <DrawChip action={d.chosen} muted /> · the {who} <DrawChip action={d.right} />
          </>
        )}
      </Head>
      <p className="feedback__why">{whyDraw(d.spot, d.right)}</p>
      {d.spot.side === "banker" && d.spot.playerThird !== null && d.spot.total >= 3 && d.spot.total <= 6 && (
        <p className="bac-hint">
          <span className="eyebrow">Remember it</span> {BANKER_HINT}
        </p>
      )}
    </div>
  );
}

function RecapRow({ d }: { d: Decision }) {
  const text =
    d.kind === "bet"
      ? `Bet ${BET_LABEL[d.chosen]}${d.correct ? "" : ` → ${BET_LABEL[d.best]}`}`
      : `${DRAW_LABEL[d.chosen]}${d.correct ? "" : ` → ${DRAW_LABEL[d.right]}`}`;
  return (
    <li className={d.correct ? "recap__row is-right" : "recap__row is-wrong"}>
      <span aria-hidden="true">{d.correct ? "✓" : "✕"}</span>
      <span className="recap__spot">{d.kind === "bet" ? "Your bet" : spotLabel(d.spot)}</span>
      <span>{text}</span>
    </li>
  );
}

function BetChip({ bet, muted }: { bet: Bet; muted?: boolean }) {
  return <span className={`chip chip--${bet}${muted ? " is-muted" : ""}`}>{BET_LABEL[bet]}</span>;
}

function DrawChip({ action, muted }: { action: DrawAction; muted?: boolean }) {
  return (
    <span className={`chip chip--${action === "draw" ? "hit" : "stand"}${muted ? " is-muted" : ""}`}>
      {action === "draw" ? "draws" : "stands"}
    </span>
  );
}
