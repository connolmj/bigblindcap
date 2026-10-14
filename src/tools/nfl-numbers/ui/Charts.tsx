import { useEffect, useRef, useState, type ReactNode } from "react";

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

/** Bar with a rounded top and a square end on the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(3, w / 2, h);
  return `M${x},${y + h}v${-(h - r)}a${r},${r} 0 0 1 ${r},${-r}h${w - 2 * r}a${r},${r} 0 0 1 ${r},${r}v${h - r}z`;
}

const pct = (v: number) => `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`;

/** A light bar, a dark one (key numbers, the favorite covering), the accent one, or a muted one. */
export type Tone = "plain" | "key" | "accent" | "soft";

export interface Bar {
  key: string | number;
  /** Axis label; empty to leave the tick out. */
  tick: string;
  /** A share, 0–1. */
  value: number;
  /** The same bar in the comparison seasons, drawn as a tick mark. */
  compare?: number;
  tone?: Tone;
  /** Print the value above the bar. */
  labelled?: boolean;
  tip: ReactNode;
}

export function BarChart({ bars, xTitle, label }: { bars: Bar[]; xTitle: string; label: string }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 220;
  const M = { top: 22, right: 10, bottom: 36, left: 38 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const max = Math.max(0.01, ...bars.map((b) => Math.max(b.value, b.compare ?? 0)));
  const top = Math.ceil((max * 100) / 5) * 5;
  const y = (v: number) => M.top + ih - (v * 100 * ih) / top;
  const step = iw / bars.length;
  const bw = Math.max(2, Math.min(30, step * 0.72));
  const x = (i: number) => M.left + i * step + (step - bw) / 2;
  const ticks = [0, top / 2, top];
  const h = hover != null ? bars[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(4, x(hover) + bw / 2 - 90), W - 184) : 0;

  return (
    <div className="nn-chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="nn-grid" x1={M.left} x2={W - M.right} y1={y(t / 100)} y2={y(t / 100)} />
            <text className="nn-axis" x={M.left - 6} y={y(t / 100)} dy="0.32em" textAnchor="end">
              {t}%
            </text>
          </g>
        ))}
        {bars.map((b, i) => (
          <g key={b.key} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
            <rect className="nn-hit" x={M.left + i * step} y={M.top} width={step} height={ih} />
            {b.value > 0 && (
              <path
                className={`nn-bar is-${b.tone ?? "plain"}${hover === i ? " is-hover" : ""}`}
                d={barPath(x(i), y(b.value), bw, Math.max(1, y(0) - y(b.value)))}
              />
            )}
            {b.compare != null && b.compare > 0 && (
              <line className="nn-compare" x1={x(i) - 1.5} x2={x(i) + bw + 1.5} y1={y(b.compare)} y2={y(b.compare)} />
            )}
            {b.labelled && (
              <text
                className="nn-label"
                x={x(i) + bw / 2}
                y={Math.min(y(b.value), b.compare != null ? y(b.compare) : Infinity) - 5}
                textAnchor="middle"
              >
                {pct(b.value)}
              </text>
            )}
            {b.tick && (
              <text className="nn-axis" x={x(i) + bw / 2} y={M.top + ih + 15} textAnchor="middle">
                {b.tick}
              </text>
            )}
          </g>
        ))}
        <line className="nn-base" x1={M.left} x2={W - M.right} y1={y(0)} y2={y(0)} />
        <text className="nn-axis" x={M.left + iw / 2} y={H - 3} textAnchor="middle">
          {xTitle}
        </text>
      </svg>
      {h && (
        <div className="nn-tip" style={{ left: tipLeft, top: 4 }}>
          {h.tip}
        </div>
      )}
    </div>
  );
}

export interface Point {
  season: number;
  value: number;
  games: number;
  /** The season isn't over yet. */
  partial: boolean;
}

