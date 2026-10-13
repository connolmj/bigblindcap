import { money } from "../engine/explain";
import { CHIPS, type Chip } from "./settings";

interface Props {
  chip: Chip;
  onChip: (chip: Chip) => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
  onRoll: () => void;
  comeOut: boolean;
}

export default function ActionBar({ chip, onChip, canUndo, onUndo, onClear, onRoll, comeOut }: Props) {
  return (
    <div className="crp-actions">
      <div className="crp-chips" role="radiogroup" aria-label="Chip size">
        {CHIPS.map((c, i) => (
          <button
            key={c}
            role="radio"
            aria-checked={chip === c}
            className={`crp-chipbtn crp-chipbtn--${c}${chip === c ? " is-selected" : ""}`}
            onClick={(e) => {
              onChip(c);
              if (e.detail > 0) e.currentTarget.blur(); // so Space still rolls
            }}
            aria-keyshortcuts={String(i + 1)}
            title={`${money(c)} chips (${i + 1})`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="crp-actions__edit">
        <button className="btn" onClick={onUndo} disabled={!canUndo} aria-keyshortcuts="U">
          Undo <span className="kbd">U</span>
        </button>
        <button className="btn" onClick={onClear} disabled={!canUndo} aria-keyshortcuts="X">
          Clear new
        </button>
      </div>
      <button className="actions__next crp-roll" onClick={onRoll}>
        {comeOut ? "Roll the come-out" : "Roll"} <span className="kbd">Space</span>
      </button>
    </div>
  );
}
