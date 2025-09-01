import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Clock, CheckCircle, XCircle } from "lucide-react";

interface UserRole {
  role: 'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client';
  scheduleValid?: boolean;
  nextAvailableTime?: string;
}

interface RoleSelectorProps {
  userEmail: string;
  onRoleSelected: (role: string) => void;
  onCancel: () => void;
}

const ROLE_LABELS: Record<'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client', string> = {
  'administrator': 'Administrador',
  'manager': 'Gerente', 
  'president': 'Presidente',
  'partner': 'Socio',
  'driver': 'Conductor',
  'official': 'Oficial',
  'employee': 'Empleado',
  'client': 'Cliente'
};

const RoleSelector: React.FC<RoleSelectorProps> = ({ userEmail, onRoleSelected, onCancel }) => {
  const { toast } = useToast();
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);

  useEffect(() => {
    loadUserRoles();
  }, [userEmail]);

  const loadUserRoles = async () => {
    try {
      // Get user ID from auth with email - using client auth instead of admin
      const { data: { user: currentUser }, error: currentUserError } = await supabase.auth.getUser();
      if (currentUserError) throw currentUserError;

      // Since we can't use admin.listUsers in client code, we'll need to work with the authenticated user
      // For now, let's get roles for the current authenticated user (this logic may need adjustment)
      let userId = currentUser?.id;

      if (!userId) {
        toast({
          title: "Error",
          description: "Usuario no encontrado",
          variant: "destructive",
        });
        onCancel();
        return;
      }

      // Get user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        toast({
          title: "Error",
          description: "No se encontraron roles para este usuario",
          variant: "destructive",
        });
        onCancel();
        return;
      }

      // Validate schedules for each role
      const rolesWithSchedules = await Promise.all(
        rolesData.map(async (roleData) => {
          const scheduleValidation = await validateRoleSchedule(userId!, roleData.role);
          return {
            role: roleData.role,
            ...scheduleValidation
          };
        })
      );

      setUserRoles(rolesWithSchedules);
    } catch (error: any) {
      console.error('Error loading user roles:', error);
      toast({
        title: "Error",
        description: "Error al cargar los roles del usuario",
        variant: "destructive",
      });
      onCancel();
    } finally {
      setLoading(false);
    }
  };

  const validateRoleSchedule = async (userId: string, role: 'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client') => {
    try {
      // Skip validation for all roles except employee
      if (role !== 'employee') {
        return { scheduleValid: true };
      }

      const { data, error } = await supabase.rpc('validate_employee_schedule_access', {
        p_user_id: userId,
        p_role: role
      });

      if (error) throw error;

      if (!data) {
        // Get next available time for this role
        const nextTime = await getNextAvailableTime(userId, role);
        return { 
          scheduleValid: false,
          nextAvailableTime: nextTime
        };
      }

      return { scheduleValid: true };
    } catch (error: any) {
      console.error('Error validating schedule:', error);
      return { scheduleValid: false };
    }
  };

  const getNextAvailableTime = async (userId: string, role: 'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client') => {
    try {
      const { data, error } = await supabase
        .from('employee_schedules')
        .select('day_of_week, start_time')
        .eq('employee_id', userId)
        .eq('role', role)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const schedule = data[0];
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return `${dayNames[schedule.day_of_week]} ${schedule.start_time}`;
      }

      return 'No definido';
    } catch (error) {
      return 'Error al consultar';
    }
  };

  const handleRoleSelect = async (role: string) => {
    const roleData = userRoles.find(r => r.role === role);
    
    if (!roleData?.scheduleValid && role !== 'administrator') {
      toast({
        title: "Acceso Denegado",
        description: `No puede acceder con el rol ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]} fuera del horario establecido`,
        variant: "destructive",
      });
      return;
    }

    setValidating(role);
    try {
      // Here you would typically store the selected role in localStorage or context
      localStorage.setItem('selectedRole', role);
      onRoleSelected(role);
      
      toast({
        title: "Éxito",
        description: `Accediendo como ${ROLE_LABELS[role as keyof typeof ROLE_LABELS]}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Error al seleccionar el rol",
        variant: "destructive",
      });
    } finally {
      setValidating(null);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Seleccionar Rol de Acceso
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Seleccione con qué rol desea acceder al sistema
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {userRoles.map((roleData) => {
          const isValid = roleData.scheduleValid || roleData.role === 'administrator';
          const isValidating = validating === roleData.role;
          
          return (
            <div
              key={roleData.role}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                isValid 
                  ? 'border-primary hover:bg-primary/5' 
                  : 'border-muted bg-muted/30 cursor-not-allowed'
              }`}
              onClick={() => isValid && !isValidating && handleRoleSelect(roleData.role)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {ROLE_LABELS[roleData.role]}
                    </p>
                    {!isValid && roleData.nextAvailableTime && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Disponible: {roleData.nextAvailableTime}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Badge variant={isValid ? 'default' : 'secondary'}>
                  {isValid ? 'Disponible' : 'Fuera de horario'}
                </Badge>
              </div>
              {isValidating && (
                <div className="mt-2 text-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                </div>
              )}
            </div>
          );
        })}
        
        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancelar
        </Button>
      </CardContent>
    </Card>
  );
};

export default RoleSelector;