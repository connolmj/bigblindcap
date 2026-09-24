import { fmtNet } from "./HandView";
import { pct, type Stats } from "./stats";

interface Props {
  stats: Stats;
  onChart: () => void;
  onSettings: () => void;
}

export default function StatsRail({ stats, onChart, onSettings }: Props) {
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
