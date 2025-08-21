import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bus, Plus, Wrench, MapPin, Clock } from "lucide-react";

const Buses = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Buses</h1>
          <p className="text-muted-foreground">
            Administra la flota de buses de la cooperativa
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Bus
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45</div>
            <p className="text-xs text-muted-foreground">
              Buses registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Servicio</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">38</div>
            <p className="text-xs text-muted-foreground">
              Buses operativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimiento</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              En mantenimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">
              Listos para salir
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bus Interprovincial - Placa ABC-123</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center h-32 bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg">
                <span className="text-muted-foreground text-sm">Imagen Bus Lateral Derecho</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Conductor:</span>
                  <p className="text-muted-foreground">Juan Pérez</p>
                </div>
                <div>
                  <span className="font-medium">Ruta:</span>
                  <p className="text-muted-foreground">Milagro - Guayaquil</p>
                </div>
                <div>
                  <span className="font-medium">Estado:</span>
                  <Badge variant="default">En Servicio</Badge>
                </div>
                <div>
                  <span className="font-medium">Pasajeros:</span>
                  <p className="text-muted-foreground">42/45</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bus Interprovincial - Placa DEF-456</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-center h-32 bg-gradient-to-br from-accent/5 to-primary/5 rounded-lg">
                <span className="text-muted-foreground text-sm">Imagen Bus Lateral Derecho</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Conductor:</span>
                  <p className="text-muted-foreground">Carlos López</p>
                </div>
                <div>
                  <span className="font-medium">Ruta:</span>
                  <p className="text-muted-foreground">Milagro - Durán</p>
                </div>
                <div>
                  <span className="font-medium">Estado:</span>
                  <Badge variant="secondary">Disponible</Badge>
                </div>
                <div>
                  <span className="font-medium">Pasajeros:</span>
                  <p className="text-muted-foreground">0/45</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Buses;