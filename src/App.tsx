import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { ScheduleView } from '@/components/schedule/ScheduleView';
import { ScheduleEditor } from '@/components/schedule/ScheduleEditor';
import { ConflictChecker } from '@/components/schedule/ConflictChecker';
import { TeacherStats } from '@/components/stats/TeacherStats';
import { DataManager } from '@/components/admin/DataManager';
import { TimeSlotManager } from '@/components/admin/TimeSlotManager';
import { Settings } from '@/components/admin/Settings';
import { useAuth } from '@/contexts/AuthContext';

import './index.css';

function AppContent() {
  const [darkMode, setDarkMode] = useState(false);
  const { isAdmin, loading } = useAuth();
  const location = useLocation();

  // Check for saved theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', !darkMode ? 'dark' : 'light');
  };

  if (loading) {
    return null; // Or a loading spinner
  }

  const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isAdmin) return <Navigate to="/" replace />;
    return <>{children}</>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <main className="container py-6 min-h-[calc(100vh-200px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<ScheduleView />} />
              <Route path="/login" element={<ScheduleView loginOpenDefault={true} />} />
              <Route path="/schedule" element={<Navigate to="/" replace />} />

              {/* Protected Routes */}
              <Route path="/teachers" element={<AdminRoute><TeacherStats /></AdminRoute>} />
              <Route path="/conflicts" element={<AdminRoute><ConflictChecker /></AdminRoute>} />
              <Route path="/manage" element={<AdminRoute><ScheduleEditor /></AdminRoute>} />
              <Route path="/data" element={<AdminRoute><DataManager /></AdminRoute>} />
              <Route path="/timeslots" element={<AdminRoute><TimeSlotManager /></AdminRoute>} />
              <Route path="/settings" element={<AdminRoute><Settings /></AdminRoute>} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 bg-muted/30 print:hidden">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p className="font-medium">
            © {new Date().getFullYear()} IDN Boarding School Bogor
          </p>
          <p className="mt-1 opacity-70">
            Sistem Informasi Jadwal Pelajaran & Manajemen Tugas Guru
          </p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
