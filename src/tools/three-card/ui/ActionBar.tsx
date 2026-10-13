import type { Phase } from "../engine/round";
import type { Action } from "../engine/strategy";

interface Props {
  phase: Phase;
  onAct: (action: Action) => void;
  onNext: () => void;
}

const ACTIONS: { action: Action; label: string; key: string; hint: string }[] = [
  { action: "play", label: "Play", key: "P", hint: "Bet 1 more to stay in" },
  { action: "fold", label: "Fold", key: "F", hint: "Give up the ante" },
];

export default function ActionBar({ phase, onAct, onNext }: Props) {
  if (phase === "settled") {
    return (
      <div className="actions tcp-actions">
        <button className="actions__next" onClick={onNext}>
          Deal next hand <span className="kbd">Space</span>
        </button>
      </div>
    );
  }

  return (
    <div className="actions tcp-actions" role="group" aria-label="Your move">
      {ACTIONS.map(({ action, label, key, hint }) => (
        <button
          key={action}
          className={`actions__btn actions__btn--${action}`}
          disabled={phase !== "decide"}
          onClick={() => onAct(action)}
          aria-keyshortcuts={key}
        >
          <span className="actions__dot" aria-hidden="true" />
          <span className="actions__label">{label}</span>
          <span className="actions__hint">{hint}</span>
          <span className="kbd actions__kbd">{key}</span>
        </button>
      ))}
    </div>
  );
}
