import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bus, MapPin } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

export function DashboardStats() {
  const [stats, setStats] = useState([
    {
      title: "Total Usuarios",
      value: "0",
      description: "Usuarios activos en el sistema",
      icon: Users,
      trend: "Cargando...",
    },
    {
      title: "Buses Operativos",
      value: "0",
      description: "Buses en servicio activo",
      icon: Bus,
      trend: "Cargando...",
    },
    {
      title: "Rutas Activas",
      value: "0",
      description: "Rutas operativas diarias",
      icon: MapPin,
      trend: "Cargando...",
    },
  ]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get buses count
      const { count: busesCount } = await supabase
        .from('buses')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'en_servicio');

      // Get routes count
      const { count: routesCount } = await supabase
        .from('routes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      setStats([
        {
          title: "Total Usuarios",
          value: (usersCount || 0).toString(),
          description: "Usuarios activos en el sistema",
          icon: Users,
          trend: "Tiempo real",
        },
        {
          title: "Buses Operativos",
          value: (busesCount || 0).toString(),
          description: "Buses en servicio activo",
          icon: Bus,
          trend: "Tiempo real",
        },
        {
          title: "Rutas Activas",
          value: (routesCount || 0).toString(),
          description: "Rutas operativas diarias",
          icon: MapPin,
          trend: "Tiempo real",
        },
      ]);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
            <p className="text-xs font-medium text-green-600 mt-1">
              {stat.trend}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}