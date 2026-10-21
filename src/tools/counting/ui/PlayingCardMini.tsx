import { isRed, SUIT_SYMBOL, type Card } from "../../blackjack/engine/cards";

/** A card as a small text tile, for the count breakdown. */
export function PlayingCardMini({ card }: { card: Card }) {
  return (
    <span className={isRed(card) ? "cc-mini is-red" : "cc-mini"} aria-label={`${card.rank} of ${card.suit}`}>
      {card.rank}
      {SUIT_SYMBOL[card.suit]}
    </span>
  );
}
