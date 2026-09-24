import { useState } from "react";
import { THEMES, type Settings, type Speed } from "./settings";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onResetStats: () => void;
}

const SPEEDS: { id: Speed; label: string }[] = [
  { id: "relaxed", label: "Relaxed" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
];

export default function SettingsPanel({ settings, onChange, onResetStats }: Props) {
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
        <legend className="eyebrow">Which hands to deal</legend>
        <div className="settings__options">
          <label className={settings.dealMode === "focus" ? "option is-selected" : "option"}>
            <input
              type="radio"
              name="deal"
              checked={settings.dealMode === "focus"}
              onChange={() => onChange({ dealMode: "focus" })}
            />
            <span className="option__title">Tough spots</span>
            <span className="option__desc">More 12s, 16s, soft hands and pairs — the decisions people get wrong.</span>
          </label>
          <label className={settings.dealMode === "realistic" ? "option is-selected" : "option"}>
            <input
              type="radio"
              name="deal"
              checked={settings.dealMode === "realistic"}
              onChange={() => onChange({ dealMode: "realistic" })}
            />
            <span className="option__title">Real shoe</span>
            <span className="option__desc">Hands come up as often as they would in a casino, blackjacks included.</span>
          </label>
        </div>
        <p className="settings__note">Applies from the next hand.</p>
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
