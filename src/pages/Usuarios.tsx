import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Search, Shield } from "lucide-react";

interface UserData {
  user_id: string;
  first_name: string;
  middle_name: string | null;
  surname_1: string;
  surname_2: string | null;
  id_number: string;
  phone: string;
  address: string;
  created_at: string;
  user_roles?: {
    role: string;
  } | null;
}

const Usuarios = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // First, get all profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, middle_name, surname_1, surname_2, id_number, phone, address, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Then, get all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles = (profilesData || []).map(profile => {
        const userRole = rolesData?.find(role => role.user_id === profile.user_id);
        return {
          ...profile,
          user_roles: userRole ? { role: userRole.role } : null
        };
      });

      setUsers(usersWithRoles as UserData[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  const getRoleBadgeVariant = (role: string) => {
    const variants = {
      administrator: 'destructive' as const,
      president: 'default' as const,
      manager: 'default' as const,
      employee: 'secondary' as const,
      partner: 'default' as const,
      driver: 'secondary' as const,
      official: 'secondary' as const,
      client: 'outline' as const
    };
    return variants[role as keyof typeof variants] || 'outline';
  };

  const getUserStats = () => {
    const stats = {
      total: users.length,
      administrator: 0,
      driver: 0,
      partner: 0,
      client: 0
    };

    users.forEach(user => {
      const role = user.user_roles?.role;
      if (role && role in stats) {
        stats[role as keyof typeof stats]++;
      }
    });

    return stats;
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.surname_1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id_number.includes(searchTerm) ||
      user.phone.includes(searchTerm);
    
    return matchesSearch;
  });

  const stats = getUserStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios del Sistema</h1>
          <p className="text-muted-foreground">
            Vista general de usuarios y estadísticas del sistema
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.administrator}</div>
            <p className="text-xs text-muted-foreground">
              Usuarios administradores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conductores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.driver}</div>
            <p className="text-xs text-muted-foreground">
              Conductores activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Socios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.partner}</div>
            <p className="text-xs text-muted-foreground">
              Socios de la cooperativa
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuarios</CardTitle>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">
                    {user.first_name} {user.middle_name} {user.surname_1} {user.surname_2}
                  </h4>
                  <p className="text-sm text-muted-foreground">C.I. {user.id_number}</p>
                  <p className="text-sm text-muted-foreground">{user.phone}</p>
                </div>
                <Badge 
                  variant={getRoleBadgeVariant(user.user_roles?.role || 'client')}
                  className="text-xs"
                >
                  {getRoleDisplayName(user.user_roles?.role || 'client')}
                </Badge>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron usuarios con los criterios de búsqueda.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;