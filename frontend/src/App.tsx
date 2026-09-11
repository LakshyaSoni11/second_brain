import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React from "react";
import { LandingPage } from "./pages/LandingPage";
import { SignupPage } from "./pages/SignupPage";
import { SigninPage } from "./pages/SigninPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SharedBrainPage } from "./pages/SharedBrainPage";
import { useAuthStore } from "./store/authStore";
import { CapturePage } from "./pages/CapturePage";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/signin" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signin" element={<SigninPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/oauth" element={<OAuthCallbackPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route path="/brain/:hash" element={<SharedBrainPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/save" element={<CapturePage/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;