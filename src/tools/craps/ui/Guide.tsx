import type { ReactNode } from "react";
import {
  betMath,
  DEFAULT_RULES,
  lineWithOddsEdge,
  maxLay,
  maxOdds,
  ODDS_NAME,
  TRUE_ODDS,
  type Rules,
} from "../engine/bets";
import { ALL_ROLLS, POINTS, ROLL_NAME, total, ways } from "../engine/dice";
import { money, paysText, pct, ratio } from "../engine/explain";
import { GOOD_EDGE } from "../engine/grade";
import { rowsByEdge } from "./betRows";
import { Die } from "./Dice";

const SECTIONS = [
  { id: "how-to-play", label: "How to play" },
  { id: "dice", label: "The 36 rolls" },
  { id: "bets", label: "Every bet, priced" },
  { id: "strategy", label: "How to bet it right" },
  { id: "tips", label: "At the table" },
];

/** The rules, the odds and the strategy — everything under the practice table. */
export default function Guide({ rules }: { rules: Rules }) {
  return (
    <div className="tcp-guide">
      <nav className="tcp-guide__toc" aria-label="On this page">
        {SECTIONS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`}>
            <span className="tcp-guide__toc-n">{String(i + 1).padStart(2, "0")}</span>
            {s.label}
          </a>
        ))}
      </nav>
      <HowToPlay />
      <DiceOdds />
      <Bets rules={rules} />
      <Strategy rules={rules} />
      <Tips />
    </div>
  );
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className="tcp-guide__section">
      <div className="eyebrow">{String(n).padStart(2, "0")}</div>
      <h2 className="tcp-guide__h2">{title}</h2>
      {children}
    </section>
  );
}

function HowToPlay() {
  const pass = betMath("pass", DEFAULT_RULES);
  return (
    <Section id="how-to-play" n={1} title="How to play">
      <p className="tcp-guide__p">
        One player — the <b>shooter</b> — rolls two dice for the whole table. Everyone bets on what the dice will do.
        The game runs in rounds, and each round starts with a <b>come-out roll</b>.
      </p>
      <ol className="tcp-steps">
        <li>
          <b>Bet the line.</b> Before the come-out, bet the <b>Pass Line</b> (with the shooter) or <b>Don't Pass</b>{" "}
          (against).
        </li>
        <li>
          <b>The come-out roll.</b> 7 or 11 is a winner for Pass. 2, 3 or 12 is "craps" and Pass loses — Don't Pass wins
          on 2 or 3, and pushes on 12. Either way, the next roll is a new come-out.
        </li>
        <li>
          <b>A point is set.</b> Any other total — 4, 5, 6, 8, 9 or 10 — becomes the <b>point</b>. The dealer flips the
          puck to <b>ON</b> and sets it on that number.
        </li>
        <li>
          <b>Roll until it's decided.</b> If the point rolls again before a 7, Pass wins. If a 7 comes first — a{" "}
          <b>seven-out</b> — Pass loses, Don't wins and the dice pass to the next shooter. Other totals don't decide the
          line, but they do settle other bets.
        </li>
        <li>
          <b>Add bets as you go.</b> Once there's a point you can take <b>odds</b> behind your line bet, make{" "}
          <b>Come</b> bets (a new Pass Line bet of your own), place numbers, and so on. A Pass bet lasts{" "}
          {pass.rolls.toFixed(1)} rolls on average.
        </li>
      </ol>
      <p className="tcp-guide__note">
        In the trainer you're the whole table: put chips on any spot, then roll. Every new bet is graded the moment you
        make it.
      </p>
    </Section>
  );
}

function DiceOdds() {
  const totals = Array.from({ length: 11 }, (_, i) => i + 2);
  return (
    <Section id="dice" n={2} title="The 36 rolls">
      <p className="tcp-guide__p">
        Every bet in craps comes down to one fact: two dice make 36 equally likely rolls, and 7 is the most common total
        — 6 ways, one roll in six. The 6 and 8 come next at 5 ways each, which is why they're the numbers worth betting.
      </p>
      <div className="crp-ways" role="table" aria-label="Ways to roll each total">
        {totals.map((t) => (
          <div key={t} className={t === 7 ? "crp-ways__col is-seven" : "crp-ways__col"} role="row">
            <div className="crp-ways__stack" aria-hidden="true">
              {ALL_ROLLS.filter((d) => total(d) === t && d[0] <= d[1]).map((d) => (
                <span key={d.join()} className={d[0] === d[1] ? "crp-ways__pair is-hard" : "crp-ways__pair"}>
                  <Die value={d[0]} />
                  <Die value={d[1]} />
                </span>
              ))}
            </div>
            <div className="crp-ways__bar" style={{ height: `${ways(t) * 14}px` }} aria-hidden="true" />
            <div className="crp-ways__t" role="cell">
              {t}
            </div>
            <div className="crp-ways__n" role="cell">
              {ways(t)}/36
            </div>
          </div>
        ))}
      </div>
      <p className="tcp-guide__note">
        Each pair shown once — 2-5 also rolls as 5-2, which is why most totals have two ways per pair. Doubles (shaded)
        are the "hard" way: {ROLL_NAME[2]} and {ROLL_NAME[12]} can only roll one way.
      </p>
      <h3 className="tcp-guide__h3">Number vs. 7 — the odds behind every point</h3>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Number</th>
              <th scope="col">Ways</th>
              <th scope="col">Before a 7</th>
              <th scope="col">True odds</th>
              <th scope="col">Place pays</th>
            </tr>
          </thead>
          <tbody>
            {POINTS.map((n) => (
              <tr key={n}>
                <th scope="row">{n}</th>
                <td>{ways(n)}</td>
                <td>{pct(ways(n) / (ways(n) + 6), 1)}</td>
                <td>{ratio(TRUE_ODDS[n])}</td>
                <td>{paysText(`place${n}`, DEFAULT_RULES)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Bets({ rules }: { rules: Rules }) {
  const rows = rowsByEdge(rules);
  return (
    <Section id="bets" n={3} title="Every bet, priced">
      <p className="tcp-guide__p">
        Exact house edges, counted over all 36 rolls for this table's rules (change them under <b>Table</b>). The edge
        is what each bet loses on average for every dollar you risk. <b>Per roll</b> spreads that over how long the bet
        takes to settle — a one-roll prop loses its whole edge every roll, a Pass bet takes about 3⅓ rolls.
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table crp-bets">
          <thead>
            <tr>
              <th scope="col">Bet</th>
              <th scope="col">Pays</th>
              <th scope="col">Edge</th>
              <th scope="col">Per roll</th>
              <th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.note}</td>
                <td className={r.good ? "is-win" : "is-lose"}>{pct(r.math.edge)}</td>
                <td>{pct(r.math.perRoll)}</td>
                <td className={r.good ? "is-win" : ""}>{r.good ? "Bet it" : "Skip it"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tcp-guide__note">
        The trainer calls a bet right when its edge is under {pct(GOOD_EDGE, 0)}. Odds are the only bets in the casino
        with no edge at all — but you can only make them behind a Pass, Don't Pass, Come or Don't Come bet.
      </p>
    </Section>
  );
}

function Strategy({ rules }: { rules: Rules }) {
  const pass = betMath("pass", rules).edge;
  const withOdds = lineWithOddsEdge(rules, false);
  const dont = lineWithOddsEdge(rules, true);
  const flat = 10;
  return (
    <Section id="strategy" n={4} title="How to bet it right">
      <p className="tcp-guide__p">
        No betting system changes the dice. What you can control is <b>which bets</b> your money goes on — and the gap
        is huge: Any 7 gives the house nearly twelve times what the Pass Line does.
      </p>
      <ol className="tcp-steps">
        <li>
          <b>Bet the Pass Line or Don't Pass.</b> {pct(pass)} and {pct(betMath("dontPass", rules).edge)}. Don't is
          slightly cheaper; Pass is friendlier at the table. Both are good.
        </li>
        <li>
          <b>Take the odds — as much as you can afford.</b> On a {money(flat)} Pass bet at a {ODDS_NAME[rules.odds]}{" "}
          table you can add up to {money(maxOdds(rules, 4, flat))} on a 4, {money(maxOdds(rules, 6, flat))} on a 6. With
          full odds your overall edge falls from {pct(pass)} to <b>{pct(withOdds, 3)}</b> (Don't with full lay odds:{" "}
          {pct(dont, 3)}). Put less on the flat bet and more on the odds.
        </li>
        <li>
          <b>Want more action? Make Come bets</b> and take odds on them too, rather than placing numbers. Each Come bet
          is a fresh Pass Line bet with the same low edge.
        </li>
        <li>
          <b>If you place numbers, place the 6 and 8</b> — in multiples of $6, so the 7 to 6 payout comes out even.
          {rules.vig === "win" ? " For the 4 and 10, buy them instead of placing them." : ""} Never bet Big 6 or 8: it
          pays less for the same thing.
        </li>
        <li>
          <b>Skip the Field, the hardways and the center of the table.</b> Every prop is 9–17%, and the one-roll bets
          lose that edge on every throw.
        </li>
      </ol>
      <p className="tcp-guide__note">
        Laying odds on a Don't bet: you risk more to win less (on a 4, lay {money(maxLay(rules, 4, flat))} to win{" "}
        {money(maxLay(rules, 4, flat) / 2)}), because once a point is set the 7 is the favourite. It's still a fair,
        zero-edge bet.
      </p>
    </Section>
  );
}

function Tips() {
  return (
    <Section id="tips" n={5} title="At the table">
      <ul className="bac-rules">
        <li>
          <b>Size bets to pay cleanly.</b> Place 6/8 in $6s, odds on 5/9 in even amounts, odds on 6/8 in $5s. The
          trainer pays exact amounts; real tables round down.
        </li>
        <li>
          <b>Contract bets stay up.</b> Once a point is set you can't take down a Pass Line or Come bet — it's your
          edge-carrying bet. Odds, place, buy and hardway bets can come down any time.
        </li>
        <li>
          <b>Know what's "off".</b> Place, buy and hardway bets, and odds on Come bets, don't work on the come-out roll
          unless you call them on. Lay bets always work.
        </li>
        <li>
          <b>Ask how the vig works.</b> Paying the 5% only on wins turns Buy 4/10 from a poor bet into a good one.
        </li>
        <li>
          <b>Watch the per-roll cost.</b> A $5 one-roll prop every throw costs more over an hour than a $25 Pass Line
          bet with odds.
        </li>
        <li>
          <b>Etiquette.</b> Hand chips to the dealer for odds and come-point bets, keep your hands out of the way while
          the dice are out, and don't say "seven" at the table.
        </li>
      </ul>
    </Section>
  );
}
