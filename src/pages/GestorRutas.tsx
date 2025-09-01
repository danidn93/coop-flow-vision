import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Route, Plus, Edit, Trash2, Clock, Bus, Upload, Eye } from "lucide-react";

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
  image_url?: string;
  created_at: string;
}

interface Terminal {
  id: string;
  name: string;
  location: string;
  terminal_type: string;
  is_active: boolean;
}

interface RouteFrequency {
  id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  frequency_number: number;
  is_first_turn: boolean;
  is_last_turn: boolean;
  assigned_bus_id?: string;
  status: string;
}

const GestorRutas = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [frequencies, setFrequencies] = useState<RouteFrequency[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [selectedTerminals, setSelectedTerminals] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFrequencyDialogOpen, setIsFrequencyDialogOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
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
    loadBuses();
    loadTerminals();
  }, []);

  const canManageRoutes = userRole && ['administrator', 'manager', 'employee', 'partner'].includes(userRole.role);

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

  const loadBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .eq('status', 'en_servicio');

      if (error) throw error;
      setBuses(data || []);
    } catch (error: any) {
      console.error('Error loading buses:', error);
    }
  };

  const loadTerminals = async () => {
    try {
      const { data, error } = await supabase
        .from('terminals')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setTerminals(data || []);
    } catch (error: any) {
      console.error('Error loading terminals:', error);
    }
  };

  const loadFrequencies = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('route_frequencies')
        .select(`
          *,
          buses!assigned_bus_id(id, alias, plate)
        `)
        .eq('route_id', routeId)
        .order('frequency_number');

      if (error) throw error;
      setFrequencies(data || []);
    } catch (error: any) {
      console.error('Error loading frequencies:', error);
    }
  };

  const uploadRouteImage = async (file: File, routeId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${routeId}.${fileExt}`;
      const filePath = `routes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('routes')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('routes')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      throw error;
    }
  };

  const generateFrequencies = async (routeId: string, frequencyMinutes: number) => {
    try {
      const { error } = await supabase.rpc('generate_route_frequencies', {
        p_route_id: routeId,
        p_frequency_minutes: frequencyMinutes,
        p_start_time: '05:00',
        p_end_time: '22:00'
      });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Frecuencias generadas correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron generar las frecuencias",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingRoute) {
        let updateData: any = { ...formData };
        
        if (imageFile) {
          const imageUrl = await uploadRouteImage(imageFile, editingRoute.id);
          updateData.image_url = imageUrl;
        }

        const { error } = await supabase
          .from('routes')
          .update(updateData)
          .eq('id', editingRoute.id);
        
        if (error) throw error;

        // Update route terminals
        await updateRouteTerminals(editingRoute.id);
        
        toast({
          title: "Éxito",
          description: "Ruta actualizada correctamente",
        });
      } else {
        const { data, error } = await supabase
          .from('routes')
          .insert([formData])
          .select()
          .single();
        
        if (error) throw error;

        // Upload image if provided
        if (imageFile && data) {
          const imageUrl = await uploadRouteImage(imageFile, data.id);
          await supabase
            .from('routes')
            .update({ image_url: imageUrl })
            .eq('id', data.id);
        }

        // Save route terminals
        if (data && selectedTerminals.length > 0) {
          await saveRouteTerminals(data.id);
        }

        // Generate frequencies automatically
        if (data) {
          await generateFrequencies(data.id, formData.frequency_minutes);
        }
        
        toast({
          title: "Éxito",
          description: "Ruta creada correctamente con frecuencias automáticas",
        });
      }
      
      setIsDialogOpen(false);
      setEditingRoute(null);
      setImageFile(null);
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

  const saveRouteTerminals = async (routeId: string) => {
    const terminalData = selectedTerminals.map((terminalId, index) => ({
      route_id: routeId,
      terminal_id: terminalId,
      terminal_order: index + 1
    }));

    const { error } = await supabase
      .from('route_terminals')
      .insert(terminalData);

    if (error) throw error;
  };

  const updateRouteTerminals = async (routeId: string) => {
    // Delete existing terminals for this route
    await supabase
      .from('route_terminals')
      .delete()
      .eq('route_id', routeId);

    // Insert new terminals
    if (selectedTerminals.length > 0) {
      await saveRouteTerminals(routeId);
    }
  };

  const loadRouteTerminals = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('route_terminals')
        .select('terminal_id')
        .eq('route_id', routeId)
        .order('terminal_order');

      if (error) throw error;
      setSelectedTerminals(data?.map(rt => rt.terminal_id) || []);
    } catch (error: any) {
      console.error('Error loading route terminals:', error);
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
    loadRouteTerminals(route.id);
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
    setSelectedTerminals([]);
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

                <div className="space-y-2">
                  <Label htmlFor="terminals">Terminales de la Ruta</Label>
                  <div className="space-y-2 max-h-32 overflow-y-auto border p-2 rounded">
                    {terminals.map((terminal) => (
                      <label key={terminal.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedTerminals.includes(terminal.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTerminals([...selectedTerminals, terminal.id]);
                            } else {
                              setSelectedTerminals(selectedTerminals.filter(id => id !== terminal.id));
                            }
                          }}
                        />
                        <span className="text-sm">{terminal.name} - {terminal.location}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Seleccione los terminales que comprenden esta ruta
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">Imagen de la Ruta</Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="w-full p-2 border rounded"
                  />
                  {editingRoute?.image_url && (
                    <div className="text-sm text-muted-foreground">
                      Imagen actual: {editingRoute.image_url.split('/').pop()}
                    </div>
                  )}
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

      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="routes">Rutas</TabsTrigger>
          <TabsTrigger value="frequencies">Ver Frecuencias</TabsTrigger>
        </TabsList>

        <TabsContent value="routes">
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
                  <div key={route.id} className="grid grid-cols-2 md:grid-cols-8 gap-4 p-4 border rounded-lg items-center">
                    {route.image_url && (
                      <div className="w-16 h-16 rounded overflow-hidden">
                        <img 
                          src={route.image_url} 
                          alt={route.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className={route.image_url ? '' : 'col-span-1'}>
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
                            onClick={() => {
                              setSelectedRoute(route);
                              loadFrequencies(route.id);
                              setIsFrequencyDialogOpen(true);
                            }}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
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
        </TabsContent>

        <TabsContent value="frequencies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Frecuencias por Ruta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4" />
                <p>Selecciona una ruta desde la pestaña "Rutas" para ver sus frecuencias y asignar buses.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Frequency Management Dialog */}
      <Dialog open={isFrequencyDialogOpen} onOpenChange={setIsFrequencyDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Frecuencias - {selectedRoute?.origin} → {selectedRoute?.destination}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4">
              {frequencies.map((frequency) => (
                <div key={frequency.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <Badge variant={frequency.is_first_turn ? 'default' : frequency.is_last_turn ? 'secondary' : 'outline'}>
                      {frequency.is_first_turn ? 'Primer Turno' : 
                       frequency.is_last_turn ? 'Último Turno' : 
                       `Freq. ${frequency.frequency_number}`}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{frequency.departure_time.slice(0, 5)}</span>
                      <span>→</span>
                      <span className="font-medium">{frequency.arrival_time.slice(0, 5)}</span>
                    </div>
                    {frequency.assigned_bus_id ? (
                      <div className="flex items-center space-x-2">
                        <Bus className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Bus asignado</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Sin asignar</span>
                    )}
                  </div>
                </div>
              ))}
              {frequencies.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No hay frecuencias configuradas para esta ruta.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestorRutas;