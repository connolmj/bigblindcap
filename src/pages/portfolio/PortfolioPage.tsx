import { useMemo } from "react";
import { computeBook } from "../../data/book";
import { useBookData } from "../../data/BookProvider";
import { fmtBig, fmtNum, fmtPct, fmtUnits, toneClass } from "../../data/format";
import Donut from "./Donut";
import "./portfolio.css";

// Add new write-ups here; put the PDF in public/docs/.
const LIBRARY = [
  {
    year: 2026,
    title: "Oura Inc. — Initiation of Coverage",
    meta: "Big Blind Capital · IPO analysis · 21 Sep 2026",
    href: "/docs/oura-ipo-initiation.pdf",
  },
  {
    year: 2008,
    title: "Bitcoin: A Peer-to-Peer Electronic Cash System",
    meta: "Satoshi Nakamoto",
    href: "/docs/bitcoin.pdf",
  },
];

const FEED_NOTE = {
  live: "Marked live from the sheet",
  error: "Sheet unreachable — showing last known values",
  loading: "Loading positions…",
};

export default function PortfolioPage() {
  const data = useBookData();
  const book = useMemo(() => computeBook(data), [data]);
  const tone = toneClass(book.eqDelta);

  return (
    <div className="eq">
      <div className="eq__intro">
        <h1 className="eq__title">Write-ups and positions</h1>
        <p>Coverage published here, alongside the source material the thinking is built on.</p>
      </div>

      <section className="eq__section">
        <div className="eyebrow eq__label">Portfolio book</div>
        <div className="eq__book">
          <div>
            <div className="eq__big">{fmtBig(book.eqNow)}</div>
            <div className="eyebrow eq__big-label">Book value</div>
          </div>
          <div>
            <div className={`eq__big ${tone}`}>{fmtUnits(book.eqDelta)}</div>
            <div className="eyebrow eq__big-label">Since start</div>
          </div>
          <div>
            <div className={`eq__big ${tone}`}>{fmtPct(book.eqRoi)}</div>
            <div className="eyebrow eq__big-label">ROI on {fmtNum(book.eqStart)}u</div>
          </div>
        </div>
      </section>

      <section className="eq__section">
        <div className="eyebrow eq__label eq__label--split">
          <span>Allocation</span>
          <span>{book.positions.length} lines</span>
        </div>
        <Donut positions={book.positions} total={book.eqNow} />
        <div className="eq__feed">{FEED_NOTE[data.eqFeed]}</div>
      </section>

      <section>
        <div className="eyebrow eq__label">Library</div>
        <div className="eq__lib eq__lib--head">
          <div>Year</div>
          <div>Document</div>
          <div>File</div>
        </div>
        {LIBRARY.map((doc) => (
          <div key={doc.href} className="eq__lib">
            <div className="eq__lib-year">{doc.year}</div>
            <div>
              <a href={doc.href} className="underlined eq__lib-title" target="_blank" rel="noopener">
                {doc.title}
              </a>
              <div className="eq__lib-meta">{doc.meta}</div>
            </div>
            <div className="eq__lib-file">PDF</div>
          </div>
        ))}
      </section>
    </div>
  );
}
