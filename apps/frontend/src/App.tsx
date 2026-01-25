import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ReviewPage } from './pages/landing';
import { LoginPage, RegisterPage } from './pages/auth';
import {
  OverviewPage,
  ReviewsPage,
  IntegrationsPage,
  IntegrationDetailPage,
  SettingsPage,
} from './pages/dashboard';
import { DashboardLayout } from './components/dashboard/layout';
import { ProtectedRoute } from './components/shared';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/r/:token" element={<ReviewPage />} />

          {/* Protected dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="integrations/:platform" element={<IntegrationDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
