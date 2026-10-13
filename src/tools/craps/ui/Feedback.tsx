import { maxLay, maxOdds, parseSpot, type Rules, type SpotId } from "../engine/bets";
import { EVENT_TITLE, fmtMoney, money, pct, spotLabel, whyBet } from "../engine/explain";
import type { Decision, RollResult, Settlement, TableState } from "../engine/table";

interface Props {
  table: TableState;
  rules: Rules;
  onShowChart: () => void;
}

export default function Feedback({ table, rules, onShowChart }: Props) {
  const latest = table.pending[table.pending.length - 1];
  const tip = oddsTip(table, rules);
  if (latest) {
    const earlier = table.pending.slice(0, -1);
    return (
      <div>
        <BetCard d={latest} rules={rules} onShowChart={onShowChart} />
        {earlier.length > 0 && (
          <ol className="recap" aria-label="Other bets this roll">
            {earlier.map((d) => (
              <DecisionRow key={d.id} d={d} />
            ))}
          </ol>
        )}
        {tip && <Tip text={tip} />}
      </div>
    );
  }
  if (table.last) {
    return (
      <div>
        <RollCard r={table.last} />
        {tip && <Tip text={tip} />}
      </div>
    );
  }
  return (
    <div className="feedback feedback--neutral">
      <div className="feedback__head">
        <span className="feedback__title">Place your bets</span>
      </div>
      <p className="feedback__why">
        Click any spot on the felt to put chips on it — each bet is graded as soon as you make it. Start with the Pass
        Line or Don't Pass, then roll.
      </p>
    </div>
  );
}

function BetCard({ d, rules, onShowChart }: { d: Decision; rules: Rules; onShowChart: () => void }) {
  return (
    <div className={d.good ? "feedback feedback--right" : "feedback feedback--wrong"} aria-live="polite">
      <div className="feedback__head">
        <span className="feedback__icon" aria-hidden="true">
          {d.good ? "✓" : "✕"}
        </span>
        <span className="feedback__title">
          {d.good ? (
            <>
              Good bet — <BetChip id={d.id} good />
            </>
          ) : (
            <>
              <BetChip id={d.id} muted /> · better: <BetChip id={d.better!} good />
            </>
          )}
        </span>
        <span className="feedback__spot">
          {money(d.amount)} · {pct(d.edge)} edge
        </span>
        <button className="linkish" onClick={onShowChart}>
          Every bet's edge →
        </button>
      </div>
      <p className="feedback__why">{whyBet(d.id, rules, d.point)}</p>
      {!d.good && (
        <p className="crp-cost">
          <span className="eyebrow">What it costs</span> {money(d.amount)} here gives up about <b>{money(d.cost)}</b> on
          average against the same money on {spotLabel(d.better!)}.
        </p>
      )}
    </div>
  );
}

function RollCard({ r }: { r: RollResult }) {
  const good = r.decisions.filter((d) => d.good).length;
  const shown = r.settlements;
  return (
    <div className="feedback feedback--neutral crp-rollcard" aria-live="polite">
      <div className="feedback__head">
        <span className="feedback__title">{EVENT_TITLE[r.event](r)}</span>
        {r.decisions.length > 0 && (
          <span className="feedback__spot">
            {good} of {r.decisions.length} new {r.decisions.length === 1 ? "bet" : "bets"} good
          </span>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="feedback__why">Nothing on the table was decided by that roll.</p>
      ) : (
        <ol className="recap crp-settle">
          {shown.map((s, i) => (
            <SettleRow key={i} s={s} />
          ))}
          <li className="recap__row crp-settle__total">
            <span className="recap__spot">This roll</span>
            <span className={r.net > 0 ? "is-win" : r.net < 0 ? "is-loss" : ""}>{fmtMoney(r.net)}</span>
          </li>
        </ol>
      )}
    </div>
  );
}

const RESULT_TEXT: Record<Settlement["result"], string> = {
  win: "wins",
  lose: "loses",
  push: "comes back",
  move: "moves",
  vig: "commission",
};

function SettleRow({ s }: { s: Settlement }) {
  const tone = s.net > 0 ? "is-right" : s.net < 0 ? "is-wrong" : "";
  return (
    <li className={`recap__row ${tone}`}>
      <span aria-hidden="true">{s.net > 0 ? "+" : s.net < 0 ? "−" : "·"}</span>
      <span className="recap__spot">
        {spotLabel(s.id)} <small>{money(s.amount)}</small>
      </span>
      <span>
        {s.result === "move" ? `moves to the ${s.to}` : RESULT_TEXT[s.result]}
        {s.net !== 0 && ` ${fmtMoney(s.net)}`}
      </span>
    </li>
  );
}

function DecisionRow({ d }: { d: Decision }) {
  return (
    <li className={d.good ? "recap__row is-right" : "recap__row is-wrong"}>
      <span aria-hidden="true">{d.good ? "✓" : "✕"}</span>
      <span className="recap__spot">
        {spotLabel(d.id)} <small>{money(d.amount)}</small>
      </span>
      <span>{d.good ? `${pct(d.edge)} edge` : `→ ${spotLabel(d.better!)}`}</span>
    </li>
  );
}

function BetChip({ id, good, muted }: { id: SpotId; good?: boolean; muted?: boolean }) {
  return (
    <span className={`chip ${good ? "chip--good" : "chip--bad"}${muted ? " is-muted" : ""}`}>{spotLabel(id)}</span>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <p className="crp-tip">
      <span className="eyebrow">Tip</span> {text}
    </p>
  );
}

/** Not graded — just a nudge when a flat bet on a number has room for zero-edge odds. */
function oddsTip(table: TableState, rules: Rules): string | null {
  const b = table.bets;
  const p = table.point;
  if (p && b.pass && (b.passOdds ?? 0) < maxOdds(rules, p, b.pass))
    return `Your Pass Line is on the ${p}. Odds behind it pay true odds with no house edge — up to ${money(maxOdds(rules, p, b.pass))} here.`;
  if (p && b.dontPass && (b.dontPassOdds ?? 0) < maxLay(rules, p, b.dontPass))
    return `You can lay odds behind your Don't Pass bet on the ${p} — no house edge, up to ${money(maxLay(rules, p, b.dontPass))}.`;
  for (const id of Object.keys(b) as SpotId[]) {
    const { kind, n } = parseSpot(id);
    if (kind === "comePoint" && n && (b[`comeOdds${n}`] ?? 0) < maxOdds(rules, n, b[id]!))
      return `Your Come bet is on the ${n}. Tap "+ odds" in the ${n} box to back it at true odds.`;
  }
  return null;
}
