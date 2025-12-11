import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import DashboardHR from "./pages/DashboardHR";
import DashboardManager from "./pages/DashboardManager";
import DashboardMedewerker from "./pages/DashboardMedewerker";
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import CaseDetail from "./pages/CaseDetail";
import NotFound from "./pages/NotFound";
import EmployeesPage from "./pages/hr/EmployeesPage";
import EmployeeDetailPage from "./pages/hr/EmployeeDetailPage";
import LeavePage from "./pages/hr/LeavePage";

const queryClient = new QueryClient();

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
      return <Navigate to="/dashboard/super-admin" replace />;
    case 'hr':
      return <Navigate to="/dashboard/hr" replace />;
    case 'manager':
      return <Navigate to="/dashboard/manager" replace />;
    case 'medewerker':
      return <Navigate to="/dashboard/medewerker" replace />;
    default:
      return <Navigate to="/auth" replace />;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<RoleBasedRedirect />} />
              <Route path="/auth" element={<Auth />} />
              
              <Route 
                path="/dashboard/super-admin" 
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <DashboardSuperAdmin />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dashboard/hr" 
                element={
                  <ProtectedRoute allowedRoles={['hr', 'super_admin']}>
                    <DashboardHR />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dashboard/manager" 
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <DashboardManager />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dashboard/medewerker" 
                element={
                  <ProtectedRoute allowedRoles={['medewerker']}>
                    <DashboardMedewerker />
                  </ProtectedRoute>
                } 
              />

              <Route 
                path="/case/:id" 
                element={
                  <ProtectedRoute>
                    <CaseDetail />
                  </ProtectedRoute>
                } 
              />

              {/* HR Module Routes */}
              <Route 
                path="/hr/medewerkers" 
                element={
                  <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                    <EmployeesPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/hr/medewerkers/:id" 
                element={
                  <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager']}>
                    <EmployeeDetailPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/hr/verlof" 
                element={
                  <ProtectedRoute allowedRoles={['hr', 'super_admin', 'manager', 'medewerker']}>
                    <LeavePage />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
