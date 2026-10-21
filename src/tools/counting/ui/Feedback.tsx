import type { ReactNode } from "react";
import { ActionChip } from "../../blackjack/ui/Feedback";
import { ACTION_LABEL, spotLabel } from "../../blackjack/engine/explain";
import { edgeAt } from "../engine/betting";
import { whyBet, whyCount, whyPlay } from "../engine/explain";
import { PlayingCardMini } from "./PlayingCardMini";
import { fmtCount, hiLo } from "../engine/hilo";
import type { Decision, Session } from "../engine/session";

interface Props {
  session: Session;
  onShowChart: () => void;
}

export default function Feedback({ session, onShowChart }: Props) {
  const last = session.decisions[session.decisions.length - 1];
  if (!last) return <Prompt session={session} />;
  const earlier = session.decisions.slice(0, -1);
  return (
    <div>
      {last.kind === "count" && <CountCard d={last} />}
      {last.kind === "bet" && <BetCard d={last} />}
      {last.kind === "play" && <PlayCard d={last} onShowChart={onShowChart} />}
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

function Prompt({ session }: { session: Session }) {
  const text =
    session.phase === "count"
      ? "Add up every card you saw last hand (2–6 are +1, 10s and Aces are −1) on top of the count going in."
      : session.shuffled
        ? "Fresh shoe: the count is 0, so the house has the edge. Bet the minimum, then start counting every card you see."
        : session.phase === "bet"
          ? "Divide the running count by the decks left to get the true count, and bet from the ramp."
          : "Keep counting as the cards come out, and play the hand.";
  return (
    <div className="feedback feedback--neutral">
      <div className="feedback__head">
        <span className="feedback__title">
          {session.phase === "count" ? "Count check" : session.phase === "bet" ? "Your bet" : "Your move"}
        </span>
      </div>
      <p className="feedback__why">{text}</p>
    </div>
  );
}

function Head({ correct, title, spot }: { correct: boolean; title: ReactNode; spot: string }) {
  return (
    <div className="feedback__head">
      <span className="feedback__icon" aria-hidden="true">
        {correct ? "✓" : "✕"}
      </span>
      <span className="feedback__title">{title}</span>
      <span className="feedback__spot">{spot}</span>
    </div>
  );
}

function CountCard({ d }: { d: Extract<Decision, { kind: "count" }> }) {
  const off = d.answer - d.actual;
  return (
    <div className={d.correct ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <Head
        correct={d.correct}
        spot="Running count"
        title={
          d.correct ? (
            <>Right on — {fmtCount(d.actual)}</>
          ) : (
            <>
              You said {fmtCount(d.answer)} · it's {fmtCount(d.actual)} ({Math.abs(off)}{" "}
              {off > 0 ? "too high" : "too low"})
            </>
          )
        }
      />
      <p className="feedback__why">{whyCount(d)}</p>
      {d.lastHand.length > 0 && (
        <div className="cc-tags" aria-label="Last hand's cards and their count">
          {d.lastHand.map((card) => (
            <span key={card.id} className="cc-tag">
              <PlayingCardMini card={card} />
              <span className={`cc-tag__n cc-tag__n--${hiLo(card) > 0 ? "up" : hiLo(card) < 0 ? "down" : "zero"}`}>
                {fmtCount(hiLo(card))}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function BetCard({ d }: { d: Extract<Decision, { kind: "bet" }> }) {
  const edge = edgeAt(d.tc);
  return (
    <div className={d.correct ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <Head
        correct={d.correct}
        spot={`True count ${fmtCount(d.tc)} · edge ${edge > 0 ? "+" : edge < 0 ? "−" : ""}${Math.abs(edge).toFixed(1)}%`}
        title={
          d.correct ? (
            <>Right bet — {d.right}u</>
          ) : (
            <>
              You bet <span className="chip is-muted">{d.chosen}u</span> · the ramp says{" "}
              <span className="chip">{d.right}u</span>
            </>
          )
        }
      />
      <p className="feedback__why">{whyBet(d)}</p>
    </div>
  );
}

function PlayCard({ d, onShowChart }: { d: Extract<Decision, { kind: "play" }>; onShowChart: () => void }) {
  const right = d.advice.rec.action;
  const spot = `${spotLabel(d.advice.rec)} · TC ${fmtCount(d.tc)}`;
  return (
    <div className={d.correct ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <div className="feedback__head">
        <span className="feedback__icon" aria-hidden="true">
          {d.correct ? "✓" : "✕"}
        </span>
        <span className="feedback__title">
          {d.correct ? (
            <>
              Correct — <ActionChip action={right} />
            </>
          ) : (
            <>
              You chose <ActionChip action={d.chosen} muted /> · the play is <ActionChip action={right} />
            </>
          )}
          {d.advice.deviates && <span className="cc-badge">Count play</span>}
        </span>
        <span className="feedback__spot">{spot}</span>
        {d.advice.deviation && (
          <button className="linkish" onClick={onShowChart}>
            See the count plays →
          </button>
        )}
      </div>
      <p className="feedback__why">{whyPlay(d)}</p>
    </div>
  );
}

function RecapRow({ d }: { d: Decision }) {
  let spot: string;
  let text: string;
  if (d.kind === "count") {
    spot = "Running count";
    text = d.correct ? fmtCount(d.actual) : `${fmtCount(d.answer)} → ${fmtCount(d.actual)}`;
  } else if (d.kind === "bet") {
    spot = `Bet at TC ${fmtCount(d.tc)}`;
    text = d.correct ? `${d.right}u` : `${d.chosen}u → ${d.right}u`;
  } else {
    spot = spotLabel(d.advice.rec);
    text = `${ACTION_LABEL[d.chosen]}${d.correct ? "" : ` → ${ACTION_LABEL[d.advice.rec.action]}`}`;
  }
  return (
    <li className={d.correct ? "recap__row is-right" : "recap__row is-wrong"}>
      <span aria-hidden="true">{d.correct ? "✓" : "✕"}</span>
      <span className="recap__spot">{spot}</span>
      <span>{text}</span>
    </li>
  );
}
