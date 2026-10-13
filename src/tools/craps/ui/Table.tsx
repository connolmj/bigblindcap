import type { ReactNode } from "react";
import type { TableTheme } from "../../blackjack/ui/settings";
import { parseSpot, type Rules, type SpotId } from "../engine/bets";
import { POINTS, total, type PointNum } from "../engine/dice";
import { EVENT_DETAIL, EVENT_TITLE, fmtMoney, money, paysText, spotLabel } from "../engine/explain";
import { canBet, limitFor, onTable, type TableState } from "../engine/table";
import DicePair, { Die } from "./Dice";

interface Props {
  table: TableState;
  rollId: number;
  rules: Rules;
  theme: TableTheme;
  onPlace: (id: SpotId) => void;
}

/** The point boxes say their numbers the way the layout does. */
const BOX_NAME: Record<PointNum, string> = { 4: "4", 5: "5", 6: "SIX", 8: "8", 9: "NINE", 10: "10" };

const THROW_MS = 650; // dice tumble before the result shows

export default function Table({ table, rollId, rules, theme, onPlace }: Props) {
  const last = table.last;
  // Win/loss tags from the last roll, until you start betting again.
  const results = table.placed.length === 0 && last ? last.settlements : [];
  const resultFor = (id: SpotId) => results.find((s) => s.id === id && s.result !== "vig");
  const fresh = new Set(table.placed.map((p) => p.id));

  const spot = (id: SpotId, body: ReactNode, className = "", hint?: string) => (
    <Spot
      key={id}
      id={id}
      amount={table.bets[id]}
      fresh={fresh.has(id)}
      off={isOff(id, table.point)}
      enabled={canBet(table, id, rules)}
      result={resultFor(id)}
      onPlace={onPlace}
      className={className}
      hint={hint}
      rollId={rollId}
    >
      {body}
    </Spot>
  );

  /** "Up to $25" once there's a flat bet to back. */
  const oddsHint = (id: SpotId) => {
    const max = limitFor(table, id, rules);
    return max > 0 ? `Up to ${money(max)}` : undefined;
  };

  return (
    <div className="felt crp-felt" data-theme={theme}>
      <div className="crp-top">
        <RollBoard history={table.history} rolls={table.rolls} />
        <div className="crp-throw">
          <DicePair key={`dice${rollId}`} dice={last?.dice ?? null} />
          {last ? (
            <div
              key={`banner${rollId}`}
              className={`felt__banner crp-banner is-${last.net > 0 ? "win" : last.net < 0 ? "lose" : "push"}`}
              style={{ animationDelay: `${THROW_MS}ms` }}
              role="status"
            >
              <div className="felt__banner-title">{EVENT_TITLE[last.event](last)}</div>
              <div className="felt__banner-detail">
                {EVENT_DETAIL[last.event]} {last.settlements.length > 0 && <strong>{fmtMoney(last.net)}</strong>}
              </div>
            </div>
          ) : (
            <div className="bac-place">Place your bets</div>
          )}
        </div>
        <div className="crp-status">
          <span className={table.point ? "crp-puck is-on" : "crp-puck"}>{table.point ? "ON" : "OFF"}</span>
          <span className="crp-status__text">
            {table.point ? `Point ${table.point}` : "Come-out roll"}
            <small>
              Roll {table.rolls + 1} · {money(onTable(table.bets))} on the table
            </small>
          </span>
        </div>
      </div>

      <div className="crp-layout">
        <div className="crp-main">
          <div className="crp-numbers" role="group" aria-label="Point numbers">
            {POINTS.map((n) => (
              <div key={n} className={table.point === n ? "crp-box is-point" : "crp-box"}>
                {table.point === n && <span className="crp-puck is-on crp-box__puck">ON</span>}
                {(n === 4 || n === 10) && spot(`buy${n}`, "Buy", "crp-spot--mini", paysText(`buy${n}`, rules))}
                {spot(
                  `place${n}`,
                  <span className="crp-box__num">{BOX_NAME[n]}</span>,
                  "crp-spot--place",
                  paysText(`place${n}`, rules),
                )}
                {(n === 4 || n === 10) && spot(`lay${n}`, "Lay", "crp-spot--mini", paysText(`lay${n}`, rules))}
                <ComeChips n={n} table={table} spot={spot} />
              </div>
            ))}
          </div>

          <div className="crp-row crp-row--come">
            {spot(
              "dontCome",
              <>
                Don't Come <small>Bar 12</small>
              </>,
              "crp-spot--dont",
            )}
            {spot("come", <span className="crp-word">COME</span>, "crp-spot--come")}
          </div>

          <div className="crp-row crp-row--field">
            {spot(
              "field",
              <span className="crp-field">
                <span className="crp-field__nums">
                  <b>2</b> 3 · 4 · 9 · 10 · 11 <b>12</b>
                </span>
                <span className="crp-word">FIELD</span>
              </span>,
              "crp-spot--field",
              `2 pays double · 12 pays ${rules.field12 === 3 ? "triple" : "double"}`,
            )}
            <div className="crp-bigs">
              {spot("big6", <span className="crp-big">6</span>, "crp-spot--big", "Big 6")}
              {spot("big8", <span className="crp-big">8</span>, "crp-spot--big", "Big 8")}
            </div>
          </div>

          <div className="crp-row crp-row--line">
            {spot(
              "dontPass",
              <>
                Don't Pass Bar <small>Bar 12</small>
              </>,
              "crp-spot--dont",
            )}
            {spot("dontPassOdds", "Lay odds", "crp-spot--odds", oddsHint("dontPassOdds"))}
          </div>
          <div className="crp-row crp-row--line">
            {spot("pass", <span className="crp-word">PASS LINE</span>, "crp-spot--pass")}
            {spot("passOdds", "Odds", "crp-spot--odds", oddsHint("passOdds"))}
          </div>
        </div>

        <div className="crp-center" role="group" aria-label="Center bets">
          {spot("any7", "Seven", "crp-spot--prop crp-spot--wide crp-spot--seven", "4 to 1 · one roll")}
          <div className="crp-hards">
            {([6, 10, 8, 4] as const).map((n) =>
              spot(
                `hard${n}`,
                <span className="crp-hard">
                  <Die value={(n / 2) as 2 | 3 | 4 | 5} />
                  <Die value={(n / 2) as 2 | 3 | 4 | 5} />
                </span>,
                "crp-spot--prop",
                `Hard ${n} · ${paysText(`hard${n}`, rules)}`,
              ),
            )}
          </div>
          <div className="crp-props">
            {spot("aceDeuce", "3", "crp-spot--prop", "15 to 1")}
            {spot("aces", "2", "crp-spot--prop", "30 to 1")}
            {spot("boxcars", "12", "crp-spot--prop", "30 to 1")}
            {spot("yo", "11", "crp-spot--prop", "15 to 1")}
          </div>
          {spot("horn", "Horn", "crp-spot--prop crp-spot--wide", "2 · 3 · 11 · 12")}
          {spot("anyCraps", "Any Craps", "crp-spot--prop crp-spot--wide crp-spot--seven", "7 to 1 · one roll")}
        </div>
      </div>
    </div>
  );
}

