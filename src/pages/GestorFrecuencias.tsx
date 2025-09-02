import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Bus, Users, ArrowRight, MapPin } from "lucide-react";
import TerminalOperations from '@/components/TerminalOperations';

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
  passengers_count?: number;
  revenue?: number;
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
  terminal_operations?: Array<{
    id: string;
    terminal_name: string;
    passengers_count: number;
    revenue: number;
  }>;
}

const GestorFrecuencias = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [frequencies, setFrequencies] = useState<RouteFrequency[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState<RouteFrequency | null>(null);
  const [expandedFrequency, setExpandedFrequency] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('05:00');
  const [endTime, setEndTime] = useState<string>('22:00');
  const [frequencyMinutes, setFrequencyMinutes] = useState<number>(15);

  const canManage = userRole && ['administrator', 'manager', 'employee'].includes(userRole.role);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedRoute && selectedDate) {
      loadFrequencies(selectedRoute, selectedDate);
    } else {
      setFrequencies([]);
    }
  }, [selectedRoute, selectedDate]);

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
        .in('status', ['disponible', 'en_servicio'])
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

  const loadFrequencies = async (routeId: string, date: string) => {
    try {
      const { data, error } = await supabase
        .from('route_frequencies')
        .select(`
          *,
          routes!inner(name, origin, destination),
          buses(id, alias, plate),
          terminal_operations(
            id,
            terminal_name,
            passengers_count,
            revenue,
            terminal_order
          )
        `)
        .eq('route_id', routeId)
        .eq('frequency_date', date)
        .neq('status', 'cancelled')
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

  const generateFrequencies = async () => {
    if (!selectedRoute || !selectedDate) return;
    try {
      const { error } = await supabase.rpc('generate_route_frequencies', {
        p_route_id: selectedRoute,
        p_frequency_minutes: frequencyMinutes,
        p_start_time: `${startTime}:00`,
        p_end_time: `${endTime}:00`,
        p_date: selectedDate
      });
      if (error) throw error;
      toast({ title: 'Frecuencias generadas', description: 'Se actualizaron las frecuencias de la ruta.' });
      loadFrequencies(selectedRoute, selectedDate);
    } catch (error: any) {
      toast({ title: 'Error', description: 'No se pudieron generar las frecuencias', variant: 'destructive' });
    }
  };

  const completeFrequency = async (frequencyId: string) => {
    try {
      const { error } = await supabase
        .from('route_frequencies')
        .update({ status: 'completed' })
        .eq('id', frequencyId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Frecuencia marcada como completada",
      });

      if (selectedRoute && selectedDate) {
        loadFrequencies(selectedRoute, selectedDate);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo completar la frecuencia",
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
        description: "Bus asignado. Ahora puede agregar datos de pasajeros por terminal.",
      });

      setIsAssignDialogOpen(false);
      // Auto-expand the frequency to show terminal operations
      setExpandedFrequency(selectedFrequency.id);
      setSelectedFrequency(null);
      setSelectedBus('');
      
      if (selectedRoute && selectedDate) {
        loadFrequencies(selectedRoute, selectedDate);
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

      if (selectedRoute && selectedDate) {
        loadFrequencies(selectedRoute, selectedDate);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo desasignar el bus",
        variant: "destructive",
      });
    }
  };

  const cancelFrequency = async (frequencyId: string) => {
    try {
      // Get current frequency and calculate time adjustment
      const currentFreq = frequencies.find(f => f.id === frequencyId);
      if (!currentFreq) return;

      const route = routes.find(r => r.id === currentFreq.route_id);
      const frequencyIntervalMinutes = route?.frequency_minutes || 15;
      const timeToAdd = Math.floor(frequencyIntervalMinutes / 2);

      // Find the previous active frequency
      let previousFreq = null;
      const currentIndex = frequencies.findIndex(f => f.id === frequencyId);
      
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (frequencies[i].status === 'active') {
          previousFreq = frequencies[i];
          break;
        }
      }

      // Cancel current frequency
      const { error: cancelError } = await supabase
        .from('route_frequencies')
        .update({ status: 'cancelled' })
        .eq('id', frequencyId);

      if (cancelError) throw cancelError;

      // If there's a previous active frequency, add half the time
      if (previousFreq) {
        const currentArrival = new Date(`2000-01-01T${previousFreq.arrival_time}`);
        currentArrival.setMinutes(currentArrival.getMinutes() + timeToAdd);
        const newArrivalTime = currentArrival.toTimeString().slice(0, 8);

        const { error: updateError } = await supabase
          .from('route_frequencies')
          .update({ arrival_time: newArrivalTime })
          .eq('id', previousFreq.id);

        if (updateError) throw updateError;

        // Send notifications if previous frequency has assigned bus
        if (previousFreq.assigned_bus_id) {
          const { data: busData } = await supabase
            .from('buses')
            .select('*')
            .eq('id', previousFreq.assigned_bus_id)
            .single();

          if (busData) {
            const message = `Tu tiempo de ruta ha sido extendido ${timeToAdd} minutos debido a la cancelación de una frecuencia.`;
            
            // Notify driver
            if (busData.driver_id) {
              await supabase.rpc('create_notification', {
                p_user_id: busData.driver_id,
                p_title: 'Extensión de Tiempo',
                p_message: message,
                p_type: 'time_extension'
              });
            }

            // Notify official
            if (busData.official_id) {
              await supabase.rpc('create_notification', {
                p_user_id: busData.official_id,
                p_title: 'Extensión de Tiempo',
                p_message: message,
                p_type: 'time_extension'
              });
            }

            // Notify owner
            if (busData.owner_id) {
              await supabase.rpc('create_notification', {
                p_user_id: busData.owner_id,
                p_title: 'Extensión de Tiempo',
                p_message: message,
                p_type: 'time_extension'
              });
            }
          }
        }
      }

      toast({
        title: "Éxito",
        description: "Frecuencia cancelada correctamente",
      });

      if (selectedRoute && selectedDate) {
        loadFrequencies(selectedRoute, selectedDate);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo cancelar la frecuencia",
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
          <CardTitle>Seleccionar Ruta y Fecha</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">Ruta</label>
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
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Fecha</label>
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
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
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Desde</label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hasta</label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cada (min)</label>
                  <Input type="number" min={1} value={frequencyMinutes} onChange={(e) => setFrequencyMinutes(parseInt(e.target.value) || 1)} />
                </div>
              </div>
              {canManage && (
                <div className="flex justify-end">
                  <Button onClick={generateFrequencies}>Generar frecuencias</Button>
                </div>
              )}
              
              {frequencies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay frecuencias configuradas para esta ruta.
                </div>
              ) : (
                <div className="grid gap-4">
                  {frequencies.map((frequency) => (
                    <div key={frequency.id} className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
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
                               {frequency.terminal_operations && frequency.terminal_operations.length > 0 && (
                                 <div className="flex items-center space-x-4 ml-4">
                                   <div className="flex items-center space-x-1">
                                     <Users className="h-3 w-3" />
                                     <span className="text-xs">
                                       {frequency.terminal_operations.reduce((sum, op) => sum + (Number(op.passengers_count) || 0), 0)} pax
                                     </span>
                                   </div>
                                   <div className="flex items-center space-x-1">
                                     <span className="text-xs">$</span>
                                     <span className="text-xs">
                                       {frequency.terminal_operations.reduce((sum, op) => sum + (Number(op.revenue) || 0), 0).toFixed(2)}
                                     </span>
                                   </div>
                                   <div className="flex items-center space-x-1">
                                     <MapPin className="h-3 w-3" />
                                     <span className="text-xs">{frequency.terminal_operations.length} terminales</span>
                                   </div>
                                 </div>
                               )}
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
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => cancelFrequency(frequency.id)}
                            >
                              Cancelar
                            </Button>
                            {frequency.buses ? (
                              frequency.status === 'completed' ? (
                                <Badge variant="default">Completada</Badge>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => unassignBusFromFrequency(frequency.id)}
                                  >
                                    Desasignar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={!frequency.terminal_operations || frequency.terminal_operations.length === 0 ? 'default' : 'outline'}
                                    onClick={() => {
                                      setExpandedFrequency(
                                        expandedFrequency === frequency.id ? null : frequency.id
                                      );
                                    }}
                                    className={!frequency.terminal_operations || frequency.terminal_operations.length === 0 ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                                  >
                                    {expandedFrequency === frequency.id ? 'Ocultar' : 
                                     (!frequency.terminal_operations || frequency.terminal_operations.length === 0) ? 
                                     '+ Agregar Pasajeros' : 'Gestionar'} Terminales
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => completeFrequency(frequency.id)}
                                    disabled={!frequency.terminal_operations || frequency.terminal_operations.length === 0}
                                  >
                                    Completar Ruta
                                  </Button>
                                </>
                              )
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
                      
                      {expandedFrequency === frequency.id && frequency.buses && (
                        <div className="ml-4 border-l-2 border-muted pl-4">
                          <TerminalOperations 
                            frequency={frequency} 
                            onUpdate={() => loadFrequencies(selectedRoute, selectedDate)} 
                          />
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