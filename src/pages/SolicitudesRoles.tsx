import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, User, MessageSquare, Calendar } from "lucide-react";

interface RoleRequest {
  id: string;
  requester_id: string;
  requested_roles: string[];
  approved_roles?: string[];
  rejected_roles?: string[];
  justification: string;
  status: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
  requester_profile?: {
    first_name: string;
    surname_1: string;
  };
}

const SolicitudesRoles = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedRoles, setSelectedRoles] = useState<Record<string, { approved: string[], rejected: string[] }>>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      // Get role requests with requester profiles
      const { data: requestsData, error: requestsError } = await supabase
        .from('role_requests')
        .select(`
          id,
          requester_id,
          requested_roles,
          approved_roles,
          rejected_roles,
          justification,
          status,
          created_at,
          reviewed_at,
          reviewed_by,
          notes
        `)
        .order('created_at', { ascending: false });

      if (requestsError) throw requestsError;

      // Get profiles for all requesters
      if (requestsData && requestsData.length > 0) {
        const requesterIds = [...new Set(requestsData.map(r => r.requester_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname_1')
          .in('user_id', requesterIds);

        if (profilesError) throw profilesError;

        // Combine data and ensure proper typing
        const requestsWithProfiles = requestsData.map(request => {
          const profile = profilesData?.find(p => p.user_id === request.requester_id);
          return {
            ...request,
            requested_roles: Array.isArray(request.requested_roles) ? request.requested_roles : [],
            approved_roles: Array.isArray(request.approved_roles) ? request.approved_roles : [],
            rejected_roles: Array.isArray(request.rejected_roles) ? request.rejected_roles : [],
            requester_profile: profile ? {
              first_name: profile.first_name,
              surname_1: profile.surname_1
            } : undefined
          } as RoleRequest;
        });

        setRequests(requestsWithProfiles);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (requestId: string, role: string, type: 'approved' | 'rejected', checked: boolean) => {
    setSelectedRoles(prev => {
      const current = prev[requestId] || { approved: [], rejected: [] };
      
      if (checked) {
        // Add to the selected type, remove from the other
        const otherType = type === 'approved' ? 'rejected' : 'approved';
        return {
          ...prev,
          [requestId]: {
            ...current,
            [type]: [...current[type].filter(r => r !== role), role],
            [otherType]: current[otherType].filter(r => r !== role)
          }
        };
      } else {
        // Remove from the selected type
        return {
          ...prev,
          [requestId]: {
            ...current,
            [type]: current[type].filter(r => r !== role)
          }
        };
      }
    });
  };

  const handleProcessRequest = async (requestId: string) => {
    const selection = selectedRoles[requestId];
    if (!selection || (selection.approved.length === 0 && selection.rejected.length === 0)) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un rol para aprobar o rechazar.",
        variant: "destructive",
      });
      return;
    }

    setProcessingIds(prev => new Set([...prev, requestId]));
    
    try {
      const { error } = await supabase.functions.invoke('approve-role-request', {
        body: {
          request_id: requestId,
          approved_roles: selection.approved,
          rejected_roles: selection.rejected,
          notes: notes[requestId] || ''
        }
      });

      if (error) throw error;

      toast({
        title: "Solicitud procesada",
        description: "Los roles han sido procesados correctamente.",
      });

      // Clear notes and selections for this request
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[requestId];
        return newNotes;
      });

      setSelectedRoles(prev => {
        const newSelection = { ...prev };
        delete newSelection[requestId];
        return newSelection;
      });

      // Reload requests
      await loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo procesar la solicitud.",
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      administrator: 'Administrador',
      president: 'Presidente',
      manager: 'Manager',
      employee: 'Empleado',
      partner: 'Socio',
      driver: 'Conductor',
      official: 'Oficial',
      client: 'Cliente'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'partial':
        return <Badge variant="secondary" className="text-blue-600 border-blue-600"><Clock className="w-3 h-3 mr-1" />Parcial</Badge>;
      case 'processed':
        return <Badge variant="default" className="text-green-600 border-green-600 bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Procesada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPendingRoles = (request: RoleRequest) => {
    const approved = request.approved_roles || [];
    const rejected = request.rejected_roles || [];
    return request.requested_roles.filter(role => !approved.includes(role) && !rejected.includes(role));
  };

  // Separate pending and processed requests
  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'partial');
  const processedRequests = requests.filter(r => r.status === 'processed');

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
          <h1 className="text-3xl font-bold tracking-tight">Solicitudes de Roles</h1>
          <p className="text-muted-foreground">
            Revisa y aprueba las solicitudes de roles adicionales
          </p>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {pendingRequests.length} pendientes
          </span>
          <span className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            {processedRequests.length} procesadas
          </span>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-yellow-600">Solicitudes Pendientes</h2>
          {pendingRequests.map((request) => {
            const pendingRoles = getPendingRoles(request);
            const selection = selectedRoles[request.id] || { approved: [], rejected: [] };
            
            return (
              <Card key={request.id} className="border-yellow-200 bg-yellow-50/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center text-lg">
                      <User className="w-5 h-5 mr-2" />
                      {request.requester_profile ? 
                        `${request.requester_profile.first_name} ${request.requester_profile.surname_1}` : 
                        'Usuario desconocido'
                      }
                    </CardTitle>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4 mr-1" />
                    Solicitado: {formatDate(request.created_at)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Show already processed roles */}
                  {(request.approved_roles?.length > 0 || request.rejected_roles?.length > 0) && (
                    <div>
                      <Label className="text-sm font-medium">Roles ya procesados:</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {request.approved_roles?.map((role) => (
                          <Badge key={role} variant="default" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            {getRoleDisplayName(role)}
                          </Badge>
                        ))}
                        {request.rejected_roles?.map((role) => (
                          <Badge key={role} variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                            <XCircle className="w-3 h-3 mr-1" />
                            {getRoleDisplayName(role)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Show pending roles for approval */}
                  {pendingRoles.length > 0 && (
                    <div>
                      <Label className="text-sm font-medium">Roles pendientes de revisión:</Label>
                      <div className="space-y-3 mt-2">
                        {pendingRoles.map((role) => (
                          <div key={role} className="flex items-center justify-between p-3 border rounded-md bg-background">
                            <div className="flex items-center space-x-3">
                              <Badge variant="outline">{getRoleDisplayName(role)}</Badge>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`approve-${request.id}-${role}`}
                                  checked={selection.approved.includes(role)}
                                  onCheckedChange={(checked) => handleRoleToggle(request.id, role, 'approved', !!checked)}
                                />
                                <Label htmlFor={`approve-${request.id}-${role}`} className="text-sm text-green-600">
                                  Aprobar
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id={`reject-${request.id}-${role}`}
                                  checked={selection.rejected.includes(role)}
                                  onCheckedChange={(checked) => handleRoleToggle(request.id, role, 'rejected', !!checked)}
                                />
                                <Label htmlFor={`reject-${request.id}-${role}`} className="text-sm text-red-600">
                                  Rechazar
                                </Label>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label className="text-sm font-medium">Justificación:</Label>
                    <p className="mt-1 text-sm text-muted-foreground bg-background p-2 rounded border">
                      {request.justification}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor={`notes-${request.id}`} className="text-sm font-medium">
                      Notas adicionales (opcional):
                    </Label>
                    <Textarea
                      id={`notes-${request.id}`}
                      value={notes[request.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [request.id]: e.target.value }))}
                      placeholder="Agrega comentarios o notas sobre esta decisión..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>

                  {pendingRoles.length > 0 && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => handleProcessRequest(request.id)}
                        disabled={processingIds.has(request.id) || (selection.approved.length === 0 && selection.rejected.length === 0)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {processingIds.has(request.id) ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Procesando...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Procesar Seleccionados
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Solicitudes Procesadas</h2>
          {processedRequests.map((request) => (
            <Card key={request.id} className="opacity-75">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center text-lg">
                    <User className="w-5 h-5 mr-2" />
                    {request.requester_profile ? 
                      `${request.requester_profile.first_name} ${request.requester_profile.surname_1}` : 
                      'Usuario desconocido'
                    }
                  </CardTitle>
                  {getStatusBadge(request.status)}
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4 mr-1" />
                  Procesado: {request.reviewed_at ? formatDate(request.reviewed_at) : 'Fecha no disponible'}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Roles procesados:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {request.approved_roles?.map((role) => (
                      <Badge key={role} variant="default" className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {getRoleDisplayName(role)}
                      </Badge>
                    ))}
                    {request.rejected_roles?.map((role) => (
                      <Badge key={role} variant="destructive" className="bg-red-100 text-red-800 border-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        {getRoleDisplayName(role)}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Justificación:</Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {request.justification}
                  </p>
                </div>

                {request.notes && (
                  <div>
                    <Label className="text-sm font-medium flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Notas del administrador:
                    </Label>
                    <p className="mt-1 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                      {request.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
            <p className="text-muted-foreground">
              Aún no se han recibido solicitudes de roles adicionales.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SolicitudesRoles;