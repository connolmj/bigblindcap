import { fmtNet } from "../../blackjack/ui/HandView";
import { ChartIcon, GearIcon, SpeakerIcon } from "../../blackjack/ui/StatsRail";
import type { Stats } from "./stats";

interface Props {
  stats: Stats;
  onChart: () => void;
  onSettings: () => void;
  sound: boolean;
  onToggleSound: () => void;
}

/** Same rail as the other trainers, with results instead of accuracy — there's nothing to grade. */
export default function StatsRail({ stats, onChart, onSettings, sound, onToggleSound }: Props) {
  return (
    <div className="rail">
      <div className="rail__stat rail__stat--lead">
        <div className="eyebrow">Hands</div>
        <div className="rail__big">{stats.hands}</div>
      </div>
      <div className="rail__stat">
        <div className="eyebrow">Net</div>
        <div className={`rail__num ${stats.net > 0 ? "is-win" : stats.net < 0 ? "is-loss" : ""}`}>
          {fmtNet(Math.round(stats.net * 100) / 100)}
        </div>
        <div className="rail__meta">on your bets</div>
      </div>
      <div className="rail__stat">
        <div className="eyebrow">Banker</div>
        <div className="rail__num">{stats.wins.banker}</div>
        <div className="rail__meta">wins</div>
      </div>
      <div className="rail__stat">
        <div className="eyebrow">Player</div>
        <div className="rail__num">{stats.wins.player}</div>
        <div className="rail__meta">wins</div>
      </div>
      <div className="rail__stat">
        <div className="eyebrow">Tie</div>
        <div className="rail__num">{stats.wins.tie}</div>
        <div className="rail__meta">hands</div>
      </div>
      <div className="rail__tools">
        <button
          className="tool-btn tool-btn--icon"
          onClick={onToggleSound}
          aria-pressed={sound}
          aria-label={sound ? "Sound on — click to mute" : "Sound off — click to unmute"}
          title={sound ? "Mute (M)" : "Unmute (M)"}
        >
          <SpeakerIcon on={sound} />
        </button>
        <button className="tool-btn" onClick={onChart} aria-keyshortcuts="C">
          <ChartIcon /> Chart
        </button>
        <button className="tool-btn" onClick={onSettings}>
          <GearIcon /> Table
        </button>
      </div>
    </div>
  );
}
