import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Layout/Header';
import Footer from '@/components/Layout/Footer';
import BottomNavBar from '@/components/Layout/BottomNavBar';
import Home from '@/pages/Home';
import About from '@/pages/About';
import Activities from '@/pages/Activities';
import ActivityDetailPage from '@/pages/ActivityDetailPage';
import ConfirmAttendancePage from '@/pages/ConfirmAttendancePage';
import Collaborate from '@/pages/Collaborate';
import Contact from '@/pages/Contact';
import LoginPage from '@/pages/LoginPage'; 
import RegisterPage from '@/pages/RegisterPage'; 
import RequestPasswordResetForm from '@/components/Auth/RequestPasswordResetForm';
import UpdatePasswordForm from '@/components/Auth/UpdatePasswordForm';
import Dashboard from '@/pages/Dashboard';
import AdminPanel from '@/pages/AdminPanel';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import CreateActivityPage from '@/pages/CreateActivityPage';
import EditActivityPage from '@/pages/EditActivityPage';
import Agradecimiento from '@/pages/Agradecimiento';
import LegalDocuments from '@/pages/LegalDocuments';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from '@/providers/ThemeProvider';

const PageRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/activities/:id" element={<ActivityDetailPage />} />
        <Route path="/confirm-attendance" element={<ConfirmAttendancePage />} />
        <Route path="/collaborate" element={<Collaborate />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<LoginPage />} /> 
        <Route path="/register" element={<RegisterPage />} /> 
        <Route path="/request-password-reset" element={<RequestPasswordResetForm />} />
        <Route path="/update-password" element={<UpdatePasswordForm />} /> 
        <Route path="/agradecimiento" element={<Agradecimiento />} />
        <Route path="/legal-documents" element={<LegalDocuments />} />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/*" 
          element={
            <ProtectedRoute requireAdmin>
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
         <Route 
          path="/admin/activities/new" 
          element={
            <ProtectedRoute requireAdmin>
              <CreateActivityPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/activities/edit/:id" 
          element={
            <ProtectedRoute requireAdmin>
              <EditActivityPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen flex flex-col bg-blanco-fundacion dark:bg-background transition-colors duration-300">
            <Header />
            <main className="flex-1 font-inter pb-16 md:pb-0">
              <PageRoutes />
            </main>
            <Footer />
            <BottomNavBar />
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;