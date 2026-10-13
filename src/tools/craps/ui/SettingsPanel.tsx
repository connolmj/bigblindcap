import { useState } from "react";
import { THEMES } from "../../blackjack/ui/settings";
import { betMath, lineWithOddsEdge, ODDS_NAME, type OddsRule, type Vig } from "../engine/bets";
import { pct } from "../engine/explain";
import { rulesOf, type Settings } from "./settings";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onResetStats: () => void;
}

const ODDS_DESC: Record<OddsRule, string> = {
  "2x": "Odds up to twice your flat bet.",
  "345x": "3× on 4 and 10, 4× on 5 and 9, 5× on 6 and 8. The Las Vegas standard.",
  "5x": "5× your flat bet on every number.",
  "10x": "10× on every number — rarer, and generous.",
};

export default function SettingsPanel({ settings, onChange, onResetStats }: Props) {
  const [confirming, setConfirming] = useState(false);
  const rules = rulesOf(settings);

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
        <legend className="eyebrow">Odds allowed</legend>
        <div className="settings__options">
          {(Object.keys(ODDS_NAME) as OddsRule[]).map((o) => (
            <Option
              key={o}
              name="odds"
              checked={settings.odds === o}
              onSelect={() => onChange({ odds: o })}
              title={ODDS_NAME[o]}
              desc={`${ODDS_DESC[o]} Pass Line with full odds: ${pct(lineWithOddsEdge({ ...rules, odds: o }, false), 3)} edge.`}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Field pays on 12</legend>
        <div className="settings__options">
          {([3, 2] as const).map((x) => (
            <Option
              key={x}
              name="field12"
              checked={settings.field12 === x}
              onSelect={() => onChange({ field12: x })}
              title={x === 3 ? "Triple" : "Double"}
              desc={`2 pays double, 12 pays ${x === 3 ? "triple" : "double"}. Field edge: ${pct(betMath("field", { ...rules, field12: x }).edge)}.`}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Buy & Lay commission</legend>
        <div className="settings__options">
          {(["win", "upfront"] as Vig[]).map((v) => (
            <Option
              key={v}
              name="vig"
              checked={settings.vig === v}
              onSelect={() => onChange({ vig: v })}
              title={v === "win" ? "Only on wins" : "Up front"}
              desc={`The 5% is taken ${v === "win" ? "only when the bet wins" : "when you make the bet, win or lose"}. Buy 4/10: ${pct(betMath("buy4", { ...rules, vig: v }).edge)} · Lay 4/10: ${pct(betMath("lay4", { ...rules, vig: v }).edge)}.`}
            />
          ))}
        </div>
        <p className="settings__note">This changes whether buying the 4 and 10 counts as a good bet.</p>
      </fieldset>

      <fieldset className="settings__group">
        <legend className="eyebrow">Sounds</legend>
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
