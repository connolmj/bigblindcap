import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { edgeAt, RAMP } from "../engine/betting";
import { fmtCount, trueCount } from "../engine/hilo";
import CountChart from "./CountChart";

const SECTIONS = [
  { id: "why-counting-works", label: "Why counting works" },
  { id: "true-count", label: "Running count to true count" },
  { id: "betting", label: "Betting with the count" },
  { id: "count-plays", label: "Count plays" },
  { id: "real-table", label: "At a real table" },
];

/** The method and the reasoning — everything under the practice table. */
export default function Guide() {
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
      <WhyItWorks />
      <TrueCount />
      <Betting />
      <CountPlays />
      <RealTable />
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

function WhyItWorks() {
  return (
    <Section id="why-counting-works" n={1} title="Why counting works">
      <p className="tcp-guide__p">
        Blackjack is dealt from a shoe that isn't reshuffled every hand, so the cards left change as the game goes on.
        When the shoe is left with extra <b>10s and Aces</b>, it favors you: more blackjacks (paid 3 to 2, and the
        dealer only gets even money), better doubles, and more dealer busts, because the dealer has to hit 12 through
        16. Extra small cards favor the house.
      </p>
      <p className="tcp-guide__p">
        <b>Hi-Lo</b> tracks that with one number. Every card you see moves the <b>running count</b>:
      </p>
      <ol className="tcp-steps">
        <li>
          <b>2, 3, 4, 5, 6 count +1.</b> A small card is gone, so the rest of the shoe got better for you.
        </li>
        <li>
          <b>7, 8, 9 count 0.</b>
        </li>
        <li>
          <b>10, J, Q, K and A count −1.</b>
        </li>
      </ol>
      <p className="tcp-guide__p">
        There are as many +1 cards as −1 cards, so a full shoe adds up to 0. Practice by counting down a single deck:
        you should end on 0, and good counters do it in under 25 seconds. Count cards in pairs that cancel (a 10 and a 5
        is 0) to go faster.
      </p>
    </Section>
  );
}

function TrueCount() {
  const examples = [6, 3, 1.5].map((decks) => ({ decks, tc: trueCount(6, decks * 52) }));
  return (
    <Section id="true-count" n={2} title="Running count to true count">
      <p className="tcp-guide__p">
        A running count of +6 means more with one deck left than with six. So divide by the decks still to come, judged
        from the discard tray: that's the <b>true count</b>, and it's what you bet and play from.
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Running count</th>
              <th scope="col">Decks left</th>
              <th scope="col">True count</th>
            </tr>
          </thead>
          <tbody>
            {examples.map((e) => (
              <tr key={e.decks}>
                <td>+6</td>
                <td>{e.decks === 1.5 ? "1½" : e.decks}</td>
                <td>{fmtCount(e.tc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tcp-guide__note">
        Here, decks left is rounded to the nearest half deck and the true count is rounded toward zero (+2.7 is +2, −1.5
        is −1). Use the shoe bar above the table for decks left.
      </p>
    </Section>
  );
}

function Betting() {
  const edge = (tc: number) => {
    const e = edgeAt(tc);
    return `${e > 0 ? "+" : e < 0 ? "−" : ""}${Math.abs(e).toFixed(1)}%`;
  };
  return (
    <Section id="betting" n={3} title="Betting with the count">
      <p className="tcp-guide__p">
        Off the top of a shoe, these rules give the house about {edge(0).replace("−", "")}. Each +1 of true count is
        worth about half a percent to you, so the edge is yours from around +1: {edge(1)} at +1, {edge(3)} at +3,{" "}
        {edge(5)} at +5. Counting makes money by betting small when the house has the edge and bigger when you do.
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">True count</th>
              {RAMP.map((r) => (
                <th scope="col" key={r.tc}>
                  {r.tc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Bet</th>
              {RAMP.map((r) => (
                <td key={r.tc}>{r.units} units</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="tcp-guide__note">
        Even at a high count you win fewer than half your hands; the edge comes from blackjacks and doubles. Swings are
        big, so size your unit for them — the <Link to="/tools/bankroll">Bankroll Management</Link> tool shows how big.
      </p>
    </Section>
  );
}

function CountPlays() {
  return (
    <Section id="count-plays" n={4} title="Count plays">
      <p className="tcp-guide__p">
        Basic strategy is right for a neutral shoe. In a few spots the count tips the play the other way. These are the
        "Illustrious 18" for this table. Each has an index: at that true count or above, make the count play.
      </p>
      <ul className="cc-rules">
        <li>
          <b>High count, stand more:</b> with extra 10s left, a hit busts you more and the dealer busts more, so 16 vs
          10 stands at 0 and 12 vs 2 or 3 stands at +3 or +2.
        </li>
        <li>
          <b>High count, double more:</b> 11 vs A, 10 vs 10 and 9 vs 2 become doubles.
        </li>
        <li>
          <b>Low count, hit more:</b> with extra small cards, 12 vs 4–6 and 13 vs 2–3 become hits.
        </li>
      </ul>
      <p className="tcp-guide__p">16 vs 10 and 15 vs 10 are worth the most. Learn those, then add the rest.</p>
      <div className="cc-guide-chart">
        <CountChart />
      </div>
    </Section>
  );
}

function RealTable() {
  return (
    <Section id="real-table" n={5} title="At a real table">
      <ul className="cc-rules">
        <li>
          <b>It's legal,</b> as long as it's all in your head. Casinos can still ask you to flat bet or leave.
        </li>
        <li>
          <b>Penetration matters.</b> The deeper the cut card, the more high counts you see. This trainer cuts at 75%.
        </li>
        <li>
          <b>Continuous shufflers</b> put cards back after every hand, so the count never builds. Counting doesn't work
          against them.
        </li>
        <li>
          <b>Watch the payout:</b> a table paying 6 to 5 on blackjack costs you more than a count can win back. Look for
          3 to 2.
        </li>
      </ul>
    </Section>
  );
}
