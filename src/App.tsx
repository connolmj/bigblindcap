import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./site/Layout";
import SportsPage from "./pages/sports/SportsPage";
import EquitiesPage from "./pages/EquitiesPage";
import GamesPage from "./pages/games/GamesPage";
import BlackjackPage from "./pages/games/BlackjackPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<SportsPage />} />
        <Route path="equities" element={<EquitiesPage />} />
        <Route path="games" element={<GamesPage />} />
        <Route path="games/blackjack" element={<BlackjackPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
