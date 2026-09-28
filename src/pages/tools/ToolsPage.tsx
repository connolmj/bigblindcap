import { Link } from "react-router-dom";
import "./tools.css";

type Icon = "blackjack" | "counting" | "survivor" | "squares" | "bankroll" | "runs";

interface Tool {
  name: string;
  desc: string;
  icon: Icon;
  /** Leave out for a tool that's coming soon. */
  to?: string;
}

/** Add a tool by adding a row here — groups show in this order. */
const GROUPS: { title: string; tools: Tool[] }[] = [
  {
    title: "Betting",
    tools: [
      {
        name: "Bankroll Management",
        to: "/tools/bankroll",
        icon: "bankroll",
        desc: "Thousands of simulated seasons at your win rate and bet size — how often a winner still ends down.",
      },
    ],
  },
  {
    title: "NFL",
    tools: [
      {
        name: "Survivor Grid",
        to: "/tools/survivor",
        icon: "survivor",
        desc: "Every team's odds each week, pick popularity, future value and a season planner.",
      },
      {
        name: "Super Bowl Squares",
        to: "/tools/squares",
        icon: "squares",
        desc: "How often every box has hit each quarter, and what yours is worth against what you paid.",
      },
    ],
  },
  {
    title: "MLB",
    tools: [
      {
        name: "Run Scoring Odds",
        to: "/tools/runs",
        icon: "runs",
        desc: "Chance a run scores, and runs expected, for every base-out situation since 2000.",
      },
    ],
  },
  {
    title: "Blackjack",
    tools: [
      {
        name: "Basic Strategy",
        to: "/tools/blackjack",
        icon: "blackjack",
        desc: "Play hands and learn the right move — hit, stand, double or split — with the reason why.",
      },
      {
        name: "Card Counting",
        icon: "counting",
        desc: "Track the shoe and adjust your play as cards come out.",
      },
    ],
  },
];

export default function ToolsPage() {
  return (
    <div className="tools">
      <div className="tools__intro">
        <div className="eyebrow">Tools</div>
        <h1 className="tools__title">Sharpen your edge</h1>
        <p className="tools__lede">Free tools and drills for the math behind the bets. No sign-up.</p>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} className="tools__group">
          <h2 className="tools__group-title eyebrow">{g.title}</h2>
          <ul className="tools__list">
            {g.tools.map((t) => (
              <li key={t.name}>
                <ToolRow tool={t} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ToolRow({ tool }: { tool: Tool }) {
  const soon = !tool.to;
  const body = (
    <>
      <span className="tool-row__icon" aria-hidden="true">
        <ToolIcon icon={tool.icon} />
      </span>
      <span className="tool-row__text">
        <span className="tool-row__name">
          {tool.name}
          {soon && <span className="tool-row__soon">Coming soon</span>}
        </span>
        <span className="tool-row__desc">{tool.desc}</span>
      </span>
      {!soon && (
        <span className="tool-row__go" aria-hidden="true">
          →
        </span>
      )}
    </>
  );
  return soon ? (
    <div className="tool-row is-soon" aria-disabled="true">
      {body}
    </div>
  ) : (
    <Link to={tool.to!} className="tool-row">
      {body}
    </Link>
  );
}

/** Little 28×28 pictures of each tool. */
function ToolIcon({ icon }: { icon: Icon }) {
  switch (icon) {
    case "blackjack":
      return (
        <svg viewBox="0 0 28 28">
          <rect x="7" y="4" width="14" height="20" rx="2" className="i-card" />
          <text x="14" y="16" className="i-text">
            A
          </text>
        </svg>
      );
    case "counting":
      return (
        <svg viewBox="0 0 28 28">
          <text x="14" y="18" className="i-text i-text--muted">
            +1
          </text>
        </svg>
      );
    case "survivor":
      return (
        <svg viewBox="0 0 28 28">
          {[0, 1, 2].flatMap((r) =>
            [0, 1, 2].map((c) => (
              <rect
                key={`${r}${c}`}
                x={4 + c * 7}
                y={4 + r * 7}
                width="6"
                height="6"
                rx="1"
                className={r === 1 && c === 2 ? "i-ink" : r === 0 ? "i-off" : "i-on"}
              />
            )),
          )}
        </svg>
      );
    case "squares":
      return (
        <svg viewBox="0 0 28 28">
          {[3, 1, 0, 2, 1, 0, 0, 1, 0, 0, 0, 0, 2, 1, 0, 3].map((v, i) => (
            <rect
              key={i}
              x={4 + (i % 4) * 5.25}
              y={4 + Math.floor(i / 4) * 5.25}
              width="4.5"
              height="4.5"
              rx="0.8"
              className={`i-heat-${v}`}
            />
          ))}
        </svg>
      );
    case "bankroll":
      return (
        <svg viewBox="0 0 28 28">
          {[4, 8, 14, 18, 13, 7].map((h, i) => (
            <rect key={i} x={4 + i * 3.5} y={24 - h} width="2.6" height={h} className={i < 2 ? "i-loss" : "i-on"} />
          ))}
        </svg>
      );
    case "runs":
      return (
        <svg viewBox="0 0 28 28">
          <rect x="17" y="12" width="6" height="6" transform="rotate(45 20 15)" className="i-on" />
          <rect x="11" y="6" width="6" height="6" transform="rotate(45 14 9)" className="i-base" />
          <rect x="5" y="12" width="6" height="6" transform="rotate(45 8 15)" className="i-on" />
        </svg>
      );
  }
}
