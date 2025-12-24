import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/common';
import { Layout } from './components/layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';
import Jobs from './pages/Jobs';
import Settings from './pages/Settings';
import BookingPage from './pages/BookingPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/Recruitment">
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
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