/** Place, Buy and Hardway bets — and odds on Come bets — sit out the come-out roll. */
function isOff(id: SpotId, point: PointNum | null) {
  if (point !== null) return false;
  const { kind } = parseSpot(id);
  return kind === "place" || kind === "buy" || kind === "hard" || kind === "comeOdds";
}

type SpotFn = (id: SpotId, body: ReactNode, className?: string, hint?: string) => ReactNode;

/** Come and Don't Come bets that have travelled to this number, with room for odds. */
function ComeChips({ n, table, spot }: { n: PointNum; table: TableState; spot: SpotFn }) {
  const come = table.bets[`come${n}`];
  const dont = table.bets[`dontCome${n}`];
  const showResult = table.placed.length === 0 && table.last;
  const gone = showResult ? table.last!.settlements.filter((s) => s.id === `come${n}` || s.id === `dontCome${n}`) : [];
  if (!come && !dont && gone.length === 0) return null;
  return (
    <div className="crp-comes">
      {gone.map((s) => (
        <span key={s.id} className={`crp-come is-${s.result}`}>
          {s.id.startsWith("dont") ? "DC" : "C"} <span className="tcp-spot__result">{fmtMoney(s.net)}</span>
        </span>
      ))}
      {come !== undefined && (
        <span className="crp-come">
          <span className="crp-come__tag" title={spotLabel(`come${n}`)}>
            C {money(come)}
          </span>
          {spot(`comeOdds${n}`, "+ odds", "crp-spot--mini crp-spot--comeodds", "No house edge")}
        </span>
      )}
      {dont !== undefined && (
        <span className="crp-come is-dont">
          <span className="crp-come__tag" title={spotLabel(`dontCome${n}`)}>
            DC {money(dont)}
          </span>
          {spot(`dontComeOdds${n}`, "+ lay", "crp-spot--mini crp-spot--comeodds", "No house edge")}
        </span>
      )}
    </div>
  );
}

