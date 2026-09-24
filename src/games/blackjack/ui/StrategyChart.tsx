import { useEffect, useRef } from "react";
import { DEALER_UPCARDS, HARD, PAIRS, SOFT, type Cell, type TableName } from "../engine/strategy";

export interface ChartSpot {
  table: TableName;
  rowKey: number;
  upValue: number;
}

const ROW_LABELS: Record<TableName, (k: number) => string> = {
  hard: (k) => (k === 8 ? "≤8" : k === 17 ? "17+" : String(k)),
  soft: (k) => `A,${k - 11}`,
  pair: (k) => (k === 11 ? "A,A" : `${k},${k}`),
};

const SECTIONS: { table: TableName; title: string; rows: Record<number, Cell[]>; order: number[] }[] = [
  { table: "hard", title: "Hard totals", rows: HARD, order: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8] },
  { table: "soft", title: "Soft totals", rows: SOFT, order: [20, 19, 18, 17, 16, 15, 14, 13] },
  { table: "pair", title: "Pairs", rows: PAIRS, order: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2] },
];

const CELL_CLASS: Record<Cell, string> = { H: "hit", S: "stand", D: "double", Ds: "double", P: "split" };

export default function StrategyChart({ highlight }: { highlight?: ChartSpot }) {
  const marked = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    marked.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight]);

  return (
    <div className="chart">
      <div className="chart__legend">
        <span className="chip chip--hit">H Hit</span>
        <span className="chip chip--stand">S Stand</span>
        <span className="chip chip--double">D Double</span>
        <span className="chip chip--split">P Split</span>
        <span className="chart__legend-note">
          <b>D</b> = double, or hit if you can't · <b>Ds</b> = double, or stand if you can't
        </span>
      </div>

      {SECTIONS.map((section) => (
        <section key={section.table} className="chart__section">
          <h3 className="eyebrow chart__title">{section.title}</h3>
          <table className="chart__table">
            <thead>
              <tr>
                <th scope="col" className="chart__corner">
                  You \ Dealer
                </th>
                {DEALER_UPCARDS.map((up) => (
                  <th scope="col" key={up}>
                    {up === 11 ? "A" : up}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.order.map((rowKey) => (
                <tr key={rowKey}>
                  <th scope="row">{ROW_LABELS[section.table](rowKey)}</th>
                  {section.rows[rowKey].map((cell, col) => {
                    const up = DEALER_UPCARDS[col];
                    const isMarked =
                      highlight?.table === section.table && highlight.rowKey === rowKey && highlight.upValue === up;
                    return (
                      <td
                        key={col}
                        ref={isMarked ? marked : undefined}
                        className={`chart__cell chart__cell--${CELL_CLASS[cell]}${isMarked ? " is-marked" : ""}`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <p className="chart__foot">For 6 decks, dealer stands on soft 17, double after split allowed, no surrender.</p>
    </div>
  );
}
