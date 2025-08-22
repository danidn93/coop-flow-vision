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
import { Route, Plus, Edit, Trash2 } from "lucide-react";

interface RouteData {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance_km: number;
  duration_minutes: number;
  base_fare: number;
  frequency_minutes: number;
  status: string;
  created_at: string;
}

const GestorRutas = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    origin: 'Milagro',
    destination: '',
    distance_km: 0,
    duration_minutes: 0,
    base_fare: 0,
    frequency_minutes: 30,
    status: 'active'
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const canManageRoutes = userRole && ['administrator', 'manager', 'partner'].includes(userRole.role);

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las rutas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRoute) {
        const { error } = await supabase
          .from('routes')
          .update(formData)
          .eq('id', editingRoute.id);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Ruta actualizada correctamente",
        });
      } else {
        const { error } = await supabase
          .from('routes')
          .insert([formData]);
        
        if (error) throw error;
        
        toast({
          title: "Éxito",
          description: "Ruta creada correctamente",
        });
      }
      
      setIsDialogOpen(false);
      setEditingRoute(null);
      resetForm();
      loadRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la ruta",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (route: RouteData) => {
    setEditingRoute(route);
    setFormData({
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      distance_km: route.distance_km,
      duration_minutes: route.duration_minutes,
      base_fare: route.base_fare,
      frequency_minutes: route.frequency_minutes,
      status: route.status
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta ruta?')) return;
    
    try {
      const { error } = await supabase
        .from('routes')
        .update({ status: 'inactive' })
        .eq('id', id);
      
      if (error) throw error;
      
      toast({
        title: "Éxito",
        description: "Ruta desactivada correctamente",
      });
      
      loadRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo desactivar la ruta",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      origin: 'Milagro',
      destination: '',
      distance_km: 0,
      duration_minutes: 0,
      base_fare: 0,
      frequency_minutes: 30,
      status: 'active'
    });
  };

  const openNewDialog = () => {
    resetForm();
    setEditingRoute(null);
    setIsDialogOpen(true);
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Rutas</h1>
          <p className="text-muted-foreground">
            Administra las rutas de la cooperativa
          </p>
        </div>
        {canManageRoutes && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Ruta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de la Ruta</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ej: Milagro - Guayaquil"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origen</Label>
                    <Input
                      id="origin"
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="Ej: Milagro"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="destination">Destino</Label>
                    <Input
                      id="destination"
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="Ej: Guayaquil"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distance">Distancia (km)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="0.1"
                      value={formData.distance_km}
                      onChange={(e) => setFormData({...formData, distance_km: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duración (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fare">Tarifa ($)</Label>
                    <Input
                      id="fare"
                      type="number"
                      step="0.25"
                      value={formData.base_fare}
                      onChange={(e) => setFormData({...formData, base_fare: parseFloat(e.target.value)})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frecuencia (min)</Label>
                    <Input
                      id="frequency"
                      type="number"
                      value={formData.frequency_minutes}
                      onChange={(e) => setFormData({...formData, frequency_minutes: parseInt(e.target.value)})}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingRoute ? 'Actualizar' : 'Crear'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            Rutas Registradas ({routes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {routes.map((route) => (
              <div key={route.id} className="grid grid-cols-2 md:grid-cols-7 gap-4 p-4 border rounded-lg items-center">
                <div>
                  <h4 className="font-semibold">{route.origin}</h4>
                  <p className="text-sm text-muted-foreground">Origen</p>
                </div>
                <div>
                  <h4 className="font-semibold">{route.destination}</h4>
                  <p className="text-sm text-muted-foreground">Destino</p>
                </div>
                <div>
                  <p className="font-medium">{route.distance_km} km</p>
                  <p className="text-sm text-muted-foreground">Distancia</p>
                </div>
                <div>
                  <p className="font-medium">{Math.floor(route.duration_minutes / 60)}h {route.duration_minutes % 60}min</p>
                  <p className="text-sm text-muted-foreground">Duración</p>
                </div>
                <div>
                  <p className="font-medium">${route.base_fare}</p>
                  <p className="text-sm text-muted-foreground">Tarifa</p>
                </div>
                <div>
                  <p className="font-medium">Cada {route.frequency_minutes}min</p>
                  <p className="text-sm text-muted-foreground">Frecuencia</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={route.status === 'active' ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {route.status === 'active' ? 'Activa' : 
                     route.status === 'inactive' ? 'Inactiva' : 'Mantenimiento'}
                  </Badge>
                  {canManageRoutes && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(route)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(route.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {routes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No hay rutas registradas.
                {canManageRoutes && <br />}
                {canManageRoutes && 'Crea una nueva ruta para comenzar.'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GestorRutas;