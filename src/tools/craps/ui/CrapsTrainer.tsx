import { useEffect, useMemo, useRef, useState } from "react";
import "../../blackjack/ui/blackjack.css";
import Modal from "../../blackjack/ui/Modal";
import { setSoundEnabled, unlockAudio } from "../../blackjack/ui/sound";
import StatsRail from "../../three-card/ui/StatsRail";
import "../../three-card/ui/three-card.css";
import "../../baccarat/ui/baccarat.css";
import { ODDS_NAME, type SpotId } from "../engine/bets";
import { fmtMoney } from "../engine/explain";
import { canBet } from "../engine/table";
import ActionBar from "./ActionBar";
import EdgeChart from "./EdgeChart";
import Feedback from "./Feedback";
import Guide from "./Guide";
import Progress from "./Progress";
import { CHIPS, rulesOf } from "./settings";
import SettingsPanel from "./SettingsPanel";
import Table from "./Table";
import { useTrainer } from "./useTrainer";
import "./craps.css";

export default function CrapsTrainer() {
  const trainer = useTrainer();
  const { table, stats, settings } = trainer;
  const rules = useMemo(() => rulesOf(settings), [settings]);
  const [dialog, setDialog] = useState<"chart" | "settings" | null>(null);

  // The chart highlights the last bet you made.
  const lastBet = useRef<SpotId | undefined>(undefined);
  const latest = table.pending[table.pending.length - 1] ?? table.last?.decisions.at(-1);
  if (latest) lastBet.current = latest.id;
  const openChart = () => setDialog("chart");

  // Sound follows the setting; the browser only allows audio after your first click or key press.
  useEffect(() => setSoundEnabled(settings.sound), [settings.sound]);
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  // Keyboard shortcuts. A ref keeps the listener pointed at the latest handlers.
  const handlers = useRef({ trainer, dialog, rules });
  handlers.current = { trainer, dialog, rules };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { trainer, dialog, rules } = handlers.current;
      if (dialog || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea")) return;

      const key = e.key.toLowerCase();
      const t = trainer.table;
      if (key === " " || key === "enter") {
        if (target.closest("button")) return; // the focused button handles it
        e.preventDefault();
        trainer.roll();
      } else if (key === "p") trainer.place(t.point ? "come" : "pass");
      else if (key === "d") trainer.place(t.point ? "dontCome" : "dontPass");
      else if (key === "o") {
        if (canBet(t, "passOdds", rules)) trainer.place("passOdds");
        else if (canBet(t, "dontPassOdds", rules)) trainer.place("dontPassOdds");
      } else if (key === "u" || key === "backspace") trainer.undo();
      else if (key === "x") trainer.clear();
      else if (key >= "1" && key <= String(CHIPS.length)) trainer.updateSettings({ chip: CHIPS[Number(key) - 1] });
      else if (key === "c") setDialog("chart");
      else if (key === "m") trainer.updateSettings({ sound: !trainer.settings.sound });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bj tcp bac crp">
      <header className="bj__intro">
        <div className="eyebrow">Tools · Craps</div>
        <h1 className="bj__title">Craps Strategy</h1>
        <p className="bj__lede">
          Put chips on the felt and roll. Every bet you make is graded on its house edge the moment it lands — and when
          there's a better bet for the same money, you'll see which one, and what the difference costs.
        </p>
        <p className="bj__rules">
          {ODDS_NAME[settings.odds]} · Field pays {settings.field12 === 3 ? "triple" : "double"} on 12 · Buy/Lay
          commission {settings.vig === "win" ? "on wins only" : "up front"}
        </p>
      </header>

      <StatsRail
        stats={stats}
        fmtMoney={fmtMoney}
        roundNoun={["roll", "rolls"]}
        sound={settings.sound}
        onToggleSound={() => trainer.updateSettings({ sound: !settings.sound })}
        onChart={openChart}
        onSettings={() => setDialog("settings")}
      />

      <Table table={table} rollId={trainer.rollId} rules={rules} theme={settings.theme} onPlace={trainer.place} />

      <ActionBar
        chip={settings.chip}
        onChip={(chip) => trainer.updateSettings({ chip })}
        canUndo={table.placed.length > 0}
        onUndo={trainer.undo}
        onClear={trainer.clear}
        onRoll={trainer.roll}
        comeOut={table.point === null}
      />

      <Feedback table={table} rules={rules} onShowChart={openChart} />

      <p className="bj__keys">
        Keyboard: <span className="kbd">P</span> Pass / Come · <span className="kbd">D</span> Don't Pass / Don't Come ·{" "}
        <span className="kbd">O</span> odds · <span className="kbd">1</span>–<span className="kbd">4</span> chip ·{" "}
        <span className="kbd">U</span> undo · <span className="kbd">Space</span> roll · <span className="kbd">C</span>{" "}
        chart · <span className="kbd">M</span> sound
      </p>

      <Progress stats={stats} />

      <Guide rules={rules} />

      <Modal open={dialog === "chart"} title="House edge on every bet" onClose={() => setDialog(null)} wide>
        <EdgeChart rules={rules} highlight={lastBet.current} />
      </Modal>
      <Modal open={dialog === "settings"} title="Table settings" onClose={() => setDialog(null)}>
        <SettingsPanel settings={settings} onChange={trainer.updateSettings} onResetStats={trainer.resetStats} />
      </Modal>
    </div>
  );
}
