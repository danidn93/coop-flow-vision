import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings, Shield, Bell, Database, Users, Palette } from "lucide-react";

const Configuracion = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h1>
          <p className="text-muted-foreground">
            Administra la configuración general de la cooperativa
          </p>
        </div>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          Guardar Cambios
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Configuración de Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="two-factor">Autenticación de dos factores</Label>
                <div className="text-sm text-muted-foreground">
                  Requiere verificación adicional para acceder al sistema
                </div>
              </div>
              <Switch id="two-factor" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-timeout">Expiración automática de sesión</Label>
                <div className="text-sm text-muted-foreground">
                  Cerrar sesión después de 30 minutos de inactividad
                </div>
              </div>
              <Switch id="session-timeout" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="password-policy">Política de contraseñas estricta</Label>
                <div className="text-sm text-muted-foreground">
                  Requiere contraseñas con mayúsculas, números y símbolos
                </div>
              </div>
              <Switch id="password-policy" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificaciones por correo</Label>
                <div className="text-sm text-muted-foreground">
                  Enviar alertas importantes por email
                </div>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-alerts">Alertas de mantenimiento</Label>
                <div className="text-sm text-muted-foreground">
                  Notificar cuando los buses requieran mantenimiento
                </div>
              </div>
              <Switch id="maintenance-alerts" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="route-alerts">Alertas de rutas</Label>
                <div className="text-sm text-muted-foreground">
                  Notificar cambios en horarios y rutas
                </div>
              </div>
              <Switch id="route-alerts" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { rol: "Administrador", usuarios: 3, permisos: "Completo" },
                  { rol: "Manager", usuarios: 5, permisos: "Operacional" },
                  { rol: "Conductor", usuarios: 28, permisos: "Limitado" },
                  { rol: "Socio", usuarios: 45, permisos: "Consulta" }
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{item.rol}</h4>
                      <p className="text-sm text-muted-foreground">{item.usuarios} usuarios</p>
                    </div>
                    <Badge variant="outline">{item.permisos}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Versión del Sistema:</span>
                  <Badge>v2.1.0</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Base de Datos:</span>
                  <Badge variant="outline">PostgreSQL</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Última Actualización:</span>
                  <span className="text-sm text-muted-foreground">15 Ene 2024</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estado del Servidor:</span>
                  <Badge className="bg-green-500">Operativo</Badge>
                </div>
                <div className="pt-4">
                  <Button className="w-full" variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Backup de Base de Datos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Información de la Cooperativa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="nombre">Nombre de la Cooperativa</Label>
                <div className="mt-1 p-2 border rounded-md bg-muted/50">
                  Cooperativa de Transporte Mariscal Sucre
                </div>
              </div>
              <div>
                <Label htmlFor="ruc">RUC</Label>
                <div className="mt-1 p-2 border rounded-md bg-muted/50">
                  0990123456001
                </div>
              </div>
              <div>
                <Label htmlFor="direccion">Dirección</Label>
                <div className="mt-1 p-2 border rounded-md bg-muted/50">
                  Milagro, Ecuador
                </div>
              </div>
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <div className="mt-1 p-2 border rounded-md bg-muted/50">
                  (04) 2970-123
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracion;