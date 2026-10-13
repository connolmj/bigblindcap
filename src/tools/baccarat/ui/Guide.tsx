import type { ReactNode } from "react";
import { pct } from "../engine/explain";
import { BET_LABEL, BETS, betReturn, DECKS, exactOdds, TIE_PAYS, type Bet, type Commission } from "../engine/payouts";
import TableauChart from "./TableauChart";

const SECTIONS = [
  { id: "how-to-play", label: "How to play" },
  { id: "payouts", label: "What gets paid" },
  { id: "drawing", label: "Drawing rules" },
  { id: "why", label: "Which bet, and why" },
];

const PAYS: Record<Commission, Record<Bet, string>> = {
  standard: { banker: "0.95 to 1", player: "1 to 1", tie: `${TIE_PAYS} to 1` },
  none: { banker: "1 to 1 (½ on a 6)", player: "1 to 1", tie: `${TIE_PAYS} to 1` },
};

const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** The rules, the payouts and the reasoning — everything under the practice table. */
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
      <HowToPlay />
      <Payouts />
      <Drawing />
      <WhyBanker />
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
  const o = exactOdds();
  return (
    <Section id="how-to-play" n={1} title="How to play">
      <p className="tcp-guide__p">
        Two hands are dealt, called <b>Player</b> and <b>Banker</b>. Neither one is you or the house — they're just the
        two sides you can bet on. Whichever ends closer to 9 wins.
      </p>
      <ol className="tcp-steps">
        <li>
          <b>Bet</b> on Player, Banker or Tie.
        </li>
        <li>
          <b>Two cards each.</b> Aces count 1, 2–9 count their number, and 10s and picture cards count 0. Only the last
          digit of the total counts: 7 + 8 = 15 is <b>5</b>.
        </li>
        <li>
          <b>Naturals.</b> If either hand has 8 or 9 on its first two cards — about {pct(o.natural, 0)} of hands — it's
          a natural and nobody draws.
        </li>
        <li>
          <b>Third cards.</b> Otherwise the Player hand may take a third card, then the Banker hand. Nobody decides: the
          dealer follows fixed rules (section 3). The trainer has you call each one so you learn them.
        </li>
        <li>
          <b>Closest to 9 wins.</b> On a tie, Player and Banker bets push and Tie bets win.
        </li>
      </ol>
    </Section>
  );
}

