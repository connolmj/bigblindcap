import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fmtPct } from "../../../tools/bankroll/ui/format";
import { combineMargins, keyNumbers, type MarginsData, type MarginTable } from "../model/margins";
import { coinFlipParlay, impliedProb, ODDS_LADDER, profitOn100, riskToWin100, toDecimal, twoWay } from "../model/odds";
import { MarginChart, ParlayChart } from "./Charts";
import "./sports-betting.css";

/** −110 / +150 / +102,300 — a true minus sign, like the rest of the site. */
const fmtAmerican = (o: number) => (o >= 0 ? "+" : "−") + Math.round(Math.abs(o)).toLocaleString("en-US");
/** A decimal payout written as American odds. 2.64 → +264. */
const decToAmerican = (d: number) => (d >= 2 ? (d - 1) * 100 : -100 / (d - 1));
const fmtDollars = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SECTIONS = [
  { id: "bet-types", label: "Types of bets" },
  { id: "american-odds", label: "American odds" },
  { id: "spreads", label: "Point spreads" },
  { id: "vig", label: "The vig" },
  { id: "parlays", label: "Vig in parlays" },
];

interface BetType {
  name: string;
  what: string;
  example: string;
  edge: string;
}

const BET_TYPES: BetType[] = [
  {
    name: "Moneyline",
    what: "Which team wins the game, straight up.",
    example: "Eagles −150 / Giants +130",
    edge: "The two sides' implied chances add up to more than 100%. The gap is often wider in lopsided games.",
  },
  {
    name: "Point spread",
    what: "Whether a team wins by more than a set number of points, or the other team loses by less.",
    example: "Chiefs −6.5 (−110) / Raiders +6.5 (−110)",
    edge: "The standard −110 on both sides is a 4.55% cut of all money bet.",
  },
  {
    name: "Total (over/under)",
    what: "The combined score of both teams, over or under a line.",
    example: "Over 47.5 (−110) / Under 47.5 (−110)",
    edge: "Priced like spreads: usually −110 both ways, a 4.55% cut.",
  },
  {
    name: "Parlay",
    what: "Two or more bets tied into one. Every leg has to win.",
    example: "Chiefs −6.5 and Over 47.5, both −110 → pays about +264",
    edge: "The vig multiplies with every leg you add. See below.",
  },
  {
    name: "Teaser",
    what: "A parlay where you move each spread or total in your favor, usually 6 points in football, for a smaller payout.",
    example: "Chiefs −6.5 → −0.5 and Bills +1.5 → +7.5, two teams at −120",
    edge: "Priced as if every point is worth the same. It isn't: only moves across 3 and 7 buy much.",
  },
  {
    name: "Prop",
    what: "Something that happens inside the game, like a player's yards or who scores first.",
    example: "Josh Allen over 1.5 passing TDs (−140)",
    edge: "Often −115 or worse on both sides, a bigger cut than a standard spread.",
  },
  {
    name: "Futures",
    what: "An outcome settled weeks or months later, like a champion, an MVP or a season win total.",
    example: "Bills to win the Super Bowl +600",
    edge: "Add up every team's implied chance and it often runs well past 100%. Your money is tied up until it settles.",
  },
  {
    name: "Round robin",
    what: "Several smaller parlays built from one list of picks.",
    example: "3 picks as every 2-team parlay = 3 bets",
    edge: "Each mini-parlay carries the compounded vig of a parlay.",
  },
  {
    name: "Alternate line",
    what: "A spread or total moved off the main number, at a different price.",
    example: "Chiefs −3.5 (−160) instead of −6.5 (−110)",
    edge: "The book prices every half-point. Check that against how often games land on the numbers you're crossing.",
  },
];

const TWO_WAY_PRICES = [-105, -110, -115, -120];

function useMarginsData() {
  const [data, setData] = useState<MarginsData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch("/data/margins.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(setData)
      .catch(() => setError(true));
  }, []);
  return { data, error };
}

