import type { Card } from "../../blackjack/engine/cards";
import { fmtNet } from "../../blackjack/ui/HandView";
import PlayingCard from "../../blackjack/ui/PlayingCard";
import type { TableTheme } from "../../blackjack/ui/settings";
import { total } from "../engine/hand";
import { BET_LABEL, type Bet } from "../engine/payouts";
import type { RoundState } from "../engine/round";
import { OPENING_CARD_GAP as DEAL_STEP } from "./settings";

interface Props {
  round: RoundState;
  theme: TableTheme;
}

const SPOTS: Bet[] = ["player", "tie", "banker"];

export default function Table({ round, theme }: Props) {
  const settled = round.phase === "settled";
  return (
    <div className={settled ? "felt bac-felt is-settled" : "felt bac-felt"} data-theme={theme}>
      <div className="bac-hands">
        <Hand
          label="Player"
          cards={round.player}
          // Opening deal order: Player, Banker, Player, Banker.
          delay={(i) => (i < 2 ? i * 2 * DEAL_STEP : 0)}
          active={round.phase === "playerDraw"}
          won={settled && round.winner === "player"}
        />
        <Hand
          label="Banker"
          cards={round.banker}
          delay={(i) => (i < 2 ? (i * 2 + 1) * DEAL_STEP : 0)}
          active={round.phase === "bankerDraw"}
          won={settled && round.winner === "banker"}
        />
      </div>

      <div className="felt__middle">
        <svg className="felt__arc" viewBox="0 0 600 120" aria-hidden="true">
          <path id="bac-arc" d="M 10 18 Q 300 128 590 18" fill="none" />
          <text>
            <textPath href="#bac-arc" startOffset="50%" textAnchor="middle">
              {round.commission === "standard"
                ? "BANKER PAYS 19 TO 20 · TIE PAYS 8 TO 1"
                : "BANKER WINNING 6 PAYS 1 TO 2 · TIE PAYS 8 TO 1"}
            </textPath>
          </text>
        </svg>
        {settled && <ResultBanner round={round} />}
        {round.phase === "bet" && <div className="bac-place">Place your bet</div>}
      </div>

      <div className="bac-spots" aria-label="Bets">
        {SPOTS.map((s) => (
          <Spot key={s} bet={s} round={round} />
        ))}
      </div>
    </div>
  );
}

function Hand(props: { label: string; cards: Card[]; delay: (i: number) => number; active: boolean; won: boolean }) {
  const classes = ["hand", "bac-hand"];
  if (props.active) classes.push("is-active");
  if (props.won) classes.push("is-win");
  return (
    <div className={classes.join(" ")}>
      <div className="hand__label">{props.label}</div>
      <div className="hand__cards bac-cards">
        {props.cards.map((card, i) => (
          <PlayingCard key={card.id} card={card} dealDelay={props.delay(i)} />
        ))}
      </div>
      <div className="hand__meta">
        {props.cards.length > 0 && <span className="hand__total">{total(props.cards)}</span>}
      </div>
    </div>
  );
}

function Spot({ bet, round }: { bet: Bet; round: RoundState }) {
  const mine = round.bet === bet;
  const settled = round.phase === "settled";
  const result = settled && mine ? round.net! : undefined;
  const tone = result === undefined ? "" : result > 0 ? " is-win" : result < 0 ? " is-lose" : " is-push";
  return (
    <div className={`bac-spot bac-spot--${bet}${mine ? " is-mine" : ""}${tone}`}>
      <span className="bac-spot__name">{BET_LABEL[bet]}</span>
      {mine && <span className="tcp-chip">1</span>}
      {result !== undefined && <span className="tcp-spot__result">{result === 0 ? "Push" : fmtNet(result)}</span>}
    </div>
  );
}

function ResultBanner({ round }: { round: RoundState }) {
  const net = round.net ?? 0;
  const tone = net > 0 ? "win" : net < 0 ? "lose" : "push";
  const pt = total(round.player);
  const bt = total(round.banker);
  const title =
    round.winner === "tie"
      ? `Tie, ${pt} to ${bt}`
      : `${BET_LABEL[round.winner!]} wins ${Math.max(pt, bt)} to ${Math.min(pt, bt)}`;
  let detail = round.natural ? "Natural — nobody draws." : "";
  if (round.winner === "tie" && round.bet !== "tie") detail += " Your bet pushes.";
  if (round.winner === "banker" && round.bet === "banker" && net < 1)
    detail += round.commission === "standard" ? " Less 5% commission." : " A winning 6 pays half.";
  return (
    <div
      className={`felt__banner is-${tone} ${round.natural ? "bac-banner--natural" : "bac-banner--late"}`}
      role="status"
    >
      <div className="felt__banner-title">{title}</div>
      <div className="felt__banner-detail">
        {detail.trim()} <strong>{fmtNet(net)}</strong>
      </div>
    </div>
  );
}
