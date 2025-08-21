import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DashboardFleet() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Flota de Buses</span>
            <Badge variant="secondary">Cooperativa Mariscal Sucre</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 p-4">
              <div className="flex items-center justify-center h-32 bg-white/50 rounded-lg">
                <span className="text-muted-foreground text-sm">Imagen Bus 1</span>
              </div>
              <div className="mt-3">
                <h4 className="font-semibold">Bus Ejecutivo</h4>
                <p className="text-sm text-muted-foreground">Servicio Milagro - Guayaquil</p>
                <Badge variant="outline" className="mt-1">En Servicio</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bus de Ruta</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-lg overflow-hidden bg-gradient-to-br from-accent/5 to-primary/5 p-4">
            <div className="flex items-center justify-center h-32 bg-white/50 rounded-lg">
              <span className="text-muted-foreground text-sm">Imagen Bus 2</span>
            </div>
            <div className="mt-3">
              <h4 className="font-semibold">Bus Urbano</h4>
              <p className="text-sm text-muted-foreground">Servicio local Milagro</p>
              <Badge variant="outline" className="mt-1">Disponible</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}