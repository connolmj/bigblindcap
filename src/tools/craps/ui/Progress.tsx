import { GROUP_LABEL, type Group } from "../engine/explain";
import { pct, type Stats } from "./stats";

export default function Progress({ stats }: { stats: Stats }) {
  if (stats.decisions === 0) return null;
  const misses = Object.entries(stats.misses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <section className="progress">
      <div className="progress__col">
        <h3 className="eyebrow">By bet type</h3>
        {(Object.keys(GROUP_LABEL) as Group[]).map((k) => {
          const b = stats.byGroup[k] ?? { n: 0, correct: 0 };
          const p = pct(b.correct, b.n);
          return (
            <div key={k} className="progress__row bac-progress__row">
              <span className="progress__label">{GROUP_LABEL[k]}</span>
              <span className="progress__bar" aria-hidden="true">
                <span style={{ width: `${p ?? 0}%` }} />
              </span>
              <span className="progress__pct">{p === null ? "—" : `${p}%`}</span>
            </div>
          );
        })}
      </div>
      <div className="progress__col">
        <h3 className="eyebrow">Bets you keep making</h3>
        {misses.length === 0 ? (
          <p className="progress__empty">Nothing yet — clean sheet.</p>
        ) : (
          <ol className="progress__misses">
            {misses.map(([name, n]) => (
              <li key={name}>
                <span>{name}</span>
                <span className="progress__count">×{n}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
