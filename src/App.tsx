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
import Auth from "./pages/Auth";

// Lazy load CRM modules
const CompaniesPage = lazy(() => import("./features/companies/CompaniesPage"));
const CompanyDetailPage = lazy(() => import("./features/companies/CompanyDetailPage"));
const ContactsPage = lazy(() => import("./features/contacts/ContactsPage"));
const ContactDetailPage = lazy(() => import("./features/contacts/ContactDetailPage"));
const QuotesPage = lazy(() => import("./features/quotes/QuotesPage"));
const QuoteDetailPage = lazy(() => import("./features/quotes/QuoteDetailPage"));
const PipelinePage = lazy(() => import("./features/projects/PipelinePage"));
const ProjectDetailPage = lazy(() => import("./features/projects/ProjectDetailPage"));

// Dashboards
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardCRM from "./pages/DashboardCRM";

// Keep for CRM repurposing
import DocumentProcessing from "./pages/DocumentProcessing";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import WorkflowTemplatesPage from "./pages/WorkflowTemplatesPage";
import WorkflowExecutions from "./pages/WorkflowExecutions";
import CalendarPage from "./pages/CalendarPage";
import CostAnalyticsDashboard from "./pages/CostAnalyticsDashboard";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import GebruikersbeheerPage from "./pages/GebruikersbeheerPage";
import AIChatPage from "./pages/AIChatPage";

// Utility pages
import CaseDetail from "./pages/CaseDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    x: 100,
  },
  enter: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -100,
  },
};

const pageTransition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
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
        
        <Route 
          path="/dashboard/super-admin" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DashboardSuperAdmin />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/executive" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <DashboardExecutive />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/crm" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER']}>
                <DashboardCRM />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/documents/processing" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <DocumentProcessing />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/ai-chat" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'MANAGER', 'SUPPORT', 'super_admin']}>
                <AIChatPage />
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
                <Suspense fallback={<LoadingScreen />}>
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
                <Suspense fallback={<LoadingScreen />}>
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
                <Suspense fallback={<LoadingScreen />}>
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
                <Suspense fallback={<LoadingScreen />}>
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
                <Suspense fallback={<LoadingScreen />}>
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
                <Suspense fallback={<LoadingScreen />}>
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
                <Suspense fallback={<LoadingScreen />}>
                  <PipelinePage />
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
                <Suspense fallback={<LoadingScreen />}>
                  <ProjectDetailPage />
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
                <CalendarPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/settings/company" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <CompanySettingsPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/analytics/costs" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <CostAnalyticsDashboard />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        {/* Settings & Admin Routes */}
        <Route 
          path="/settings/gebruikers"
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <GebruikersbeheerPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/admin/gebruikers"
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin', 'ADMIN']}>
                <GebruikersbeheerPage />
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
                <WorkflowTemplatesPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/workflows/builder" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'super_admin']}>
                <WorkflowBuilder />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/workflows/executions" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'SALES', 'super_admin']}>
                <WorkflowExecutions />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route path="*" element={<AnimatedRoute><NotFound /></AnimatedRoute>} />
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
    case 'super_admin': // Legacy support
      return <Navigate to="/dashboard/super-admin" replace />;
    case 'ADMIN':
      return <Navigate to="/dashboard/executive" replace />;
    case 'SALES':
    case 'MANAGER':
      return <Navigate to="/dashboard/crm" replace />;
    case 'SUPPORT':
    case 'hr': // Legacy support
    case 'manager': // Legacy support
    case 'medewerker': // Legacy support
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
              
              {/* AI CRM Chatbot - available on all authenticated pages */}
              <HRChatbot />
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
