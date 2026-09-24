import { fmtNet } from "./HandView";
import { pct, type Stats } from "./stats";

interface Props {
  stats: Stats;
  onChart: () => void;
  onSettings: () => void;
  sound: boolean;
  onToggleSound: () => void;
}

export default function StatsRail({ stats, onChart, onSettings, sound, onToggleSound }: Props) {
  const accuracy = pct(stats.correct, stats.decisions);
  return (
    <div className="rail">
      <div className="rail__stat rail__stat--lead">
        <div className="eyebrow">Streak</div>
        <div className="rail__big">
          {stats.streak}
          {stats.streak >= 5 && (
            <span className="rail__flame" aria-label="on fire">
              🔥
            </span>
          )}
        </div>
      </div>
      <div className="rail__stat">
        <div className="eyebrow">Accuracy</div>
        <div className="rail__num">{accuracy === null ? "—" : `${accuracy}%`}</div>
        <div className="rail__meta">
          {stats.correct} of {stats.decisions}
        </div>
      </div>
      <div className="rail__stat">
        <div className="eyebrow">Best</div>
        <div className="rail__num">{stats.bestStreak}</div>
        <div className="rail__meta">in a row</div>
      </div>
      <div className="rail__stat">
        <div className="eyebrow">Net</div>
        <div className={`rail__num ${stats.net > 0 ? "is-win" : stats.net < 0 ? "is-loss" : ""}`}>
          {fmtNet(stats.net)}
        </div>
        <div className="rail__meta">
          {stats.hands} {stats.hands === 1 ? "hand" : "hands"}
        </div>
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

const ChartIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <path d="M2 2h12v12H2zM2 6h12M2 10h12M6 2v12M10 2v12" fill="none" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <circle cx="8" cy="8" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const SpeakerIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <path d="M2.5 6h2.5l3.5-3v10l-3.5-3H2.5z" fill="currentColor" />
    {on ? (
      <path
        d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.7a6 6 0 0 1 0 8.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    ) : (
      <path d="M10.5 6l4 4M14.5 6l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    )}
  </svg>
);