export default function SportsBettingBasics() {
  return (
    <article className="sb">
      <header className="sb__intro">
        <div className="eyebrow">
          <Link to="/learn">Learn</Link> · Fundamentals
        </div>
        <h1 className="sb__title">Sports Betting Basics</h1>
        <p className="sb__lede">
          What you can bet on, what the odds mean, and how much the book keeps. Once you understand the vig, you'll see
          why most bettors lose over time, and why parlays lose faster.
        </p>
        <nav className="sb__toc" aria-label="On this page">
          {SECTIONS.map((s, i) => (
            <a key={s.id} href={`#${s.id}`}>
              <span className="sb__toc-n">{i + 1}</span>
              {s.label}
            </a>
          ))}
        </nav>
      </header>

      <BetTypes />
      <AmericanOdds />
      <Spreads />
      <Vig />
      <Parlays />

      <aside className="sb__help">
        <strong>Bet for fun, not to make money.</strong> The math on this page is why the house wins over time. Set a
        limit before you start. If gambling stops being fun, call or text <a href="tel:18004262537">1-800-GAMBLER</a>.
      </aside>
    </article>
  );
}

function Section({ id, n, title, children }: { id: string; n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="sb__section">
      <div className="eyebrow">{String(n).padStart(2, "0")}</div>
      <h2 className="sb__h2">{title}</h2>
      {children}
    </section>
  );
}

// ---------- 1. Types of bets ----------

