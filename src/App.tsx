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
import GestorUsuarios from "./pages/GestorUsuarios";
import GestorBuses from "./pages/GestorBuses";
import GestorRutas from "./pages/GestorRutas";
import GestorFrecuencias from "./pages/GestorFrecuencias";
import Recompensas from "./pages/Recompensas";
import ConfiguracionCooperativa from "./pages/ConfiguracionCooperativa";
import ConfiguracionTema from "./pages/ConfiguracionTema";
import SolicitudesRoles from "./pages/SolicitudesRoles";
import ChatSoporte from "./pages/ChatSoporte";
import ChatBuses from "./pages/ChatBuses";
import Incidentes from "./pages/Incidentes";
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
              <ProtectedRoute allowedRoles={['administrator', 'manager']}>
                <DashboardLayout>
                  <GestorUsuarios />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/buses" element={
              <ProtectedRoute allowedRoles={['administrator', 'manager', 'partner']}>
                <DashboardLayout>
                  <GestorBuses />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/rutas" element={
              <ProtectedRoute allowedRoles={['administrator', 'manager', 'partner']}>
                <DashboardLayout>
                  <GestorRutas />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/chat-soporte" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChatSoporte />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/incidentes" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Incidentes />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute allowedRoles={['administrator', 'manager', 'president', 'partner']}>
                <DashboardLayout>
                  <Reportes />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/gestor-frecuencias" element={
              <ProtectedRoute allowedRoles={['administrator', 'manager', 'partner']}>
                <DashboardLayout>
                  <GestorFrecuencias />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/recompensas" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Recompensas />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/configuracion-cooperativa" element={
              <ProtectedRoute allowedRoles={['administrator', 'president']}>
                <DashboardLayout>
                  <ConfiguracionCooperativa />
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
            <Route path="/configuracion/tema" element={
              <ProtectedRoute allowedRoles={['administrator']}>
                <DashboardLayout>
                  <ConfiguracionTema />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/solicitudes-roles" element={
              <ProtectedRoute allowedRoles={['administrator']}>
                <DashboardLayout>
                  <SolicitudesRoles />
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
