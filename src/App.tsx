import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
import DashboardHR from "./pages/DashboardHR";
import DashboardManager from "./pages/DashboardManager";
import DashboardMedewerker from "./pages/DashboardMedewerker";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function RoleBasedRedirect() {
  // Direct naar HR dashboard met mock user
  return <Navigate to="/dashboard/hr" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="/auth" element={<Auth />} />
            
            <Route 
              path="/dashboard/hr" 
              element={
                <ProtectedRoute allowedRoles={['hr']}>
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
