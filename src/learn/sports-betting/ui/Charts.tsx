import { useEffect, useRef, useState } from "react";
import { fmtPct } from "../../../tools/bankroll/ui/format";
import type { ParlayRow } from "../model/odds";

/** Width of an element, kept up to date as it resizes. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(680);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** Bar with rounded top (or bottom, for bars hanging below the axis) and a square end on the baseline. */
function bar(x: number, y: number, w: number, h: number, down = false): string {
  const r = Math.min(4, w / 2, h);
  if (down) {
    return `M${x},${y}h${w}v${h - r}a${r},${r} 0 0 1 ${-r},${r}h${-(w - 2 * r)}a${r},${r} 0 0 1 ${-r},${-r}z`;
  }
  return `M${x},${y + h}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}z`;
}

// ---------- Parlays: expected loss per $100 as legs are added ----------

export function ParlayChart({ rows }: { rows: ParlayRow[] }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 230;
  const M = { top: 30, right: 12, bottom: 34, left: 48 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  // Losses hang down from a $0 line at the top; the scale always reaches at least −$50.
  const worst = Math.max(50, Math.ceil((-Math.min(...rows.map((r) => r.ev)) * 100) / 10) * 10);
  const y = (loss: number) => M.top + (loss / worst) * ih;
  const step = iw / rows.length;
  const bw = Math.max(6, Math.min(44, step - 6));
  const x = (i: number) => M.left + i * step + (step - bw) / 2;
  const ticks = [0, worst / 2, worst];
  const h = hover != null ? rows[hover] : null;

  return (
    <div className="sb-chart" ref={ref}>
      <svg
        width={W}
        height={H}
        role="img"
        aria-label="Expected loss per $100 parlay, by number of legs"
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="sb-grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="sb-axis" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {t === 0 ? "$0" : `−$${t}`}
            </text>
          </g>
        ))}
        {rows.map((r, i) => {
          const loss = -r.ev * 100;
          const labelled = i === 0 || i === rows.length - 1 || i === hover;
          return (
            <g key={r.legs} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
              <rect className="sb-hit" x={M.left + i * step} y={M.top} width={step} height={ih} />
              <path
                className={`sb-bar is-loss${hover === i ? " is-hover" : ""}`}
                d={bar(x(i), y(0), bw, Math.max(1, y(loss) - y(0)), true)}
              />
              {labelled && (
                <text className="sb-label" x={x(i) + bw / 2} y={y(loss) + 14} textAnchor="middle">
                  −${loss.toFixed(0)}
                </text>
              )}
              <text className="sb-axis" x={x(i) + bw / 2} y={M.top + ih + 18} textAnchor="middle">
                {r.legs}
              </text>
            </g>
          );
        })}
        <line className="sb-base" x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} />
        <text className="sb-axis" x={M.left + iw / 2} y={H - 2} textAnchor="middle">
          Legs in the parlay
        </text>
      </svg>
      {h && (
        // Bottom left is empty: the first legs lose the least, so their bars are short.
        <div className="sb-tip" style={{ left: M.left + 8, bottom: M.bottom + 8 }}>
          <strong>
            {h.legs} {h.legs === 1 ? "leg (straight bet)" : "legs"}
          </strong>
          <span>
            Hits {fmtPct(h.winChance, h.winChance < 0.01 ? 2 : 1)} · you lose ${(-h.ev * 100).toFixed(2)} per $100
          </span>
        </div>
      )}
    </div>
  );
}
