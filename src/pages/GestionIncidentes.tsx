import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Eye, CheckCircle, Clock, MapPin, User } from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Incident {
  id: string;
  title: string;
  description: string;
  incident_type: string;
  severity: string;
  status: string;
  location_description: string;
  photos: string[];
  affected_routes: string[];
  created_at: string;
  resolved_at?: string;
  reporter_id: string;
  moderator_id?: string;
  moderated_at?: string;
  profiles?: {
    first_name: string;
    surname_1: string;
  } | null;
}

const GestionIncidentes = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadIncidents();
  }, [filterStatus]);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('road_incidents')
        .select(`
          *
        `)
        .order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Get reporter profiles separately
      const incidentsWithProfiles = await Promise.all(
        (data || []).map(async (incident) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, surname_1')
            .eq('user_id', incident.reporter_id)
            .single();
            
          return {
            ...incident,
            profiles: profileData
          };
        })
      );
      
      setIncidents(incidentsWithProfiles as Incident[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los incidentes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateIncidentStatus = async () => {
    if (!selectedIncident || !newStatus) return;

    try {
      const updates: any = {
        status: newStatus,
        moderator_id: userRole?.user_id,
        moderated_at: new Date().toISOString(),
      };

      if (newStatus === 'resuelto') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('road_incidents')
        .update(updates)
        .eq('id', selectedIncident.id);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('incident_audit_log')
        .insert({
          incident_id: selectedIncident.id,
          user_id: userRole?.user_id,
          action: 'status_change',
          changes: { old_status: selectedIncident.status, new_status: newStatus },
          notes: notes || null,
        });

      toast({
        title: "Éxito",
        description: "Estado del incidente actualizado correctamente",
      });

      setIsDetailDialogOpen(false);
      setSelectedIncident(null);
      setNewStatus('');
      setNotes('');
      loadIncidents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el incidente",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baja': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'activo': return 'destructive';
      case 'en_revision': return 'default';
      case 'resuelto': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'activo': return <AlertTriangle className="h-4 w-4" />;
      case 'en_revision': return <Clock className="h-4 w-4" />;
      case 'resuelto': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Incidentes</h1>
          <p className="text-muted-foreground">
            Revisar y gestionar incidentes reportados por los usuarios
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="en_revision">En Revisión</SelectItem>
                <SelectItem value="resuelto">Resueltos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {incidents.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No hay incidentes para mostrar</p>
            </CardContent>
          </Card>
        ) : (
          incidents.map((incident) => (
            <Card key={incident.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{incident.title}</h3>
                      <Badge variant={getSeverityColor(incident.severity)}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge variant={getStatusColor(incident.status)} className="flex items-center gap-1">
                        {getStatusIcon(incident.status)}
                        {incident.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    
                    <p className="text-muted-foreground line-clamp-2">{incident.description}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{incident.location_description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>
                          {incident.profiles?.first_name} {incident.profiles?.surname_1}
                        </span>
                      </div>
                      <span>
                        {format(new Date(incident.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                      </span>
                    </div>

                    {incident.affected_routes.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {incident.affected_routes.map((route, index) => (
                          <Badge key={index} variant="outline">
                            {route}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedIncident(incident);
                      setIsDetailDialogOpen(true);
                      setNewStatus(incident.status);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalles
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalles del Incidente</DialogTitle>
          </DialogHeader>
          
          {selectedIncident && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedIncident.title}</h3>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={getSeverityColor(selectedIncident.severity)}>
                      {selectedIncident.severity.toUpperCase()}
                    </Badge>
                    <Badge variant={getStatusColor(selectedIncident.status)} className="flex items-center gap-1">
                      {getStatusIcon(selectedIncident.status)}
                      {selectedIncident.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Descripción</h4>
                  <p className="text-muted-foreground">{selectedIncident.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Tipo</h4>
                    <p className="text-muted-foreground">{selectedIncident.incident_type}</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Ubicación</h4>
                    <p className="text-muted-foreground">{selectedIncident.location_description}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Reportado por</h4>
                  <p className="text-muted-foreground">
                    {selectedIncident.profiles?.first_name} {selectedIncident.profiles?.surname_1}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Fecha de reporte</h4>
                  <p className="text-muted-foreground">
                    {format(new Date(selectedIncident.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </p>
                </div>

                {selectedIncident.photos && selectedIncident.photos.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Fotos</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedIncident.photos.map((photo, index) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="rounded-lg border object-cover h-32 w-full"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Actualizar Estado</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Nuevo Estado</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="activo">Activo</SelectItem>
                        <SelectItem value="en_revision">En Revisión</SelectItem>
                        <SelectItem value="resuelto">Resuelto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notas (opcional)</label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Agrega notas sobre la resolución..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDetailDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={updateIncidentStatus}
                      disabled={!newStatus || newStatus === selectedIncident.status}
                    >
                      Actualizar Estado
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestionIncidentes;