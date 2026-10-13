import type { DealMode } from "../engine/scenario";

const MODES: { id: DealMode; label: string; title: string }[] = [
  { id: "realistic", label: "Random deck", title: "Every hand comes up as often as it would at the table." },
  {
    id: "focus",
    label: "Close calls",
    title: "Mostly Queen-high, plus Jack- and King-high — the hands near the line.",
  },
];

/** Switch between truly random hands and the tricky ones, right above the table. */
export default function DealToggle({ value, onChange }: { value: DealMode; onChange: (mode: DealMode) => void }) {
  const current = MODES.find((m) => m.id === value)!;
  return (
    <div className="deal-toggle">
      <span className="eyebrow">Hands</span>
      <div className="segmented" role="radiogroup" aria-label="Which hands to deal">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="radio"
            aria-checked={value === m.id}
            className={value === m.id ? "segmented__btn is-selected" : "segmented__btn"}
            onClick={() => onChange(m.id)}
            title={m.title}
          >
            {m.label}
          </button>
        ))}
      </div>
      <span className="deal-toggle__desc">{current.title}</span>
    </div>
  );
}
