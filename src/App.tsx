import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./site/Layout";
import HomePage from "./pages/home/HomePage";
import SportsPage from "./pages/sports/SportsPage";
import EquitiesPage from "./pages/equities/EquitiesPage";
import ToolsPage from "./pages/tools/ToolsPage";
import BlackjackPage from "./pages/tools/BlackjackPage";
import SurvivorPage from "./pages/tools/SurvivorPage";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="sports" element={<SportsPage />} />
        <Route path="equities" element={<EquitiesPage />} />
        <Route path="tools" element={<ToolsPage />} />
        <Route path="tools/blackjack" element={<BlackjackPage />} />
        <Route path="tools/survivor" element={<SurvivorPage />} />
        {/* Old addresses from when this section was called Games */}
        <Route path="games" element={<Navigate to="/tools" replace />} />
        <Route path="games/blackjack" element={<Navigate to="/tools/blackjack" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
