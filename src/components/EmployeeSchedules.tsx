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
import { Clock, Plus, Trash2, Calendar, User } from "lucide-react";

interface EmployeeSchedule {
  id: string;
  employee_id: string;
  role: 'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client';
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  profiles?: {
    first_name: string;
    surname_1: string;
    id_number: string;
  };
}

interface Employee {
  user_id: string;
  role: 'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client';
  profiles: {
    first_name: string;
    surname_1: string;
    id_number: string;
  };
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' }
];

const EMPLOYEE_ROLES = [
  { value: 'employee', label: 'Empleado' },
  { value: 'driver', label: 'Conductor' },
  { value: 'official', label: 'Oficial' }
];

const EmployeeSchedules: React.FC = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [schedules, setSchedules] = useState<EmployeeSchedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const canManage = userRole && ['administrator', 'manager', 'president'].includes(userRole.role);

  useEffect(() => {
    if (canManage) {
      loadData();
    }
  }, [canManage]);

  const loadData = async () => {
    await Promise.all([
      loadSchedules(),
      loadEmployees()
    ]);
  };

  const loadSchedules = async () => {
    try {
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('*')
        .order('employee_id')
        .order('day_of_week');

      if (error) throw error;
      
      // Now get profiles separately for each schedule
      const schedulesWithProfiles = await Promise.all(
        (data || []).map(async (schedule) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, surname_1, id_number')
            .eq('user_id', schedule.employee_id)
            .single();
          
          return {
            ...schedule,
            profiles: profileError ? null : profileData
          };
        })
      );
      
      setSchedules(schedulesWithProfiles);
    } catch (error: any) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['employee', 'driver', 'official']);

      if (error) throw error;
      
      // Now get profiles separately for each employee
      const employeesWithProfiles = await Promise.all(
        (data || []).map(async (employee) => {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, surname_1, id_number')
            .eq('user_id', employee.user_id)
            .single();
          
          return {
            ...employee,
            profiles: profileError ? { first_name: '', surname_1: '', id_number: '' } : profileData
          };
        })
      );
      
      setEmployees(employeesWithProfiles);
    } catch (error: any) {
      console.error('Error loading employees:', error);
    }
  };

  const addSchedule = async () => {
    if (!selectedEmployeeId || !selectedRole || selectedDay === null || !startTime || !endTime) {
      toast({
        title: "Error",
        description: "Complete todos los campos",
        variant: "destructive",
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Error",
        description: "La hora de inicio debe ser anterior a la hora de fin",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .insert({
          employee_id: selectedEmployeeId,
          role: selectedRole as 'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client',
          day_of_week: selectedDay,
          start_time: startTime,
          end_time: endTime,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Horario agregado correctamente",
      });

      setIsDialogOpen(false);
      resetForm();
      await loadSchedules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo agregar el horario",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    if (!confirm('¿Está seguro de eliminar este horario?')) return;

    try {
      const { error } = await supabase
        .from('employee_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Horario eliminado correctamente",
      });

      await loadSchedules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el horario",
        variant: "destructive",
      });
    }
  };

  const toggleScheduleStatus = async (scheduleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('employee_schedules')
        .update({ is_active: !currentStatus })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Horario ${!currentStatus ? 'activado' : 'desactivado'} correctamente`,
      });

      await loadSchedules();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el horario",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setSelectedEmployeeId('');
    setSelectedRole('');
    setSelectedDay(null);
    setStartTime('');
    setEndTime('');
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEmployeeName = (employee: Employee) => {
    return `${employee.profiles?.first_name} ${employee.profiles?.surname_1} (${employee.profiles?.id_number})`;
  };

  const getScheduleName = (schedule: EmployeeSchedule) => {
    return `${schedule.profiles?.first_name} ${schedule.profiles?.surname_1} (${schedule.profiles?.id_number})`;
  };

  const groupedSchedules = schedules.reduce((acc, schedule) => {
    const key = `${schedule.employee_id}-${schedule.role}`;
    if (!acc[key]) {
      acc[key] = {
        employee: schedule,
        days: []
      };
    }
    acc[key].days.push(schedule);
    return acc;
  }, {} as Record<string, { employee: EmployeeSchedule; days: EmployeeSchedule[] }>);

  if (!canManage) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            No tiene permisos para gestionar horarios de empleados
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Horarios de Empleados</h1>
          <p className="text-muted-foreground">
            Configure los horarios de trabajo para controlar el acceso por roles
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Horario
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Horario de Empleado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Empleado</label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.user_id} value={employee.user_id}>
                        {getEmployeeName(employee)} - {EMPLOYEE_ROLES.find(r => r.value === employee.role)?.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Rol</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Día de la Semana</label>
                <Select value={selectedDay?.toString()} onValueChange={(value) => setSelectedDay(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar día" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Hora de Inicio</label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Hora de Fin</label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={addSchedule} disabled={loading}>
                  {loading ? 'Guardando...' : 'Agregar Horario'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {Object.entries(groupedSchedules).map(([key, group]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {getScheduleName(group.employee)} - {EMPLOYEE_ROLES.find(r => r.value === group.employee.role)?.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {group.days.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        {DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</span>
                      </div>
                      <Badge variant={schedule.is_active ? 'default' : 'secondary'}>
                        {schedule.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleScheduleStatus(schedule.id, schedule.is_active)}
                      >
                        {schedule.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(groupedSchedules).length === 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">No hay horarios configurados</p>
              <p className="text-sm text-muted-foreground">
                Agregue horarios para controlar el acceso de los empleados por roles
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeSchedules;