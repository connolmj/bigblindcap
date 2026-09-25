import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import Logo from "./Logo";
import "./layout.css";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/sports", label: "Sports", end: false },
  { to: "/equities", label: "Equities", end: false },
  { to: "/tools", label: "Tools", end: false },
];

export default function Layout() {
  // Tools get a little more room than the text-heavy pages.
  const wide = useLocation().pathname.startsWith("/tools");

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
