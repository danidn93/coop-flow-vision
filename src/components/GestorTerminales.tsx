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
import { MapPin, Plus, Users, Building2, Trash2 } from "lucide-react";

interface Terminal {
  id: string;
  name: string;
  location: string;
  terminal_type: string;
  is_active: boolean;
  created_at: string;
}

interface TerminalAssignment {
  id: string;
  terminal_id: string;
  employee_id: string;
  assigned_at: string;
  is_active: boolean;
  terminals: Terminal;
  profiles: {
    first_name: string;
    surname_1: string;
  };
}

interface Profile {
  user_id: string;
  first_name: string;
  surname_1: string;
}

const GestorTerminales: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [assignments, setAssignments] = useState<TerminalAssignment[]>([]);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Terminal creation dialog
  const [isTerminalDialogOpen, setIsTerminalDialogOpen] = useState(false);
  const [terminalName, setTerminalName] = useState('');
  const [terminalLocation, setTerminalLocation] = useState('');
  const [terminalType, setTerminalType] = useState<string>('terminal');

  // Assignment dialog
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadTerminals(),
      loadAssignments(),
      loadEmployees()
    ]);
  };

  const loadTerminals = async () => {
    try {
      const { data, error } = await supabase
        .from('terminals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTerminals(data || []);
    } catch (error: any) {
      console.error('Error loading terminals:', error);
    }
  };

  const loadAssignments = async () => {
    try {
      // Load assignments and then get profile data separately
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('terminal_assignments')
        .select(`
          *,
          terminals(*)
        `)
        .eq('is_active', true)
        .order('assigned_at', { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Get profile data for employees
      if (assignmentsData && assignmentsData.length > 0) {
        const employeeIds = assignmentsData.map(a => a.employee_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname_1')
          .in('user_id', employeeIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const assignmentsWithProfiles = assignmentsData.map(assignment => ({
          ...assignment,
          profiles: profilesData?.find(p => p.user_id === assignment.employee_id) || {
            first_name: 'N/A',
            surname_1: ''
          }
        }));

        setAssignments(assignmentsWithProfiles);
      } else {
        setAssignments([]);
      }
    } catch (error: any) {
      console.error('Error loading assignments:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      // Get employee user IDs first
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'employee');

      if (roleError) throw roleError;

      if (roleData && roleData.length > 0) {
        const employeeIds = roleData.map(r => r.user_id);
        
        // Get profiles for those employees
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname_1')
          .in('user_id', employeeIds);

        if (profilesError) throw profilesError;
        
        setEmployees(profilesData || []);
      } else {
        setEmployees([]);
      }
    } catch (error: any) {
      console.error('Error loading employees:', error);
    }
  };

  const createTerminal = async () => {
    if (!terminalName.trim() || !terminalLocation.trim() || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('terminals')
        .insert({
          name: terminalName.trim(),
          location: terminalLocation.trim(),
          terminal_type: terminalType
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabase.rpc('create_audit_log', {
        p_action: 'CREATE',
        p_table_name: 'terminals',
        p_record_id: data.id,
        p_new_values: {
          name: data.name,
          location: data.location,
          terminal_type: data.terminal_type
        }
      });

      toast({
        title: "Éxito",
        description: "Terminal creada correctamente",
      });

      setIsTerminalDialogOpen(false);
      setTerminalName('');
      setTerminalLocation('');
      setTerminalType('terminal');
      await loadTerminals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo crear la terminal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignEmployee = async () => {
    if (!selectedTerminalId || !selectedEmployeeId || !user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('terminal_assignments')
        .insert({
          terminal_id: selectedTerminalId,
          employee_id: selectedEmployeeId,
          assigned_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit trail
      await supabase.rpc('create_audit_log', {
        p_action: 'ASSIGN',
        p_table_name: 'terminal_assignments',
        p_record_id: data.id,
        p_new_values: {
          terminal_id: selectedTerminalId,
          employee_id: selectedEmployeeId
        }
      });

      toast({
        title: "Éxito",
        description: "Empleado asignado correctamente",
      });

      setIsAssignmentDialogOpen(false);
      setSelectedTerminalId('');
      setSelectedEmployeeId('');
      await loadAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo asignar el empleado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deactivateAssignment = async (assignmentId: string) => {
    if (!confirm('¿Está seguro de desactivar esta asignación?')) return;

    try {
      const { error } = await supabase
        .from('terminal_assignments')
        .update({ is_active: false })
        .eq('id', assignmentId);

      if (error) throw error;

      // Log audit trail
      await supabase.rpc('create_audit_log', {
        p_action: 'DEACTIVATE',
        p_table_name: 'terminal_assignments',
        p_record_id: assignmentId
      });

      toast({
        title: "Éxito",
        description: "Asignación desactivada",
      });

      await loadAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo desactivar la asignación",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gestión de Terminales</h2>
        <div className="flex gap-2">
          <Button onClick={() => setIsTerminalDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Terminal
          </Button>
          <Button variant="outline" onClick={() => setIsAssignmentDialogOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Asignar Empleado
          </Button>
        </div>
      </div>

      {/* Terminals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Terminales y Oficinas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {terminals.map((terminal) => (
              <div key={terminal.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{terminal.name}</h3>
                  <Badge variant={terminal.terminal_type === 'terminal' ? 'default' : 'secondary'}>
                    {terminal.terminal_type === 'terminal' ? 'Terminal' : 'Oficina'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {terminal.location}
                </div>
                <div className="text-xs text-muted-foreground">
                  {terminal.is_active ? 'Activa' : 'Inactiva'}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Asignaciones de Empleados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">
                    {assignment.profiles.first_name} {assignment.profiles.surname_1}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {assignment.terminals.name} - {assignment.terminals.location}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Asignado: {new Date(assignment.assigned_at).toLocaleDateString()}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deactivateAssignment(assignment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Terminal Creation Dialog */}
      <Dialog open={isTerminalDialogOpen} onOpenChange={setIsTerminalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nueva Terminal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <Input
                value={terminalName}
                onChange={(e) => setTerminalName(e.target.value)}
                placeholder="Ej: Terminal Central"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Ubicación</label>
              <Input
                value={terminalLocation}
                onChange={(e) => setTerminalLocation(e.target.value)}
                placeholder="Ej: Av. Principal #123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tipo</label>
              <Select value={terminalType} onValueChange={setTerminalType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="terminal">Terminal</SelectItem>
                  <SelectItem value="office">Oficina</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsTerminalDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={createTerminal}
                disabled={!terminalName.trim() || !terminalLocation.trim() || loading}
              >
                {loading ? 'Creando...' : 'Crear Terminal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Employee Assignment Dialog */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Empleado a Terminal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Terminal</label>
              <Select value={selectedTerminalId} onValueChange={setSelectedTerminalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar terminal" />
                </SelectTrigger>
                <SelectContent>
                  {terminals.filter(t => t.is_active).map((terminal) => (
                    <SelectItem key={terminal.id} value={terminal.id}>
                      {terminal.name} - {terminal.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Empleado</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.user_id} value={employee.user_id}>
                      {employee.first_name} {employee.surname_1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAssignmentDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                onClick={assignEmployee}
                disabled={!selectedTerminalId || !selectedEmployeeId || loading}
              >
                {loading ? 'Asignando...' : 'Asignar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestorTerminales;