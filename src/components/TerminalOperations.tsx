import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { MapPin, Users, DollarSign, Plus, Trash2 } from "lucide-react";

interface TerminalOperation {
  id: string;
  terminal_name: string;
  terminal_order: number;
  passengers_count: number;
  revenue: number;
  recorded_by: string;
  recorded_at: string;
  created_at: string;
  terminal_id?: string;
  terminals?: {
    name: string;
    location: string;
  };
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
}

interface TerminalOperationsProps {
  frequency: RouteFrequency;
  onUpdate: () => void;
}

const TerminalOperations: React.FC<TerminalOperationsProps> = ({ frequency, onUpdate }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [operations, setOperations] = useState<TerminalOperation[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [userAssignedTerminals, setUserAssignedTerminals] = useState<Terminal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [terminalName, setTerminalName] = useState('');
  const [passengersCount, setPassengersCount] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (frequency.id) {
      loadData();
    }
  }, [frequency.id]);

  const loadData = async () => {
    await Promise.all([
      loadTerminalOperations(),
      loadTerminals(),
      loadUserAssignedTerminals()
    ]);
  };

  const loadTerminalOperations = async () => {
    try {
      const { data, error } = await supabase
        .from('terminal_operations')
        .select(`
          *,
          terminals(name, location)
        `)
        .eq('frequency_id', frequency.id)
        .order('terminal_order', { ascending: true });

      if (error) throw error;
      setOperations(data || []);
    } catch (error: any) {
      console.error('Error loading terminal operations:', error);
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

  const loadUserAssignedTerminals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('terminal_assignments')
        .select(`
          terminal_id,
          terminals(*)
        `)
        .eq('employee_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      
      const assignedTerminals = data?.map(assignment => assignment.terminals).filter(Boolean) || [];
      setUserAssignedTerminals(assignedTerminals);
    } catch (error: any) {
      console.error('Error loading user assigned terminals:', error);
    }
  };

  const addTerminalOperation = async () => {
    if ((!selectedTerminalId && !terminalName.trim()) || !user) return;
    
    setLoading(true);
    try {
      const nextOrder = Math.max(...operations.map(op => op.terminal_order), 0) + 1;
      
      const insertData = {
        frequency_id: frequency.id,
        terminal_name: selectedTerminalId ? 
          terminals.find(t => t.id === selectedTerminalId)?.name || terminalName.trim() : 
          terminalName.trim(),
        terminal_order: nextOrder,
        passengers_count: passengersCount,
        revenue: revenue,
        recorded_by: user.id,
        ...(selectedTerminalId && { terminal_id: selectedTerminalId })
      };

      const { data, error } = await supabase
        .from('terminal_operations')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabase.rpc('create_audit_log', {
        p_action: 'CREATE',
        p_table_name: 'terminal_operations',
        p_record_id: data.id,
        p_new_values: insertData,
        p_metadata: {
          frequency_id: frequency.id,
          route_id: frequency.route_id
        }
      });

      toast({
        title: "Éxito",
        description: "Operación de terminal registrada correctamente",
      });

      setIsDialogOpen(false);
      setSelectedTerminalId('');
      setTerminalName('');
      setPassengersCount(0);
      setRevenue(0);
      
      await loadTerminalOperations();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo registrar la operación de terminal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteOperation = async (operationId: string) => {
    if (!confirm('¿Está seguro de eliminar esta operación de terminal?')) return;

    try {
      const { error } = await supabase
        .from('terminal_operations')
        .delete()
        .eq('id', operationId);

      if (error) throw error;

      // Log audit trail
      await supabase.rpc('create_audit_log', {
        p_action: 'DELETE',
        p_table_name: 'terminal_operations',
        p_record_id: operationId,
        p_metadata: {
          frequency_id: frequency.id,
          route_id: frequency.route_id
        }
      });

      toast({
        title: "Éxito",
        description: "Operación de terminal eliminada",
      });

      await loadTerminalOperations();
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la operación",
        variant: "destructive",
      });
    }
  };

  const totalPassengers = operations.reduce((sum, op) => sum + op.passengers_count, 0);
  const totalRevenue = operations.reduce((sum, op) => sum + op.revenue, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Operaciones por Terminal
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              disabled={frequency.status === 'completed'}
            >
              <Plus className="h-4 w-4 mr-1" />
              Agregar Terminal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No hay operaciones registradas para esta frecuencia
            </div>
          ) : (
            <div className="space-y-3">
              {operations.map((operation, index) => (
                <div key={operation.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline">
                      Terminal {operation.terminal_order}
                    </Badge>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {operation.terminals?.name || operation.terminal_name}
                      </span>
                      {operation.terminals?.location && (
                        <span className="text-xs text-muted-foreground">
                          {operation.terminals.location}
                        </span>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{operation.passengers_count} pasajeros</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span>${operation.revenue.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {frequency.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteOperation(operation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {operations.length > 1 && (
                <div className="flex items-center justify-between p-3 border-2 border-primary rounded-lg bg-primary/5">
                  <div className="flex items-center space-x-4">
                    <Badge variant="default">
                      Total Ruta
                    </Badge>
                    <div className="flex items-center gap-4 font-medium">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{totalPassengers} pasajeros</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>${totalRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Operación de Terminal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">
                Frecuencia: {new Date(`2000-01-01T${frequency.departure_time}`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - {new Date(`2000-01-01T${frequency.arrival_time}`).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {frequency.routes?.origin} - {frequency.routes?.destination}
              </p>
              {frequency.buses && (
                <p className="text-sm text-muted-foreground">
                  Bus: {frequency.buses.alias} ({frequency.buses.plate})
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Terminal</label>
              {userAssignedTerminals.length > 0 ? (
                <Select value={selectedTerminalId} onValueChange={(value) => {
                  setSelectedTerminalId(value);
                  if (value) {
                    setTerminalName('');
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar terminal asignada" />
                  </SelectTrigger>
                  <SelectContent>
                    {userAssignedTerminals.map((terminal) => (
                      <SelectItem key={terminal.id} value={terminal.id}>
                        {terminal.name} - {terminal.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={terminalName}
                  onChange={(e) => setTerminalName(e.target.value)}
                  placeholder="Ej: Terminal Central, Estación Norte, etc."
                />
              )}
            </div>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-2">Cantidad de Pasajeros</label>
                <Input
                  type="number"
                  min="0"
                  value={passengersCount}
                  onChange={(e) => setPassengersCount(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Ingresos ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={revenue}
                  onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={addTerminalOperation}
                disabled={(!selectedTerminalId && !terminalName.trim()) || loading}
              >
                {loading ? 'Guardando...' : 'Agregar Operación'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TerminalOperations;