import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Route } from "lucide-react";

const Rutas = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rutas Disponibles</h1>
          <p className="text-muted-foreground">
            Consulta las rutas disponibles de la cooperativa
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rutas Activas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground">
              Rutas en operación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frecuencias/Día</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">120</div>
            <p className="text-xs text-muted-foreground">
              Salidas diarias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarifa Promedio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1.94</div>
            <p className="text-xs text-muted-foreground">
              Precio promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distancia Total</CardTitle>
            <Route className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">140</div>
            <p className="text-xs text-muted-foreground">
              Kilómetros diarios
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rutas de la Cooperativa Mariscal Sucre</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { 
                  origen: "Milagro", 
                  destino: "Guayaquil", 
                  distancia: "65 km", 
                  duracion: "1h 30min", 
                  tarifa: "$3.00", 
                  frecuencia: "Cada 30min",
                  status: "Activa" 
                },
                { 
                  origen: "Milagro", 
                  destino: "Simón Bolívar", 
                  distancia: "25 km", 
                  duracion: "45min", 
                  tarifa: "$1.50", 
                  frecuencia: "Cada 20min",
                  status: "Activa" 
                },
                { 
                  origen: "Milagro", 
                  destino: "Lorenzo de Garaicoa", 
                  distancia: "32 km", 
                  duracion: "55min", 
                  tarifa: "$2.00", 
                  frecuencia: "Cada 30min",
                  status: "Activa" 
                },
                { 
                  origen: "Milagro", 
                  destino: "Mata de Plátano", 
                  distancia: "18 km", 
                  duracion: "35min", 
                  tarifa: "$1.25", 
                  frecuencia: "Cada 25min",
                  status: "Activa" 
                }
              ].map((ruta, index) => (
                <div key={index} className="grid grid-cols-2 md:grid-cols-7 gap-4 p-4 border rounded-lg items-center">
                  <div>
                    <h4 className="font-semibold">{ruta.origen}</h4>
                    <p className="text-sm text-muted-foreground">Origen</p>
                  </div>
                  <div>
                    <h4 className="font-semibold">{ruta.destino}</h4>
                    <p className="text-sm text-muted-foreground">Destino</p>
                  </div>
                  <div>
                    <p className="font-medium">{ruta.distancia}</p>
                    <p className="text-sm text-muted-foreground">Distancia</p>
                  </div>
                  <div>
                    <p className="font-medium">{ruta.duracion}</p>
                    <p className="text-sm text-muted-foreground">Duración</p>
                  </div>
                  <div>
                    <p className="font-medium">{ruta.tarifa}</p>
                    <p className="text-sm text-muted-foreground">Tarifa</p>
                  </div>
                  <div>
                    <p className="font-medium">{ruta.frecuencia}</p>
                    <p className="text-sm text-muted-foreground">Frecuencia</p>
                  </div>
                  <div>
                    <Badge variant="default">{ruta.status}</Badge>
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

export default Rutas;