import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Bus, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PartnerStats {
  daysWorking: number;
  bus: {
    id: string;
    plate: string;
    alias: string;
    image_url: string;
    status: string;
  } | null;
  totalPassengers: number;
  totalRevenue: number;
  routes: Array<{
    name: string;
    average_passengers: number;
    total_revenue: number;
    frequency_count: number;
  }>;
}

export function PartnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPartnerStats();
    }
  }, [user]);

  const loadPartnerStats = async () => {
    try {
      setLoading(true);

      // Get partner's bus
      const { data: busData } = await supabase
        .from('buses')
        .select('id, plate, alias, image_url, status, created_at')
        .eq('owner_id', user?.id)
        .maybeSingle();

      let daysWorking = 0;
      if (busData) {
        daysWorking = Math.floor((Date.now() - new Date(busData.created_at).getTime()) / (1000 * 60 * 60 * 24));
      }

      // Get route frequencies assigned to this bus
      const { data: frequenciesData } = busData ? await supabase
        .from('route_frequencies')
        .select(`
          id,
          route_id,
          routes!inner(name)
        `)
        .eq('assigned_bus_id', busData.id) : { data: [] };

      // Get terminal operations for this bus to calculate passengers and revenue
      const frequencyIds = frequenciesData?.map(f => f.id) || [];
      
      const { data: operationsData } = frequencyIds.length > 0 ? await supabase
        .from('terminal_operations')
        .select('route_frequency_id, passengers_count, revenue')
        .in('route_frequency_id', frequencyIds) : { data: [] };

      // Calculate totals
      let totalPassengers = 0;
      let totalRevenue = 0;
      
      if (operationsData && operationsData.length > 0) {
        operationsData.forEach(op => {
          totalPassengers += op.passengers_count;
          totalRevenue += Number(op.revenue);
        });
      }

      // Process routes data
      const routesMap = new Map();
      frequenciesData?.forEach(freq => {
        const routeName = freq.routes.name;
        if (!routesMap.has(routeName)) {
          routesMap.set(routeName, {
            name: routeName,
            frequency_count: 0,
            total_passengers: 0,
            total_revenue: 0
          });
        }
        
        const route = routesMap.get(routeName);
        route.frequency_count += 1;
        
        // Add operations for this frequency
        const freqOperations = operationsData?.filter(op => op.route_frequency_id === freq.id) || [];
        freqOperations.forEach(op => {
          route.total_passengers += op.passengers_count;
          route.total_revenue += Number(op.revenue);
        });
      });

      const routes = Array.from(routesMap.values()).map(route => ({
        name: route.name,
        average_passengers: route.frequency_count > 0 ? Math.round(route.total_passengers / route.frequency_count) : 0,
        total_revenue: route.total_revenue,
        frequency_count: route.frequency_count
      }));

      setStats({
        daysWorking,
        bus: busData,
        totalPassengers,
        totalRevenue,
        routes
      });
    } catch (error) {
      console.error('Error loading partner stats:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_servicio': return 'bg-green-500';
      case 'mantenimiento': return 'bg-yellow-500';
      case 'fuera_servicio': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_servicio': return 'En Servicio';
      case 'mantenimiento': return 'Mantenimiento';
      case 'fuera_servicio': return 'Fuera de Servicio';
      default: return status;
    }
  };

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
              Desde el registro del bus
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pasajeros</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPassengers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pasajeros transportados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalRevenue?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              Ingresos generados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio Pasajeros</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.routes?.length ? Math.round(stats.totalPassengers / stats.routes.reduce((sum, r) => sum + r.frequency_count, 0)) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Por viaje
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bus Information */}
      {stats?.bus && (
        <Card>
          <CardHeader>
            <CardTitle>Información del Bus</CardTitle>
            <CardDescription>
              Detalles y estado actual de tu vehículo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {stats.bus.image_url && (
                <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={stats.bus.image_url} 
                    alt={`Bus ${stats.bus.plate}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Bus className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">{stats.bus.plate}</h3>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(stats.bus.status)}`} />
                </div>
                <p className="text-muted-foreground mb-2">{stats.bus.alias || 'Sin alias'}</p>
                <Badge variant="outline">
                  {getStatusText(stats.bus.status)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Routes Summary */}
      {stats?.routes && stats.routes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Rutas</CardTitle>
            <CardDescription>
              Estadísticas de rendimiento por ruta asignada
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.routes.map((route, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-primary" />
                    <div>
                      <span className="font-medium">{route.name}</span>
                      <p className="text-sm text-muted-foreground">
                        {route.frequency_count} frecuencias asignadas
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-sm font-medium">{route.average_passengers}</p>
                        <p className="text-xs text-muted-foreground">Promedio pasajeros</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">${route.total_revenue.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Ingresos totales</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!stats?.bus && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No tienes buses asignados como socio</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}