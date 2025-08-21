import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Usuarios from "./pages/Usuarios";
import Buses from "./pages/Buses";
import Rutas from "./pages/Rutas";
import Reportes from "./pages/Reportes";
import Configuracion from "./pages/Configuracion";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
  <SidebarProvider>
    <div className="flex min-h-screen w-full">
      <AppSidebar />
      <div className="flex-1">
        <DashboardHeader />
        <main className="flex-1 space-y-4 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  </SidebarProvider>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Index />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Usuarios />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/buses" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Buses />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/rutas" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Rutas />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reportes />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/configuracion" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Configuracion />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