export function TrendChart({
  points,
  kind,
  refLine,
  range,
  label,
}: {
  points: Point[];
  kind: "pct" | "pts";
  refLine?: { value: number; label: string };
  /** Seasons picked above, shaded. */
  range: [number, number];
  label: string;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const H = 230;
  const M = { top: 16, right: 14, bottom: 28, left: 44 };
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const shown = points.filter((p) => Number.isFinite(p.value));
  if (!shown.length) return <p className="nn__empty">No games match these filters.</p>;

  const unit = kind === "pct" ? 100 : 1;
  const vals = shown.map((p) => p.value * unit);
  if (refLine) vals.push(refLine.value * unit);
  const span = Math.max(...vals) - Math.min(...vals) || 1;
  const stepRaw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(stepRaw));
  const tickStep = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= stepRaw)!;
  const lo = Math.floor(Math.min(...vals) / tickStep) * tickStep;
  const hi = Math.ceil(Math.max(...vals) / tickStep) * tickStep;
  const yTicks: number[] = [];
  for (let t = lo; t <= hi + 1e-9; t += tickStep) yTicks.push(Math.round(t * 100) / 100);

  const first = points[0].season;
  const last = points.at(-1)!.season;
  const x = (season: number) => M.left + (last === first ? iw / 2 : ((season - first) / (last - first)) * iw);
  const y = (v: number) => M.top + ih - ((v * unit - lo) / (hi - lo || 1)) * ih;
  const fmtTick = (t: number) => (kind === "pct" ? `${t}%` : t > 0 && refLine?.value === 0 ? `+${t}` : `${t}`);
  const fmtVal = (v: number) =>
    kind === "pct"
      ? `${(v * 100).toFixed(1)}%`
      : refLine?.value === 0
        ? `${v > 0 ? "+" : ""}${v.toFixed(1)}`
        : v.toFixed(1);
  const line = shown.map((p, i) => `${i ? "L" : "M"}${x(p.season).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const h = hover != null ? shown[hover] : null;
  const half = iw / Math.max(1, last - first) / 2;
  const tipLeft = h ? Math.min(Math.max(4, x(h.season) - 80), W - 164) : 0;

  return (
    <div className="nn-chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        <rect
          className="nn-range"
          x={x(Math.max(range[0], first)) - half}
          y={M.top}
          width={x(Math.min(range[1], last)) - x(Math.max(range[0], first)) + 2 * half}
          height={ih}
        />
        {yTicks.map((t) => (
          <g key={t}>
            <line className="nn-grid" x1={M.left} x2={W - M.right} y1={y(t / unit)} y2={y(t / unit)} />
            <text className="nn-axis" x={M.left - 6} y={y(t / unit)} dy="0.32em" textAnchor="end">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {refLine && (
          <g>
            <line className="nn-ref" x1={M.left} x2={W - M.right} y1={y(refLine.value)} y2={y(refLine.value)} />
            <text className="nn-ref-label" x={W - M.right} y={y(refLine.value) - 5} textAnchor="end">
              {refLine.label}
            </text>
          </g>
        )}
        {points
          .filter((p) => p.season % 5 === 0 || p.season === first || p.season === last)
          .filter((p, i, a) => i === a.length - 1 || x(a[i + 1].season) - x(p.season) > 34)
          .map((p) => (
            <text key={p.season} className="nn-axis" x={x(p.season)} y={M.top + ih + 17} textAnchor="middle">
              {p.season}
            </text>
          ))}
        <path className="nn-line" d={line} />
        {shown.map((p, i) => (
          <g key={p.season} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)}>
            <rect className="nn-hit" x={x(p.season) - half} y={M.top} width={2 * half} height={ih} />
            <circle
              className={`nn-dot${p.partial ? " is-partial" : ""}${hover === i ? " is-hover" : ""}`}
              cx={x(p.season)}
              cy={y(p.value)}
              r={hover === i ? 4.5 : 3}
            />
          </g>
        ))}
      </svg>
      {h && (
        <div className="nn-tip" style={{ left: tipLeft, top: 4 }}>
          <strong>
            {h.season}
            {h.partial ? " (so far)" : ""}: {fmtVal(h.value)}
          </strong>
          <span>{h.games.toLocaleString("en-US")} games</span>
        </div>
      )}
    </div>
  );
}
