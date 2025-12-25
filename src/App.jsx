import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import MainLayout from './layouts/MainLayout';
import ManagerLayout from './layouts/ManagerLayout';

// Main Portal Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import CandidateSearch from './pages/CandidateSearch';
import Jobs from './pages/Jobs';
import JobDetail from './pages/JobDetail';
import Calendar from './pages/Calendar';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import Settings from './pages/Settings';
import BookingPage from './pages/BookingPage';

// Manager Portal Pages (PWA)
import ManagerDashboard from './pages/manager/ManagerDashboard';
import ManagerReviews from './pages/manager/ManagerReviews';
import ManagerSchedule from './pages/manager/ManagerSchedule';

// Protected Route wrapper
function ProtectedRoute({ children, requiredRoles = [] }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.some(role => hasRole(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

// Role access definitions
const ROLE_ACCESS = {
  ADMIN: ['super_admin'],
  RECRUITER: ['super_admin', 'recruiter'],
  MANAGER: ['super_admin', 'recruiter', 'regional_manager', 'branch_manager'],
  ALL: ['super_admin', 'recruiter', 'regional_manager', 'branch_manager', 'viewer']
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/book/:slug" element={<BookingPage />} />

      {/* Manager Portal (PWA) */}
      <Route path="/manager" element={
        <ProtectedRoute requiredRoles={ROLE_ACCESS.MANAGER}>
          <ManagerLayout />
        </ProtectedRoute>
      }>
        <Route index element={<ManagerDashboard />} />
        <Route path="reviews" element={<ManagerReviews />} />
        <Route path="schedule" element={<ManagerSchedule />} />
      </Route>

      {/* Main Portal */}
      <Route path="/" element={
        <ProtectedRoute requiredRoles={ROLE_ACCESS.ALL}>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="candidates" element={<Candidates />} />
        <Route path="candidates/:id" element={<CandidateDetail />} />
        <Route path="search" element={
          <ProtectedRoute requiredRoles={ROLE_ACCESS.RECRUITER}>
            <CandidateSearch />
          </ProtectedRoute>
        } />
        <Route path="jobs" element={
          <ProtectedRoute requiredRoles={ROLE_ACCESS.RECRUITER}>
            <Jobs />
          </ProtectedRoute>
        } />
        <Route path="jobs/:id" element={
          <ProtectedRoute requiredRoles={ROLE_ACCESS.RECRUITER}>
            <JobDetail />
          </ProtectedRoute>
        } />
        <Route path="calendar" element={
          <ProtectedRoute requiredRoles={ROLE_ACCESS.MANAGER}>
            <Calendar />
          </ProtectedRoute>
        } />
        <Route path="templates" element={
          <ProtectedRoute requiredRoles={ROLE_ACCESS.RECRUITER}>
            <WhatsAppTemplates />
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute requiredRoles={ROLE_ACCESS.ADMIN}>
            <Settings />
          </ProtectedRoute>
        } />
      </Route>

      {/* Unauthorized */}
      <Route path="/unauthorized" element={
        <div className="not-found-page">
          <h1>Unauthorized</h1>
          <p>You do not have permission to access this page.</p>
          <a href="/Recruitment/login">Go to Login</a>
        </div>
      } />

      {/* 404 */}
      <Route path="*" element={
        <div className="not-found-page">
          <h1>404</h1>
          <p>Page not found</p>
          <a href="/Recruitment/dashboard">Go to Dashboard</a>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/Recruitment">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
