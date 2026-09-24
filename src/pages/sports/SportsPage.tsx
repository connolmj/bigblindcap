import { useEffect, useMemo, useState } from "react";
import {
  fmtRecord,
  fmtUnits,
  inScope,
  leaguesPresent,
  parseSheet,
  seasonsPresent,
  SHEET_CSV_URL,
  tally,
  type SheetRows,
} from "./ledger";
import { SAMPLE_CARD, sampleLedger } from "./sampleData";
import "./sports.css";

const ROWS_PER_PAGE = 16;

export default function SportsPage() {
  const [sport, setSport] = useState("ALL");
  // null means "whatever the newest season in the data is"
  const [seasonChoice, setSeasonChoice] = useState<string | null>(null);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [rows, setRows] = useState<SheetRows | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(SHEET_CSV_URL, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setRows(parseSheet(text));
      })
      // Sheet unreachable: keep showing the sample ledger.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const graded = rows ? rows.graded : sampleLedger();
  const pending = rows ? rows.pending : SAMPLE_CARD;

  const seasons = useMemo(() => seasonsPresent(graded, pending), [graded, pending]);
  const leagues = useMemo(() => leaguesPresent(graded, pending), [graded, pending]);
  const currentSeason = seasons[0];
  const season = seasonChoice ?? currentSeason;

  const scopeTally = (sp: string, se: string) => tally(graded.filter((p) => inScope(p, sp, se)));
  const seasonTotals = scopeTally(sport, currentSeason);
  const allTotals = scopeTally(sport, "ALL");
  const roi = allTotals.risked ? (allTotals.u / allTotals.risked) * 100 : 0;
  const seasonRoi = seasonTotals.risked ? (seasonTotals.u / seasonTotals.risked) * 100 : 0;

  const filtered = graded.filter((p) => inScope(p, sport, season));
  const pages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const current = Math.min(ledgerPage, pages - 1);
  const start = current * ROWS_PER_PAGE;

  // "On the card" shows the earliest upcoming date only.
  const firstKey = pending.reduce((min, p) => (p.sortKey && (!min || p.sortKey < min) ? p.sortKey : min), 0);
  const card = firstKey ? pending.filter((p) => p.sortKey === firstKey) : pending;
  const todayPicks = card.filter((p) => sport === "ALL" || p.league === sport);
  const pendingInScope = pending.filter((p) => sport === "ALL" || p.league === sport).length;

  const selectSport = (code: string) => {
    setSport(code);
    setLedgerPage(0);
  };

  const unitsClass = (u: number) => (u > 0 ? "is-win" : u < 0 ? "is-loss" : "");

  return (
    <div className="sports">
      <div className="sports__tabs">
        {["ALL", ...leagues].map((code) => (
          <button
            key={code}
            className={sport === code ? "sports__tab is-active" : "sports__tab"}
            onClick={() => selectSport(code)}
          >
            {code}
          </button>
        ))}
      </div>

      <div className="sports__rail">
        <div className="sports__stat">
          <div className="eyebrow">{sport === "ALL" ? `${currentSeason} season` : `${currentSeason} ${sport}`}</div>
          <div className={`sports__big ${seasonTotals.n ? unitsClass(seasonTotals.u) : "is-muted"}`}>
            {seasonTotals.n ? fmtUnits(seasonTotals.u) : pendingInScope ? "0.00u" : "—"}
          </div>
          <div className="sports__meta">
            {seasonTotals.n
              ? `${fmtRecord(seasonTotals)} · ROI ${seasonRoi.toFixed(1)}% on ${seasonTotals.risked.toFixed(0)}u risked`
              : pendingInScope
                ? `${pendingInScope} ${pendingInScope === 1 ? "pick on the card" : "picks on the card"}, none graded yet`
                : "Season not started"}
          </div>
        </div>
        <div className="sports__stat">
          <div className="eyebrow">All time {sport === "ALL" ? "" : `· ${sport}`}</div>
          <div className="sports__medium">{allTotals.n ? fmtUnits(allTotals.u) : "—"}</div>
          <div className="sports__meta">
            {allTotals.risked
              ? `${fmtRecord(allTotals)} · ROI ${roi.toFixed(1)}% on ${allTotals.risked.toFixed(0)}u risked`
              : pendingInScope
                ? "Nothing graded yet"
                : "No record yet"}
          </div>
        </div>
      </div>

      <section className="sports__section sports__section--first">
        <div className="eyebrow sports__section-title">By league</div>
        <div className="sports__grid sports__grid--league sports__grid--head">
          <div>Lg</div>
          <div>{currentSeason.slice(2)} rec</div>
          <div>{currentSeason.slice(2)} u</div>
          <div>All rec</div>
          <div>All u</div>
        </div>
        {leagues.map((code) => {
          const ls = scopeTally(code, currentSeason);
          const la = scopeTally(code, "ALL");
          const active = sport === code;
          return (
            <div key={code} className="sports__grid sports__grid--league sports__row">
              <button
                className={active ? "sports__league is-active" : "sports__league"}
                onClick={() => selectSport(active ? "ALL" : code)}
              >
                {code}
              </button>
              <div className="sports__small">{ls.n ? fmtRecord(ls) : "—"}</div>
              <div className="sports__num">{ls.n ? fmtUnits(ls.u) : "—"}</div>
              <div className="sports__small">{la.n ? fmtRecord(la) : "—"}</div>
              <div className="sports__num">{la.n ? fmtUnits(la.u) : "—"}</div>
            </div>
          );
        })}
      </section>

      {todayPicks.length > 0 && (
        <section className="sports__section">
          <div className="sports__section-head">
            <div className="eyebrow">On the card</div>
            <div className="eyebrow">{todayPicks[0].dateLabel}</div>
          </div>
          {todayPicks.map((p, i) => (
            <div key={i} className="sports__grid sports__grid--card sports__row sports__row--card">
              <div className="sports__small sports__left">{p.time}</div>
              <div className="sports__pick">
                <span className="sports__pick-name">{p.pick}</span>
                <span className="sports__pick-game">{p.game}</span>
              </div>
              <div className="sports__small">{p.line}</div>
              <div className="sports__num">{p.units}</div>
            </div>
          ))}
        </section>
      )}

      <section className="sports__section">
        <div className="sports__section-head sports__section-head--wrap">
          <div className="eyebrow">
            Graded · {filtered.length.toLocaleString()} {sport === "ALL" ? "picks" : `${sport} picks`}
            {season === "ALL" ? ", all seasons" : ` in ${season}`}
          </div>
          <select
            className="sports__select"
            value={season}
            onChange={(e) => {
              setSeasonChoice(e.target.value);
              setLedgerPage(0);
            }}
          >
            {seasons.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
            <option value="ALL">All seasons</option>
          </select>
        </div>
        <div className="sports__grid sports__grid--ledger sports__grid--head">
          <div>Date</div>
          <div>Lg</div>
          <div>Pick</div>
          <div>Res</div>
          <div>Units</div>
        </div>
        {filtered.slice(start, start + ROWS_PER_PAGE).map((r, i) => {
          const tone = r.tag === "WIN" ? "is-win" : r.tag === "LOSS" ? "is-loss" : "";
          return (
            <div key={start + i} className="sports__grid sports__grid--ledger sports__row sports__row--ledger">
              <div className="sports__small sports__left">{r.date}</div>
              <div className="sports__lg">{r.league}</div>
              <div className="sports__ledger-pick">{r.pick}</div>
              <div className={`sports__tag ${tone || "is-muted"}`}>{r.tag}</div>
              <div className={`sports__delta ${tone}`}>{r.delta}</div>
            </div>
          );
        })}
        <div className="sports__pager">
          <div className="eyebrow">
            {filtered.length
              ? `${start + 1}–${Math.min(start + ROWS_PER_PAGE, filtered.length)} of ${filtered.length.toLocaleString()}`
              : "No graded picks in this view"}
          </div>
          <div className="sports__pager-controls">
            <button
              className="sports__pager-btn"
              disabled={current === 0}
              onClick={() => setLedgerPage(Math.max(0, current - 1))}
            >
              ← Newer
            </button>
            <span className="eyebrow">
              {current + 1} / {pages}
            </span>
            <button
              className="sports__pager-btn"
              disabled={current >= pages - 1}
              onClick={() => setLedgerPage(Math.min(pages - 1, current + 1))}
            >
              Older →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
