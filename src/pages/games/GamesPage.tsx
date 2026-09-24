import { Link } from "react-router-dom";
import "./games.css";

export default function GamesPage() {
  return (
    <div className="games">
      <div className="games__intro">
        <div className="eyebrow">Games</div>
        <h1 className="games__title">Sharpen your edge</h1>
        <p className="games__lede">Short drills for the math behind the table. Free to play, no sign-up.</p>
      </div>

      <div className="games__list">
        <Link to="/games/blackjack" className="game-card">
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
