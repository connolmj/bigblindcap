import { RULES } from "../../blackjack/engine/rules";
import type { TableTheme } from "../../blackjack/ui/settings";
import BlackjackTable from "../../blackjack/ui/Table";
import { fmtCount, fmtDecks } from "../engine/hilo";
import { cardsLeft, CUT_CARD, liveDecks, liveRunning, liveTrue, type Session } from "../engine/session";

interface Props {
  session: Session;
  roundId: number;
  theme: TableTheme;
  /** Show the running and true count on the table (when you're not being quizzed on it). */
  showCount: boolean;
}

export default function Table({ session, roundId, theme, showCount }: Props) {
  const playing = session.phase === "play" && session.round;
  return (
    <div className="cc-table">
      <ShoeMeter session={session} />
      {playing ? (
        <BlackjackTable key={roundId} round={session.round!} theme={theme} />
      ) : (
        <ClearedTable theme={theme} message={session.phase === "count" ? "Count check" : "Place your bet"} />
      )}
      {showCount && (
        <div className="cc-live" aria-live="off">
          Running <b>{fmtCount(liveRunning(session))}</b> · True <b>{fmtCount(liveTrue(session))}</b>
        </div>
      )}
    </div>
  );
}

/** Between hands: an empty table, the same height as a dealt one. */
function ClearedTable({ theme, message }: { theme: TableTheme; message: string }) {
  return (
    <div className="felt" data-theme={theme}>
      <div className="felt__dealer">
        <EmptyHand label="Dealer" />
      </div>
      <div className="felt__middle">
        <svg className="felt__arc" viewBox="0 0 600 120" aria-hidden="true">
          <path id="cc-arc" d="M 10 18 Q 300 128 590 18" fill="none" />
          <text>
            <textPath href="#cc-arc" startOffset="50%" textAnchor="middle">
              BLACKJACK PAYS 3 TO 2 · DEALER STANDS ON 17
            </textPath>
          </text>
        </svg>
        <div className="cc-place">{message}</div>
      </div>
      <div className="felt__player">
        <EmptyHand label="You" />
      </div>
    </div>
  );
}

/** A hand's space with no cards yet. */
function EmptyHand({ label }: { label: string }) {
  return (
    <div className="hand">
      <div className="hand__label">{label}</div>
      <div className="hand__cards" />
      <div className="hand__meta" />
    </div>
  );
}

/** How much of the shoe is gone, and where the cut card sits — the discard tray, in a bar. */
function ShoeMeter({ session }: { session: Session }) {
  const total = RULES.decks * 52;
  const left = cardsLeft(session);
  const dealt = (total - left) / total;
  const cut = (total - CUT_CARD) / total;
  return (
    <div className="cc-shoe">
      <span className="eyebrow">Shoe</span>
      <span
        className="cc-shoe__bar"
        role="meter"
        aria-label="Shoe dealt"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={total - left}
      >
        <span className="cc-shoe__dealt" style={{ width: `${dealt * 100}%` }} />
        <span className="cc-shoe__cut" style={{ left: `${cut * 100}%` }} title="Cut card: reshuffle" />
      </span>
      <span className="cc-shoe__text">
        About <b>{fmtDecks(liveDecks(session))}</b> {liveDecks(session) === 1 ? "deck" : "decks"} left
        {session.shuffled && session.phase !== "play" ? " · fresh shoe, count starts at 0" : ""}
      </span>
    </div>
  );
}
