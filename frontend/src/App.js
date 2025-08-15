import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SocketStatus from './components/SocketStatus';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectEditorPage from './pages/ProjectEditorPage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';
import PremiumPage from './pages/PremiumPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
      >
        <div className="spinner"></div>
        <div className="loading-text">Loading...</div>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <>
      <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } 
      />
      <Route 
        path="/register" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } 
      />

      {/* Protected routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="devices/:id" element={<DeviceDetailPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id/editor" element={<ProjectEditorPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="premium" element={<PremiumPage />} />
      </Route>

      {/* 404 route */}
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <SocketStatus />
    </>
    </ErrorBoundary>
  );
}

export default App;