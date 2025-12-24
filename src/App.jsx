import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, ToastProvider } from './context';
import { QueryProvider } from './lib/queryClient';
import { ProtectedRoute, PageLoader } from './components/common';
import { Layout } from './components/layout';

// Lazy-loaded pages - reduces initial bundle size
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Candidates = lazy(() => import('./pages/Candidates'));
const CandidateDetail = lazy(() => import('./pages/CandidateDetail'));
const Jobs = lazy(() => import('./pages/Jobs'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Settings = lazy(() => import('./pages/Settings'));
const BookingPage = lazy(() => import('./pages/BookingPage'));

export default function App() {
  return (
    <QueryProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter basename="/Recruitment">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/book/:token" element={<BookingPage />} />
                
                {/* Protected routes */}
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Dashboard />} />
                  <Route path="candidates" element={<Candidates />} />
                  <Route path="candidates/:id" element={<CandidateDetail />} />
                  <Route path="jobs" element={<Jobs />} />
                  <Route path="calendar" element={<Calendar />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryProvider>
  );
}
