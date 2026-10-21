import { RAMP } from "../engine/betting";
import { DEVIATIONS, type Deviation } from "../engine/deviations";
import { deviationRule } from "../engine/explain";
import { fmtCount } from "../engine/hilo";

const VALUES: { cards: string; n: number }[] = [
  { cards: "2 3 4 5 6", n: 1 },
  { cards: "7 8 9", n: 0 },
  { cards: "10 J Q K A", n: -1 },
];

/** Everything a counter keeps in their head, on one card. Pass the last count spot you hit to mark it. */
export default function CountChart({ highlight }: { highlight?: Deviation }) {
  // Highest indexes first, like most printed lists; negatives at the end.
  const plays = [...DEVIATIONS].sort((a, b) => b.index - a.index);
  return (
    <div className="chart cc-chart">
      <section className="chart__section">
        <h3 className="eyebrow chart__title">Hi-Lo card values</h3>
        <div className="cc-values">
          {VALUES.map((v) => (
            <div
              key={v.cards}
              className={`cc-values__cell cc-values__cell--${v.n > 0 ? "up" : v.n < 0 ? "down" : "zero"}`}
            >
              <span className="cc-values__n">{fmtCount(v.n)}</span>
              <span className="cc-values__cards">{v.cards}</span>
            </div>
          ))}
        </div>
        <p className="chart__foot">
          True count = running count ÷ decks left (to the nearest half deck), rounded toward zero.
        </p>
      </section>

      <section className="chart__section">
        <h3 className="eyebrow chart__title">Bet ramp</h3>
        <table className="chart__table cc-ramp">
          <thead>
            <tr>
              <th scope="row">True count</th>
              {RAMP.map((r) => (
                <th scope="col" key={r.tc}>
                  {r.tc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Bet</th>
              {RAMP.map((r) => (
                <td key={r.tc}>{r.units}u</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="chart__section">
        <h3 className="eyebrow chart__title">Count plays — everything else is basic strategy</h3>
        <ol className="cc-plays">
          {plays.map((v) => (
            <li key={`${v.table}${v.row}${v.up}`} className={v === highlight ? "is-marked" : undefined}>
              {deviationRule(v)}
            </li>
          ))}
        </ol>
        <p className="chart__foot">
          Doubles only on your first two cards. The 18th play of the "Illustrious 18" is insurance at +3 or more; this
          table doesn't offer it.
        </p>
      </section>
    </div>
  );
}
