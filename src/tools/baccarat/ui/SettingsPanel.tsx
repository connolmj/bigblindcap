import { useState } from "react";
import { THEMES, type Speed } from "../../blackjack/ui/settings";
import { betReturn, COMMISSION_NAME, type Commission } from "../engine/payouts";
import type { Settings } from "./settings";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onResetStats: () => void;
}

const COMMISSION_DESC: Record<Commission, string> = {
  standard: "Banker wins pay 0.95 to 1.",
  none: "Banker wins pay 1 to 1, except a winning 6 pays half.",
};

const SPEEDS: { id: Speed; label: string }[] = [
  { id: "relaxed", label: "Relaxed" },
  { id: "normal", label: "Normal" },
  { id: "fast", label: "Fast" },
];

const edges = (c: Commission) =>
  `Banker ${(-betReturn("banker", c) * 100).toFixed(2)}% · Player ${(-betReturn("player", c) * 100).toFixed(2)}%`;

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
        <legend className="eyebrow">Commission</legend>
        <div className="settings__options">
          {(["standard", "none"] as Commission[]).map((c) => (
            <Option
              key={c}
              name="commission"
              checked={settings.commission === c}
              onSelect={() => onChange({ commission: c })}
              title={COMMISSION_NAME[c]}
              desc={`${COMMISSION_DESC[c]} House edge: ${edges(c)}.`}
            />
          ))}
        </div>
        <p className="settings__note">This changes which bet has the lowest house edge.</p>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Dealing speed</legend>
        <div className="segmented">
          {SPEEDS.map((sp) => (
            <button
              key={sp.id}
              className={settings.speed === sp.id ? "segmented__btn is-selected" : "segmented__btn"}
              onClick={() => onChange({ speed: sp.id })}
              aria-pressed={settings.speed === sp.id}
            >
              {sp.label}
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
            <span>Reset your results and the scoreboard?</span>
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
