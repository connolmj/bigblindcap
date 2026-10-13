import { useEffect, useRef, type Ref } from "react";
import { BANKER_HINT } from "../engine/explain";
import { bankerDraws, playerDraws, type DrawSpot } from "../engine/rules";

const TOTALS = [0, 1, 2, 3, 4, 5, 6, 7];
const THIRDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/** The drawing rules on one card. Pass the last call you made to mark it. */
export default function TableauChart({ highlight }: { highlight?: DrawSpot }) {
  const marked = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    marked.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  const isMarked = (side: DrawSpot["side"], total: number, third: number | null) =>
    highlight?.side === side && highlight.total === total && highlight.playerThird === third;
  const cell = (draw: boolean, mark: boolean, key: string | number) => (
    <td
      key={key}
      ref={mark ? (marked as Ref<HTMLTableCellElement>) : undefined}
      className={`chart__cell chart__cell--${draw ? "hit" : "stand"}${mark ? " is-marked" : ""}`}
    >
      {draw ? "D" : "S"}
    </td>
  );

  return (
    <div className="chart bac-chart">
      <div className="chart__legend">
        <span className="chip chip--hit">D Draw</span>
        <span className="chip chip--stand">S Stand</span>
        <span className="chart__legend-note">
          A natural (8 or 9 on the first two cards) on either side ends the hand — nobody draws.
        </span>
      </div>

      <section className="chart__section">
        <h3 className="eyebrow chart__title">Player — always goes first</h3>
        <table className="chart__table">
          <thead>
            <tr>
              <th scope="col" className="chart__corner">
                Player total
              </th>
              {TOTALS.map((t) => (
                <th scope="col" key={t}>
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Player</th>
              {TOTALS.map((t) => cell(playerDraws(t), isMarked("player", t, null), t))}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="chart__section">
        <h3 className="eyebrow chart__title">Banker — depends on the Player's third card</h3>
        <table className="chart__table bac-tableau">
          <thead>
            <tr>
              <th scope="col" className="chart__corner">
                Banker \ P's 3rd
              </th>
              <th scope="col" className="bac-tableau__stood">
                Stood
              </th>
              {THIRDS.map((c) => (
                <th scope="col" key={c}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TOTALS.map((t) => (
              <tr key={t}>
                <th scope="row">{t}</th>
                {cell(bankerDraws(t, null), isMarked("banker", t, null), "stood")}
                {THIRDS.map((c) => cell(bankerDraws(t, c), isMarked("banker", t, c), c))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="chart__foot">
        "Stood": the Player stood on 6 or 7, and the Banker plays the Player's rule. Banker 3–6 in one line:{" "}
        {BANKER_HINT}. A 10 or picture card counts as 0.
      </p>
    </div>
  );
}
