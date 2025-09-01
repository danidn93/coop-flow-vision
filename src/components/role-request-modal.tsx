import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Send } from "lucide-react";

interface RoleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoleRequestModal({ isOpen, onClose }: RoleRequestModalProps) {
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableRoles = [
    { value: 'driver', label: 'Conductor', description: 'Conducir vehículos de la cooperativa' },
    { value: 'official', label: 'Oficial', description: 'Supervisar y controlar operaciones en los buses' },
    { value: 'partner', label: 'Socio', description: 'Participar como socio de la cooperativa' },
    { value: 'employee', label: 'Empleado', description: 'Trabajar como empleado' },
    { value: 'manager', label: 'Manager', description: 'Gestionar operaciones' },
    { value: 'administrator', label: 'Administrador', description: 'Acceso completo al sistema' }
  ];

  const currentRoles = userRoles?.map(r => r.role as string) || [];
  const requestableRoles = availableRoles.filter(role => !currentRoles.includes(role.value));

  const handleRoleToggle = (roleValue: string, checked: boolean) => {
    if (checked) {
      setSelectedRoles([...selectedRoles, roleValue]);
    } else {
      setSelectedRoles(selectedRoles.filter(r => r !== roleValue));
    }
  };

  const handleSubmit = async () => {
    if (!user || selectedRoles.length === 0) return;

    setIsSubmitting(true);
    try {
      // Create notification for administrators
      const { error } = await supabase.functions.invoke('create-role-request', {
        body: {
          user_id: user.id,
          requested_roles: selectedRoles,
          justification: justification
        }
      });

      if (error) throw error;

      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud de roles adicionales ha sido enviada a los administradores.",
      });

      // Reset form
      setSelectedRoles([]);
      setJustification('');
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            Solicitar Roles Adicionales
          </DialogTitle>
          <DialogDescription>
            Selecciona los roles adicionales que necesitas y proporciona una justificación.
            Los administradores revisarán tu solicitud.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Tus roles actuales:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {currentRoles.map((role) => (
                <Badge key={role} variant="outline">
                  {availableRoles.find(r => r.value === role)?.label || role}
                </Badge>
              ))}
            </div>
          </div>

          {requestableRoles.length > 0 ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Roles disponibles para solicitar:</Label>
                <div className="space-y-3 max-h-60 overflow-y-auto p-3 border rounded-md">
                  {requestableRoles.map((role) => (
                    <div key={role.value} className="flex items-start space-x-3">
                      <Checkbox
                        id={role.value}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={(checked) => handleRoleToggle(role.value, !!checked)}
                      />
                      <div className="flex-1">
                        <Label 
                          htmlFor={role.value}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {role.label}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {role.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="justification">Justificación *</Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explica por qué necesitas estos roles adicionales..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={selectedRoles.length === 0 || !justification.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Solicitud
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Ya tienes todos los roles disponibles o no hay roles adicionales para solicitar.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}