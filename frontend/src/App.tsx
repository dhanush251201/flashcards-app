import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { PublicOnlyRoute } from "@/routes/PublicOnlyRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { DeckDetailPage } from "@/pages/DeckDetailPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { StudySessionPage } from "@/pages/StudySessionPage";
import { AppShell } from "@/components/layout/AppShell";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        <Route path="/app" element={<ProtectedRoute />}>
          <Route
            element={
              <AppShell>
                <DashboardPage />
              </AppShell>
            }
            path="dashboard"
          />
          <Route
            element={
              <AppShell>
                <DeckDetailPage />
              </AppShell>
            }
            path="decks/:deckId"
          />
          <Route
            element={
              <AppShell>
                <StudySessionPage />
              </AppShell>
            }
            path="study/:sessionId"
          />
          <Route path="" element={<Navigate to="/app/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;

