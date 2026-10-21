import type { Bet, Commission } from "../engine/payouts";
import type { Phase } from "../engine/round";

interface Props {
  phase: Phase;
  commission: Commission;
  onBet: (bet: Bet) => void;
  onSkip: () => void;
  onNext: () => void;
}

const BET_BUTTONS: { bet: Bet; label: string; key: string; hint: string }[] = [
  { bet: "player", label: "Player", key: "P", hint: "Pays 1 to 1" },
  { bet: "banker", label: "Banker", key: "B", hint: "" },
  { bet: "tie", label: "Tie", key: "T", hint: "Pays 8 to 1" },
];

const BANKER_HINT = { standard: "Pays 1 to 1, less 5%", none: "1 to 1, half on a 6" };

export default function ActionBar({ phase, commission, onBet, onSkip, onNext }: Props) {
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

  // Third cards are coming out; the hand plays itself.
  return (
    <div className="actions bac-actions">
      <button className="actions__next bac-dealing" onClick={onSkip}>
        Dealing… skip ahead <span className="kbd">Space</span>
      </button>
    </div>
  );
}
