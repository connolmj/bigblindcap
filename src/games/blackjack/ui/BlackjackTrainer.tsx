import { useEffect, useRef, useState } from "react";
import { RULES_SUMMARY } from "../engine/rules";
import type { Action } from "../engine/strategy";
import ActionBar from "./ActionBar";
import Feedback from "./Feedback";
import Modal from "./Modal";
import Progress from "./Progress";
import { setSoundEnabled, unlockAudio } from "./sound";
import SettingsPanel from "./SettingsPanel";
import StatsRail from "./StatsRail";
import StrategyChart, { type ChartSpot } from "./StrategyChart";
import Table from "./Table";
import { useTrainer } from "./useTrainer";
import "./blackjack.css";

const KEY_TO_ACTION: Record<string, Action> = { h: "hit", s: "stand", d: "double", p: "split" };

export default function BlackjackTrainer() {
  const trainer = useTrainer();
  const { round, stats, settings } = trainer;
  const [dialog, setDialog] = useState<"chart" | "settings" | null>(null);
  const [chartSpot, setChartSpot] = useState<ChartSpot | undefined>();

  const openChart = (spot?: ChartSpot) => {
    // With no specific spot, point at your most recent decision (never the one you're on — no peeking!).
    const last = round.decisions[round.decisions.length - 1];
    setChartSpot(spot ?? last?.recommendation);
    setDialog("chart");
  };

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
  const handlers = useRef({ trainer, openChart, dialog });
  handlers.current = { trainer, openChart, dialog };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { trainer, openChart, dialog } = handlers.current;
      if (dialog || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea")) return;

      const key = e.key.toLowerCase();
      if (KEY_TO_ACTION[key]) {
        trainer.act(KEY_TO_ACTION[key]);
      } else if ((key === " " || key === "enter") && trainer.round.phase === "settled") {
        if (target.closest("button")) return; // the focused button handles it
        e.preventDefault();
        trainer.nextHand();
      } else if (key === "c") {
        openChart();
      } else if (key === "m") {
        trainer.updateSettings({ sound: !trainer.settings.sound });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="bj">
      <header className="bj__intro">
        <div className="eyebrow">Games · Blackjack</div>
        <h1 className="bj__title">
          <span className="bj__level">Level 1:</span> Basic Blackjack Strategy
        </h1>
        <p className="bj__lede">
          Play each hand the way the math says to. After every move you'll see whether it was right, and why.
        </p>
        <p className="bj__rules">{RULES_SUMMARY}</p>
      </header>

      <StatsRail
        stats={stats}
        sound={settings.sound}
        onToggleSound={() => trainer.updateSettings({ sound: !settings.sound })}
        onChart={() => openChart()}
        onSettings={() => setDialog("settings")}
      />

      <Table key={trainer.roundId} round={round} theme={settings.theme} />

      <ActionBar phase={round.phase} legal={trainer.legal} onAct={trainer.act} onNext={trainer.nextHand} />

      <Feedback round={round} onShowChart={(rec) => openChart(rec)} />

      <p className="bj__keys">
        Keyboard: <span className="kbd">H</span> hit · <span className="kbd">S</span> stand ·{" "}
        <span className="kbd">D</span> double · <span className="kbd">P</span> split ·{" "}
        <span className="kbd">Space</span> next hand · <span className="kbd">C</span> chart ·{" "}
        <span className="kbd">M</span> sound
      </p>

      <Progress stats={stats} />

      <Modal open={dialog === "chart"} title="Basic strategy chart" onClose={() => setDialog(null)} wide>
        <StrategyChart highlight={chartSpot} />
      </Modal>
      <Modal open={dialog === "settings"} title="Table settings" onClose={() => setDialog(null)}>
        <SettingsPanel settings={settings} onChange={trainer.updateSettings} onResetStats={trainer.resetStats} />
      </Modal>
    </div>
  );
}
