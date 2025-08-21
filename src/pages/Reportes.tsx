import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, TrendingUp, Users, Bus } from "lucide-react";

const Reportes = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Estadísticas</h1>
          <p className="text-muted-foreground">
            Genera reportes y analiza estadísticas de la cooperativa
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Exportar Datos
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes Generados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <p className="text-xs text-muted-foreground">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pasajeros/Mes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-muted-foreground">
              +15% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viajes Realizados</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,880</div>
            <p className="text-xs text-muted-foreground">
              Viajes completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.5%</div>
            <p className="text-xs text-muted-foreground">
              Promedio operativo
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reportes Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { 
                  nombre: "Reporte Diario de Operaciones", 
                  descripcion: "Resumen de viajes y pasajeros del día",
                  fecha: "Hoy",
                  tipo: "Operacional"
                },
                { 
                  nombre: "Reporte Semanal de Flota", 
                  descripcion: "Estado y rendimiento de buses",
                  fecha: "Esta semana",
                  tipo: "Mantenimiento"
                },
                { 
                  nombre: "Reporte Mensual Financiero", 
                  descripcion: "Ingresos y gastos del mes",
                  fecha: "Este mes",
                  tipo: "Financiero"
                },
                { 
                  nombre: "Reporte de Conductores", 
                  descripcion: "Desempeño y asistencia",
                  fecha: "Este mes",
                  tipo: "Personal"
                }
              ].map((reporte, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{reporte.nombre}</h4>
                    <p className="text-sm text-muted-foreground">{reporte.descripcion}</p>
                    <p className="text-xs text-muted-foreground mt-1">{reporte.fecha}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{reporte.tipo}</Badge>
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estadísticas por Ruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { ruta: "Milagro - Guayaquil", pasajeros: 4850, ocupacion: "89%" },
                { ruta: "Milagro - Durán", pasajeros: 3200, ocupacion: "76%" },
                { ruta: "Milagro - Babahoyo", pasajeros: 2400, ocupacion: "68%" },
                { ruta: "Milagro - Machala", pasajeros: 2000, ocupacion: "62%" }
              ].map((estadistica, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{estadistica.ruta}</h4>
                    <p className="text-sm text-muted-foreground">{estadistica.pasajeros} pasajeros</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{estadistica.ocupacion}</p>
                    <p className="text-sm text-muted-foreground">Ocupación</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reportes;