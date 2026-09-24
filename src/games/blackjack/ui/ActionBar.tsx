import type { Phase } from "../engine/round";
import type { Action } from "../engine/strategy";

interface Props {
  phase: Phase;
  legal: Record<Action, boolean>;
  onAct: (action: Action) => void;
  onNext: () => void;
}

export const ACTIONS: { action: Action; label: string; key: string; hint: string }[] = [
  { action: "hit", label: "Hit", key: "H", hint: "Take a card" },
  { action: "stand", label: "Stand", key: "S", hint: "Keep your total" },
  { action: "double", label: "Double", key: "D", hint: "2× bet, one card" },
  { action: "split", label: "Split", key: "P", hint: "Two hands" },
];

export default function ActionBar({ phase, legal, onAct, onNext }: Props) {
  if (phase === "settled") {
    return (
      <div className="actions">
        <button className="actions__next" onClick={onNext}>
          Deal next hand <span className="kbd">Space</span>
        </button>
      </div>
    );
  }

  return (
    <div className="actions" role="group" aria-label="Your move">
      {ACTIONS.map(({ action, label, key, hint }) => (
        <button
          key={action}
          className={`actions__btn actions__btn--${action}`}
          disabled={phase !== "player" || !legal[action]}
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
