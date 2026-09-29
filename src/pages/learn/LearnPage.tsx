import { Link } from "react-router-dom";
import "../tools/tools.css";

interface Guide {
  name: string;
  desc: string;
  /** Leave out for a guide that's coming soon. */
  to?: string;
}

/** Add a guide by adding a row here — groups show in this order. */
const GROUPS: { title: string; guides: Guide[] }[] = [
  {
    title: "Fundamentals",
    guides: [
      {
        name: "Sports Betting Basics",
        to: "/learn/fundamentals/sports-betting-basics",
        desc: "Types of bets, American odds, point spreads, and how the vig compounds in parlays.",
      },
    ],
  },
];

export default function LearnPage() {
  return (
    <div className="tools">
      <div className="tools__intro">
        <div className="eyebrow">Learn</div>
        <h1 className="tools__title">Know the math</h1>
        <p className="tools__lede">Plain-English guides to risk, odds, betting and investing.</p>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} className="tools__group">
          <h2 className="tools__group-title eyebrow">{g.title}</h2>
          <ul className="tools__list">
            {g.guides.map((guide) => (
              <li key={guide.name}>
                <GuideRow guide={guide} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function GuideRow({ guide }: { guide: Guide }) {
  const soon = !guide.to;
  const body = (
    <>
      <span className="tool-row__text">
        <span className="tool-row__name">
          {guide.name}
          {soon && <span className="tool-row__soon">Coming soon</span>}
        </span>
        <span className="tool-row__desc">{guide.desc}</span>
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
    <Link to={guide.to!} className="tool-row">
      {body}
    </Link>
  );
}
