import { useState } from "react";
import { THEMES, type Speed } from "../../blackjack/ui/settings";
import { SOMETIMES_EVERY, type CountCheck, type Settings } from "./settings";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onNewShoe: () => void;
  onResetStats: () => void;
}

const CHECKS: { id: CountCheck; title: string; desc: string }[] = [
  { id: "every", title: "Every hand", desc: "Give the running count before every bet." },
  {
    id: "sometimes",
    title: "Now and then",
    desc: `Every ${SOMETIMES_EVERY}th hand — closer to the real thing, where nobody asks.`,
  },
  { id: "off", title: "Show it on the table", desc: "Training wheels: the running and true count stay on screen." },
];

const SPEEDS: { id: Speed; label: string }[] = [
  { id: "relaxed", label: "Relaxed" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
];

export default function SettingsPanel({ settings, onChange, onNewShoe, onResetStats }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="settings">
      <fieldset className="settings__group">
        <legend className="eyebrow">Table</legend>
        <div className="settings__themes">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={settings.theme === t.id ? "theme-swatch is-selected" : "theme-swatch"}
              onClick={() => onChange({ theme: t.id })}
              aria-pressed={settings.theme === t.id}
            >
              <span className="theme-swatch__preview felt" data-theme={t.id}>
                <span className="theme-swatch__card" />
                <span className="theme-swatch__card" />
              </span>
              <span className="theme-swatch__name">{t.name}</span>
              <span className="theme-swatch__blurb">{t.blurb}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Count check</legend>
        <div className="settings__options">
          {CHECKS.map((c) => (
            <label key={c.id} className={settings.countCheck === c.id ? "option is-selected" : "option"}>
              <input
                type="radio"
                name="count-check"
                checked={settings.countCheck === c.id}
                onChange={() => onChange({ countCheck: c.id })}
              />
              <span className="option__title">{c.title}</span>
              <span className="option__desc">{c.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Dealer speed</legend>
        <div className="segmented">
          {SPEEDS.map((s) => (
            <button
              key={s.id}
              className={settings.speed === s.id ? "segmented__btn is-selected" : "segmented__btn"}
              onClick={() => onChange({ speed: s.id })}
              aria-pressed={settings.speed === s.id}
            >
              {s.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Card sounds</legend>
        <div className="segmented">
          {[true, false].map((on) => (
            <button
              key={String(on)}
              className={settings.sound === on ? "segmented__btn is-selected" : "segmented__btn"}
              onClick={() => onChange({ sound: on })}
              aria-pressed={settings.sound === on}
            >
              {on ? "On" : "Off"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Shoe</legend>
        <button className="btn" onClick={onNewShoe}>
          Shuffle a new shoe
        </button>
        <p className="settings__note">Starts the count over at 0. Between hands only.</p>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Your stats</legend>
        {confirming ? (
          <div className="settings__confirm">
            <span>Reset streaks, accuracy and history?</span>
            <button
              className="btn btn--danger"
              onClick={() => {
                onResetStats();
                setConfirming(false);
              }}
            >
              Reset
            </button>
            <button className="btn" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn" onClick={() => setConfirming(true)}>
            Reset stats…
          </button>
        )}
      </fieldset>
    </div>
  );
}
