import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnimatePresence, motion } from "framer-motion";
import Auth from "./pages/Auth";
import DashboardHR from "./pages/DashboardHR";
import DashboardManager from "./pages/DashboardManager";
import DashboardMedewerker from "./pages/DashboardMedewerker";
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import DashboardExecutive from "./pages/DashboardExecutive";
import CaseDetail from "./pages/CaseDetail";
import NotFound from "./pages/NotFound";
import EmployeePortal from "./pages/EmployeePortal";
import ManagerMobile from "./pages/ManagerMobile";
import EmployeesPage from "./pages/hr/EmployeesPage";
import EmployeeDetailPage from "./pages/hr/EmployeeDetailPage";
import EmployeeCreatePage from "./pages/hr/EmployeeCreatePage";
import EmployeeEditPage from "./pages/hr/EmployeeEditPage";
import LeavePage from "./pages/hr/LeavePage";
import HRDashboardPage from "./pages/hr/HRDashboardPage";
import DocumentsPage from "./pages/hr/DocumentsPage";
import OnboardingPage from "./pages/hr/OnboardingPage";
import OnboardingDetailPage from "./pages/hr/OnboardingDetailPage";
import OnboardingTemplatesPage from "./pages/hr/OnboardingTemplatesPage";
import WelcomePage from "./pages/employee/WelcomePage";
import DocumentProcessing from "./pages/DocumentProcessing";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import WorkflowExecutions from "./pages/WorkflowExecutions";
import DepartmentsPage from "./pages/DepartmentsPage";
import GebruikersbeheerPage from "./pages/GebruikersbeheerPage";
import CalendarPage from "./pages/CalendarPage";
import PlanningPage from "./pages/PlanningPage";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import CostAnalyticsDashboard from "./pages/CostAnalyticsDashboard";
import EmployeeContractsPage from "./pages/EmployeeContractsPage";
import { HRChatbot } from "./components/ai/HRChatbot";
import ManagerMobilePage from "./pages/manager/ManagerMobilePage";
import AIChatPage from "./pages/AIChatPage";

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
          path="/dashboard/hr" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                <DashboardHR />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/executive" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DashboardExecutive />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/documents/processing" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager', 'medewerker']}>
                <DocumentProcessing />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/manager" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['manager']}>
                <DashboardManager />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/manager-mobile" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerMobile />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/manager/approvals" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['manager']}>
                <ManagerMobilePage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/ai-chat" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager', 'medewerker']}>
                <AIChatPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/dashboard/medewerker" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['medewerker']}>
                <DashboardMedewerker />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/employee" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['medewerker']}>
                <EmployeePortal />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        <Route 
          path="/case/:id" 
          element={
            <AnimatedRoute>
              <ProtectedRoute>
                <CaseDetail />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        {/* HR Module Routes */}
        <Route 
          path="/hr/dashboard" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                <HRDashboardPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/verzuim" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                <DashboardHR />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/medewerkers" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                <EmployeesPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/medewerkers/nieuw" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                <EmployeeCreatePage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/medewerkers/:id" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                <EmployeeDetailPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/medewerkers/:id/bewerken" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                <EmployeeEditPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/verlof" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager', 'medewerker']}>
                <LeavePage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/calendar" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager', 'medewerker']}>
                <CalendarPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/planning" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                <PlanningPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        <Route 
          path="/settings/company" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CompanySettingsPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/kosten" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin']}>
                <CostAnalyticsDashboard />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/documenten" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                <DocumentsPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/onboarding" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                <OnboardingPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/onboarding/templates" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                <OnboardingTemplatesPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/onboarding/:id" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                <OnboardingDetailPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/welkom" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['medewerker']}>
                <WelcomePage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        
        {/* Settings Routes */}
        <Route 
          path="/settings/afdelingen" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin']}>
                <DepartmentsPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/settings/gebruikers" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['super_admin']}>
                <GebruikersbeheerPage />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />

        {/* Workflow Automation Routes */}
        <Route 
          path="/hr/workflows/builder" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                <WorkflowBuilder />
              </ProtectedRoute>
            </AnimatedRoute>
          } 
        />
        <Route 
          path="/hr/workflows/executions" 
          element={
            <AnimatedRoute>
              <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
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
    case 'super_admin':
      return <Navigate to="/hr/dashboard" replace />;
    case 'hr':
      return <Navigate to="/hr/dashboard" replace />;
    case 'manager':
      return <Navigate to="/dashboard/manager" replace />;
    case 'medewerker':
      return <Navigate to="/employee" replace />;
    default:
      return <Navigate to="/auth" replace />;
  }
}

const App = () => (
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
            
            {/* AI HR Chatbot - available on all authenticated pages */}
            <HRChatbot />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
