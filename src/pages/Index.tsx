import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogOut, Users, MapPin, Settings, FileText } from 'lucide-react';

const Index = () => {
  const { user, profile, userRole, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'administrator':
        return 'destructive';
      case 'president':
      case 'manager':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      administrator: 'Administrador',
      president: 'Presidente',
      manager: 'Manager',
      employee: 'Empleado',
      partner: 'Socio',
      driver: 'Conductor',
      official: 'Dirigente',
      client: 'Cliente'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  return (
    <div className="min-h-screen bg-secondary/10">
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Cooperativa Mariscal Sucre</h1>
              <p className="text-primary-foreground/80 text-lg">Sistema de Gestión y Control</p>
            </div>
            <div className="flex items-center gap-4">
              {profile && (
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {profile.first_name} {profile.surname_1}
                  </p>
                  {userRole && (
                    <Badge variant={getRoleBadgeVariant(userRole.role)}>
                      {getRoleDisplayName(userRole.role)}
                    </Badge>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                size="lg"
                onClick={signOut}
                className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Cerrar Sesión
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Panel de Control</h2>
          <p className="text-muted-foreground text-lg">
            Bienvenido al sistema de gestión de la cooperativa
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Usuarios</CardTitle>
                <Users className="h-6 w-6 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Gestión de usuarios y roles del sistema
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Rutas</CardTitle>
                <MapPin className="h-6 w-6 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Configuración de rutas y tarifas diarias
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Reportes</CardTitle>
                <FileText className="h-6 w-6 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Informes y estadísticas del sistema
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Configuración</CardTitle>
                <Settings className="h-6 w-6 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Ajustes generales del sistema
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {profile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Nombre Completo:</p>
                  <p className="text-muted-foreground">
                    {profile.first_name} {profile.middle_name || ''} {profile.surname_1} {profile.surname_2 || ''}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Cédula:</p>
                  <p className="text-muted-foreground">{profile.id_number}</p>
                </div>
                <div>
                  <p className="font-semibold">Teléfono:</p>
                  <p className="text-muted-foreground">{profile.phone}</p>
                </div>
                <div>
                  <p className="font-semibold">Dirección:</p>
                  <p className="text-muted-foreground">{profile.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
