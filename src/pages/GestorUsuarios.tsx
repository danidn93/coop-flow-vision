import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Users, Plus, Edit, Shield, Search } from "lucide-react";

interface UserProfile {
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

const GestorUsuarios = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [newUserRole, setNewUserRole] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    middle_name: '',
    surname_1: '',
    surname_2: '',
    id_number: '',
    phone: '',
    address: '',
    role: 'client'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const isAdmin = userRole?.role === 'administrator';

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

      setUsers(usersWithRoles as UserProfile[]);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Use admin signup function to avoid email confirmation and handle duplicates
      const { data, error } = await supabase.functions.invoke('admin-signup', {
        body: {
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          middle_name: formData.middle_name,
          surname_1: formData.surname_1,
          surname_2: formData.surname_2,
          id_number: formData.id_number,
          phone: formData.phone,
          address: formData.address,
          role: formData.role
        }
      });

      if (error) {
        const ctx: any = (error as any).context;
        const serverMsg = typeof ctx === 'string' ? ctx : ctx?.error || ctx?.message;
        throw new Error(serverMsg || error.message || 'Error al crear el usuario');
      }

      // For seguridad: si la función responde 200 pero con payload de error
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }
      
      toast({
        title: "Éxito",
        description: "Usuario creado correctamente",
      });
      
      setIsDialogOpen(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el usuario",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newUserRole) return;

    try {
      // Delete existing roles for the user
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', selectedUser.user_id);

      // Insert new role
      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: selectedUser.user_id,
          role: newUserRole as any
        });

      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Rol actualizado correctamente",
      });
      
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      setNewUserRole('');
      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      first_name: '',
      middle_name: '',
      surname_1: '',
      surname_2: '',
      id_number: '',
      phone: '',
      address: '',
      role: 'client'
    });
  };

  const openRoleDialog = (user: UserProfile) => {
    setSelectedUser(user);
    setNewUserRole('client'); // Default to client role
    setIsRoleDialogOpen(true);
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.surname_1.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id_number.includes(searchTerm) ||
      user.phone.includes(searchTerm);
    
    // For now, we'll show all users since we simplified the interface
    return matchesSearch;
  });

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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            Administra los usuarios y roles del sistema
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Primer Nombre *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="middle_name">Segundo Nombre</Label>
                    <Input
                      id="middle_name"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surname_1">Primer Apellido *</Label>
                    <Input
                      id="surname_1"
                      value={formData.surname_1}
                      onChange={(e) => setFormData({...formData, surname_1: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="surname_2">Segundo Apellido</Label>
                    <Input
                      id="surname_2"
                      value={formData.surname_2}
                      onChange={(e) => setFormData({...formData, surname_2: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="id_number">Cédula *</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) => setFormData({...formData, id_number: e.target.value})}
                      required
                      minLength={10}
                      maxLength={13}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Dirección *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Cliente</SelectItem>
                      <SelectItem value="driver">Conductor</SelectItem>
                      <SelectItem value="partner">Socio</SelectItem>
                      <SelectItem value="employee">Empleado</SelectItem>
                      <SelectItem value="official">Dirigente</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="administrator">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Crear Usuario
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Usuarios</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar usuarios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="administrator">Administrador</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="partner">Socio</SelectItem>
                  <SelectItem value="driver">Conductor</SelectItem>
                  <SelectItem value="client">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.user_id} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg items-center">
                <div>
                  <h4 className="font-semibold">
                    {user.first_name} {user.middle_name} {user.surname_1} {user.surname_2}
                  </h4>
                  <p className="text-sm text-muted-foreground">C.I. {user.id_number}</p>
                </div>
                <div>
                  <p className="font-medium">{user.phone}</p>
                  <p className="text-sm text-muted-foreground">Teléfono</p>
                </div>
                <div>
                  <p className="font-medium text-sm">{user.address}</p>
                  <p className="text-sm text-muted-foreground">Dirección</p>
                </div>
                <div>
                  <Badge 
                    variant={getRoleBadgeVariant(user.user_roles?.role || 'client')} 
                    className="text-xs"
                  >
                    {getRoleDisplayName(user.user_roles?.role || 'client')}
                  </Badge>
                </div>
                <div className="flex justify-end">
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openRoleDialog(user)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Cambiar Rol
                    </Button>
                  )}
                </div>
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

      {/* Role Change Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Cambiar Rol de Usuario</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">
                  {selectedUser.first_name} {selectedUser.surname_1}
                </p>
                <p className="text-sm text-muted-foreground">
                  C.I. {selectedUser.id_number}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newRole">Nuevo Rol</Label>
                <Select value={newUserRole} onValueChange={setNewUserRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Cliente</SelectItem>
                    <SelectItem value="driver">Conductor</SelectItem>
                    <SelectItem value="partner">Socio</SelectItem>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="official">Dirigente</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="administrator">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleRoleChange}>
                  Actualizar Rol
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestorUsuarios;