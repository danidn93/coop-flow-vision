import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, CalendarIcon, TrendingUp, Users, Bus, Filter } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Route {
  id: string;
  name: string;
}

interface ReportData {
  totalPassengers: number;
  totalRevenue: number;
  tripCount: number;
  routeStats: Array<{
    routeName: string;
    passengers: number;
    revenue: number;
    trips: number;
  }>;
}

const Reportes = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      const { data } = await supabase
        .from('routes')
        .select('id, name')
        .eq('status', 'active')
        .order('name');
      
      if (data) {
        setRoutes(data);
      }
    } catch (error) {
      console.error('Error loading routes:', error);
    }
  };

  const handleRouteToggle = (routeId: string) => {
    setSelectedRoutes(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const generateReport = async () => {
    if (!startDate || !endDate || selectedRoutes.length === 0) {
      return;
    }

    setLoading(true);
    try {
      // Get route frequencies for selected routes and date range
      const { data: frequenciesData } = await supabase
        .from('route_frequencies')
        .select(`
          id,
          route_id,
          routes!inner(name)
        `)
        .in('route_id', selectedRoutes);

      if (!frequenciesData) {
        setReportData({
          totalPassengers: 0,
          totalRevenue: 0,
          tripCount: 0,
          routeStats: []
        });
        return;
      }

      const frequencyIds = frequenciesData.map(f => f.id);

      // Get terminal operations for the date range
      const { data: operationsData } = await supabase
        .from('terminal_operations')
        .select('route_frequency_id, passengers_count, revenue, recorded_at')
        .in('route_frequency_id', frequencyIds)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString());

      // Process the data
      const routeStatsMap = new Map();
      let totalPassengers = 0;
      let totalRevenue = 0;
      let tripCount = 0;

      operationsData?.forEach(operation => {
        const frequency = frequenciesData.find(f => f.id === operation.route_frequency_id);
        if (frequency) {
          const routeName = frequency.routes.name;
          
          if (!routeStatsMap.has(routeName)) {
            routeStatsMap.set(routeName, {
              routeName,
              passengers: 0,
              revenue: 0,
              trips: 0
            });
          }

          const routeStat = routeStatsMap.get(routeName);
          routeStat.passengers += operation.passengers_count;
          routeStat.revenue += Number(operation.revenue);
          routeStat.trips += 1;

          totalPassengers += operation.passengers_count;
          totalRevenue += Number(operation.revenue);
          tripCount += 1;
        }
      });

      setReportData({
        totalPassengers,
        totalRevenue,
        tripCount,
        routeStats: Array.from(routeStatsMap.values())
      });
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Estadísticas</h1>
          <p className="text-muted-foreground">
            Genera reportes y analiza estadísticas de la cooperativa
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={generateReport} disabled={loading || !startDate || !endDate || selectedRoutes.length === 0}>
            <Filter className="mr-2 h-4 w-4" />
            {loading ? 'Generando...' : 'Generar Reporte'}
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Inicio</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha de Fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Routes Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleccionar Rutas</label>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {routes.map((route) => (
                    <div key={route.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={route.id}
                        checked={selectedRoutes.includes(route.id)}
                        onCheckedChange={() => handleRouteToggle(route.id)}
                      />
                      <label htmlFor={route.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {route.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Results */}
      {reportData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pasajeros</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.totalPassengers}</div>
              <p className="text-xs text-muted-foreground">
                En el período seleccionado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${reportData.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Ingresos generados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Viajes</CardTitle>
              <Bus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reportData.tripCount}</div>
              <p className="text-xs text-muted-foreground">
                Viajes realizados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Route Statistics */}
      {reportData && reportData.routeStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estadísticas por Ruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.routeStats.map((stat, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{stat.routeName}</h4>
                    <p className="text-sm text-muted-foreground">{stat.trips} viajes realizados</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-4">
                      <div>
                        <p className="font-semibold">{stat.passengers}</p>
                        <p className="text-xs text-muted-foreground">Pasajeros</p>
                      </div>
                      <div>
                        <p className="font-semibold">${stat.revenue.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Ingresos</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reportes;