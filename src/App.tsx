import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { SuspenseFallback } from "@/components/SuspenseFallback";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Preload all main CRM modules (sidebar items - no lazy loading)
import CompaniesPage from "./features/companies/CompaniesPage";
import CompanyDetailPage from "./features/companies/CompanyDetailPage";
import ContactsPage from "./features/contacts/ContactsPage";
import ContactDetailPage from "./features/contacts/ContactDetailPage";
import QuotesPage from "./features/quotes/QuotesPage";
import QuoteDetailPage from "./features/quotes/QuoteDetailPage";
import ProjectsPage from "./features/projects/ProjectsPage";
import PipelinePage from "./features/projects/PipelinePage";
import ProjectDetailPage from "./features/projects/ProjectDetailPage";
import InteractionsPage from "./features/interactions/InteractionsPage";
import { SettingsPage } from "./pages/SettingsPage";

// Preload Dashboards (frequently accessed)
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardCRM from "./pages/DashboardCRM";

// Lazy load CRM utility pages
const DocumentProcessing = lazy(() => import("./pages/DocumentProcessing"));
const DocumentTemplatesPage = lazy(() => import("./pages/DocumentTemplatesPage"));
const WorkflowBuilder = lazy(() => import("./pages/WorkflowBuilder"));
const WorkflowTemplatesPage = lazy(() => import("./pages/WorkflowTemplatesPage"));
const WorkflowExecutions = lazy(() => import("./pages/WorkflowExecutions"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const CostAnalyticsDashboard = lazy(() => import("./pages/CostAnalyticsDashboard"));
const CompanySettingsPage = lazy(() => import("./pages/CompanySettingsPage"));
const GebruikersbeheerPage = lazy(() => import("./pages/GebruikersbeheerPage"));
const AIChatPage = lazy(() => import("./pages/AIChatPage"));

// Lazy load utility pages
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 1,
  },
  enter: {
    opacity: 1,
  },
  exit: {
    opacity: 1,
  },
};

const pageTransition = {
  duration: 0,
};

// Wrapper component for animated routes
function AnimatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

// Routes wrapper with AnimatePresence
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedRoute><RoleBasedRedirect /></AnimatedRoute>} />
        <Route path="/auth" element={<AnimatedRoute><Auth /></AnimatedRoute>} />
        <Route path="/forgot-password" element={<AnimatedRoute><ForgotPassword /></AnimatedRoute>} />
        <Route path="/reset-password" element={<AnimatedRoute><ResetPassword /></AnimatedRoute>} />
        
        <Route 
          path="/dashboard/super-admin" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <DashboardSuperAdmin />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/executive" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <DashboardExecutive />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/crm" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <DashboardCRM />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/documents/processing" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <DocumentProcessing />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/ai-chat" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <AIChatPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        {/* CRM MODULE ROUTES */}
        <Route 
          path="/companies" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <CompaniesPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/companies/:id" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <CompanyDetailPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/contacts" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <ContactsPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/contacts/:id" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <ContactDetailPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/quotes" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <QuotesPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/quotes/:id" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <QuoteDetailPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/pipeline" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <PipelinePage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/projects" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <ProjectsPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/projects/:id" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <ProjectDetailPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/interactions" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <InteractionsPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        {/* Repurposable Features */}
        <Route 
          path="/calendar" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <CalendarPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/settings/company" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <CompanySettingsPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/analytics/costs" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <CostAnalyticsDashboard />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        {/* Settings & Admin Routes */}
        <Route 
          path="/settings"
          element={
            <AnimatedRoute>
              <ProtectedRoute>
                <Suspense fallback={<SuspenseFallback />}>
                  <SettingsPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/settings/gebruikers"
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <GebruikersbeheerPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/admin/gebruikers"
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <GebruikersbeheerPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        {/* Workflow Automation - Can be repurposed for Sales Workflows */}
        <Route 
          path="/workflows/templates" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <WorkflowTemplatesPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/documents/templates" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <DocumentTemplatesPage />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/workflows/builder" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <WorkflowBuilder />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/workflows/executions" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'super_admin']}>
                <Suspense fallback={<SuspenseFallback />}>
                  <WorkflowExecutions />
                </Suspense>
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route path="*" element={<AnimatedRoute><Suspense fallback={<SuspenseFallback />}><NotFound /></Suspense></AnimatedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}

function RoleBasedRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect based on role
  switch (role) {
    case 'super_admin' as any: // Legacy support
      return <Navigate to="/dashboard/super-admin" replace />;
    case 'ADMIN':
      return <Navigate to="/dashboard/executive" replace />;
    case 'SALES':
    case 'MANAGER':
      return <Navigate to="/dashboard/crm" replace />;
    case 'SUPPORT':
    case 'hr' as any: // Legacy support
    case 'manager' as any: // Legacy support
    case 'medewerker' as any: // Legacy support
      return <Navigate to="/companies" replace />;
    default:
      return <Navigate to="/dashboard/crm" replace />;
  }
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider 
        attribute="class" 
        defaultTheme="light" 
        enableSystem={false}
        disableTransitionOnChange={false}
      >
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <AnimatedRoutes />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
