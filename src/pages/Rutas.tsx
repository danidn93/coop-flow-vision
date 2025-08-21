import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, Route } from "lucide-react";

const Rutas = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Rutas</h1>
          <p className="text-muted-foreground">
            Administra las rutas interprovinciales de la cooperativa
          </p>
        </div>
        <Button>
          <Route className="mr-2 h-4 w-4" />
          Nueva Ruta
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rutas Activas</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
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
            <div className="text-2xl font-bold">96</div>
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
            <div className="text-2xl font-bold">$2.50</div>
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
            <div className="text-2xl font-bold">485</div>
            <p className="text-xs text-muted-foreground">
              Kilómetros diarios
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rutas Interprovinciales</CardTitle>
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
                  destino: "Durán", 
                  distancia: "45 km", 
                  duracion: "1h 10min", 
                  tarifa: "$2.50", 
                  frecuencia: "Cada 45min",
                  status: "Activa" 
                },
                { 
                  origen: "Milagro", 
                  destino: "Babahoyo", 
                  distancia: "85 km", 
                  duracion: "2h", 
                  tarifa: "$3.50", 
                  frecuencia: "Cada 1h",
                  status: "Activa" 
                },
                { 
                  origen: "Milagro", 
                  destino: "Machala", 
                  distancia: "120 km", 
                  duracion: "2h 30min", 
                  tarifa: "$4.50", 
                  frecuencia: "Cada 2h",
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