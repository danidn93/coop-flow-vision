import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardFleet } from '@/components/dashboard-fleet';
import { CreateTestUsersButton } from '@/components/create-test-users-button';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === 'administrator';

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
