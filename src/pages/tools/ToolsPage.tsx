import { Link } from "react-router-dom";
import "./tools.css";

// 0 = strong cell, 1 = weak, 2 = your pick, 3 = crossed out
const MINI_GRID = [
  [0, 1, 2, 1, 0, 1],
  [3, 3, 3, 3, 3, 3],
  [1, 0, 1, 1, 2, 0],
  [0, 2, 0, 1, 1, 1],
  [1, 1, 0, 0, 1, 2],
];

// Bar heights for the little outcome histogram on the bankroll card.
const MINI_DIST = [6, 12, 22, 36, 52, 70, 88, 100, 92, 76, 58, 40, 26, 15, 8];

export default function ToolsPage() {
  return (
    <div className="tools">
      <div className="tools__intro">
        <div className="eyebrow">Tools</div>
        <h1 className="tools__title">Sharpen your edge</h1>
        <p className="tools__lede">Free tools and drills for the math behind the bets. No sign-up.</p>
      </div>

      <div className="tools__list">
        <Link to="/tools/blackjack" className="game-card">
          <div className="game-card__art" aria-hidden="true">
            <span className="game-card__card">
              A<small>♠</small>
            </span>
            <span className="game-card__card game-card__card--red">
              7<small>♥</small>
            </span>
          </div>
          <div className="game-card__body">
            <div className="eyebrow">Blackjack · Level 1</div>
            <div className="game-card__name">Basic Blackjack Strategy</div>
            <p className="game-card__desc">
              Play hands against the dealer and learn the right move — hit, stand, double or split — with the reason
              behind every one.
            </p>
            <span className="game-card__cta">Play →</span>
          </div>
        </Link>

        <Link to="/tools/survivor" className="game-card">
          <div className="game-card__art game-card__art--grid" aria-hidden="true">
            <div className="mini-grid">
              {MINI_GRID.map((row, i) =>
                row.map((v, j) => (
                  <span
                    key={`${i}-${j}`}
                    className={v === 2 ? "is-pick" : v === 3 ? "is-used" : ""}
                    style={{ opacity: v === 1 ? 0.35 : undefined }}
                  />
                )),
              )}
            </div>
          </div>
          <div className="game-card__body">
            <div className="eyebrow">NFL · Survivor pools</div>
            <div className="game-card__name">Survivor Grid</div>
            <p className="game-card__desc">
              Every team's odds for every week, estimated pick popularity, future value, and a planner that maps out
              your season one team at a time.
            </p>
            <span className="game-card__cta">Open →</span>
          </div>
        </Link>

        <Link to="/tools/bankroll" className="game-card">
          <div className="game-card__art game-card__art--dist" aria-hidden="true">
            <div className="mini-dist">
              {MINI_DIST.map((h, i) => (
                <span key={i} className={i < 5 ? "is-down" : ""} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="game-card__body">
            <div className="eyebrow">Betting · Bankroll</div>
            <div className="game-card__name">Bankroll Management</div>
            <p className="game-card__desc">
              Set your win rate, line, bet count and bet size, then see thousands of seasons play out — how often a
              winning bettor still finishes down, or goes broke.
            </p>
            <span className="game-card__cta">Open →</span>
          </div>
        </Link>

        <div className="game-card is-soon" aria-disabled="true">
          <div className="game-card__art game-card__art--soon" aria-hidden="true">
            <span className="game-card__count">+1</span>
          </div>
          <div className="game-card__body">
            <div className="eyebrow">Blackjack · Level 2</div>
            <div className="game-card__name">Card Counting</div>
            <p className="game-card__desc">Track the shoe and adjust your play as cards come out.</p>
            <span className="game-card__cta is-muted">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
