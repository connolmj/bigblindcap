import { Link } from "react-router-dom";
import "../../site/plain.css";

interface Tool {
  name: string;
  desc: string;
  /** Leave out for a tool that's coming soon. */
  to?: string;
}

interface Group {
  /** Sub-heading inside a category; leave out for a plain list. */
  title?: string;
  tools: Tool[];
}

/**
 * Add a tool by adding a row here. Categories show in this order, then the
 * groups inside each one.
 */
const CATEGORIES: { title: string; groups: Group[] }[] = [
  {
    title: "General Betting",
    groups: [
      {
        title: "Bankroll",
        tools: [
          {
            name: "Bankroll Management",
            to: "/tools/bankroll",
            desc: "Thousands of simulated seasons at your win rate and bet size — how often a winner still ends down.",
          },
        ],
      },
    ],
  },
  {
    title: "Sports Betting",
    groups: [
      {
        title: "NFL",
        tools: [
          {
            name: "Survivor Grid",
            to: "/tools/survivor",
            desc: "Every team's odds each week, pick popularity, future value and a season planner.",
          },
          {
            name: "Super Bowl Squares",
            to: "/tools/squares",
            desc: "How often every box has hit each quarter, and what yours is worth against what you paid.",
          },
          {
            name: "Key Numbers & Trends",
            to: "/tools/nfl-numbers",
            desc: "How close games finish, how favorites and underdogs do at every spread, home field, totals, division games — and how it's all changed since 1999.",
          },
        ],
      },
      {
        title: "MLB",
        tools: [
          {
            name: "Run Scoring Odds",
            to: "/tools/runs",
            desc: "Chance a run scores, and runs expected, for every base-out situation since 2000.",
          },
        ],
      },
    ],
  },
  {
    title: "Casino Games",
    groups: [
      {
        // One list, no sub-headings: each tool's name says which game it's for.
        tools: [
          {
            name: "Blackjack Basic Strategy",
            to: "/tools/blackjack",
            desc: "Play hands and learn the right move — hit, stand, double or split — with the reason why.",
          },
          {
            name: "Blackjack Card Counting",
            desc: "Track the shoe and adjust your play as cards come out.",
          },
          {
            name: "Three Card Poker Strategy",
            to: "/tools/three-card-poker",
            desc: "Practice the one decision in the game — play or fold — see what every hand is worth, and learn the payouts.",
          },
          {
            name: "Baccarat Strategy",
            to: "/tools/baccarat",
            desc: "Pick the best bet for the table, call every third card like the dealer, and see the house edge on each bet.",
          },
          {
            name: "Craps Strategy",
            to: "/tools/craps",
            desc: "Bet a full layout and roll the dice. Every bet is graded on its house edge, with the better bet and what it saves.",
          },
        ],
      },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="plain">
      <div className="plain__intro">
        <div className="eyebrow">Tools</div>
        <h1 className="plain__title">Sharpen your edge</h1>
        <p className="plain__lede">Free tools and drills for the math behind the bets. No sign-up.</p>
      </div>

      {CATEGORIES.map((c) => (
        <section key={c.title} className="plain__section">
          <h2 className="plain__heading">{c.title}</h2>
          {c.groups.map((g, i) => (
            <div key={g.title ?? i}>
              {g.title && <h3 className="plain__group eyebrow">{g.title}</h3>}
              <ul className="plain__list">
                {g.tools.map((t) => (
                  <li key={t.name}>
                    {t.to ? (
                      <Link className="underlined" to={t.to}>
                        {t.name}
                      </Link>
                    ) : (
                      <span className="plain__soon">{t.name} (coming soon)</span>
                    )}
                    <span className="plain__why">{t.desc}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
