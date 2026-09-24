import { useEffect, useRef, type CSSProperties } from "react";
import { isRed, SUIT_SYMBOL, type Card } from "../engine/cards";
import { playDeal, playFlip } from "./sound";

interface Props {
  card: Card;
  faceDown?: boolean;
  /** Delay (ms) before the deal-in animation starts, for staggering the opening deal. */
  dealDelay?: number;
}

const FACE = new Set(["J", "Q", "K"]);

export default function PlayingCard({ card, faceDown = false, dealDelay = 0 }: Props) {
  const suit = SUIT_SYMBOL[card.suit];
  const style = { "--deal-delay": `${dealDelay}ms` } as CSSProperties;
  const label = faceDown ? "Face-down card" : `${card.rank} of ${card.suit}`;

  // Sound when the card lands (timed with its deal animation)...
  useEffect(() => {
    const t = setTimeout(playDeal, dealDelay);
    return () => clearTimeout(t);
    // Only on mount: a card is dealt once.
  }, []);

  // ...and when a face-down card is turned over.
  const wasDown = useRef(faceDown);
  useEffect(() => {
    if (wasDown.current && !faceDown) playFlip();
    wasDown.current = faceDown;
  }, [faceDown]);

  return (
    <div className="pcard" style={style} role="img" aria-label={label}>
      <div className={faceDown ? "pcard__inner is-flipped" : "pcard__inner"}>
        <div className={isRed(card) ? "pcard__face is-red" : "pcard__face"}>
          <span className="pcard__corner pcard__corner--tl">
            <span className="pcard__rank">{card.rank}</span>
            <span className="pcard__suit">{suit}</span>
          </span>
          <span className={FACE.has(card.rank) ? "pcard__center pcard__center--face" : "pcard__center"}>
            {FACE.has(card.rank) ? (
              <>
                <span className="pcard__face-letter">{card.rank}</span>
                <span className="pcard__face-suit">{suit}</span>
              </>
            ) : (
              suit
            )}
          </span>
          <span className="pcard__corner pcard__corner--br">
            <span className="pcard__rank">{card.rank}</span>
            <span className="pcard__suit">{suit}</span>
          </span>
        </div>
        <div className="pcard__back">
          <span className="pcard__back-chip">BB</span>
        </div>
      </div>
    </div>
  );
}
