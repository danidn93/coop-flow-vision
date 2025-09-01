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
import { Bus, Plus, Edit, Trash2, User } from "lucide-react";

interface BusData {
  id: string;
  plate: string;
  alias: string | null;
  capacity: number | null;
  status: string;
  owner_id: string;
  driver_id: string | null;
  official_id: string | null;
  route_id: string | null;
  created_at: string;
  routes?: {
    name: string;
    destination: string;
  } | null;
}

interface RouteOption {
  id: string;
  name: string;
  destination: string;
}

interface UserOption {
  user_id: string;
  first_name: string;
  surname_1: string;
  roles?: string[];
}

const GestorBuses = () => {
  const { toast } = useToast();
  const { userRole, user } = useAuth();
  const [buses, setBuses] = useState<BusData[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [partners, setPartners] = useState<UserOption[]>([]);
  const [drivers, setDrivers] = useState<UserOption[]>([]);
  const [officials, setOfficials] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<BusData | null>(null);
  const [formData, setFormData] = useState({
    plate: '',
    alias: '',
    capacity: 45,
    status: 'disponible',
    owner_id: '',
    driver_id: '',
    official_id: ''
  });

  useEffect(() => {
    loadBuses();
    loadRoutes();
    loadUsers();
  }, []);

  const canManageBuses = userRole && ['administrator', 'manager', 'employee', 'partner'].includes(userRole.role);

  const loadBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select(`
          id, plate, alias, capacity, status, owner_id, driver_id, official_id, created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBuses(data as BusData[] || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los buses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, destination')
        .eq('status', 'active');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      console.error('Error loading routes:', error);
    }
  };

  const loadUsers = async () => {
    try {
      // Load all profiles with roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, surname_1');

      if (profilesError) throw profilesError;

      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine profiles with roles (support multiple roles per user)
      const rolesMap = new Map<string, string[]>();
      (rolesData || []).forEach((r: { user_id: string; role: string }) => {
        const arr = rolesMap.get(r.user_id) || [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      });

      const usersWithRoles: UserOption[] = (profilesData || []).map((profile) => ({
        ...profile,
        roles: rolesMap.get(profile.user_id) || []
      }));

      setUsers(usersWithRoles);
      setPartners(usersWithRoles.filter((u) => u.roles?.includes('partner')));
      setDrivers(usersWithRoles.filter((u) => u.roles?.includes('driver')));
      setOfficials(usersWithRoles.filter((u) => u.roles?.includes('official')));
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      owner_id: formData.owner_id || user?.id,
      driver_id: formData.driver_id === 'unassigned' ? null : formData.driver_id || null,
      official_id: formData.official_id === 'unassigned' ? null : formData.official_id || null
    };
    
    try {
      if (editingBus) {
        const { error } = await supabase
          .from('buses')
          .update(submitData)
          .eq('id', editingBus.id);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Bus actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('buses')
          .insert([submitData]);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Bus registrado correctamente",
        });
      }
      
      setIsDialogOpen(false);
      setEditingBus(null);
      resetForm();
      loadBuses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el bus",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (bus: BusData) => {
    setEditingBus(bus);
    setFormData({
      plate: bus.plate,
      alias: bus.alias || '',
      capacity: bus.capacity || 45,
      status: bus.status,
      owner_id: bus.owner_id,
      driver_id: bus.driver_id || 'unassigned',
      official_id: bus.official_id || 'unassigned'
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea dar de baja este bus?')) return;
    
    try {
      const { error } = await supabase
        .from('buses')
        .update({ status: 'fuera_de_servicio' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Bus dado de baja correctamente",
      });
      
      loadBuses();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo dar de baja el bus",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      plate: '',
      alias: '',
      capacity: 45,
      status: 'disponible',
      owner_id: '',
      driver_id: 'unassigned',
      official_id: 'unassigned'
    });
  };

  const openNewDialog = () => {
    resetForm();
    setEditingBus(null);
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'en_servicio': { label: 'En Servicio', variant: 'default' as const },
      'disponible': { label: 'Disponible', variant: 'secondary' as const },
      'mantenimiento': { label: 'Mantenimiento', variant: 'destructive' as const },
      'en_tour': { label: 'En Tour', variant: 'default' as const },
      'fuera_de_servicio': { label: 'Fuera de Servicio', variant: 'outline' as const }
    };
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>;
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Buses</h1>
          <p className="text-muted-foreground">
            Administra la flota de buses de la cooperativa
          </p>
        </div>
        {canManageBuses && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Bus
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingBus ? 'Editar Bus' : 'Registrar Nuevo Bus'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="plate">Placa *</Label>
                  <Input
                    id="plate"
                    value={formData.plate}
                    onChange={(e) => setFormData({...formData, plate: e.target.value.toUpperCase()})}
                    placeholder="ABC-1234"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="alias">Alias/Nombre</Label>
                  <Input
                    id="alias"
                    value={formData.alias}
                    onChange={(e) => setFormData({...formData, alias: e.target.value})}
                    placeholder="Ej: El Rápido"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacidad</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    min="20"
                    max="60"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="owner">Propietario (Socio) *</Label>
                  <Select value={formData.owner_id} onValueChange={(value) => setFormData({...formData, owner_id: value})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar propietario" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((partner) => (
                        <SelectItem key={partner.user_id} value={partner.user_id}>
                          {partner.first_name} {partner.surname_1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {editingBus && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="driver">Conductor (Gestión)</Label>
                      <Select value={formData.driver_id} onValueChange={(value) => setFormData({...formData, driver_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar conductor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.user_id} value={driver.user_id}>
                              {driver.first_name} {driver.surname_1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="official">Oficial (Gestión)</Label>
                      <Select value={formData.official_id} onValueChange={(value) => setFormData({...formData, official_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar oficial" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Sin asignar</SelectItem>
                          {officials.map((official) => (
                            <SelectItem key={official.user_id} value={official.user_id}>
                              {official.first_name} {official.surname_1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    
                    <div className="space-y-2">
                      <Label htmlFor="status">Estado (Gestión)</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disponible">Disponible</SelectItem>
                          <SelectItem value="en_servicio">En Servicio</SelectItem>
                          <SelectItem value="en_tour">En Tour</SelectItem>
                          <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                          <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingBus ? 'Actualizar' : 'Registrar'}
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
            <CardTitle className="text-sm font-medium">Total Buses</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buses.length}</div>
            <p className="text-xs text-muted-foreground">
              Buses registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Servicio</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {buses.filter(bus => bus.status === 'en_servicio').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Buses operativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {buses.filter(bus => bus.status === 'disponible').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Listos para salir
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimiento</CardTitle>
            <Bus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {buses.filter(bus => bus.status === 'mantenimiento').length}
            </div>
            <p className="text-xs text-muted-foreground">
              En mantenimiento
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bus className="h-5 w-5" />
            Flota de Buses ({buses.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {buses.map((bus) => (
              <div key={bus.id} className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 border rounded-lg items-center">
                <div>
                  <h4 className="font-semibold">{bus.plate}</h4>
                  <p className="text-sm text-muted-foreground">
                    {bus.alias || 'Sin alias'}
                  </p>
                </div>
                <div>
                  <p className="font-medium">{bus.capacity} pasajeros</p>
                  <p className="text-sm text-muted-foreground">Capacidad</p>
                </div>
                <div>
                  <p className="font-medium flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Propietario
                  </p>
                  <p className="text-sm text-muted-foreground">ID: {bus.owner_id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="font-medium">
                    {bus.driver_id ? `Conductor: ${bus.driver_id.slice(0, 8)}...` : 'Sin conductor'}
                  </p>
                  <p className="text-sm text-muted-foreground">Conductor</p>
                </div>
                <div>
                  <p className="font-medium">
                    {bus.official_id ? `Oficial: ${bus.official_id.slice(0, 8)}...` : 'Sin oficial'}
                  </p>
                  <p className="text-sm text-muted-foreground">Oficial</p>
                </div>
                <div>
                  <p className="font-medium">
                    {bus.routes ? bus.routes.name : 'Sin ruta'}
                  </p>
                  <p className="text-sm text-muted-foreground">Ruta asignada</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(bus.status)}
                  {canManageBuses && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(bus)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(bus.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {buses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay buses registrados.
                {canManageBuses && <br />}
                {canManageBuses && 'Registra un nuevo bus para comenzar.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestorBuses;