import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardFleet } from '@/components/dashboard-fleet';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1">
          <DashboardHeader />
          <main className="flex-1 space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            </div>
            <DashboardStats />
            <DashboardFleet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