function Payouts() {
  const o = exactOdds();
  const wins: Record<Bet, number> = { banker: o.banker, player: o.player, tie: o.tie };
  const tieNine = (TIE_PAYS + 1) * o.tie - (1 - o.tie);
  return (
    <Section id="payouts" n={2} title="What gets paid">
      <p className="tcp-guide__p">
        Exact odds for an {DECKS}-deck shoe, counted over every way the cards can come out. Ties happen {pct(o.tie, 1)}{" "}
        of the time, and when they do the Player and Banker bets just come back.
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Bet</th>
              <th scope="col">Wins</th>
              <th scope="col">Pays · 5% table</th>
              <th scope="col">Edge</th>
              <th scope="col">Pays · no-comm.</th>
              <th scope="col">Edge</th>
            </tr>
          </thead>
          <tbody>
            {BETS.map((b) => (
              <tr key={b}>
                <th scope="row">{BET_LABEL[b]}</th>
                <td>{pct(wins[b])}</td>
                <td>{PAYS.standard[b]}</td>
                <td className={b === "banker" ? "is-win" : b === "tie" ? "is-lose" : ""}>
                  {pct(-betReturn(b, "standard"))}
                </td>
                <td>{PAYS.none[b]}</td>
                <td className={b === "player" ? "is-win" : b === "tie" ? "is-lose" : ""}>
                  {pct(-betReturn(b, "none"))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tcp-guide__note">
        Green marks the best bet on each table. Some casinos pay Tie 9 to 1, which cuts its edge to {pct(-tieNine)} —
        still about four times the main bets.
      </p>
    </Section>
  );
}

function Drawing() {
  return (
    <Section id="drawing" n={3} title="Drawing rules">
      <p className="tcp-guide__p">
        <b>The Player goes first:</b> draw on 0–5, stand on 6 or 7.
      </p>
      <p className="tcp-guide__p">
        <b>The Banker goes second.</b> If the Player stood, the Banker uses the same rule. If the Player drew, the
        Banker's move depends on its own total and the Player's third card:
      </p>
      <ul className="bac-rules">
        <li>
          <b>0–2:</b> always draws
        </li>
        <li>
          <b>3:</b> draws unless the Player's third card is an 8
        </li>
        <li>
          <b>4:</b> draws if it's 2–7
        </li>
        <li>
          <b>5:</b> draws if it's 4–7
        </li>
        <li>
          <b>6:</b> draws if it's 6 or 7
        </li>
        <li>
          <b>7:</b> always stands
        </li>
      </ul>
      <p className="tcp-guide__p">
        The trick for 3–6: the window of cards the Banker draws against shrinks by two at each step up, and ends at 7.
      </p>
      <div className="bac-guide-chart">
        <TableauChart />
      </div>
    </Section>
  );
}

function WhyBanker() {
  const o = exactOdds();
  const hands = 100;
  const stake = 25;
  return (
    <Section id="why" n={4} title="Which bet, and why">
      <p className="tcp-guide__p">
        Your bet is the only real decision in baccarat, and it's a simple one. <b>The Banker hand wins more often</b> —{" "}
        {pct(o.banker, 1)} of hands against the Player's {pct(o.player, 1)} — because it acts last: its drawing rule
        gets to react to the Player's third card. That's why casinos charge a commission on Banker wins.
      </p>
      <p className="tcp-guide__p">
        <b>On a 5% commission table, bet Banker.</b> The commission takes back most of Banker's advantage but not all of
        it, leaving a {pct(-betReturn("banker", "standard"))} house edge against Player's{" "}
        {pct(-betReturn("player", "standard"))}.
      </p>
      <p className="tcp-guide__p">
        <b>On a no-commission table, bet Player.</b> Instead of the 5%, a Banker win with a total of 6 pays only half.
        That happens on {pct(o.bankerSix, 1)} of hands, and halving those wins costs more than the commission did:
        Banker's edge rises to {pct(-betReturn("banker", "none"))}, so Player's unchanged{" "}
        {pct(-betReturn("player", "none"))} becomes the better bet.
      </p>
      <p className="tcp-guide__p">
        <b>Skip the Tie.</b> It pays {TIE_PAYS} to 1 but comes in about once every {Math.round(1 / o.tie)} hands. Fair
        odds would be {(1 / o.tie - 1).toFixed(1)} to 1, and the shortfall is a {pct(-betReturn("tie", "standard"))}{" "}
        edge.
      </p>

      <h3 className="tcp-guide__h3">What it costs</h3>
      <p className="tcp-guide__p">
        {hands} hands at {money(stake)} is {money(hands * stake)} in bets. On average you'd lose:
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Every hand on</th>
              <th scope="col">5% table</th>
              <th scope="col">No-commission</th>
            </tr>
          </thead>
          <tbody>
            {BETS.map((b) => (
              <tr key={b}>
                <th scope="row">{BET_LABEL[b]}</th>
                <td>{money(-betReturn(b, "standard") * hands * stake)}</td>
                <td>{money(-betReturn(b, "none") * hands * stake)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="tcp-guide__h3">What doesn't matter</h3>
      <p className="tcp-guide__p">
        Casinos hand out scorecards and light up boards of past results so you can chase streaks and patterns. They
        don't predict anything: with {DECKS} decks, the cards already played barely move the odds of the next hand.
        Betting systems that raise or lower your bet after wins and losses don't change the house edge either — they
        only change how bumpy the ride is.
      </p>
    </Section>
  );
}
