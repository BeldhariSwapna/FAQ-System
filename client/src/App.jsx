import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './components/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UserPage from './pages/UserPage';
import QueryPage from './pages/QueryPage';
import QueriesListPage from './pages/QueriesListPage';
import AdminDashboard from './pages/AdminDashboard';
import './styles/auth.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              backdropFilter: 'blur(8px)',
            },
            success: { iconTheme: { primary: 'var(--success)', secondary: 'white' } },
            error: { iconTheme: { primary: 'var(--error)', secondary: 'white' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
          <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
          <Route
            path="/user"
            element={
              <ProtectedRoute>
                <UserPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/query"
            element={
              <ProtectedRoute>
                <QueryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/queries"
            element={
              <ProtectedRoute>
                <QueriesListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole={['admin', 'super_admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/user" replace />} />
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
