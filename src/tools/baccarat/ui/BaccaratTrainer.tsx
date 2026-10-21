import { useEffect, useRef, useState } from "react";
import "../../blackjack/ui/blackjack.css";
import Modal from "../../blackjack/ui/Modal";
import { setSoundEnabled, unlockAudio } from "../../blackjack/ui/sound";
import "../../three-card/ui/three-card.css";
import type { Bet } from "../engine/payouts";
import type { DrawSpot } from "../engine/rules";
import ActionBar from "./ActionBar";
import Feedback from "./Feedback";
import Guide from "./Guide";
import Progress from "./Progress";
import SettingsPanel from "./SettingsPanel";
import StatsRail from "./StatsRail";
import TableauChart from "./TableauChart";
import Table from "./Table";
import { useTrainer } from "./useTrainer";
import "./baccarat.css";

const KEY_TO_BET: Record<string, Bet> = { p: "player", b: "banker", t: "tie" };

export default function BaccaratTrainer() {
  const trainer = useTrainer();
  const { round, stats, settings } = trainer;
  const [dialog, setDialog] = useState<"chart" | "settings" | null>(null);
  const [chartSpot, setChartSpot] = useState<DrawSpot | undefined>();

  // Points the chart at the last third-card rule the table played.
  const lastCall = useRef<DrawSpot | undefined>(undefined);
  const lastDraw = [...round.steps].reverse().find((s) => s.kind === "draw");
  if (lastDraw?.kind === "draw") lastCall.current = lastDraw.spot;
  const openChart = () => {
    setChartSpot(lastCall.current);
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

  // As the hand plays out, keep the story box on screen — scrolling down
  // just enough, but never past the stats bar.
  const railRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const fb = feedbackRef.current;
    if (!rail || !fb || round.phase === "bet") return;
    const overflow = fb.getBoundingClientRect().bottom + 12 - window.innerHeight;
    const room = rail.getBoundingClientRect().top - 8;
    const by = Math.min(overflow, room);
    if (by > 0) window.scrollBy({ top: by, behavior: "smooth" });
  }, [round.steps.length, round.phase]);

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
      const phase = trainer.round.phase;
      if (phase === "bet" && KEY_TO_BET[key]) {
        trainer.bet(KEY_TO_BET[key]);
      } else if ((key === " " || key === "enter") && phase !== "bet") {
        if (target.closest("button")) return; // the focused button handles it
        e.preventDefault();
        if (phase === "settled") trainer.nextHand();
        else trainer.skip();
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
    <div className="bj tcp bac">
      <header className="bj__intro">
        <div className="eyebrow">Tools · Baccarat</div>
        <h1 className="bj__title">Baccarat Strategy</h1>
        <p className="bj__lede">
          Bet Player, Banker or Tie, then watch the hand play out. The dealer follows fixed drawing rules, and the table
          shows you which one applied at each card.
        </p>
        <p className="bj__rules">
          8 decks · {settings.commission === "standard" ? "5% commission on Banker" : "No commission · Banker 6 pays ½"}{" "}
          · Tie pays 8 to 1
        </p>
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

      <Table key={trainer.roundId} round={round} theme={settings.theme} />

      <ActionBar
        phase={round.phase}
        commission={round.commission}
        onBet={trainer.bet}
        onSkip={trainer.skip}
        onNext={trainer.nextHand}
      />

      <div ref={feedbackRef}>
        <Feedback round={round} onShowChart={openChart} />
      </div>

      <p className="bj__keys">
        Keyboard: <span className="kbd">P</span> Player · <span className="kbd">B</span> Banker ·{" "}
        <span className="kbd">T</span> Tie · <span className="kbd">Space</span> skip ahead / next hand ·{" "}
        <span className="kbd">C</span> chart · <span className="kbd">M</span> sound
      </p>

      <Progress stats={stats} />

      <Guide />

      <Modal open={dialog === "chart"} title="Baccarat drawing rules" onClose={() => setDialog(null)} wide>
        <TableauChart highlight={chartSpot} />
      </Modal>
      <Modal open={dialog === "settings"} title="Table settings" onClose={() => setDialog(null)}>
        <SettingsPanel settings={settings} onChange={trainer.updateSettings} onResetStats={trainer.resetStats} />
      </Modal>
    </div>
  );
}
