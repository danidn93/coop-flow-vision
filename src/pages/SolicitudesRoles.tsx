import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, Clock, User, MessageSquare, Calendar } from "lucide-react";

interface RoleRequest {
  id: string;
  requester_id: string;
  requested_role: string;
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
          requested_role,
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

        // Combine data
        const requestsWithProfiles = requestsData.map(request => {
          const profile = profilesData?.find(p => p.user_id === request.requester_id);
          return {
            ...request,
            requester_profile: profile ? {
              first_name: profile.first_name,
              surname_1: profile.surname_1
            } : undefined
          };
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

  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set([...prev, requestId]));
    
    try {
      const { error } = await supabase.functions.invoke('approve-role-request', {
        body: {
          request_id: requestId,
          action: action,
          notes: notes[requestId] || ''
        }
      });

      if (error) throw error;

      toast({
        title: "Solicitud procesada",
        description: `La solicitud ha sido ${action === 'approve' ? 'aprobada' : 'rechazada'} correctamente.`,
      });

      // Clear notes for this request
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[requestId];
        return newNotes;
      });

      // Reload requests
      await loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `No se pudo ${action === 'approve' ? 'aprobar' : 'rechazar'} la solicitud.`,
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
      case 'approved':
        return <Badge variant="default" className="text-green-600 border-green-600 bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Aprobada</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rechazada</Badge>;
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

  // Separate pending and processed requests
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

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
            {processedRequests.filter(r => r.status === 'approved').length} aprobadas
          </span>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-yellow-600">Solicitudes Pendientes</h2>
          {pendingRequests.map((request) => (
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
                <div>
                  <Label className="text-sm font-medium">Rol solicitado:</Label>
                  <Badge variant="outline" className="ml-2">
                    {getRoleDisplayName(request.requested_role)}
                  </Badge>
                </div>
                
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

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => handleRequestAction(request.id, 'approve')}
                    disabled={processingIds.has(request.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processingIds.has(request.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprobar
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRequestAction(request.id, 'reject')}
                    disabled={processingIds.has(request.id)}
                  >
                    {processingIds.has(request.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Rechazar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  <Label className="text-sm font-medium">Rol solicitado:</Label>
                  <Badge variant="outline" className="ml-2">
                    {getRoleDisplayName(request.requested_role)}
                  </Badge>
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