interface SpotProps {
  id: SpotId;
  amount: number | undefined;
  fresh: boolean;
  off: boolean;
  enabled: boolean;
  result?: { result: string; net: number; to?: PointNum };
  onPlace: (id: SpotId) => void;
  className: string;
  hint?: string;
  rollId: number;
  children: ReactNode;
}

function Spot({ id, amount, fresh, off, enabled, result, onPlace, className, hint, rollId, children }: SpotProps) {
  const classes = ["crp-spot", className];
  if (amount) classes.push("is-mine");
  if (!enabled) classes.push("is-closed");
  if (result) classes.push(`is-${result.result}`);
  const label = `${spotLabel(id)}${amount ? `, ${money(amount)} on it` : ""}${off ? ", off this roll" : ""}`;
  return (
    <button
      className={classes.join(" ")}
      onClick={(e) => {
        onPlace(id);
        // After a mouse click, let Space roll the dice instead of re-pressing this spot.
        if (e.detail > 0) e.currentTarget.blur();
      }}
      disabled={!enabled}
      aria-label={label}
      title={enabled ? `${spotLabel(id)}${hint ? ` — ${hint}` : ""}` : undefined}
    >
      <span className="crp-spot__body">{children}</span>
      {hint && <span className="crp-spot__hint">{hint}</span>}
      {amount !== undefined && (
        <span className={fresh ? "tcp-chip crp-chip is-new" : "tcp-chip crp-chip"}>{money(amount)}</span>
      )}
      {off && amount !== undefined && <span className="crp-off">Off</span>}
      {result && result.result !== "move" && (
        <span key={rollId} className="tcp-spot__result crp-result" style={{ animationDelay: `${THROW_MS}ms` }}>
          {result.result === "push" ? "Push" : fmtMoney(result.net)}
        </span>
      )}
      {result?.result === "move" && (
        <span key={rollId} className="tcp-spot__result crp-result" style={{ animationDelay: `${THROW_MS}ms` }}>
          → {result.to}
        </span>
      )}
    </button>
  );
}

/** The last rolls, newest first — like the display by the table. */
function RollBoard({ history, rolls }: { history: TableState["history"]; rolls: number }) {
  const recent = history.slice(-10).reverse();
  return (
    <ol className="crp-board" aria-label="Recent rolls">
      {recent.length === 0 && <li className="crp-board__empty">No rolls yet</li>}
      {recent.map((d, i) => {
        const t = total(d);
        return (
          <li key={rolls - i} className={t === 7 ? "is-seven" : d[0] === d[1] ? "is-hard" : ""}>
            {t}
          </li>
        );
      })}
    </ol>
  );
}
