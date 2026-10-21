import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Action } from "../../blackjack/engine/strategy";
import BlackjackActions from "../../blackjack/ui/ActionBar";
import { BET_OPTIONS } from "../engine/betting";
import { fmtCount } from "../engine/hilo";
import type { Session } from "../engine/session";

interface Props {
  session: Session;
  legal: Record<Action, boolean>;
  onCount: (answer: number) => void;
  onBet: (units: number) => void;
  onAct: (action: Action) => void;
  onNext: () => void;
}

export default function ActionBar({ session, legal, onCount, onBet, onAct, onNext }: Props) {
  if (session.phase === "count") return <CountForm key={session.hands} onCount={onCount} />;

  if (session.phase === "bet") {
    return (
      <div className="cc-ask">
        <p className="cc-ask__q">How much do you bet?</p>
        <div className="actions cc-bets" role="group" aria-label="Your bet">
          {BET_OPTIONS.map((units) => (
            <button
              key={units}
              className="actions__btn cc-bet"
              onClick={() => onBet(units)}
              aria-keyshortcuts={String(units)}
            >
              <span className="actions__label">{units}u</span>
              <span className="kbd actions__kbd">{units}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <BlackjackActions phase={session.round!.phase} legal={legal} onAct={onAct} onNext={onNext} />;
}

/** Type the running count, or step it with − / +. Enter checks it. */
function CountForm({ onCount }: { onCount: (answer: number) => void }) {
  // Kept as text so you can type a minus sign first.
  const [text, setText] = useState("0");
  const value = parseCount(text);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus({ preventScroll: true }), []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onCount(value);
  };
  const step = (by: number) => setText(String(value + by));

  return (
    <form className="cc-ask" onSubmit={submit}>
      <label className="cc-ask__q" htmlFor="cc-count">
        What's the running count?
      </label>
      <div className="cc-count-form">
        <button type="button" className="cc-step" onClick={() => step(-1)} aria-label="Count down one">
          −
        </button>
        <input
          ref={input}
          id="cc-count"
          className="cc-count-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d+−-]/g, "").slice(0, 4))}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              step(e.key === "ArrowUp" ? 1 : -1);
            }
          }}
          onFocus={(e) => e.target.select()}
          aria-describedby="cc-count-now"
        />
        <button type="button" className="cc-step" onClick={() => step(1)} aria-label="Count up one">
          +
        </button>
        <button type="submit" className="actions__next cc-check">
          Check {fmtCount(value)} <span className="kbd">Enter</span>
        </button>
      </div>
      <span id="cc-count-now" className="visually-hidden">
        Use the arrow keys or type a number, then press Enter.
      </span>
    </form>
  );
}

/** "−3", "-3", "+2", "4" → a number; anything else → 0. */
function parseCount(text: string): number {
  const n = parseInt(text.replace("−", "-"), 10);
  return Number.isNaN(n) ? 0 : n;
}
