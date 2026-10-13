import { useEffect, useRef, useState } from "react";
import "../../blackjack/ui/blackjack.css";
import Modal from "../../blackjack/ui/Modal";
import { setSoundEnabled, unlockAudio } from "../../blackjack/ui/sound";
import StatsRail from "../../three-card/ui/StatsRail";
import "../../three-card/ui/three-card.css";
import type { Bet } from "../engine/payouts";
import { currentSpot } from "../engine/round";
import type { DrawAction, DrawSpot } from "../engine/rules";
import ActionBar from "./ActionBar";
import Feedback from "./Feedback";
import Guide from "./Guide";
import Progress from "./Progress";
import SettingsPanel from "./SettingsPanel";
import TableauChart from "./TableauChart";
import Table from "./Table";
import { useTrainer } from "./useTrainer";
import "./baccarat.css";

const KEY_TO_BET: Record<string, Bet> = { p: "player", b: "banker", t: "tie" };
const KEY_TO_DRAW: Record<string, DrawAction> = { d: "draw", s: "stand" };

export default function BaccaratTrainer() {
  const trainer = useTrainer();
  const { round, stats, settings } = trainer;
  const [dialog, setDialog] = useState<"chart" | "settings" | null>(null);
  const [chartSpot, setChartSpot] = useState<DrawSpot | undefined>();
  const spot = currentSpot(round);

  // Points the chart at your most recent draw call, even from an earlier hand —
  // never the one you're on (no peeking!).
  const lastCall = useRef<DrawSpot | undefined>(undefined);
  const lastDraw = [...round.decisions].reverse().find((d) => d.kind === "draw");
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

  // After each call, make sure the result box is on screen — scrolling down
  // just enough, but never past the stats bar.
  const railRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const fb = feedbackRef.current;
    if (!rail || !fb || round.decisions.length === 0) return;
    const overflow = fb.getBoundingClientRect().bottom + 12 - window.innerHeight;
    const room = rail.getBoundingClientRect().top - 8;
    const by = Math.min(overflow, room);
    if (by > 0) window.scrollBy({ top: by, behavior: "smooth" });
  }, [round.decisions.length, round.phase]);

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
      } else if ((phase === "playerDraw" || phase === "bankerDraw") && KEY_TO_DRAW[key]) {
        trainer.draw(KEY_TO_DRAW[key]);
      } else if ((key === " " || key === "enter") && phase === "settled") {
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
    <div className="bj tcp bac">
      <header className="bj__intro">
        <div className="eyebrow">Tools · Baccarat</div>
        <h1 className="bj__title">Baccarat Strategy</h1>
        <p className="bj__lede">
          Pick the right bet, then call every third card the way the dealer has to. After each call you'll see whether
          it was right, and why.
        </p>
        <p className="bj__rules">
          8 decks · {settings.commission === "standard" ? "5% commission on Banker" : "No commission · Banker 6 pays ½"}{" "}
          · Tie pays 8 to 1
        </p>
      </header>

      <div ref={railRef}>
        <StatsRail
          stats={stats}
          costDigits={3}
          sound={settings.sound}
          onToggleSound={() => trainer.updateSettings({ sound: !settings.sound })}
          onChart={openChart}
          onSettings={() => setDialog("settings")}
        />
      </div>

      <Table key={trainer.roundId} round={round} theme={settings.theme} />

      <ActionBar
        phase={round.phase}
        spot={spot}
        commission={round.commission}
        onBet={trainer.bet}
        onDraw={trainer.draw}
        onNext={trainer.nextHand}
      />

      <div ref={feedbackRef}>
        <Feedback round={round} onShowChart={openChart} />
      </div>

      <p className="bj__keys">
        Keyboard: <span className="kbd">P</span> Player · <span className="kbd">B</span> Banker ·{" "}
        <span className="kbd">T</span> Tie · <span className="kbd">D</span> draw · <span className="kbd">S</span> stand
        · <span className="kbd">Space</span> next hand · <span className="kbd">C</span> chart ·{" "}
        <span className="kbd">M</span> sound
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
