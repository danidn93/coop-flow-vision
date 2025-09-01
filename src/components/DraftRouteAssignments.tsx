import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Bus, Route, Plus, Trash2, Clock, FileText, CheckCircle } from "lucide-react";

interface DraftAssignment {
  id: string;
  bus_id: string;
  route_id: string;
  assignment_date: string;
  first_frequency_time: string;
  assigned_by: string;
  notes?: string;
  is_confirmed: boolean;
  buses?: {
    alias: string;
    plate: string;
    status: string;
  };
  routes?: {
    name: string;
    origin: string;
    destination: string;
  };
  profiles?: {
    first_name: string;
    surname_1: string;
  };
}

interface Bus {
  id: string;
  alias: string;
  plate: string;
  status: string;
}

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

const DraftRouteAssignments: React.FC = () => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [assignments, setAssignments] = useState<DraftAssignment[]>([]);
  const [availableBuses, setAvailableBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Tomorrow
  );
  const [selectedBusId, setSelectedBusId] = useState<string>('');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [firstFrequencyTime, setFirstFrequencyTime] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const canManage = userRole && ['administrator', 'manager', 'employee'].includes(userRole.role);
  const canConfirm = userRole && ['administrator', 'manager'].includes(userRole.role);

  useEffect(() => {
    if (canManage) {
      loadData();
    }
  }, [canManage, selectedDate]);

  const loadData = async () => {
    await Promise.all([
      loadDraftAssignments(),
      loadAvailableBuses(),
      loadRoutes()
    ]);
  };

  const loadDraftAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('draft_route_assignments')
        .select(`
          *,
          buses(alias, plate, status),
          routes(name, origin, destination)
        `)
        .eq('assignment_date', selectedDate)
        .order('first_frequency_time');

      if (error) throw error;
      
      // Get profiles for assigned_by users
      const assignmentsWithProfiles = await Promise.all(
        (data || []).map(async (assignment) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, surname_1')
            .eq('user_id', assignment.assigned_by)
            .single();
          
          return {
            ...assignment,
            profiles: profileError ? null : profileData
          };
        })
      );
      
      setAssignments(assignmentsWithProfiles);
    } catch (error: any) {
      console.error('Error loading draft assignments:', error);
    }
  };

  const loadAvailableBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .in('status', ['disponible', 'en_servicio'])
        .order('alias');

      if (error) throw error;

      // Filter out buses already assigned for the selected date
      const { data: assignedBuses, error: assignedError } = await supabase
        .from('draft_route_assignments')
        .select('bus_id')
        .eq('assignment_date', selectedDate);

      if (assignedError) throw assignedError;

      const assignedBusIds = new Set(assignedBuses?.map(a => a.bus_id) || []);
      const available = (data || []).filter(bus => !assignedBusIds.has(bus.id));
      
      setAvailableBuses(available);
    } catch (error: any) {
      console.error('Error loading available buses:', error);
    }
  };

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error: any) {
      console.error('Error loading routes:', error);
    }
  };

  const createAssignment = async () => {
    if (!selectedBusId || !selectedRouteId || !firstFrequencyTime || !user) {
      toast({
        title: "Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('draft_route_assignments')
        .insert({
          bus_id: selectedBusId,
          route_id: selectedRouteId,
          assignment_date: selectedDate,
          first_frequency_time: firstFrequencyTime,
          assigned_by: user.id,
          notes: notes.trim() || null
        });

      if (error) throw error;

      // Log audit trail
      await supabase.rpc('create_audit_log', {
        p_action: 'CREATE',
        p_table_name: 'draft_route_assignments',
        p_new_values: {
          bus_id: selectedBusId,
          route_id: selectedRouteId,
          assignment_date: selectedDate,
          first_frequency_time: firstFrequencyTime,
          notes: notes.trim() || null
        }
      });

      toast({
        title: "Éxito",
        description: "Asignación borrador creada correctamente",
      });

      setIsDialogOpen(false);
      resetForm();
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la asignación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('draft_route_assignments')
        .update({ is_confirmed: true })
        .eq('id', assignmentId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Asignación confirmada correctamente",
      });

      await loadDraftAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo confirmar la asignación",
        variant: "destructive",
      });
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('¿Está seguro de eliminar esta asignación?')) return;

    try {
      const { error } = await supabase
        .from('draft_route_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      // Log audit trail
      await supabase.rpc('create_audit_log', {
        p_action: 'DELETE',
        p_table_name: 'draft_route_assignments',
        p_record_id: assignmentId
      });

      toast({
        title: "Éxito",
        description: "Asignación eliminada correctamente",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la asignación",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedBusId('');
    setSelectedRouteId('');
    setFirstFrequencyTime('');
    setNotes('');
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No tiene permisos para gestionar asignaciones de rutas
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asignaciones Borrador de Rutas</h1>
          <p className="text-muted-foreground">
            Planifique las asignaciones de buses para el siguiente día laboral
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Asignación
          </Button>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Asignación Borrador</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fecha de Asignación</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Bus Disponible</label>
                <Select value={selectedBusId} onValueChange={setSelectedBusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar bus" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBuses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.id}>
                        {bus.alias} - {bus.plate} ({bus.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ruta</label>
                <Select value={selectedRouteId} onValueChange={setSelectedRouteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ruta" />
                  </SelectTrigger>
                  <SelectContent>
                    {routes.map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name} ({route.origin} - {route.destination})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Primera Frecuencia</label>
                <Input
                  type="time"
                  value={firstFrequencyTime}
                  onChange={(e) => setFirstFrequencyTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Notas (Opcional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observaciones sobre la asignación..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createAssignment} disabled={loading}>
                  {loading ? 'Creando...' : 'Crear Asignación'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Asignaciones para {formatDate(selectedDate)}
            </CardTitle>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8">
              <Bus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay asignaciones para esta fecha</p>
              <p className="text-sm text-muted-foreground">
                Cree una nueva asignación para planificar las rutas
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="grid gap-2 flex-1">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4" />
                          <span className="font-medium">
                            {assignment.buses?.alias} - {assignment.buses?.plate}
                          </span>
                          <Badge variant="outline">{assignment.buses?.status}</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Route className="h-4 w-4" />
                          <span className="font-medium">{assignment.routes?.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Primera frecuencia: {formatTime(assignment.first_frequency_time)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          <span>
                            Por: {assignment.profiles?.first_name} {assignment.profiles?.surname_1}
                          </span>
                        </div>
                      </div>

                      {assignment.notes && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Notas:</strong> {assignment.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {assignment.is_confirmed ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Confirmada
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Borrador</Badge>
                      )}

                      {!assignment.is_confirmed && canConfirm && (
                        <Button
                          size="sm"
                          onClick={() => confirmAssignment(assignment.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteAssignment(assignment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DraftRouteAssignments;