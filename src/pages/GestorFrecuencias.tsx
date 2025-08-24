import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Bus, Users, Calendar, ArrowRight } from "lucide-react";

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
  routes?: {
    name: string;
    origin: string;
    destination: string;
  };
  buses?: {
    id: string;
    alias: string;
    plate: string;
  };
}

const GestorFrecuencias = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [frequencies, setFrequencies] = useState<RouteFrequency[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<RouteFrequency | null>(null);
  const [selectedBus, setSelectedBus] = useState<string>('');

  const canManage = userRole && ['administrator', 'manager'].includes(userRole.role);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoute) {
      loadFrequencies(selectedRoute);
    } else {
      setFrequencies([]);
    }
  }, [selectedRoute]);

  const loadData = async () => {
    try {
      // Load routes
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (routesError) throw routesError;

      // Load available buses
      const { data: busesData, error: busesError } = await supabase
        .from('buses')
        .select('*')
        .eq('status', 'en_servicio')
        .order('plate');

      if (busesError) throw busesError;

      setRoutes(routesData || []);
      setBuses(busesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFrequencies = async (routeId: string) => {
    try {
      const { data, error } = await supabase
        .from('route_frequencies')
        .select(`
          *,
          routes!inner(name, origin, destination),
          buses(id, alias, plate)
        `)
        .eq('route_id', routeId)
        .order('frequency_number');

      if (error) throw error;
      setFrequencies(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las frecuencias",
        variant: "destructive",
      });
    }
  };

  const assignBusToFrequency = async () => {
    if (!selectedFrequency || !selectedBus) return;

    try {
      const { error } = await supabase
        .from('route_frequencies')
        .update({ assigned_bus_id: selectedBus })
        .eq('id', selectedFrequency.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Bus asignado a la frecuencia correctamente",
      });

      setIsAssignDialogOpen(false);
      setSelectedFrequency(null);
      setSelectedBus('');
      
      if (selectedRoute) {
        loadFrequencies(selectedRoute);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo asignar el bus",
        variant: "destructive",
      });
    }
  };

  const unassignBusFromFrequency = async (frequencyId: string) => {
    try {
      const { error } = await supabase
        .from('route_frequencies')
        .update({ assigned_bus_id: null })
        .eq('id', frequencyId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Bus desasignado de la frecuencia",
      });

      if (selectedRoute) {
        loadFrequencies(selectedRoute);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo desasignar el bus",
        variant: "destructive",
      });
    }
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Frecuencias</h1>
          <p className="text-muted-foreground">
            Administra las frecuencias y asignación de buses a las rutas
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Ruta</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedRoute} onValueChange={setSelectedRoute}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una ruta para ver sus frecuencias" />
            </SelectTrigger>
            <SelectContent>
              {routes.map(route => (
                <SelectItem key={route.id} value={route.id}>
                  {route.origin} - {route.destination}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedRoute && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Frecuencias de la Ruta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {frequencies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay frecuencias configuradas para esta ruta.
                </div>
              ) : (
                <div className="grid gap-4">
                  {frequencies.map((frequency) => (
                    <div key={frequency.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant={frequency.is_first_turn ? 'default' : frequency.is_last_turn ? 'secondary' : 'outline'}
                          >
                            {frequency.is_first_turn ? 'Primer Turno' : 
                             frequency.is_last_turn ? 'Último Turno' : 
                             `Frecuencia ${frequency.frequency_number}`}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatTime(frequency.departure_time)}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{formatTime(frequency.arrival_time)}</span>
                        </div>

                        {frequency.buses ? (
                          <div className="flex items-center space-x-2">
                            <Bus className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {frequency.buses.alias} ({frequency.buses.plate})
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">Sin asignar</span>
                          </div>
                        )}
                      </div>

                      {canManage && (
                        <div className="flex gap-2">
                          {frequency.buses ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => unassignBusFromFrequency(frequency.id)}
                            >
                              Desasignar
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedFrequency(frequency);
                                setIsAssignDialogOpen(true);
                              }}
                            >
                              Asignar Bus
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Bus a Frecuencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedFrequency && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">
                  Frecuencia: {formatTime(selectedFrequency.departure_time)} - {formatTime(selectedFrequency.arrival_time)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedFrequency.routes?.origin} - {selectedFrequency.routes?.destination}
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Seleccionar Bus</label>
              <Select value={selectedBus} onValueChange={setSelectedBus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un bus disponible" />
                </SelectTrigger>
                <SelectContent>
                  {buses.filter(bus => 
                    !frequencies.some(f => f.assigned_bus_id === bus.id && f.id !== selectedFrequency?.id)
                  ).map(bus => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.alias} - {bus.plate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAssignDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                onClick={assignBusToFrequency}
                disabled={!selectedBus}
              >
                Asignar Bus
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestorFrecuencias;