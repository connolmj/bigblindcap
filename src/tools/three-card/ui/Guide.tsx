import { useMemo, type ReactNode } from "react";
import { fmtEv } from "../engine/explain";
import { CATEGORIES, CATEGORY_NAME, type Category } from "../engine/hand";
import {
  ANTE_BONUS,
  ANTE_PLAY_RETURN,
  ANTE_PLAY_RETURN_PER_ACTION,
  CATEGORY_COUNTS,
  OTHER_STRATEGIES,
  PAIR_PLUS,
  pairPlusReturn,
  TOTAL_HANDS,
  type PairPlusTable,
} from "../engine/paytable";
import { analyze } from "../engine/strategy";
import { parseCards } from "../engine/notation";

const SECTIONS = [
  { id: "how-to-play", label: "How to play" },
  { id: "payouts", label: "What gets paid" },
  { id: "rankings", label: "Hand rankings" },
  { id: "why", label: "Why Q-6-4" },
];

const STRONGEST_FIRST = [...CATEGORIES].reverse();
const pct = (x: number, d = 2) => `${(x * 100).toFixed(d)}%`;
const oneIn = (count: number) => {
  const n = TOTAL_HANDS / count;
  return `1 in ${n < 10 ? n.toFixed(1) : Math.round(n).toLocaleString("en-US")}`;
};
const PP_TABLES = Object.keys(PAIR_PLUS) as PairPlusTable[];

/** Off-suit, unconnected example hands on either side of the line (no flush or straight sneaking in). */
const LADDER = [
  { label: "J-10-8", cards: ["Js", "Th", "8d"] },
  { label: "Q-5-4", cards: ["Qs", "5h", "4d"] },
  { label: "Q-6-2", cards: ["Qs", "6h", "2d"] },
  { label: "Q-6-3", cards: ["Qs", "6h", "3d"] },
  { label: "Q-6-4", cards: ["Qs", "6h", "4d"] },
  { label: "Q-6-5", cards: ["Qs", "6h", "5d"] },
  { label: "Q-7-2", cards: ["Qs", "7h", "2d"] },
  { label: "Q-J-9", cards: ["Qs", "Jh", "9d"] },
  { label: "K-3-2", cards: ["Ks", "3h", "2d"] },
  { label: "A-4-2", cards: ["As", "4h", "2d"] },
];

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
      <Rankings />
      <WhyQ64 />
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
  return (
    <Section id="how-to-play" n={1} title="How to play">
      <p className="tcp-guide__p">
        Three Card Poker is you against the dealer, one deck, three cards each. There's only one decision in the whole
        game, which is why it's worth getting exactly right.
      </p>
      <ol className="tcp-steps">
        <li>
          <b>Bet the ante.</b> You can also bet <b>Pair Plus</b>, a side bet that pays on your hand alone.
        </li>
        <li>
          <b>Get three cards.</b> The dealer gets three too, face down.
        </li>
        <li>
          <b>Play or fold.</b> To stay in, put out a <b>play</b> bet the same size as your ante. To fold, give up the
          ante. Pair Plus still pays on your hand either way.
        </li>
        <li>
          <b>The dealer turns over.</b> They need <b>Queen-high or better</b> to qualify. If they don't, your ante wins
          and your play bet comes back.
        </li>
        <li>
          <b>Best hand wins.</b> If the dealer qualifies, the higher hand wins both the ante and the play bet. A tie
          pushes.
        </li>
      </ol>
    </Section>
  );
}

function Payouts() {
  const ppEdge = useMemo(() => Object.fromEntries(PP_TABLES.map((t) => [t, -pairPlusReturn(PAIR_PLUS[t])])), []);
  const paying = STRONGEST_FIRST.filter((c) => PAIR_PLUS[PP_TABLES[0]][c] !== undefined);

  return (
    <Section id="payouts" n={2} title="What gets paid">
      <h3 className="tcp-guide__h3">Ante and play</h3>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">What happens</th>
              <th scope="col">Ante</th>
              <th scope="col">Play</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">You fold</th>
              <td className="is-lose">Loses</td>
              <td>—</td>
            </tr>
            <tr>
              <th scope="row">Dealer doesn't qualify</th>
              <td className="is-win">1 to 1</td>
              <td>Push</td>
            </tr>
            <tr>
              <th scope="row">You beat a qualifying dealer</th>
              <td className="is-win">1 to 1</td>
              <td className="is-win">1 to 1</td>
            </tr>
            <tr>
              <th scope="row">Dealer beats you</th>
              <td className="is-lose">Loses</td>
              <td className="is-lose">Loses</td>
            </tr>
            <tr>
              <th scope="row">Tie</th>
              <td>Push</td>
              <td>Push</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="tcp-guide__h3">Ante bonus</h3>
      <p className="tcp-guide__p">
        Paid on your ante for a strong hand <b>whatever the dealer has</b> — even if they beat you — as long as you
        played.
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Your hand</th>
              <th scope="col">Pays</th>
            </tr>
          </thead>
          <tbody>
            {STRONGEST_FIRST.filter((c) => ANTE_BONUS[c]).map((c) => (
              <tr key={c}>
                <th scope="row">{CATEGORY_NAME[c]}</th>
                <td className="is-win">{ANTE_BONUS[c]} to 1</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="tcp-guide__h3">Pair Plus</h3>
      <p className="tcp-guide__p">
        A separate bet on your own three cards. The dealer's hand doesn't matter, and it pays even if you fold. Casinos
        use different tables; the flush payout is the one to check.
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Your hand</th>
              <th scope="col">How often</th>
              {PP_TABLES.map((t) => (
                <th scope="col" key={t}>
                  {t === "1-4-6-30-40" ? "Better table" : "Common table"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paying.map((c) => (
              <tr key={c}>
                <th scope="row">{CATEGORY_NAME[c]}</th>
                <td>{oneIn(CATEGORY_COUNTS[c])}</td>
                {PP_TABLES.map((t) => (
                  <td key={t} className={c === "flush" && t === "1-3-6-30-40" ? "is-lose" : "is-win"}>
                    {PAIR_PLUS[t][c]} to 1
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th scope="row">Anything else</th>
              <td>{oneIn(CATEGORY_COUNTS.high)}</td>
              {PP_TABLES.map((t) => (
                <td key={t} className="is-lose">
                  Loses
                </td>
              ))}
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                House edge
              </th>
              {PP_TABLES.map((t) => (
                <td key={t}>{pct(ppEdge[t])}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="tcp-guide__note">
        Paying a flush 3 to 1 instead of 4 to 1 looks small, but flushes come up so often that it triples the house
        edge. There's no decision to make on Pair Plus, so the only way to play it well is to find the better table — or
        skip it.
      </p>
    </Section>
  );
}

function Rankings() {
  return (
    <Section id="rankings" n={3} title="Hand rankings">
      <p className="tcp-guide__p">
        With three cards, <b>a straight beats a flush</b>. It's the reverse of regular poker because it's the rarer
        hand: there are {CATEGORY_COUNTS.straight} straights but {CATEGORY_COUNTS.flush.toLocaleString("en-US")}{" "}
        flushes. A-2-3 is the lowest straight and A-K-Q the highest; K-A-2 doesn't count.
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Hand</th>
              <th scope="col">Example</th>
              <th scope="col">Hands</th>
              <th scope="col">Chance</th>
            </tr>
          </thead>
          <tbody>
            {STRONGEST_FIRST.map((c) => (
              <tr key={c}>
                <th scope="row">{CATEGORY_NAME[c]}</th>
                <td className="tcp-example">{EXAMPLE[c]}</td>
                <td>{CATEGORY_COUNTS[c].toLocaleString("en-US")}</td>
                <td>{pct(CATEGORY_COUNTS[c] / TOTAL_HANDS)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={2}>
                Every hand
              </th>
              <td>{TOTAL_HANDS.toLocaleString("en-US")}</td>
              <td>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Section>
  );
}

const EXAMPLE: Record<Category, string> = {
  straightFlush: "8♥ 9♥ 10♥",
  trips: "7♠ 7♥ 7♦",
  straight: "4♣ 5♦ 6♠",
  flush: "2♦ 9♦ K♦",
  pair: "J♠ J♣ 4♥",
  high: "Q♠ 6♥ 4♦",
};

function WhyQ64() {
  // ~18k dealer hands per example — a few milliseconds each, counted once.
  const ladder = useMemo(() => LADDER.map((l) => ({ ...l, a: analyze(parseCards(...l.cards)) })), []);
  const lo = -1.12;
  const hi = -0.8;
  const x = (ev: number) => `${((Math.min(hi, Math.max(lo, ev)) - lo) / (hi - lo)) * 100}%`;

  return (
    <Section id="why" n={4} title="Why Q-6-4?">
      <p className="tcp-guide__p">
        Every decision comes down to one comparison. <b>Folding always costs exactly your ante.</b> Playing puts a
        second unit at risk, and it's worth it only if, on average, you lose less than one ante by staying in.
      </p>
      <p className="tcp-guide__p">
        Two things pull in your favor when you play. The dealer fails to qualify about 30% of the time — then your ante
        wins and the play bet comes back, whatever you hold. And when the dealer does qualify, you still beat some of
        their hands. Against that, every qualifying hand that beats you costs two units.
      </p>
      <p className="tcp-guide__p">
        Jack-high or worse can't beat any qualifying hand, so it only ever wins one unit, about 30% of the time, and
        loses two the other 70%: fold it. Any Ace or King is comfortably worth playing. Queen-high is where it flips,
        and counting every hand the dealer could hold puts the line exactly at <b>Q-6-4</b>.
      </p>

      <div className="tcp-ladder-ev" role="table" aria-label="Average result of playing, by hand">
        <div className="tcp-ladder-ev__head" role="row">
          <span role="columnheader">Hand</span>
          <span role="columnheader" className="tcp-ladder-ev__axis">
            <span>Playing loses more than folding</span>
            <span>Playing loses less</span>
          </span>
          <span role="columnheader">Play</span>
        </div>
        {ladder.map(({ label, a }) => (
          <div
            key={label}
            role="row"
            className={a.action === "play" ? "tcp-ladder-ev__row is-play" : "tcp-ladder-ev__row"}
          >
            <span role="cell" className="tcp-ladder-ev__hand">
              {label}
            </span>
            <span role="cell" className="tcp-ladder-ev__track">
              <span className="tcp-ladder-ev__fold" style={{ left: x(-1) }} />
              <span className="tcp-ladder-ev__dot" style={{ left: x(a.playEv) }} />
            </span>
            <span role="cell" className="tcp-ladder-ev__num">
              {fmtEv(a.playEv, 3)}
            </span>
          </div>
        ))}
        <p className="tcp-guide__note">
          The line is folding's −1u. Off-suit examples; your exact numbers shift by a hair depending on suits, but never
          across the line.
        </p>
      </div>

      <h3 className="tcp-guide__h3">What it costs</h3>
      <p className="tcp-guide__p">
        Play perfectly and the house keeps <b>{pct(-ANTE_PLAY_RETURN)}</b> of your ante —{" "}
        {pct(-ANTE_PLAY_RETURN_PER_ACTION)} of everything you bet, counting the play bets. The common shortcuts cost
        more:
      </p>
      <div className="tcp-table-wrap">
        <table className="tcp-table">
          <thead>
            <tr>
              <th scope="col">Strategy</th>
              <th scope="col">Rule</th>
              <th scope="col">House edge</th>
            </tr>
          </thead>
          <tbody>
            <tr className="is-best">
              <th scope="row">Q-6-4</th>
              <td>Play Q-6-4 or better</td>
              <td>{pct(-ANTE_PLAY_RETURN)}</td>
            </tr>
            {OTHER_STRATEGIES.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.name}</th>
                <td>{s.rule}</td>
                <td>{pct(-s.ret)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tcp-guide__note">
        Per ante, counted over every possible deal: all {TOTAL_HANDS.toLocaleString("en-US")} hands you can get against
        the 18,424 the dealer can hold from the other 49 cards.
      </p>
    </Section>
  );
}
