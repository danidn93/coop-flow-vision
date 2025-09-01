import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardFleet } from '@/components/dashboard-fleet';
import { CreateTestUsersButton } from '@/components/create-test-users-button';
import { ClientDashboard } from '@/components/client-dashboard';
import { DriverDashboard } from '@/components/driver-dashboard';
import { OfficialDashboard } from '@/components/official-dashboard';
import { PartnerDashboard } from '@/components/partner-dashboard';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === 'administrator';
  const isClient = userRole?.role === 'client';
  const isDriver = userRole?.role === 'driver';
  const isOfficial = userRole?.role === 'official';
  const isPartner = userRole?.role === 'partner';

  // Client dashboard
  if (isClient) {
    return (
      <>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Mi Dashboard</h2>
        </div>
        <ClientDashboard />
      </>
    );
  }

  // Driver dashboard
  if (isDriver) {
    return (
      <>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard del Conductor</h2>
        </div>
        <DriverDashboard />
      </>
    );
  }

  // Official dashboard
  if (isOfficial) {
    return (
      <>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard del Oficial</h2>
        </div>
        <OfficialDashboard />
      </>
    );
  }

  // Partner dashboard
  if (isPartner) {
    return (
      <>
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard del Socio</h2>
        </div>
        <PartnerDashboard />
      </>
    );
  }

  // Admin/Manager/Employee/President dashboard with incident stats  
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <DashboardStats />
      <DashboardFleet />
      {isAdmin && <CreateTestUsersButton />}
    </>
  );
};

export default Index;