function BetTypes() {
  return (
    <Section id="bet-types" n={1} title="Types of bets">
      <p className="sb__p">
        Nearly every bet at a sportsbook is one of these, or a combination of them. The last column says where the book
        takes its cut.
      </p>
      <div className="sb__table-wrap">
        <table className="sb__table sb__table--stack">
          <thead>
            <tr>
              <th>Bet</th>
              <th>What you're betting on</th>
              <th>Example</th>
              <th>Where the house edge hides</th>
            </tr>
          </thead>
          <tbody>
            {BET_TYPES.map((b) => (
              <tr key={b.name}>
                <th scope="row">{b.name}</th>
                <td data-label="What">{b.what}</td>
                <td data-label="Example" className="sb__example">
                  {b.example}
                </td>
                <td data-label="House edge">{b.edge}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ---------- 2. American odds ----------

function AmericanOdds() {
  return (
    <Section id="american-odds" n={2} title="Reading American odds">
      <p className="sb__p">
        A <strong>minus</strong> number marks the favorite. It's how much you risk to win $100: at −150, you bet $150 to
        win $100. A <strong>plus</strong> number marks the underdog. It's how much a $100 bet wins: at +150, $100 wins
        $150.
      </p>
      <p className="sb__p">
        Each price also implies a <strong>chance</strong>. That's the win rate where the bet breaks even. If a bet wins
        more often than its implied chance, it makes money over time. If it wins less often, it loses.
      </p>
      <details className="sb__math">
        <summary>The math</summary>
        <p>
          Minus odds: implied chance = odds ÷ (odds + 100), using the number without its sign. −150 → 150 ÷ 250 = 60%.
        </p>
        <p>Plus odds: implied chance = 100 ÷ (odds + 100). +150 → 100 ÷ 250 = 40%.</p>
        <p>
          Decimal odds are what comes back per $1, your stake included. Minus: 1 + 100 ÷ odds. Plus: 1 + odds ÷ 100.
        </p>
      </details>
      <div className="sb__table-wrap sb__table-wrap--narrow">
        <table className="sb__table sb__table--num">
          <thead>
            <tr>
              <th>American</th>
              <th>Implied chance</th>
              <th>Decimal</th>
              <th>Profit on $100</th>
              <th>Risk to win $100</th>
            </tr>
          </thead>
          <tbody>
            {ODDS_LADDER.map((o) => (
              <tr key={o} className={o === -110 || o === 100 ? "is-mark" : undefined}>
                <th scope="row">{fmtAmerican(o)}</th>
                <td>{fmtPct(impliedProb(o), 1)}</td>
                <td>{toDecimal(o).toFixed(2)}</td>
                <td>{fmtDollars(profitOn100(o))}</td>
                <td>{fmtDollars(riskToWin100(o))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sb__note">
        Highlighted: +100 is an even-money coin flip, and −110 is the standard price on spreads and totals. At −110 you
        need to win 52.4% of your bets just to break even.
      </p>
    </Section>
  );
}

// ---------- 3. Spreads and key numbers ----------

const COVER_EXAMPLES: { result: string; outcome: string }[] = [
  { result: "Chiefs win by 10", outcome: "Chiefs −6.5 wins" },
  { result: "Chiefs win by 7", outcome: "Chiefs −6.5 wins" },
  { result: "Chiefs win by 6", outcome: "Raiders +6.5 wins" },
  { result: "Chiefs win by 3", outcome: "Raiders +6.5 wins" },
  { result: "Raiders win", outcome: "Raiders +6.5 wins" },
];

function Spreads() {
  const { data, error } = useMarginsData();
  return (
    <Section id="spreads" n={3} title="Point spreads">
      <p className="sb__p">
        A spread evens up a lopsided game. The book gives the underdog a head start, so both sides are close to a coin
        flip and priced the same, usually −110. The favorite has to win by <em>more</em> than the spread. The underdog
        can lose by <em>less</em> than the spread, or win outright.
      </p>
      <div className="sb__table-wrap sb__table-wrap--narrow">
        <table className="sb__table">
          <caption>Chiefs −6.5 vs Raiders +6.5</caption>
          <thead>
            <tr>
              <th>Final score</th>
              <th>Bet that wins</th>
            </tr>
          </thead>
          <tbody>
            {COVER_EXAMPLES.map((e) => (
              <tr key={e.result}>
                <th scope="row">{e.result}</th>
                <td className={e.outcome.startsWith("Chiefs") ? "sb__fav" : "sb__dog"}>{e.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sb__p">
        The half-point (the ".5") means there can't be a tie. On a whole number like −7, a 7-point win is a{" "}
        <strong>push</strong> and everyone gets their money back.
      </p>

      <h3 className="sb__h3">Key numbers</h3>
      <p className="sb__p">
        Football is scored in 3s and 7s, so final margins bunch up on a few numbers. That makes some half-points worth
        far more than others. Moving from −3.5 to −2.5 is a big change. Moving from −5.5 to −4.5 barely matters.
      </p>
      {error && <p className="sb__note">Couldn't load the game results. Please refresh in a minute.</p>}
      {!data && !error && <p className="sb__note">Loading every NFL result…</p>}
      {data && <KeyNumbers data={data} />}
    </Section>
  );
}

function KeyNumbers({ data }: { data: MarginsData }) {
  const first = data.seasons[0].year;
  const last = data.seasons.at(-1)!.year;
  const all = useMemo(() => combineMargins(data.seasons, first, last), [data, first, last]);
  const before = useMemo(() => combineMargins(data.seasons, first, 2014), [data, first]);
  const after = useMemo(() => combineMargins(data.seasons, 2015, last), [data, last]);
  const top = keyNumbers(all, 6);
  const three = all.share[3] ?? 0;
  const seven = all.share[7] ?? 0;

  return (
    <>
      <MarginChart table={all} />
      <p className="sb__note">
        Every NFL game, regular season and playoffs, {first}–{last} ({all.games.toLocaleString("en-US")} games). Ties
        left out. Data: nflverse.
      </p>
      <p className="sb__p">
        About <strong>{fmtPct(three, 0)}</strong> of games are decided by exactly 3 and{" "}
        <strong>{fmtPct(seven, 0)}</strong> by exactly 7. Nothing else comes close. A line that moves across 3 changes
        the result of about one game in {Math.round(1 / three)}. That's why books charge more for that half-point, and
        why a 6-point teaser is only a good deal when it moves a line across both 3 and 7 (for example, a −7.5 favorite
        teased down to −1.5, or a +1.5 underdog teased up to +7.5).
      </p>
      <div className="sb__table-wrap sb__table-wrap--narrow">
        <table className="sb__table sb__table--num">
          <caption>Most common final margins</caption>
          <thead>
            <tr>
              <th>Margin</th>
              <th>
                {first}–{last}
              </th>
              <th>{first}–2014</th>
              <th>2015–{last}</th>
            </tr>
          </thead>
          <tbody>
            {top.map((k) => (
              <tr key={k.margin} className={k.margin === 3 || k.margin === 7 ? "is-mark" : undefined}>
                <th scope="row">{k.margin}</th>
                <MarginCell t={all} m={k.margin} />
                <MarginCell t={before} m={k.margin} />
                <MarginCell t={after} m={k.margin} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sb__note">
        In 2015 the NFL moved the extra-point kick back to the 15-yard line. More missed kicks and more two-point tries
        have made 7 a little less common and 6 a little more.
      </p>
    </>
  );
}

function MarginCell({ t, m }: { t: MarginTable; m: number }) {
  return <td>{fmtPct(t.share[m] ?? 0, 1)}</td>;
}

// ---------- 4. The vig ----------

function Vig() {
  const std = twoWay(-110, -110);
  const each = impliedProb(-110);
  return (
    <Section id="vig" n={4} title="The vig">
      <p className="sb__p">
        The <strong>vig</strong> (also called juice) is the book's fee, built into the price. A fair coin flip would pay
        +100 on both sides. The book offers −110 on both sides instead. Each side then implies a {fmtPct(each, 1)}{" "}
        chance, and together they add up to more than 100%.
      </p>

      <div className="sb-vig" role="img" aria-label="Two sides at −110 imply 52.4% each, 104.8% in total">
        <div className="sb-vig__track">
          <div className="sb-vig__seg sb-vig__seg--a" style={{ width: `${(each / std.total) * 100}%` }}>
            <span>Side A {fmtPct(each, 1)}</span>
          </div>
          <div className="sb-vig__seg sb-vig__seg--b" style={{ width: `${(each / std.total) * 100}%` }}>
            <span>Side B {fmtPct(each, 1)}</span>
          </div>
          <div className="sb-vig__over" style={{ left: `${(1 / std.total) * 100}%` }} />
          <div className="sb-vig__line" style={{ left: `${(1 / std.total) * 100}%` }}>
            <span>100%</span>
          </div>
        </div>
        <div className="sb-vig__legend">
          <span>
            Total: <strong>{fmtPct(std.total, 1)}</strong>
          </span>
          <span>
            <i className="sb-vig__swatch" /> The {fmtPct(std.total - 1, 1)} past 100% is the vig
          </span>
        </div>
      </div>

      <p className="sb__p">
        Suppose one person bets $110 on each side. The book takes in $220 and pays the winner back $210 ($110 stake plus
        $100 profit). It keeps $10, or <strong>{fmtPct(std.hold, 2)}</strong> of everything bet, whoever wins. That cut
        is the <strong>hold</strong>.
      </p>

      <div className="sb__table-wrap sb__table-wrap--narrow">
        <table className="sb__table sb__table--num">
          <caption>Same price on both sides</caption>
          <thead>
            <tr>
              <th>Price</th>
              <th>Break-even win rate</th>
              <th>Book's hold</th>
            </tr>
          </thead>
          <tbody>
            {TWO_WAY_PRICES.map((o) => (
              <tr key={o} className={o === -110 ? "is-mark" : undefined}>
                <th scope="row">
                  {fmtAmerican(o)} / {fmtAmerican(o)}
                </th>
                <td>{fmtPct(impliedProb(o), 2)}</td>
                <td>{fmtPct(twoWay(o, o).hold, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details className="sb__math">
        <summary>The math</summary>
        <p>Add up the implied chance of each side. Anything over 100% is the overround: 52.38% + 52.38% = 104.76%.</p>
        <p>Hold = 1 − 1 ÷ total = 1 − 1 ÷ 1.0476 = 4.55%. It's the share of all money bet that the book keeps.</p>
        <p>
          To take the vig out, divide each side by the total: 52.38% ÷ 104.76% = 50%. That's the fair, no-vig chance.
        </p>
      </details>
    </Section>
  );
}

// ---------- 5. Parlays ----------

function Parlays() {
  const [price, setPrice] = useState(-110);
  const rows = useMemo(() => Array.from({ length: 10 }, (_, i) => coinFlipParlay(price, i + 1)), [price]);
  const one = rows[0];
  const ten = rows[9];

  return (
    <Section id="parlays" n={5} title="How the vig compounds in parlays">
      <p className="sb__p">
        A parlay's payout is each leg's price multiplied together. The vig gets multiplied too. Take a leg that's a true
        50/50 but priced at {fmtAmerican(price)}. As a straight bet, you give up{" "}
        <strong>${(-one.ev * 100).toFixed(2)}</strong> per $100 on average. String ten of those together and you give up{" "}
        <strong>${(-ten.ev * 100).toFixed(2)}</strong> per $100.
      </p>

      <div className="sb__controls">
        <span className="sb__control-label">Price on every leg</span>
        <div className="sb-seg" role="group" aria-label="Price on every leg">
          {TWO_WAY_PRICES.map((o) => (
            <button
              key={o}
              className={price === o ? "is-on" : ""}
              onClick={() => setPrice(o)}
              aria-pressed={price === o}
            >
              {fmtAmerican(o)}
            </button>
          ))}
        </div>
      </div>

      <ParlayChart rows={rows} />
      <p className="sb__note">
        Expected loss per $100, with every leg a true coin flip priced at {fmtAmerican(price)} on both sides.
      </p>

      <div className="sb__table-wrap">
        <table className="sb__table sb__table--num">
          <thead>
            <tr>
              <th>Legs</th>
              <th>Chance all hit</th>
              <th>Fair payout</th>
              <th>Book pays</th>
              <th>Your edge</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.legs}>
                <th scope="row">{r.legs}</th>
                <td>
                  {r.winChance >= 0.01
                    ? fmtPct(r.winChance, 1)
                    : `1 in ${Math.round(1 / r.winChance).toLocaleString("en-US")}`}
                </td>
                <td>{fmtAmerican(decToAmerican(r.fairDecimal))}</td>
                <td>{fmtAmerican(decToAmerican(r.bookDecimal))}</td>
                <td className="is-loss">{fmtPct(r.ev, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="sb__p">
        Every row is a losing bet, but the losses aren't equal. The payout looks bigger with each leg you add, and so
        does the share the book keeps. It's not that parlays are rigged. Paying the vig once per leg just adds up
        quickly. If you can't win straight bets at 52.4%, adding legs only makes it worse.
      </p>

      <details className="sb__math">
        <summary>The math</summary>
        <p>
          Chance all legs hit = 0.5<sup>legs</sup>. Fair payout = 1 ÷ that chance, so a 2-leg parlay should pay 4 for 1
          (+300).
        </p>
        <p>
          The book pays each leg's decimal price multiplied: at −110 that's 1.909 × 1.909 = 3.645 for 1 (+264) on two
          legs.
        </p>
        <p>
          Your edge = chance × payout − 1. At −110: 0.5 × 1.909 = 0.9545 per leg, so n legs return 0.9545
          <sup>n</sup> − 1. Ten legs: −37.2%.
        </p>
      </details>
    </Section>
  );
}
