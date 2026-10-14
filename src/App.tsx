import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./site/Layout";
import HomePage from "./pages/home/HomePage";

// Every other page is its own download, fetched the first time you open it,
// so visiting one tool doesn't load the code for all the others.
const SportsPage = lazy(() => import("./pages/sports/SportsPage"));
const PortfolioPage = lazy(() => import("./pages/portfolio/PortfolioPage"));
const ToolsPage = lazy(() => import("./pages/tools/ToolsPage"));
const BlackjackPage = lazy(() => import("./pages/tools/BlackjackPage"));
const ThreeCardPokerPage = lazy(() => import("./pages/tools/ThreeCardPokerPage"));
const BaccaratPage = lazy(() => import("./pages/tools/BaccaratPage"));
const CrapsPage = lazy(() => import("./pages/tools/CrapsPage"));
const SurvivorPage = lazy(() => import("./pages/tools/SurvivorPage"));
const BankrollPage = lazy(() => import("./pages/tools/BankrollPage"));
const SquaresPage = lazy(() => import("./pages/tools/SquaresPage"));
const RunsPage = lazy(() => import("./pages/tools/RunsPage"));
const NflNumbersPage = lazy(() => import("./pages/tools/NflNumbersPage"));
const LearnPage = lazy(() => import("./pages/learn/LearnPage"));
const SportsBettingBasicsPage = lazy(() => import("./pages/learn/SportsBettingBasicsPage"));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="sports" element={<SportsPage />} />
        <Route path="portfolio" element={<PortfolioPage />} />
        <Route path="equities" element={<Navigate to="/portfolio" replace />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="tools/blackjack" element={<BlackjackPage />} />
        <Route path="tools/three-card-poker" element={<ThreeCardPokerPage />} />
        <Route path="tools/baccarat" element={<BaccaratPage />} />
        <Route path="tools/craps" element={<CrapsPage />} />
        <Route path="tools/survivor" element={<SurvivorPage />} />
        <Route path="tools/bankroll" element={<BankrollPage />} />
        <Route path="tools/squares" element={<SquaresPage />} />
        <Route path="tools/runs" element={<RunsPage />} />
        <Route path="tools/nfl-numbers" element={<NflNumbersPage />} />
        <Route path="learn" element={<LearnPage />} />
        <Route path="learn/fundamentals" element={<Navigate to="/learn" replace />} />
        <Route path="learn/fundamentals/sports-betting-basics" element={<SportsBettingBasicsPage />} />
        {/* Old addresses from when this section was called Games */}
        <Route path="games" element={<Navigate to="/tools" replace />} />
        <Route path="games/blackjack" element={<Navigate to="/tools/blackjack" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
