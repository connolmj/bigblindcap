import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Bin } from "../model/bins";
import { ticks } from "../model/bins";
import { checkpoints, type SimResult } from "../model/sim";
import { fmtMoney, fmtPct, fmtSigned } from "./format";

const H = 250;
const M = { top: 14, right: 14, bottom: 30, left: 58 };

/** Width of an element, kept up to date as it resizes. */
function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(720);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function Tip({
  x,
  y,
  w,
  pinned,
  children,
}: {
  x: number;
  y: number;
  w: number;
  pinned?: boolean;
  children: ReactNode;
}) {
  const left = Math.min(Math.max(x, 90), w - 90);
  return (
    <div className={pinned ? "br-tip is-pinned" : "br-tip"} style={{ left, top: y }}>
      {children}
    </div>
  );
}

// ---------- End-of-season distribution ----------

export function OutcomeHistogram({
  bins,
  seasons,
  edge,
  mean,
}: {
  bins: Bin[];
  seasons: number;
  edge: number;
  mean: number;
}) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (!bins.length) return null;

  const T = 30; // room above the bars for the break-even / expected labels
  const iw = W - M.left - M.right;
  const ih = H - T - M.bottom;
  const x0 = bins[0].lo;
  const x1 = bins[bins.length - 1].hi;
  const x = (v: number) => M.left + ((v - x0) / (x1 - x0)) * iw;
  const maxShare = Math.max(...bins.map((b) => b.count)) / seasons;
  const yTicks = ticks(0, maxShare, 4);
  const yMax = Math.max(maxShare, yTicks[yTicks.length - 1]);
  const y = (share: number) => T + ih - (share / yMax) * ih;
  const xTicks = ticks(x0, x1, W < 480 ? 4 : 6);
  const bw = iw / bins.length;
  const gap = bw > 6 ? 2 : bw > 3 ? 1 : 0;
  const h = hover != null ? bins[hover] : null;

  return (
    <div className="br-chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label="Histogram of end-of-season profit across simulated seasons">
        {yTicks.map((t) => (
          <g key={t}>
            <line className="br-grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="br-axis" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {fmtPct(t, (yTicks[1] ?? 1) - yTicks[0] < 0.01 ? 1 : 0)}
            </text>
          </g>
        ))}
        {bins.map((b, i) => {
          const top = y(b.count / seasons);
          const win = b.lo >= edge - 1e-6;
          return (
            <path
              key={i}
              className={`br-bar ${win ? "is-up" : "is-down"}${hover === i ? " is-hover" : ""}`}
              d={barPath(x(b.lo) + gap / 2, top, Math.max(1, bw - gap), T + ih - top)}
            />
          );
        })}
        <line className="br-base" x1={M.left} x2={W - M.right} y1={T + ih} y2={T + ih} />
        {edge > x0 && edge < x1 && (
          <g>
            <line className="br-zero" x1={x(edge)} x2={x(edge)} y1={T - 12} y2={T + ih} />
            <text
              className="br-note"
              x={x(edge) + (mean < edge ? 4 : -4)}
              y={T - 16}
              textAnchor={mean < edge ? "start" : "end"}
            >
              Break even
            </text>
          </g>
        )}
        {mean > x0 && mean < x1 && (
          <g>
            <line className="br-mean" x1={x(mean)} x2={x(mean)} y1={T - 12} y2={T + ih} />
            <text
              className="br-note br-note--ink"
              x={x(mean) + (mean < edge ? -4 : 4)}
              y={T - 16}
              textAnchor={mean < edge ? "end" : "start"}
            >
              Expected
            </text>
          </g>
        )}
        {xTicks.map((t) => (
          <text key={t} className="br-axis" x={x(t)} y={H - 10} textAnchor="middle">
            {fmtSigned(t)}
          </text>
        ))}
        {bins.map((_, i) => (
          <rect
            key={i}
            x={M.left + i * bw}
            y={T}
            width={bw}
            height={ih}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </svg>
      {h && (
        <Tip x={x((h.lo + h.hi) / 2)} y={y(h.count / seasons) - 8} w={W}>
          <strong>
            {h.open === "below"
              ? `${fmtSigned(h.hi)} or worse`
              : h.open === "above"
                ? `${fmtSigned(h.lo)} or better`
                : `${fmtSigned(h.lo)} to ${fmtSigned(h.hi)}`}
          </strong>
          <span>{fmtPct(h.count / seasons, 1)} of seasons</span>
        </Tip>
      )}
    </div>
  );
}

/** A bar with 4px rounded corners on the data end only. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`;
}

// ---------- Bankroll over the season ----------

export function BankrollPaths({ result, bets, bankroll }: { result: SimResult; bets: number; bankroll: number }) {
  const [ref, W] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const { bands, samples } = result;
  const at = checkpoints(bets);

  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;
  const lo = Math.min(0, ...bands.p5);
  const hi = Math.max(bankroll * 1.2, ...bands.p95);
  const yTicks = ticks(lo, hi, 5);
  const y0 = Math.min(lo, yTicks[0]);
  const y1 = Math.max(hi, yTicks[yTicks.length - 1]);
  const x = (t: number) => M.left + (t / bets) * iw;
  const y = (v: number) => M.top + ih - ((v - y0) / (y1 - y0)) * ih;
  const xTicks = ticks(0, bets, W < 480 ? 4 : 6);

  const area = (upper: number[], lower: number[]) =>
    upper.map((v, i) => `${i ? "L" : "M"}${x(at[i]).toFixed(1)} ${y(v).toFixed(1)}`).join("") +
    lower
      .map((_, i) => {
        const j = lower.length - 1 - i;
        return `L${x(at[j]).toFixed(1)} ${y(lower[j]).toFixed(1)}`;
      })
      .join("") +
    "Z";
  const line = (vals: number[], idx: (i: number) => number) =>
    vals.map((v, i) => `${i ? "L" : "M"}${x(idx(i)).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  // Thin each sample path to the checkpoints so long seasons stay light.
  const sampleLine = (p: number[]) =>
    line(
      at.map((t) => p[t]),
      (i) => at[i],
    );

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - box.left) / box.width) * bets;
    let best = 0;
    for (let i = 1; i < at.length; i++) if (Math.abs(at[i] - t) < Math.abs(at[best] - t)) best = i;
    setHover(best);
  };

  return (
    <div className="br-chart" ref={ref}>
      <svg width={W} height={H} role="img" aria-label="Bankroll over the season: percentile bands and sample seasons">
        <defs>
          <clipPath id="br-plot">
            <rect x={M.left} y={M.top} width={iw} height={ih} />
          </clipPath>
        </defs>
        {yTicks.map((t) => (
          <g key={t}>
            <line className="br-grid" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text className="br-axis" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {fmtMoney(t)}
            </text>
          </g>
        ))}
        <g clipPath="url(#br-plot)">
          <path className="br-band br-band--outer" d={area(bands.p95, bands.p5)} />
          <path className="br-band br-band--inner" d={area(bands.p75, bands.p25)} />
          {samples.map((p, i) => (
            <path key={i} className={p[p.length - 1] < bankroll ? "br-path is-down" : "br-path"} d={sampleLine(p)} />
          ))}
          <line className="br-start" x1={M.left} x2={W - M.right} y1={y(bankroll)} y2={y(bankroll)} />
          <path className="br-median" d={line(bands.p50, (i) => at[i])} />
        </g>
        <line className="br-base" x1={M.left} x2={W - M.right} y1={M.top + ih} y2={M.top + ih} />
        {xTicks.map((t) => (
          <text key={t} className="br-axis" x={x(t)} y={H - 10} textAnchor="middle">
            {t === 0 ? "Bet 0" : t}
          </text>
        ))}
        {hover != null && (
          <g>
            <line className="br-cross" x1={x(at[hover])} x2={x(at[hover])} y1={M.top} y2={M.top + ih} />
            <circle className="br-dot" cx={x(at[hover])} cy={y(bands.p50[hover])} r={4} />
          </g>
        )}
        <rect
          x={M.left}
          y={M.top}
          width={iw}
          height={ih}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover != null && (
        <Tip x={x(at[hover])} y={M.top + 4} w={W} pinned>
          <strong>After bet {at[hover]}</strong>
          <span>Median {fmtMoney(bands.p50[hover])}</span>
          <span>
            Middle half {fmtMoney(bands.p25[hover])}–{fmtMoney(bands.p75[hover])}
          </span>
          <span>
            90% range {fmtMoney(bands.p5[hover])}–{fmtMoney(bands.p95[hover])}
          </span>
        </Tip>
      )}
    </div>
  );
}
