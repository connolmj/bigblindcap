import { useMemo } from "react";
import { Link } from "react-router-dom";
import { computeBook } from "../../data/book";
import { useBookData } from "../../data/BookProvider";
import { fmtBig, fmtKeyDate, fmtPct, fmtRecord, fmtUnits, toneClass } from "../../data/format";
import "./home.css";

export default function HomePage() {
  const data = useBookData();
  const book = useMemo(() => computeBook(data), [data]);
  const { sports } = book;

  return (
    <div className="home">
      <div className="home__intro">
        <p>
          Welcome to Big Blind Capital. We take risks, we splash the chips. I will be tracking both equities and sports
          picks. Just having fun documenting the journey and wanted to build a track record. Let’s see how this goes.
        </p>
        <p>
          This is not investment advice and for fun only. <strong>GL us</strong> · Follow me on X{" "}
          <a href="https://x.com/BigBlindCap" target="_blank" rel="noopener" className="underlined">
            @BigBlindCap
          </a>
        </p>
        {/* Was an 8 MB GIF; the same clip as a looping MP4 is ~0.5 MB. */}
        <video
          className="home__clip"
          src="/media/chips.mp4"
          poster="/media/chips-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
      </div>

      <section className="home__book">
        <div className="eyebrow home__book-title">Total book</div>
        <div className="home__totals">
          <div className="home__total">
            <div className="home__total-value">{fmtBig(book.totalNow)}</div>
            <div className="eyebrow">Current units</div>
          </div>
          <div className="home__trio">
            <Stat value={fmtUnits(book.allUp)} tone={book.allUp} label="Units up" />
            <Stat value={fmtPct(book.ytdRoi)} tone={book.ytdUp} label={`${book.year} ROI`} />
            <Stat value={fmtPct(book.allRoi)} tone={book.allUp} label="All-time ROI" />
          </div>
          <div className="home__split-note">
            Sports {fmtBig(book.sportsNow)} · Portfolio {fmtBig(book.eqNow)}
          </div>
        </div>

        <div className="home__cards">
          <Link to="/sports" className="home__card">
            <div className="eyebrow">Sports</div>
            <div className={`home__card-value ${sports.n ? toneClass(sports.u) : "is-faint"}`}>
              {sports.n ? fmtUnits(sports.u) : "—"}
            </div>
            <div className={`home__card-roi ${sports.n ? toneClass(sports.u) : "is-faint"}`}>
              ROI {fmtPct(book.sportsRoi)}
            </div>
            <div className="home__card-meta">
              {sports.n ? `${fmtRecord(sports)} · ${sports.risked.toFixed(0)}u risked` : "No graded picks yet"}
            </div>
          </Link>
          <Link to="/portfolio" className="home__card">
            <div className="eyebrow">Portfolio</div>
            <div className={`home__card-value ${toneClass(book.eqDelta)}`}>{fmtUnits(book.eqDelta)}</div>
            <div className={`home__card-roi ${toneClass(book.eqDelta)}`}>ROI {fmtPct(book.eqRoi)}</div>
            <div className="home__card-meta">Since {book.trackKey ? fmtKeyDate(book.trackKey) : "Sep 22, 2026"}</div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, tone, label }: { value: string; tone: number; label: string }) {
  return (
    <div className="home__stat">
      <div className={`home__stat-value ${toneClass(tone)}`}>{value}</div>
      <div className="eyebrow">{label}</div>
    </div>
  );
}
