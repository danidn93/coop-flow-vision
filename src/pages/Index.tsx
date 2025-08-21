import { DashboardStats } from '@/components/dashboard-stats';
import { DashboardFleet } from '@/components/dashboard-fleet';

const Index = () => {
  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <DashboardStats />
      <DashboardFleet />
    </>
  );
};

export default Index;
