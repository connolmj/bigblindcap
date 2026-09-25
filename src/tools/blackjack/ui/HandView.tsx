import type { Card } from "../engine/cards";
import type { PlayerHand } from "../engine/round";
import PlayingCard from "./PlayingCard";

interface Props {
  cards: Card[];
  total: string;
  /** Index of a card to show face down (the dealer's hole card). */
  hiddenIndex?: number;
  /** Stagger for the opening deal: returns a delay per card index, or 0. */
  dealDelay?: (i: number) => number;
  active?: boolean;
  dimmed?: boolean;
  hand?: PlayerHand;
  label?: string;
}

const OUTCOME_TEXT = { blackjack: "Blackjack", win: "Win", push: "Push", lose: "Lose" } as const;

export function fmtNet(n: number): string {
  if (n === 0) return "±0";
  return (n > 0 ? "+" : "−") + Math.abs(n) + "u";
}

export default function HandView({ cards, total, hiddenIndex, dealDelay, active, dimmed, hand, label }: Props) {
  const classes = ["hand"];
  if (active) classes.push("is-active");
  if (dimmed) classes.push("is-dimmed");
  if (hand?.outcome) classes.push(`is-${hand.outcome}`);

  return (
    <div className={classes.join(" ")}>
      {label && <div className="hand__label">{label}</div>}
      <div className="hand__cards">
        {cards.map((card, i) => (
          <PlayingCard key={card.id} card={card} faceDown={i === hiddenIndex} dealDelay={dealDelay?.(i) ?? 0} />
        ))}
      </div>
      <div className="hand__meta">
        <span className="hand__total">{total}</span>
        {hand && (
          <span className={hand.doubled ? "hand__bet is-doubled" : "hand__bet"} title={`${hand.bet} unit bet`}>
            {hand.bet}u
          </span>
        )}
        {hand?.outcome && (
          <span className="hand__outcome">
            {OUTCOME_TEXT[hand.outcome]} {fmtNet(hand.net ?? 0)}
          </span>
        )}
      </div>
    </div>
  );
}
