import type { Rules, SpotId } from "../engine/bets";
import { pct } from "../engine/explain";
import { GOOD_EDGE } from "../engine/grade";
import { rowFor, rowsByEdge } from "./betRows";

/** Every bet's house edge on one scale, with the 2% line drawn across. */
export default function EdgeChart({ rules, highlight }: { rules: Rules; highlight?: SpotId }) {
  const rows = rowsByEdge(rules);
  const max = Math.max(...rows.map((r) => r.math.edge));
  const mark = highlight ? rowFor(highlight)?.label : undefined;
  return (
    <div className="crp-chart">
      <p className="tcp-chart__rule">
        Bets left of the line give the house less than {pct(GOOD_EDGE, 0)} — those are the ones the trainer counts as
        right. Numbers are for this table's rules.
      </p>
      <div className="crp-chart__rows" style={{ ["--line" as string]: `${(GOOD_EDGE / max) * 100}%` }}>
        {rows.map((r) => (
          <div
            key={r.label}
            className={`crp-chart__row${r.good ? " is-good" : " is-bad"}${r.label === mark ? " is-marked" : ""}`}
          >
            <span className="crp-chart__name">
              {r.label}
              <small>{r.note}</small>
            </span>
            <span className="crp-chart__track">
              <span className="crp-chart__bar" style={{ width: `${(r.math.edge / max) * 100}%` }} />
              <span className="crp-chart__line" aria-hidden="true" />
            </span>
            <span className="crp-chart__num">{pct(r.math.edge)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
