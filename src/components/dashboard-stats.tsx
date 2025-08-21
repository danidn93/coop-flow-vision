import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Bus, MapPin, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Total Usuarios",
    value: "124",
    description: "Usuarios activos en el sistema",
    icon: Users,
    trend: "+12%",
  },
  {
    title: "Buses Operativos",
    value: "45",
    description: "Buses en servicio activo",
    icon: Bus,
    trend: "+3%",
  },
  {
    title: "Rutas Activas",
    value: "8",
    description: "Rutas operativas diarias",
    icon: MapPin,
    trend: "Estable",
  },
  {
    title: "Ingresos Mes",
    value: "$45,230",
    description: "Ingresos del mes actual",
    icon: TrendingUp,
    trend: "+8%",
  },
];

export function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {stat.trend} desde el mes pasado
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}