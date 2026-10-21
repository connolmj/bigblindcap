import { useEffect, useRef, useState } from "react";
import { RULES_SUMMARY } from "../../blackjack/engine/rules";
import type { Action } from "../../blackjack/engine/strategy";
import "../../blackjack/ui/blackjack.css";
import Modal from "../../blackjack/ui/Modal";
import { setSoundEnabled, unlockAudio } from "../../blackjack/ui/sound";
import StatsRail from "../../blackjack/ui/StatsRail";
import "../../three-card/ui/three-card.css";
import { BET_OPTIONS } from "../engine/betting";
import type { Deviation } from "../engine/deviations";
import { handOver } from "../engine/session";
import ActionBar from "./ActionBar";
import CountChart from "./CountChart";
import Feedback from "./Feedback";
import Guide from "./Guide";
import Progress from "./Progress";
import SettingsPanel from "./SettingsPanel";
import Table from "./Table";
import { useTrainer } from "./useTrainer";
import "./counting.css";

const KEY_TO_ACTION: Record<string, Action> = { h: "hit", s: "stand", d: "double", p: "split" };

export default function CountingTrainer() {
  const trainer = useTrainer();
  const { session, stats, settings } = trainer;
  const [dialog, setDialog] = useState<"chart" | "settings" | null>(null);
  const [chartSpot, setChartSpot] = useState<Deviation | undefined>();

  // Points the chart at your most recent count spot — never one you haven't played yet.
  const lastSpot = useRef<Deviation | undefined>(undefined);
  const lastPlay = [...session.decisions].reverse().find((d) => d.kind === "play" && d.advice.deviation);
  if (lastPlay?.kind === "play") lastSpot.current = lastPlay.advice.deviation;
  const openChart = () => {
    setChartSpot(lastSpot.current);
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

  // After each call, make sure the result box is on screen — scrolling down
  // just enough, but never past the stats bar.
  const railRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const settled = handOver(session);
  useEffect(() => {
    const rail = railRef.current;
    const fb = feedbackRef.current;
    if (!rail || !fb || session.decisions.length === 0) return;
    const overflow = fb.getBoundingClientRect().bottom + 12 - window.innerHeight;
    const room = rail.getBoundingClientRect().top - 8;
    const by = Math.min(overflow, room);
    if (by > 0) window.scrollBy({ top: by, behavior: "smooth" });
  }, [session.decisions.length, settled]);

  // Keyboard shortcuts. A ref keeps the listener pointed at the latest handlers.
  const handlers = useRef({ trainer, openChart, dialog });
  handlers.current = { trainer, openChart, dialog };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { trainer, openChart, dialog } = handlers.current;
      if (dialog || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, select, textarea")) return; // the count box handles its own keys

      const key = e.key.toLowerCase();
      const { session } = trainer;
      const units = Number(key);
      if (session.phase === "bet" && (BET_OPTIONS as readonly number[]).includes(units)) {
        trainer.bet(units);
      } else if (session.phase === "play" && KEY_TO_ACTION[key]) {
        trainer.act(KEY_TO_ACTION[key]);
      } else if ((key === " " || key === "enter") && handOver(session)) {
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
    <div className="bj tcp cc">
      <header className="bj__intro">
        <div className="eyebrow">Tools · Blackjack</div>
        <h1 className="bj__title">
          <span className="bj__level">Level 2:</span> Blackjack Card Counting
        </h1>
        <p className="bj__lede">
          Keep the Hi-Lo count through a real shoe. Before each hand, give the count and size your bet from it; then
          play the hand, including the spots where the count changes the right move.
        </p>
        <p className="bj__rules">{RULES_SUMMARY} · Reshuffle at 75%</p>
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

      <Table
        session={session}
        roundId={trainer.roundId}
        theme={settings.theme}
        showCount={settings.countCheck === "off"}
      />

      <ActionBar
        session={session}
        legal={trainer.legal}
        onCount={trainer.count}
        onBet={trainer.bet}
        onAct={trainer.act}
        onNext={trainer.nextHand}
      />

      <div ref={feedbackRef}>
        <Feedback session={session} onShowChart={openChart} />
      </div>

      <p className="bj__keys">
        Keyboard: <span className="kbd">↑</span> <span className="kbd">↓</span> count ·{" "}
        <span className="kbd">Enter</span> check · <span className="kbd">1</span> <span className="kbd">2</span>{" "}
        <span className="kbd">4</span> <span className="kbd">6</span> <span className="kbd">8</span> bet ·{" "}
        <span className="kbd">H</span> hit · <span className="kbd">S</span> stand · <span className="kbd">D</span>{" "}
        double · <span className="kbd">P</span> split · <span className="kbd">Space</span> next hand ·{" "}
        <span className="kbd">C</span> chart · <span className="kbd">M</span> sound
      </p>

      <Progress stats={stats} />

      <Guide />

      <Modal open={dialog === "chart"} title="Counting cheat sheet" onClose={() => setDialog(null)} wide>
        <CountChart highlight={chartSpot} />
      </Modal>
      <Modal open={dialog === "settings"} title="Table settings" onClose={() => setDialog(null)}>
        <SettingsPanel
          settings={settings}
          onChange={trainer.updateSettings}
          onNewShoe={() => {
            trainer.newShoe();
            setDialog(null);
          }}
          onResetStats={trainer.resetStats}
        />
      </Modal>
    </div>
  );
}
