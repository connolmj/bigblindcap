import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import "./layout.css";

const NAV = [
  { to: "/", label: "Sports", end: true },
  { to: "/equities", label: "Equities", end: false },
  { to: "/games", label: "Games", end: false },
];

export default function Layout() {
  // Games get a little more room than the text-heavy pages.
  const wide = useLocation().pathname.startsWith("/games");

  return (
    <div className="site">
      <div className={wide ? "site__column site__column--wide" : "site__column"}>
        <header className="site-header">
          <Link to="/" className="site-header__brand">
            <Logo />
            <span className="site-header__name">BIG BLIND CAPITAL</span>
          </Link>
          <nav className="site-nav">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? "site-nav__link is-active" : "site-nav__link")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>

        <div className="site-rule" />

        <main>
          <Outlet />
        </main>

        <footer className="site-footer">
          {/* Was an 8 MB GIF; the same clip as a looping MP4 is ~0.5 MB. */}
          <video
            className="site-footer__clip"
            src="/media/footer.mp4"
            poster="/media/footer-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            aria-hidden="true"
          />
          <p className="site-footer__disclaimer">
            All content on this site is for informational and entertainment purposes only. Nothing here is investment
            advice or a solicitation to wager. Information is drawn from sources believed reliable, but no guarantee is
            made as to accuracy or completeness. Past results are not an indicator of future returns.
          </p>
        </footer>
      </div>
    </div>
  );
}
