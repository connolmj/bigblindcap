import { useEffect, useRef, useState } from "react";
import { fmtPct } from "../../../tools/bankroll/ui/format";
import type { MarginTable } from "../model/margins";
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

// ---------- Key numbers: how often NFL games end by each margin ----------

const MAX_MARGIN = 21;
const KEY = new Set([3, 7]);
const NEAR_KEY = new Set([6, 10, 14]);

export function MarginChart({ table }: { table: MarginTable }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 230;
  const M = { top: 22, right: 12, bottom: 34, left: 40 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const margins = Array.from({ length: MAX_MARGIN }, (_, i) => i + 1);
  const yMax = 0.16;
  const y = (s: number) => M.top + ih - (Math.min(s, yMax) / yMax) * ih;
  const step = iw / margins.length;
  const bw = Math.max(4, step - 3);
  const x = (m: number) => M.left + (m - 1) * step + (step - bw) / 2;
  const h = hover != null ? { m: hover, s: table.share[hover] ?? 0 } : null;

  return (
    <div className="sb-chart" ref={ref}>
      <svg
        width={W}
        height={H}
        role="img"
        aria-label={`Share of NFL games decided by each margin, ${table.from}–${table.to}`}
        onMouseLeave={() => setHover(null)}
      >
        {[0, 0.05, 0.1, 0.15].map((t) => (
          <g key={t}>
            <line className="sb-grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="sb-axis" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {fmtPct(t)}
            </text>
          </g>
        ))}
        {margins.map((m) => {
          const s = table.share[m] ?? 0;
          const top = y(s);
          const tone = KEY.has(m) ? "is-key" : NEAR_KEY.has(m) ? "is-near" : "";
          return (
            <g key={m} onMouseEnter={() => setHover(m)} onClick={() => setHover(m)}>
              <rect className="sb-hit" x={M.left + (m - 1) * step} y={M.top} width={step} height={ih} />
              <path
                className={`sb-bar ${tone}${hover === m ? " is-hover" : ""}`}
                d={bar(x(m), top, bw, M.top + ih - top)}
              />
              {KEY.has(m) && (
                <text className="sb-label" x={x(m) + bw / 2} y={top - 6} textAnchor="middle">
                  {fmtPct(s, 1)}
                </text>
              )}
              {(W >= 480 || m % 2 === 1) && (
                <text
                  className={KEY.has(m) ? "sb-axis sb-axis--ink" : "sb-axis"}
                  x={x(m) + bw / 2}
                  y={M.top + ih + 15}
                  textAnchor="middle"
                >
                  {m}
                </text>
              )}
            </g>
          );
        })}
        <line className="sb-base" x1={M.left} x2={W - M.right} y1={M.top + ih} y2={M.top + ih} />
        <text className="sb-axis" x={M.left + iw / 2} y={H - 4} textAnchor="middle">
          Final margin (points)
        </text>
      </svg>
      {h && (
        // Top right sits over the short bars past 14, so it never covers 3 or 7.
        <div className="sb-tip" style={{ right: M.right + 6, top: 8 }}>
          <strong>Won by {h.m}</strong>
          <span>
            {fmtPct(h.s, 1)} of games · about 1 in {Math.round(1 / h.s)}
          </span>
        </div>
      )}
    </div>
  );
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
