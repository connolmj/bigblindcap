import { useEffect, useRef, useState } from "react";
import "../../blackjack/ui/blackjack.css";
import Modal from "../../blackjack/ui/Modal";
import { setSoundEnabled, unlockAudio } from "../../blackjack/ui/sound";
import type { HandValue } from "../engine/hand";
import type { Action } from "../engine/strategy";
import ActionBar from "./ActionBar";
import DealToggle from "./DealToggle";
import Feedback from "./Feedback";
import Guide from "./Guide";
import Progress from "./Progress";
import SettingsPanel from "./SettingsPanel";
import StatsRail from "./StatsRail";
import StrategyChart from "./StrategyChart";
import Table from "./Table";
import { useTrainer } from "./useTrainer";
import "./three-card.css";

const KEY_TO_ACTION: Record<string, Action> = { p: "play", f: "fold" };

export default function ThreeCardTrainer() {
  const trainer = useTrainer();
  const { round, stats, settings } = trainer;
  const [dialog, setDialog] = useState<"chart" | "settings" | null>(null);
  const [chartSpot, setChartSpot] = useState<HandValue | undefined>();

  // Points the chart at the hand you just decided — never the one you're on (no peeking!).
  const lastDecided = useRef<HandValue | undefined>(undefined);
  if (round.decision) lastDecided.current = round.decision.analysis.hand;
  const openChart = () => {
    setChartSpot(lastDecided.current);
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

  // After you decide, make sure the "why" box is on screen — scrolling down
  // just enough, but never past the stats bar.
  const railRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const decided = round.decision !== null;
  useEffect(() => {
    const rail = railRef.current;
    const fb = feedbackRef.current;
    if (!rail || !fb || !decided) return;
    const overflow = fb.getBoundingClientRect().bottom + 12 - window.innerHeight;
    const room = rail.getBoundingClientRect().top - 8;
    const by = Math.min(overflow, room);
    if (by > 0) window.scrollBy({ top: by, behavior: "smooth" });
  }, [decided, trainer.roundId]);

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
    <div className="bj tcp">
      <header className="bj__intro">
        <div className="eyebrow">Tools · Three Card Poker</div>
        <h1 className="bj__title">Three Card Poker Strategy</h1>
        <p className="bj__lede">
          One decision per hand: play or fold. Make it, and you'll see whether it was right — and exactly what each
          choice is worth against every hand the dealer could be holding.
        </p>
        <p className="bj__rules">1 deck · Dealer qualifies with Q-high · Ante bonus 1-4-5</p>
      </header>

      <div ref={railRef}>
        <StatsRail
          stats={stats}
          sound={settings.sound}
          onToggleSound={() => trainer.updateSettings({ sound: !settings.sound })}
          onChart={openChart}
          onSettings={() => setDialog("settings")}
        />
      </div>

      <DealToggle value={settings.dealMode} onChange={(dealMode) => trainer.updateSettings({ dealMode })} />

      <Table key={trainer.roundId} round={round} theme={settings.theme} />

      <ActionBar phase={round.phase} onAct={trainer.act} onNext={trainer.nextHand} />

      <div ref={feedbackRef}>
        <Feedback round={round} onShowChart={openChart} />
      </div>

      <p className="bj__keys">
        Keyboard: <span className="kbd">P</span> play · <span className="kbd">F</span> fold ·{" "}
        <span className="kbd">Space</span> next hand · <span className="kbd">C</span> chart ·{" "}
        <span className="kbd">M</span> sound
      </p>

      <Progress stats={stats} />

      <Guide />

      <Modal open={dialog === "chart"} title="Three Card Poker strategy" onClose={() => setDialog(null)} wide>
        <StrategyChart highlight={chartSpot} />
      </Modal>
      <Modal open={dialog === "settings"} title="Table settings" onClose={() => setDialog(null)}>
        <SettingsPanel settings={settings} onChange={trainer.updateSettings} onResetStats={trainer.resetStats} />
      </Modal>
    </div>
  );
}
