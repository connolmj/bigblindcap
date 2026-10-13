import { useEffect, useRef, type Ref } from "react";
import { groupOf, GROUP_LABEL, type Group } from "../engine/explain";
import { evaluateValues, rankLabel, type HandValue } from "../engine/hand";
import { shouldPlay, THRESHOLD } from "../engine/strategy";

const LADDER: { group: Group; play: boolean | null; note: string }[] = [
  { group: "made", play: true, note: "Always. Straights and better also earn the ante bonus." },
  { group: "high", play: true, note: "Always — even K-3-2." },
  { group: "queen", play: null, note: "Play Q-6-4 or better. See the grid below." },
  { group: "weak", play: false, note: "Always fold. It can't beat a dealer who qualifies." },
];

/** Second card J down to 3, third card 2 up to 10. */
const SECONDS = [11, 10, 9, 8, 7, 6, 5, 4, 3];
const THIRDS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

/** The whole strategy on one card. Pass the last hand you played to mark it. */
export default function StrategyChart({ highlight }: { highlight?: HandValue }) {
  const marked = useRef<HTMLElement>(null);
  useEffect(() => {
    marked.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  const markedGroup = highlight ? groupOf(highlight) : undefined;
  const queenCell = markedGroup === "queen" ? highlight!.ranks : undefined;

  return (
    <div className="chart tcp-chart">
      <p className="tcp-chart__rule">
        Play <b>{THRESHOLD.ranks.map(rankLabel).join("-")}</b> or better. Fold everything worse.
      </p>

      <section className="chart__section">
        <h3 className="eyebrow chart__title">By hand</h3>
        <ul className="tcp-ladder">
          {LADDER.map((row) => {
            const isMarked = markedGroup === row.group && row.group !== "queen";
            return (
              <li
                key={row.group}
                ref={isMarked ? (marked as Ref<HTMLLIElement>) : undefined}
                className={isMarked ? "tcp-ladder__row is-marked" : "tcp-ladder__row"}
              >
                <span className="tcp-ladder__name">{GROUP_LABEL[row.group]}</span>
                {row.play === null ? (
                  <span className="chip tcp-ladder__mixed">Depends</span>
                ) : (
                  <span className={`chip chip--${row.play ? "play" : "fold"}`}>{row.play ? "Play" : "Fold"}</span>
                )}
                <span className="tcp-ladder__note">{row.note}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="chart__section">
        <h3 className="eyebrow chart__title">Queen-high: your second and third cards</h3>
        <table className="chart__table tcp-grid">
          <thead>
            <tr>
              <th scope="col" className="chart__corner">
                Q + 2nd \ 3rd
              </th>
              {THIRDS.map((t) => (
                <th scope="col" key={t}>
                  {rankLabel(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SECONDS.map((second) => (
              <tr key={second}>
                <th scope="row">Q-{rankLabel(second)}</th>
                {THIRDS.map((third) => {
                  // Q-J-10 is a straight, not Queen-high.
                  if (third >= second || (second === 11 && third === 10))
                    return <td key={third} className="tcp-grid__blank" />;
                  const play = shouldPlay(evaluateValues([12, second, third], false));
                  const isMarked = queenCell?.[1] === second && queenCell?.[2] === third;
                  return (
                    <td
                      key={third}
                      ref={isMarked ? (marked as Ref<HTMLTableCellElement>) : undefined}
                      className={`chart__cell chart__cell--${play ? "play" : "fold"}${isMarked ? " is-marked" : ""}`}
                      title={`Q-${rankLabel(second)}-${rankLabel(third)}: ${play ? "play" : "fold"}`}
                    >
                      {play ? "P" : "F"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="chart__foot">
        One deck, dealer qualifies with Queen-high, ante bonus 1-4-5. Checked against every one of the 22,100 hands you
        can be dealt.
      </p>
    </div>
  );
}
