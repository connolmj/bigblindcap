import type { Card } from "../../blackjack/engine/cards";
import PlayingCard from "../../blackjack/ui/PlayingCard";
import { fmtNet } from "../../blackjack/ui/HandView";
import type { TableTheme } from "../../blackjack/ui/settings";
import { describe, evaluate } from "../engine/hand";
import type { RoundState } from "../engine/round";

interface Props {
  round: RoundState;
  theme: TableTheme;
}

const DEAL_STEP = 140; // ms between cards on the deal

export default function Table({ round, theme }: Props) {
  const settled = round.phase === "settled";
  const p = round.payout;
  const folded = round.decision?.chosen === "fold";
  const dealerText =
    round.revealed < 3
      ? round.phase === "decide"
        ? "Dealer"
        : "Revealing…"
      : `${describe(evaluate(round.dealer))}${p?.dealerQualified ? "" : " · doesn't qualify"}`;

  return (
    <div className={settled ? "felt tcp-felt is-settled" : "felt tcp-felt"} data-theme={theme}>
      <div className="felt__dealer">
        <Hand
          label="Dealer"
          cards={round.dealer}
          total={dealerText}
          faceDown={(i) => i >= round.revealed}
          delay={(i) => (i * 2 + 1) * DEAL_STEP}
        />
      </div>

      <div className="felt__middle">
        <svg className="felt__arc" viewBox="0 0 600 120" aria-hidden="true">
          <path id="tcp-arc" d="M 10 18 Q 300 128 590 18" fill="none" />
          <text>
            <textPath href="#tcp-arc" startOffset="50%" textAnchor="middle">
              DEALER QUALIFIES WITH QUEEN HIGH OR BETTER
            </textPath>
          </text>
        </svg>
        {settled && p && <ResultBanner round={round} />}
      </div>

      <div className="felt__player tcp-player">
        <Hand
          label="You"
          cards={round.player}
          total={describe(evaluate(round.player))}
          delay={(i) => i * 2 * DEAL_STEP}
          dim={folded}
        />
        <div className="tcp-spots" aria-label="Your bets">
          {round.pairPlus && <Spot label="Pair Plus" result={p?.pairPlus ?? undefined} />}
          <Spot label="Ante" result={p ? p.ante + p.anteBonus : undefined} note={p?.anteBonus ? "bonus" : undefined} />
          <Spot
            label="Play"
            empty={!round.decision || folded}
            result={p && !folded ? p.play : undefined}
            note={folded ? "folded" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

function Hand({
  label,
  cards,
  total,
  faceDown,
  delay,
  dim,
}: {
  label: string;
  cards: Card[];
  total: string;
  faceDown?: (i: number) => boolean;
  delay: (i: number) => number;
  dim?: boolean;
}) {
  return (
    <div className={dim ? "hand is-lose" : "hand"}>
      <div className="hand__label">{label}</div>
      <div className="hand__cards tcp-cards">
        {cards.map((card, i) => (
          <PlayingCard key={card.id} card={card} faceDown={faceDown?.(i)} dealDelay={delay(i)} />
        ))}
      </div>
      <div className="hand__meta">
        <span className="hand__total">{total}</span>
      </div>
    </div>
  );
}

/** A betting circle with its 1-unit chip, and what it paid once the hand is over. */
function Spot({ label, result, empty, note }: { label: string; result?: number; empty?: boolean; note?: string }) {
  const tone = result === undefined ? "" : result > 0 ? " is-win" : result < 0 ? " is-lose" : " is-push";
  return (
    <div className={`tcp-spot${tone}`}>
      <span className={empty ? "tcp-spot__ring is-empty" : "tcp-spot__ring"}>
        {!empty && <span className="tcp-chip">1</span>}
      </span>
      <span className="tcp-spot__label">{label}</span>
      {result !== undefined ? (
        <span className="tcp-spot__result">
          {result === 0 ? "Push" : fmtNet(result)}
          {note && result > 0 && <small> {note}</small>}
        </span>
      ) : (
        note && <span className="tcp-spot__note">{note}</span>
      )}
    </div>
  );
}

function ResultBanner({ round }: { round: RoundState }) {
  const p = round.payout!;
  const tone = p.net > 0 ? "win" : p.net < 0 ? "lose" : "push";
  const { title, detail } = describeResult(round);
  return (
    <div className={`felt__banner is-${tone}`} role="status">
      <div className="felt__banner-title">{title}</div>
      <div className="felt__banner-detail">
        {detail} <strong>{fmtNet(p.net)}</strong>
      </div>
    </div>
  );
}

function describeResult(round: RoundState): { title: string; detail: string } {
  const p = round.payout!;
  const lines: string[] = [];
  if (p.anteBonus) lines.push(`Ante bonus +${p.anteBonus}.`);
  if (p.pairPlus !== null) lines.push(p.pairPlus > 0 ? `Pair Plus +${p.pairPlus}.` : "Pair Plus loses.");
  const extra = lines.length ? " " + lines.join(" ") : "";

  if (round.decision?.chosen === "fold") return { title: "Folded", detail: `Ante lost.${extra}` };
  if (!p.dealerQualified) return { title: "Dealer doesn't qualify", detail: `Ante wins, play pushes.${extra}` };
  switch (p.result) {
    case "win":
      return { title: "You win", detail: `Ante and play both pay.${extra}` };
    case "tie":
      return { title: "Push", detail: `Same hand — bets returned.${extra}` };
    default:
      return { title: "Dealer wins", detail: `Ante and play lose.${extra}` };
  }
}
