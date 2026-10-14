import "../tools/tools.css";
import "./shelf.css";

interface Book {
  title: string;
  author: string;
  why: string;
  href: string;
}

interface Source {
  label: string;
  href: string;
}

interface Voice {
  name: string;
  why: string;
  links: Source[];
}

/** Add a book by adding a row here. Groups show in this order. */
const BOOKS: { title: string; books: Book[] }[] = [
  {
    title: "Investing",
    books: [
      {
        title: "One Up on Wall Street",
        author: "Peter Lynch",
        why: "Invest in what you know. The everyday investor's edge over Wall Street.",
        href: "https://www.amazon.com/dp/B006YDFYW6",
      },
      {
        title: "The Intelligent Investor",
        author: "Benjamin Graham",
        why: "Mr. Market and the margin of safety. Where value investing starts.",
        href: "https://www.amazon.com/dp/B0CTR2F7PT",
      },
      {
        title: "Richer, Wiser, Happier",
        author: "William Green",
        why: "How the great investors think about money, and about life.",
        href: "https://www.amazon.com/dp/1501164856",
      },
      {
        title: "The Psychology of Money",
        author: "Morgan Housel",
        why: "With money, how you behave matters more than how smart you are.",
        href: "https://www.amazon.com/dp/0857197681",
      },
    ],
  },
  {
    title: "Risk & how the world works",
    books: [
      {
        title: "The Black Swan",
        author: "Nassim Nicholas Taleb",
        why: "Rare, high-impact events and why we keep underrating them.",
        href: "https://www.amazon.com/dp/081297381X",
      },
      {
        title: "Freakonomics",
        author: "Steven Levitt & Stephen Dubner",
        why: "Incentives explain more than you'd think.",
        href: "https://www.amazon.com/dp/0063032376",
      },
      {
        title: "Outliers",
        author: "Malcolm Gladwell",
        why: "Success comes from timing, practice and opportunity, not just talent.",
        href: "https://www.amazon.com/dp/0316017930",
      },
    ],
  },
  {
    title: "Building & life",
    books: [
      {
        title: "The Almanack of Naval Ravikant",
        author: "Eric Jorgenson",
        why: "Wealth, judgment and happiness in Naval's own words. Free to read online.",
        href: "https://www.navalmanack.com",
      },
      {
        title: "Zero to One",
        author: "Peter Thiel",
        why: "Build something new instead of copying what already works.",
        href: "https://www.amazon.com/dp/B00J6YBOFQ",
      },
      {
        title: "Principles",
        author: "Ray Dalio",
        why: "Radical truth, radical transparency and a system for making decisions.",
        href: "https://www.amazon.com/dp/1501124021",
      },
    ],
  },
];

/** Videos, podcasts and clips, one row per person. Add a link to a row or add a row. */
const VOICES: Voice[] = [
  {
    name: "Naval Ravikant",
    why: "Wealth, leverage, judgment and happiness.",
    links: [{ label: "YouTube · from 1:23:46", href: "https://www.youtube.com/watch?v=1-TZqOsVCNM&t=5026s" }],
  },
  {
    name: "Stanley Druckenmiller",
    why: "The macro investor with decades of no losing years. Conviction, sizing and being flexible.",
    links: [
      { label: "YouTube", href: "https://www.youtube.com/watch?v=-5Weeox0Xus" },
      { label: "YouTube", href: "https://www.youtube.com/watch?v=z_pk4eBDaLA" },
      { label: "Clip on X", href: "https://x.com/BoringBiz_/status/2006442095922524177" },
      { label: "Clip on X", href: "https://x.com/RudyHavenstein/status/1393965498618978308" },
    ],
  },
  {
    name: "Mohnish Pabrai",
    why: "Value investing the Dhandho way: clone the best ideas and bet big when the odds are lopsided.",
    links: [{ label: "Spotify", href: "https://open.spotify.com/episode/7MSryj28fD4Z6rlVWb4ZtN" }],
  },
  {
    name: "Preston Pysh & Robert Breedlove",
    why: "Money, Bitcoin and thinking from first principles.",
    links: [{ label: "Spotify", href: "https://open.spotify.com/episode/5kSnQa1KZQmF1zbho2mjdP" }],
  },
];

/** Two-letter cover mark from the title, skipping a leading "The". */
function initials(title: string) {
  const words = title.replace(/^The\s+/i, "").split(/\s+/);
  return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
}

export default function ShelfPage() {
  return (
    <div className="tools shelf">
      <div className="tools__intro">
        <div className="eyebrow">Shelf</div>
        <h1 className="tools__title">What shaped my thinking</h1>
        <p className="tools__lede">The books, interviews and podcasts I recommend most. Added to as I go.</p>
      </div>

      <nav className="tools__jump" aria-label="Sections">
        <a href="#books">Books</a>
        <a href="#watch">Watch &amp; listen</a>
      </nav>

      <section id="books" className="tools__category">
        <h2 className="tools__category-title">Books</h2>
        <p className="tools__category-blurb">The ones I'd hand you first.</p>
        {BOOKS.map((g) => (
          <div key={g.title} className="tools__group">
            <h3 className="tools__group-title eyebrow">{g.title}</h3>
            <ul className="tools__list">
              {g.books.map((b) => (
                <li key={b.title}>
                  <a className="tool-row" href={b.href} target="_blank" rel="noreferrer">
                    <span className="shelf__cover" aria-hidden="true">
                      {initials(b.title)}
                    </span>
                    <span className="tool-row__text">
                      <span className="tool-row__name">
                        {b.title}
                        <span className="shelf__author">{b.author}</span>
                      </span>
                      <span className="tool-row__desc">{b.why}</span>
                    </span>
                    <span className="tool-row__go" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section id="watch" className="tools__category">
        <h2 className="tools__category-title">Watch &amp; listen</h2>
        <p className="tools__category-blurb">Interviews and podcasts worth the time.</p>
        <ul className="tools__list">
          {VOICES.map((v) => (
            <li key={v.name} className="shelf__voice">
              <span className="tool-row__text">
                <span className="tool-row__name">{v.name}</span>
                <span className="tool-row__desc">{v.why}</span>
              </span>
              <span className="shelf__links">
                {v.links.map((l) => (
                  <a key={l.href} className="shelf__link" href={l.href} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
