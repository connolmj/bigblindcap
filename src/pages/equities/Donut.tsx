import { useState } from "react";
import { displayTicker, kindOf, type Kind, type Position } from "../../data/equities";
import { fmtBig, fmtPct, toneClass } from "../../data/format";

const ORDER: Record<Kind, number> = { Stock: 0, Crypto: 1, Cash: 2 };
const CX = 120;
const CY = 120;
const R = 112;
const R0 = 70;

/** Stocks: ink → grey. Crypto: amber shades. Cash: pale grey. */
function ramp(kind: Kind, i: number, count: number): string {
  const f = i / Math.max(count - 1, 1);
  if (kind === "Stock") return `oklch(${(0.24 + f * 0.46).toFixed(3)} 0.02 265)`;
  if (kind === "Crypto") return `oklch(${(0.5 + f * 0.32).toFixed(3)} 0.11 70)`;
  return "oklch(0.9 0.006 260)";
}

const pt = (rad: number, a: number) => (CX + rad * Math.sin(a)).toFixed(2) + " " + (CY - rad * Math.cos(a)).toFixed(2);

/** SVG path for a ring segment from angle a0 to a1 (radians, clockwise from 12 o'clock). */
function arc(a0: number, a1: number): string {
  if (a1 - a0 >= Math.PI * 2 - 1e-6) a1 = a0 + Math.PI * 2 - 1e-4;
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${pt(R, a0)} A${R} ${R} 0 ${big} 1 ${pt(R, a1)} L${pt(R0, a1)} A${R0} ${R0} 0 ${big} 0 ${pt(R0, a0)} Z`;
}

interface Slice {
  ticker: string;
  kind: Kind;
  units: number;
  frac: number;
  ret: number;
  delta: number;
  path: string;
  fill: string;
}

export function buildSlices(positions: Position[], total: number): Slice[] {
  const items = positions
    .map((p) => ({ p, kind: kindOf(p) }))
    .filter((x) => x.p.units > 0)
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.p.units - a.p.units);
  const counts: Record<Kind, number> = { Stock: 0, Crypto: 0, Cash: 0 };
  items.forEach((x) => counts[x.kind]++);
  const seen: Record<Kind, number> = { Stock: 0, Crypto: 0, Cash: 0 };
  let a = 0;
  return items.map(({ p, kind }) => {
    const frac = total ? p.units / total : 0;
    const a0 = a;
    a += frac * Math.PI * 2;
    const start = p.start != null && p.start > 0 ? p.start : p.units;
    return {
      ticker: displayTicker(p),
      kind,
      units: p.units,
      frac,
      ret: start ? ((p.units - start) / start) * 100 : 0,
      delta: p.units - start,
      path: arc(a0, a),
      fill: ramp(kind, seen[kind]++, counts[kind]),
    };
  });
}

export default function Donut({ positions, total }: { positions: Position[]; total: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const slices = buildSlices(positions, total);
  const active = hover ?? selected;
  const act = slices.find((s) => s.ticker === active);
  const sel = slices.find((s) => s.ticker === selected);

  const groups = (["Stock", "Crypto", "Cash"] as Kind[])
    .map((k) => {
      const inKind = slices.filter((s) => s.kind === k);
      const units = inKind.reduce((sum, s) => sum + s.units, 0);
      return {
        kind: k,
        name: k === "Stock" ? "Stocks" : k,
        n: inKind.length,
        fill: ramp(k, Math.floor((inKind.length - 1) / 2), inKind.length),
        pct: ((total ? units / total : 0) * 100).toFixed(1) + "%",
      };
    })
    .filter((g) => g.n);

  return (
    <>
      <div className="donut">
        <div className="donut__chart">
          <svg viewBox="0 0 240 240" onMouseLeave={() => setHover(null)} role="img" aria-label="Allocation by position">
            {slices.map((s) => (
              <path
                key={s.ticker}
                d={s.path}
                fill={s.fill}
                stroke="#fff"
                strokeWidth={1.5}
                style={{ opacity: active == null || active === s.ticker ? 1 : 0.28 }}
                onMouseEnter={() => setHover(s.ticker)}
                onClick={() => setSelected(selected === s.ticker ? null : s.ticker)}
              >
                <title>{`${s.ticker} · ${s.units.toFixed(2)}u · ${(s.frac * 100).toFixed(1)}%`}</title>
              </path>
            ))}
          </svg>
          <div className="donut__center">
            <div className="eyebrow">{act ? act.kind : "Equities"}</div>
            <div className="donut__title">{act ? act.ticker : fmtBig(total)}</div>
            <div className="donut__sub">
              {act ? `${act.units.toFixed(2)}u · ${(act.frac * 100).toFixed(1)}%` : `${slices.length} positions`}
            </div>
          </div>
        </div>
        <div className="hold" onMouseLeave={() => setHover(null)}>
          {/* Stocks in one column; crypto and cash in the other. */}
          {[groups.slice(0, 1), groups.slice(1)].map((col, ci) => (
            <div key={ci} className="hold__col">
              {col.map((g) => (
                <div key={g.kind} className="hold__group">
                  <div className="hold__head">
                    <span className="donut__swatch" style={{ background: g.fill }} />
                    <span className="hold__name">{g.name}</span>
                    <span className="hold__pct">{g.pct}</span>
                  </div>
                  {slices
                    .filter((sl) => sl.kind === g.kind)
                    .map((sl) => (
                      <button
                        key={sl.ticker}
                        className={[
                          "hold__row",
                          active === sl.ticker ? "is-active" : "",
                          selected === sl.ticker ? "is-selected" : "",
                        ].join(" ")}
                        onMouseEnter={() => setHover(sl.ticker)}
                        onFocus={() => setHover(sl.ticker)}
                        onClick={() => setSelected(selected === sl.ticker ? null : sl.ticker)}
                        title={`${sl.ticker} · ${sl.units.toFixed(2)}u`}
                      >
                        <span className="hold__dot" style={{ background: sl.fill }} />
                        <span className="hold__ticker">{sl.ticker}</span>
                        <span className="hold__weight">{(sl.frac * 100).toFixed(1)}%</span>
                        <span className={`hold__ret ${Math.round(sl.ret * 10) === 0 ? "" : toneClass(sl.delta)}`}>
                          {Math.round(sl.ret * 10) === 0 ? "—" : (sl.ret > 0 ? "+" : "") + fmtPct(sl.ret)}
                        </span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          ))}
          <p className="hold__foot">Share of the book · return since start · click a position for detail</p>
        </div>
      </div>

      {sel && (
        <div className="donut__detail">
          <div className="donut__detail-head">
            <div>
              <span className="donut__detail-ticker">{sel.ticker}</span>
              <span className="eyebrow">{sel.kind}</span>
            </div>
            <button className="eyebrow donut__close" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          <div className="donut__detail-grid">
            <Fact value={`${sel.units.toFixed(2)}u`} label="Units" />
            <Fact value={(sel.frac * 100).toFixed(1) + "%"} label="Of book" />
            <Fact
              value={fmtPct(sel.ret)}
              label="Since start"
              tone={Math.round(sel.ret * 10) === 0 ? "" : toneClass(sel.delta)}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Fact({ value, label, tone = "" }: { value: string; label: string; tone?: string }) {
  return (
    <div>
      <div className={`donut__fact ${tone}`}>{value}</div>
      <div className="eyebrow donut__fact-label">{label}</div>
    </div>
  );
}
