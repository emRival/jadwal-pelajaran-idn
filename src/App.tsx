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

import { GraduationCap, Heart, ExternalLink, Calendar, Users, AlertTriangle } from 'lucide-react';

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
      <footer className="border-t mt-16 bg-muted/20 dark:bg-slate-950/40 backdrop-blur supports-[backdrop-filter]:bg-muted/10 print:hidden transition-colors duration-300">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-none tracking-tight">Jadwal Pelajaran</h3>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">IDN Boarding School</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
                Sistem Informasi Jadwal Pelajaran dan Manajemen Beban Tugas Mengajar Guru secara cerdas, asinkronus, dan bebas konflik.
              </p>
            </div>

            {/* Quick Links Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">Navigasi Utama</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <a href="/" className="hover:text-primary transition-colors flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Jadwal Pelajaran
                  </a>
                </li>
                {isAdmin && (
                  <>
                    <li>
                      <a href="/teachers" className="hover:text-primary transition-colors flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Statistik Guru
                      </a>
                    </li>
                    <li>
                      <a href="/conflicts" className="hover:text-primary transition-colors flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Cek Konflik Jadwal
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Developer / School Info Section */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">Informasi & Kontak</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                IDN Boarding School Pamijahan. Kecamatan Pamijahan, Kabupaten Bogor, Jawa Barat.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a 
                  href="https://idn.sch.id" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-all duration-200"
                  title="Website IDN"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Sub-footer Divider */}
          <div className="border-t pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} IDN Boarding School Pamijahan. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-center sm:text-right">
              <span>Dibuat dengan</span>
              <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500 animate-pulse mx-0.5" />
              <span>oleh</span>
              <a 
                href="https://github.com/emRival" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-semibold text-foreground/85 hover:text-primary transition-colors ml-1"
              >
                Muhammad Rival
              </a>
            </div>
          </div>
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
