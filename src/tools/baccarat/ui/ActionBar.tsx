import type { Bet, Commission } from "../engine/payouts";
import type { Phase } from "../engine/round";
import type { DrawAction, DrawSpot } from "../engine/rules";

interface Props {
  phase: Phase;
  spot: DrawSpot | null;
  commission: Commission;
  onBet: (bet: Bet) => void;
  onDraw: (action: DrawAction) => void;
  onNext: () => void;
}

const BET_BUTTONS: { bet: Bet; label: string; key: string; hint: string }[] = [
  { bet: "player", label: "Player", key: "P", hint: "Pays 1 to 1" },
  { bet: "banker", label: "Banker", key: "B", hint: "" },
  { bet: "tie", label: "Tie", key: "T", hint: "Pays 8 to 1" },
];

const DRAW_BUTTONS: { action: DrawAction; label: string; key: string; hint: string }[] = [
  { action: "draw", label: "Draw", key: "D", hint: "Third card" },
  { action: "stand", label: "Stand", key: "S", hint: "No more cards" },
];

const BANKER_HINT = { standard: "Pays 1 to 1, less 5%", none: "1 to 1, half on a 6" };

export default function ActionBar({ phase, spot, commission, onBet, onDraw, onNext }: Props) {
  if (phase === "settled") {
    return (
      <div className="actions bac-actions">
        <button className="actions__next" onClick={onNext}>
          Deal next hand <span className="kbd">Space</span>
        </button>
      </div>
    );
  }

  if (phase === "bet") {
    return (
      <div className="actions bac-actions bac-actions--bet" role="group" aria-label="Your bet">
        {BET_BUTTONS.map(({ bet, label, key, hint }) => (
          <button
            key={bet}
            className={`actions__btn actions__btn--${bet}`}
            onClick={() => onBet(bet)}
            aria-keyshortcuts={key}
          >
            <span className="actions__dot" aria-hidden="true" />
            <span className="actions__label">{label}</span>
            <span className="actions__hint">{bet === "banker" ? BANKER_HINT[commission] : hint}</span>
            <span className="kbd actions__kbd">{key}</span>
          </button>
        ))}
      </div>
    );
  }

  const who = spot?.side === "banker" ? "Banker" : "Player";
  return (
    <div className="bac-ask">
      <p className="bac-ask__q">
        Does the <b>{who}</b> draw on <b>{spot?.total}</b>?
      </p>
      <div className="actions bac-actions" role="group" aria-label={`Does the ${who} draw?`}>
        {DRAW_BUTTONS.map(({ action, label, key, hint }) => (
          <button
            key={action}
            className={`actions__btn actions__btn--${action === "draw" ? "hit" : "stand"}`}
            onClick={() => onDraw(action)}
            aria-keyshortcuts={key}
          >
            <span className="actions__dot" aria-hidden="true" />
            <span className="actions__label">{label}</span>
            <span className="actions__hint">{hint}</span>
            <span className="kbd actions__kbd">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
