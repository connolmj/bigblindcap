import { pct, type Stats } from "./stats";

const LABELS = { hard: "Hard totals", soft: "Soft totals", pair: "Pairs" } as const;

export default function Progress({ stats }: { stats: Stats }) {
  if (stats.decisions === 0) return null;
  const misses = Object.entries(stats.misses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <section className="progress">
      <div className="progress__col">
        <h3 className="eyebrow">By hand type</h3>
        {(Object.keys(LABELS) as (keyof typeof LABELS)[]).map((k) => {
          const b = stats.byTable[k];
          const p = pct(b.correct, b.n);
          return (
            <div key={k} className="progress__row">
              <span className="progress__label">{LABELS[k]}</span>
              <span className="progress__bar" aria-hidden="true">
                <span style={{ width: `${p ?? 0}%` }} />
              </span>
              <span className="progress__pct">{p === null ? "—" : `${p}%`}</span>
            </div>
          );
        })}
      </div>
      <div className="progress__col">
        <h3 className="eyebrow">Most missed</h3>
        {misses.length === 0 ? (
          <p className="progress__empty">Nothing yet — clean sheet.</p>
        ) : (
          <ol className="progress__misses">
            {misses.map(([spot, n]) => (
              <li key={spot}>
                <span>{spot}</span>
                <span className="progress__count">×{n}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
