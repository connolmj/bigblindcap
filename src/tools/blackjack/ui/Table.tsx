import { cardValue } from "../engine/cards";
import { describeTotal, handTotal } from "../engine/hand";
import type { RoundState } from "../engine/round";
import HandView, { fmtNet } from "./HandView";
import type { TableTheme } from "./settings";

interface Props {
  round: RoundState;
  theme: TableTheme;
}

const DEAL_STEP = 160; // ms between cards on the opening deal

export default function Table({ round, theme }: Props) {
  const opening = round.decisions.length === 0 && round.hands.length === 1;
  // Opening deal order: you, dealer, you, dealer.
  const playerDelay = (i: number) => (opening && i < 2 ? i * 2 * DEAL_STEP : 0);
  const dealerDelay = (i: number) => (opening && i < 2 ? (i * 2 + 1) * DEAL_STEP : 0);

  const up = round.dealer[0];
  const dealerTotal = round.holeRevealed
    ? describeTotal(round.dealer)
    : `Shows ${up.rank === "A" ? "A" : cardValue(up)}`;
  const split = round.hands.length > 1;

  return (
    <div
      className={round.phase === "settled" ? "felt is-settled" : "felt"}
      data-theme={theme}
      data-hands={round.hands.length}
    >
      <div className="felt__dealer">
        <HandView
          label="Dealer"
          cards={round.dealer}
          total={dealerTotal}
          hiddenIndex={round.holeRevealed ? undefined : 1}
          dealDelay={dealerDelay}
        />
      </div>

      <div className="felt__middle">
        <svg className="felt__arc" viewBox="0 0 600 120" aria-hidden="true">
          <path id="felt-arc" d="M 10 18 Q 300 128 590 18" fill="none" />
          <text>
            <textPath href="#felt-arc" startOffset="50%" textAnchor="middle">
              BLACKJACK PAYS 3 TO 2 · DEALER STANDS ON 17
            </textPath>
          </text>
        </svg>
        {round.phase === "settled" && <ResultBanner round={round} />}
      </div>

      <div className="felt__player">
        {round.hands.map((hand, i) => (
          <HandView
            key={i}
            label={split ? `Hand ${i + 1}` : "You"}
            cards={hand.cards}
            total={describeTotal(hand.cards)}
            dealDelay={i === 0 ? playerDelay : undefined}
            active={split && round.phase === "player" && i === round.active}
            dimmed={split && round.phase === "player" && i !== round.active}
            hand={hand}
          />
        ))}
      </div>
    </div>
  );
}

function ResultBanner({ round }: { round: RoundState }) {
  const net = round.net ?? 0;
  const tone = net > 0 ? "win" : net < 0 ? "lose" : "push";
  const { title, detail } = describeResult(round);
  return (
    <div className={`felt__banner is-${tone}`} role="status">
      <div className="felt__banner-title">{title}</div>
      <div className="felt__banner-detail">
        {detail} <strong>{fmtNet(net)}</strong>
      </div>
    </div>
  );
}

function describeResult(round: RoundState): { title: string; detail: string } {
  const dealer = handTotal(round.dealer).total;
  if (round.natural === "both") return { title: "Push", detail: "You both have blackjack." };
  if (round.natural === "player") return { title: "Blackjack!", detail: "Paid 3 to 2." };
  if (round.natural === "dealer") return { title: "Dealer blackjack", detail: "Nothing you could do." };

  if (round.hands.length > 1) {
    const wins = round.hands.filter((h) => h.net! > 0).length;
    return {
      title: wins === round.hands.length ? "Swept it!" : wins === 0 ? "Tough split" : "Split settled",
      detail: dealer > 21 ? `Dealer busts with ${dealer}.` : `Dealer has ${dealer}.`,
    };
  }

  const [hand] = round.hands;
  const mine = handTotal(hand.cards).total;
  switch (hand.outcome) {
    case "win":
      return dealer > 21
        ? { title: "Dealer busts", detail: `${dealer} — your ${mine} wins.` }
        : { title: "You win", detail: `${mine} beats ${dealer}.` };
    case "push":
      return { title: "Push", detail: `Both on ${mine}.` };
    default:
      return mine > 21
        ? { title: "Bust", detail: `${mine} is over 21.` }
        : { title: "Dealer wins", detail: `${dealer} beats ${mine}.` };
  }
}
