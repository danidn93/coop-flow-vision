import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Bus, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkStats {
  daysWorking: number;
  totalPoints: number;
  routes: Array<{
    name: string;
    frequency_count: number;
  }>;
  buses: Array<{
    plate: string;
    alias: string;
    assignments_count: number;
  }>;
}

export function DriverDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDriverStats();
    }
  }, [user]);

  const loadDriverStats = async () => {
    try {
      setLoading(true);

      // Get days working (based on bus assignments)
      const { data: busAssignments } = await supabase
        .from('buses')
        .select('created_at')
        .eq('driver_id', user?.id)
        .order('created_at', { ascending: true });

      const daysWorking = busAssignments && busAssignments.length > 0 
        ? Math.floor((Date.now() - new Date(busAssignments[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Get total points
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user?.id)
        .single();

      // Get routes worked on
      const { data: driverBuses } = await supabase
        .from('buses')
        .select('id')
        .eq('driver_id', user?.id);

      const busIds = driverBuses?.map(bus => bus.id) || [];

      const { data: routesData } = busIds.length > 0 ? await supabase
        .from('route_frequencies')
        .select(`
          route_id,
          routes!inner(name)
        `)
        .not('assigned_bus_id', 'is', null)
        .in('assigned_bus_id', busIds) : { data: [] };

      // Process routes data
      const routesMap = new Map();
      routesData?.forEach(freq => {
        const routeName = freq.routes.name;
        routesMap.set(routeName, (routesMap.get(routeName) || 0) + 1);
      });

      const routes = Array.from(routesMap.entries()).map(([name, count]) => ({
        name,
        frequency_count: count
      }));

      // Get buses worked with
      const { data: busesData } = await supabase
        .from('buses')
        .select('plate, alias')
        .eq('driver_id', user?.id);

      const buses = busesData?.map(bus => ({
        plate: bus.plate,
        alias: bus.alias || 'Sin alias',
        assignments_count: 1 // Current assignment
      })) || [];

      setStats({
        daysWorking,
        totalPoints: pointsData?.total_points || 0,
        routes,
        buses
      });
    } catch (error) {
      console.error('Error loading driver stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Días Trabajando</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.daysWorking || 0}</div>
            <p className="text-xs text-muted-foreground">
              Desde la primera asignación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puntos Totales</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPoints || 0}</div>
            <p className="text-xs text-muted-foreground">
              Puntos acumulados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rutas Trabajadas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.routes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Rutas diferentes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Buses Asignados</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.buses?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Buses trabajados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Routes Summary */}
      {stats?.routes && stats.routes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Rutas</CardTitle>
            <CardDescription>
              Rutas en las que has trabajado y frecuencias asignadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.routes.map((route, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="font-medium">{route.name}</span>
                  </div>
                  <Badge variant="secondary">
                    {route.frequency_count} frecuencias
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Buses Summary */}
      {stats?.buses && stats.buses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Buses Asignados</CardTitle>
            <CardDescription>
              Vehículos que has manejado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.buses.map((bus, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Bus className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-medium">{bus.plate}</span>
                      <p className="text-sm text-muted-foreground">{bus.alias}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Activo
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}