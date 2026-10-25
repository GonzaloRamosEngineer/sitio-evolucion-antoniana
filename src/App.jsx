// src/App.jsx
import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import BottomNavBar from "@/components/Layout/BottomNavBar";
import { AnimatePresence, MotionConfig } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ROUTE_PATHS } from "@/config/rutas";

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
const CarnetPage = lazy(() => import("@/pages/CarnetPage"));
const ClubPage = lazy(() => import("@/pages/club/ClubPage"));
const ComercioPanel = lazy(() => import("@/pages/club/ComercioPanel"));
const PostularComercioPage = lazy(() => import("@/pages/club/PostularComercioPage"));
const Rendicion = lazy(() => import("@/pages/Rendicion"));
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
const CommissionPortal = lazy(() => import("@/pages/CommissionPortal"));
const NotFound = lazy(() => import("@/pages/NotFound"));

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

const LegacyRedirect = ({ to }) => {
  const { search, hash } = useLocation();
  return <Navigate replace to={`${to}${search}${hash}`} />;
};

const PageRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Suspense key={location.pathname} fallback={<PageLoader />}>
      <Routes location={location}>
        {/* Sitio */}
        <Route path={ROUTE_PATHS.INICIO} element={<Home />} />
        <Route path={ROUTE_PATHS.NOSOTROS} element={<About />} />
        <Route path={ROUTE_PATHS.ACTIVIDADES} element={<Activities />} />
        <Route path={ROUTE_PATHS.ACTIVIDAD_DETALLE} element={<ActivityDetailPage />} />
        <Route path={ROUTE_PATHS.ACTIVIDAD_COMPATIBILIDAD} element={<ActivityDetailPage />} />
        <Route path={ROUTE_PATHS.CONFIRMAR_ASISTENCIA} element={<ConfirmAttendancePage />} />
        <Route path={ROUTE_PATHS.COLABORAR} element={<Collaborate />} />
        <Route path={ROUTE_PATHS.RENDICION} element={<Rendicion />} />
        <Route path={ROUTE_PATHS.CONTACTO} element={<Contact />} />
        <Route path={ROUTE_PATHS.AGRADECIMIENTO} element={<Agradecimiento />} />

        {/* Auth */}
        <Route path={ROUTE_PATHS.INGRESAR} element={<LoginPage />} />
        <Route path={ROUTE_PATHS.REGISTRARSE} element={<RegisterPage />} />
        <Route
          path={ROUTE_PATHS.SOLICITAR_RECUPERACION}
          element={<RequestPasswordResetForm />}
        />
        <Route path={ROUTE_PATHS.ACTUALIZAR_CLAVE} element={<UpdatePasswordForm />} />

        {/* Legal */}
        <Route path={ROUTE_PATHS.DOCUMENTACION_LEGAL} element={<LegalDocuments />} />
        <Route path={ROUTE_PATHS.PRIVACIDAD} element={<PrivacyPolicy />} />
        <Route path={ROUTE_PATHS.TERMINOS} element={<TermsOfUse />} />

        {/* Partners / Beneficios */}
        <Route path={ROUTE_PATHS.ALIANZAS} element={<PartnersPage />} />
        <Route path={ROUTE_PATHS.ALIANZA_DETALLE} element={<PartnerDetailPage />} />
        <Route path={ROUTE_PATHS.ALIANZA_COMPATIBILIDAD} element={<PartnerDetailPage />} />

        <Route path={ROUTE_PATHS.BENEFICIOS} element={<BenefitsPage />} />
        {/* Ruta canónica por slug */}
        <Route path={ROUTE_PATHS.BENEFICIO_DETALLE} element={<BenefitDetailPage />} />
        {/* Compatibilidad por id -> el componente redirige a /beneficios/:slug */}
        <Route path={ROUTE_PATHS.BENEFICIO_POR_ID} element={<BenefitDetailPage />} />

        <Route path={ROUTE_PATHS.POSTULAR_ALIANZA} element={<ApplyPartnerPage />} />

        {/* Novedades */}
        <Route path={ROUTE_PATHS.NOVEDADES} element={<NewsPage />} />
        <Route path={ROUTE_PATHS.NOVEDAD_DETALLE} element={<NewsDetailPage />} />
        {/* Compatibilidad por id/uuid */}
        <Route path={ROUTE_PATHS.NOVEDAD_POR_ID} element={<NewsDetailPage />} />
        <Route path={ROUTE_PATHS.NOVEDAD_POR_UUID} element={<NewsDetailPage />} />

        <Route path={ROUTE_PATHS.PREINSCRIPCION} element={<Preinscription />} />

        {/* Compatibilidad local y client-side. En producción, Vercel responde
            antes con un único 308; acá se preservan query string y hash. */}
        <Route path={ROUTE_PATHS.ALIAS_NOSOTROS} element={<LegacyRedirect to={ROUTE_PATHS.NOSOTROS} />} />
        <Route path={ROUTE_PATHS.ALIAS_ACTIVIDADES} element={<LegacyRedirect to={ROUTE_PATHS.ACTIVIDADES} />} />
        <Route path={ROUTE_PATHS.ALIAS_COLABORAR} element={<LegacyRedirect to={ROUTE_PATHS.COLABORAR} />} />
        <Route path={ROUTE_PATHS.ALIAS_RENDICION} element={<LegacyRedirect to={ROUTE_PATHS.RENDICION} />} />
        <Route path={ROUTE_PATHS.ALIAS_CONTACTO} element={<LegacyRedirect to={ROUTE_PATHS.CONTACTO} />} />
        <Route path={ROUTE_PATHS.ALIAS_DOCUMENTACION_LEGAL} element={<LegacyRedirect to={ROUTE_PATHS.DOCUMENTACION_LEGAL} />} />
        <Route path={ROUTE_PATHS.ALIAS_PRIVACIDAD} element={<LegacyRedirect to={ROUTE_PATHS.PRIVACIDAD} />} />
        <Route path={ROUTE_PATHS.ALIAS_TERMINOS} element={<LegacyRedirect to={ROUTE_PATHS.TERMINOS} />} />
        <Route path={ROUTE_PATHS.ALIAS_ALIANZAS} element={<LegacyRedirect to={ROUTE_PATHS.ALIANZAS} />} />
        <Route path={ROUTE_PATHS.ALIAS_POSTULAR_ALIANZA} element={<LegacyRedirect to={ROUTE_PATHS.POSTULAR_ALIANZA} />} />
        <Route path={ROUTE_PATHS.ALIAS_PREINSCRIPCION} element={<LegacyRedirect to={ROUTE_PATHS.PREINSCRIPCION} />} />
        <Route path={ROUTE_PATHS.ALIAS_CARNET} element={<LegacyRedirect to={ROUTE_PATHS.CARNET} />} />
        <Route path={ROUTE_PATHS.ALIAS_CLUB} element={<LegacyRedirect to={ROUTE_PATHS.CLUB} />} />
        <Route path={ROUTE_PATHS.ALIAS_POSTULAR_COMERCIO} element={<LegacyRedirect to={ROUTE_PATHS.POSTULAR_COMERCIO} />} />
        <Route path={ROUTE_PATHS.ALIAS_COMERCIO} element={<LegacyRedirect to={ROUTE_PATHS.COMERCIO} />} />
        <Route path={ROUTE_PATHS.ALIAS_CUENTA} element={<LegacyRedirect to={ROUTE_PATHS.CUENTA} />} />

        {/* Áreas protegidas */}

        <Route
          path={ROUTE_PATHS.ADMIN_EDUCACION}
          element={
            <ProtectedRoute allowedRoles={["admin", "educacion_manager"]}>
              <EducationAdmin />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTE_PATHS.COMISION}
          element={
            <ProtectedRoute allowedRoles={["admin", "comision_directiva", "documentacion_lectura"]}>
              <CommissionPortal />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTE_PATHS.CARNET}
          element={
            <ProtectedRoute>
              <CarnetPage />
            </ProtectedRoute>
          }
        />

        {/* §12: `/beneficios` y `/mi/beneficios` leen la MISMA tabla y hacen trabajos
            distintos, decidido el 2026-09-06 (§12.10.14 lo dejó abierto):

              /beneficios  la VIDRIERA. Pública, indexable, con slug propio y
                           previews de OG. Es a donde llega quien todavía no
                           aporta, y por eso está en el nav.
              /mi/beneficios  el MOSTRADOR del socio: canjear y ver los canjes
                              propios. Se llega desde el carnet, desde la cuenta
                              y desde el CTA de un beneficio, no desde el nav
                              público — mandar ahí a un visitante sería ofrecerle
                              una pantalla que no puede usar.

            Sigue siendo pública y no protegida a propósito: entrar por la URL
            y ver qué hay adentro no hace daño, y lo que exige sesión —generar
            el canje— lo valida la Edge Function. */}
        <Route path={ROUTE_PATHS.CLUB} element={<ClubPage />} />

        {/* §12.10.5 — por dónde pide entrar un comercio. Pública y sin sesión:
            un comercio que quiere sumarse no tiene por qué crearse una cuenta
            en el sitio para avisarlo. */}
        <Route path={ROUTE_PATHS.POSTULAR_COMERCIO} element={<PostularComercioPage />} />

        {/* El mostrador. `ProtectedRoute` solo garantiza que haya sesión; QUIÉN
            puede validar lo resuelve `mis_comercios()` en la base, y las Edge
            Functions vuelven a comprobarlo antes de tocar un canje. Esta ruta es
            UX, no una frontera de seguridad (ver CLAUDE.md). */}
        <Route
          path={ROUTE_PATHS.COMERCIO}
          element={
            <ProtectedRoute>
              <ComercioPanel />
            </ProtectedRoute>
          }
        />

        <Route
          path={ROUTE_PATHS.CUENTA}
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Rutas de admin, de la más específica a la más general (ROADMAP 3.1).
            **El orden acá no es lo que decide**: React Router v6 resuelve por
            especificidad, así que `/admin/activities/new` le gana a `/admin/*`
            esté donde esté. Se ordenan así para que el archivo no sugiera una
            precedencia que no existe — antes el comodín venía primero y se
            leía como si atrapara todo, que es una trampa para quien agregue la
            próxima ruta. Si alguna vez se migra a un router que **sí** resuelve
            por orden, esta disposición ya es la correcta.
            (`/admin/education` queda arriba, junto a `/comision`: se agrupa por
            rol, no por prefijo — es de `educacion_manager`, no de admin puro.) */}
        <Route
          path={ROUTE_PATHS.ADMIN_ACTIVIDAD_NUEVA}
          element={
            <ProtectedRoute requireAdmin>
              <CreateActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTE_PATHS.ADMIN_ACTIVIDAD_EDITAR}
          element={
            <ProtectedRoute requireAdmin>
              <EditActivityPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTE_PATHS.ADMIN}
          element={
            <ProtectedRoute requireAdmin>
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Catch-all: 404 */}
        <Route path={ROUTE_PATHS.NO_ENCONTRADA} element={<NotFound />} />
      </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

function App() {
  return (
    // reducedMotion="user" hace que framer-motion respete prefers-reduced-motion
    // en todo el árbol (card.jsx + todos los whileInView): desactiva animaciones de
    // transform/layout y conserva las de opacidad. Cumple WCAG 2.3.3 (ítem 5.4).
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <Router
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          {/* Reset de scroll en cada navegación */}
          <ScrollToTop behavior="smooth" />

          <div className="min-h-screen flex flex-col bg-brand-sand">
            <Header />
            <main className="min-w-0 flex-1 font-inter pb-20 md:pb-0">
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
    </MotionConfig>
  );
}

export default App;
