import { useState } from "react";
import { THEMES, type Speed } from "../../blackjack/ui/settings";
import { PAIR_PLUS, PAIR_PLUS_NAME, pairPlusReturn, type PairPlusTable } from "../engine/paytable";
import type { Settings } from "./settings";

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

const edge = (t: PairPlusTable) => `${(-pairPlusReturn(PAIR_PLUS[t]) * 100).toFixed(2)}% house edge`;

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
          <Option
            name="deal"
            checked={settings.dealMode === "focus"}
            onSelect={() => onChange({ dealMode: "focus" })}
            title="Close calls"
            desc="Lots of Queen-high, plus Jack- and King-high — the hands near the line."
          />
          <Option
            name="deal"
            checked={settings.dealMode === "realistic"}
            onSelect={() => onChange({ dealMode: "realistic" })}
            title="Real deck"
            desc="Hands come up as often as they would at the table."
          />
        </div>
        <p className="settings__note">Applies from the next hand.</p>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Pair Plus side bet</legend>
        <div className="settings__options">
          {(Object.keys(PAIR_PLUS) as PairPlusTable[]).map((t) => (
            <Option
              key={t}
              name="pairplus"
              checked={settings.pairPlus === t}
              onSelect={() => onChange({ pairPlus: t })}
              title={PAIR_PLUS_NAME[t]}
              desc={`Pays ${t.split("-").join(" / ")} to 1 · ${edge(t)}`}
            />
          ))}
          <Option
            name="pairplus"
            checked={settings.pairPlus === "off"}
            onSelect={() => onChange({ pairPlus: "off" })}
            title="No side bet"
            desc="Just the ante and play."
          />
        </div>
        <p className="settings__note">Pair Plus doesn't change whether you should play or fold.</p>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Reveal speed</legend>
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

function Option(props: { name: string; checked: boolean; onSelect: () => void; title: string; desc: string }) {
  return (
    <label className={props.checked ? "option is-selected" : "option"}>
      <input type="radio" name={props.name} checked={props.checked} onChange={props.onSelect} />
      <span className="option__title">{props.title}</span>
      <span className="option__desc">{props.desc}</span>
    </label>
  );
}
