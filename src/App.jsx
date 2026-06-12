// src/App.jsx
import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import BottomNavBar from "@/components/Layout/BottomNavBar";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/providers/ThemeProvider";

// Shell siempre presente (no se hace lazy: layout + guards + helpers)
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import ScrollToTop from "@/components/Layout/ScrollToTop";
import BackToTop from "@/components/Layout/BackToTop";

// Pages (lazy: cada una en su propio chunk, se carga al navegar)
const Home = lazy(() => import("@/pages/Home"));
const About = lazy(() => import("@/pages/About"));
const Activities = lazy(() => import("@/pages/Activities"));
const ActivityDetailPage = lazy(() => import("@/pages/ActivityDetailPage"));
const ConfirmAttendancePage = lazy(() => import("@/pages/ConfirmAttendancePage"));
const Collaborate = lazy(() => import("@/pages/Collaborate"));
const Contact = lazy(() => import("@/pages/Contact"));
const LoginPage = lazy(() => import("@/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/RegisterPage"));
const RequestPasswordResetForm = lazy(() => import("@/components/Auth/RequestPasswordResetForm"));
const UpdatePasswordForm = lazy(() => import("@/components/Auth/UpdatePasswordForm"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const AdminPanel = lazy(() => import("@/pages/AdminPanel"));
const CreateActivityPage = lazy(() => import("@/pages/CreateActivityPage"));
const EditActivityPage = lazy(() => import("@/pages/EditActivityPage"));
const Agradecimiento = lazy(() => import("@/pages/Agradecimiento"));
const LegalDocuments = lazy(() => import("@/pages/LegalDocuments"));
const Preinscription = lazy(() => import("./pages/Preinscripcion"));
const EducationAdmin = lazy(() => import("./pages/EducationAdmin"));

// Partners / Novedades
const PartnersPage = lazy(() => import("@/pages/PartnersPage"));
const PartnerDetailPage = lazy(() => import("@/pages/PartnerDetailPage"));
const BenefitsPage = lazy(() => import("@/pages/BenefitsPage"));
const BenefitDetailPage = lazy(() => import("@/pages/BenefitDetailPage"));
const ApplyPartnerPage = lazy(() => import("@/pages/ApplyPartnerPage"));
const NewsPage = lazy(() => import("@/pages/NewsPage"));
const NewsDetailPage = lazy(() => import("@/pages/NewsDetailPage"));

// Legal
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfUse = lazy(() => import("@/pages/TermsOfUse"));

// Fallback mientras carga el chunk de la página
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-brand-primary" />
  </div>
);

const PageRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense key={location.pathname} fallback={<PageLoader />}>
      <Routes location={location}>
        {/* Sitio */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/activities/:id" element={<ActivityDetailPage />} />
        <Route path="/confirm-attendance" element={<ConfirmAttendancePage />} />
        <Route path="/collaborate" element={<Collaborate />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/agradecimiento" element={<Agradecimiento />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/request-password-reset"
          element={<RequestPasswordResetForm />}
        />
        <Route path="/update-password" element={<UpdatePasswordForm />} />

        {/* Legal */}
        <Route path="/legal-documents" element={<LegalDocuments />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />

        {/* Partners / Beneficios */}
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/partners/:slug" element={<PartnerDetailPage />} />

        <Route path="/beneficios" element={<BenefitsPage />} />
        {/* Ruta canónica por slug */}
        <Route path="/beneficios/:slug" element={<BenefitDetailPage />} />
        {/* Compatibilidad por id -> el componente redirige a /beneficios/:slug */}
        <Route path="/beneficios/id/:id" element={<BenefitDetailPage />} />

        <Route path="/postular-partner" element={<ApplyPartnerPage />} />

        {/* Novedades */}
        <Route path="/novedades" element={<NewsPage />} />
        <Route path="/novedades/:slug" element={<NewsDetailPage />} />
        {/* Compatibilidad por id/uuid */}
        <Route path="/novedades/id/:id" element={<NewsDetailPage />} />
        <Route path="/novedades/uuid/:id" element={<NewsDetailPage />} />

        <Route path="/preinscripcion" element={<Preinscription />} />

        {/* Áreas protegidas */}

        <Route
          path="/admin/education"
          element={
            <ProtectedRoute allowedRoles={["admin", "educacion_manager"]}>
              <EducationAdmin />
            </ProtectedRoute>
          }
        />

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
      </Suspense>
    </AnimatePresence>
  );
};

function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <Router
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {/* Reset de scroll en cada navegación */}
          <ScrollToTop behavior="smooth" />

          <div className="min-h-screen flex flex-col bg-blanco-fundacion dark:bg-background transition-colors duration-300">
            <Header />
            <main className="flex-1 font-inter pb-16 md:pb-0">
              <PageRoutes />
            </main>
            <Footer />
            <BottomNavBar />
            {/* Botón flotante global */}
            <BackToTop threshold={300} />
            <Toaster />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
