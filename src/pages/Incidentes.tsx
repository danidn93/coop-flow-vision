import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  AlertTriangle, Plus, Eye, CheckCircle, X, Camera, 
  MapPin, Clock, User, Filter, Search
} from "lucide-react";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RoadIncident {
  id: string;
  reporter_id: string;
  incident_type: string;
  title: string;
  description: string;
  location_description: string;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  affected_routes: string[];
  status: 'activo' | 'resuelto' | 'cerrado';
  photos: string[];
  moderator_id?: string;
  moderated_at?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  reporter_profile?: {
    first_name: string;
    surname_1: string;
  };
  moderator_profile?: {
    first_name: string;
    surname_1: string;
  };
}

interface IncidentForm {
  incident_type: string;
  title: string;
  description: string;
  location_description: string;
  severity: 'baja' | 'media' | 'alta' | 'critica';
  affected_routes: string[];
}

const incidentTypes = {
  'accidente': 'Accidente',
  'cierre_via': 'Cierre de Vía',
  'manifestacion': 'Manifestación',
  'construccion': 'Construcción',
  'multa': 'Multa/Infracción',
  'revision': 'Revisión Policía',
  'otro': 'Otro'
};

const severityColors = {
  'baja': 'bg-green-500',
  'media': 'bg-yellow-500', 
  'alta': 'bg-orange-500',
  'critica': 'bg-red-500'
};

const statusColors = {
  'activo': 'destructive',
  'resuelto': 'default',
  'cerrado': 'secondary'
};

const availableRoutes = [
  'Milagro - Guayaquil',
  'Milagro - Durán', 
  'Milagro - Babahoyo',
  'Milagro - Machala',
  'Guayaquil - Milagro',
  'Durán - Milagro',
  'Babahoyo - Milagro',
  'Machala - Milagro'
];

const Incidentes = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<RoadIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<RoadIncident | null>(null);
  const [filter, setFilter] = useState('activo');
  const [searchTerm, setSearchTerm] = useState('');

  const [newIncident, setNewIncident] = useState<IncidentForm>({
    incident_type: '',
    title: '',
    description: '',
    location_description: '',
    severity: 'media',
    affected_routes: []
  });

  const canCreateIncident = userRole?.role === 'driver' || 
                           userRole?.role === 'official' || 
                           userRole?.role === 'administrator';

  const canModerate = userRole?.role === 'administrator' || 
                     userRole?.role === 'manager' || 
                     userRole?.role === 'president';

  useEffect(() => {
    loadIncidents();
    setupRealtimeSubscription();
  }, []);

  useEffect(() => {
    filterIncidents();
  }, [incidents, filter, searchTerm]);

  const loadIncidents = async () => {
    try {
      const { data, error } = await supabase
        .from('road_incidents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncidents(data?.map(incident => ({
        ...incident,
        severity: incident.severity as 'baja' | 'media' | 'alta' | 'critica',
        status: incident.status as 'activo' | 'resuelto' | 'cerrado'
      })) || []);
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

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('road-incidents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'road_incidents'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setIncidents(prev => [payload.new as RoadIncident, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setIncidents(prev => prev.map(incident => 
              incident.id === payload.new.id ? payload.new as RoadIncident : incident
            ));
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const filterIncidents = () => {
    let filtered = incidents;

    if (filter !== 'todos') {
      filtered = filtered.filter(incident => incident.status === filter);
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(incident =>
        incident.title.toLowerCase().includes(search) ||
        incident.location_description.toLowerCase().includes(search) ||
        incident.description.toLowerCase().includes(search) ||
        incident.affected_routes.some(route => route.toLowerCase().includes(search))
      );
    }

    setFilteredIncidents(filtered);
  };

  const createIncident = async () => {
    if (!canCreateIncident || !user) return;

    try {
      const { data, error } = await supabase
        .from('road_incidents')
        .insert({
          ...newIncident,
          reporter_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit log
      await supabase.from('incident_audit_log').insert({
        incident_id: data.id,
        user_id: user.id,
        action: 'created',
        notes: 'Incidente creado'
      });

      toast({
        title: "Éxito",
        description: "Incidente reportado correctamente",
      });

      setShowCreateDialog(false);
      setNewIncident({
        incident_type: '',
        title: '',
        description: '',
        location_description: '',
        severity: 'media',
        affected_routes: []
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo crear el incidente",
        variant: "destructive",
      });
    }
  };

  const updateIncidentStatus = async (incidentId: string, newStatus: 'resuelto' | 'cerrado') => {
    if (!canModerate || !user) return;

    try {
      const updateData: any = { 
        status: newStatus,
        moderator_id: user.id,
        moderated_at: new Date().toISOString()
      };

      if (newStatus === 'resuelto') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('road_incidents')
        .update(updateData)
        .eq('id', incidentId);

      if (error) throw error;

      // Create audit log
      await supabase.from('incident_audit_log').insert({
        incident_id: incidentId,
        user_id: user.id,
        action: newStatus === 'resuelto' ? 'resolved' : 'closed',
        notes: `Incidente marcado como ${newStatus}`
      });

      toast({
        title: "Éxito",
        description: `Incidente marcado como ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el incidente",
        variant: "destructive",
      });
    }
  };

  const getSeverityText = (severity: string) => {
    const severityText = {
      'baja': 'Baja',
      'media': 'Media',
      'alta': 'Alta',
      'critica': 'Crítica'
    };
    return severityText[severity as keyof typeof severityText] || severity;
  };

  const getStatusText = (status: string) => {
    const statusText = {
      'activo': 'Activo',
      'resuelto': 'Resuelto', 
      'cerrado': 'Cerrado'
    };
    return statusText[status as keyof typeof statusText] || status;
  };

  const handleRouteChange = (route: string, checked: boolean) => {
    if (checked) {
      setNewIncident(prev => ({
        ...prev,
        affected_routes: [...prev.affected_routes, route]
      }));
    } else {
      setNewIncident(prev => ({
        ...prev,
        affected_routes: prev.affected_routes.filter(r => r !== route)
      }));
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
          <h1 className="text-3xl font-bold tracking-tight">Incidentes de Ruta</h1>
          <p className="text-muted-foreground">
            Reportes y seguimiento de incidentes en las rutas de transporte
          </p>
        </div>
        {canCreateIncident && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Reportar Incidente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Incidente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo de Incidente</Label>
                    <Select value={newIncident.incident_type} onValueChange={(value) => 
                      setNewIncident(prev => ({ ...prev, incident_type: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(incidentTypes).map(([key, value]) => (
                          <SelectItem key={key} value={key}>{value}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Severidad</Label>
                    <Select value={newIncident.severity} onValueChange={(value: any) => 
                      setNewIncident(prev => ({ ...prev, severity: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baja">Baja</SelectItem>
                        <SelectItem value="media">Media</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="critica">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Título del Incidente</Label>
                  <Input
                    value={newIncident.title}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Breve descripción del incidente"
                  />
                </div>

                <div>
                  <Label>Ubicación</Label>
                  <Input
                    value={newIncident.location_description}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, location_description: e.target.value }))}
                    placeholder="Describe la ubicación del incidente"
                  />
                </div>

                <div>
                  <Label>Descripción Detallada</Label>
                  <Textarea
                    value={newIncident.description}
                    onChange={(e) => setNewIncident(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe el incidente en detalle..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Rutas Afectadas</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableRoutes.map(route => (
                      <label key={route} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newIncident.affected_routes.includes(route)}
                          onChange={(e) => handleRouteChange(route, e.target.checked)}
                        />
                        <span className="text-sm">{route}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={createIncident} 
                  disabled={!newIncident.title || !newIncident.description || !newIncident.location_description}
                  className="w-full"
                >
                  Reportar Incidente
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={filter === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('todos')}
              >
                Todos
              </Button>
              <Button
                variant={filter === 'activo' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFilter('activo')}
              >
                Activos
              </Button>
              <Button
                variant={filter === 'resuelto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('resuelto')}
              >
                Resueltos
              </Button>
              <Button
                variant={filter === 'cerrado' ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFilter('cerrado')}
              >
                Cerrados
              </Button>
            </div>
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar incidentes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      <div className="grid gap-4">
        {filteredIncidents.map((incident) => (
          <Card key={incident.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{incident.title}</h3>
                    <Badge variant={statusColors[incident.status] as any}>
                      {getStatusText(incident.status)}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${severityColors[incident.severity]}`} />
                      <span className="text-xs text-muted-foreground">
                        {getSeverityText(incident.severity)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {incident.reporter_profile?.first_name} {incident.reporter_profile?.surname_1}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {incident.location_description}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(incident.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Tipo:</span> {incidentTypes[incident.incident_type as keyof typeof incidentTypes]}
                  </div>
                  {incident.affected_routes.length > 0 && (
                    <div className="text-sm">
                      <span className="font-medium">Rutas afectadas:</span> {incident.affected_routes.join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canModerate && incident.status === 'activo' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateIncidentStatus(incident.id, 'resuelto')}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateIncidentStatus(incident.id, 'cerrado')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{incident.description}</p>
              {incident.photos.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <Camera className="h-4 w-4" />
                  <span className="text-xs text-muted-foreground">
                    {incident.photos.length} foto(s) adjunta(s)
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {filteredIncidents.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay incidentes</h3>
              <p className="text-muted-foreground">
                {filter === 'todos' 
                  ? 'No se han reportado incidentes'
                  : `No hay incidentes con estado "${getStatusText(filter)}"`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <Dialog open={!!selectedIncident} onOpenChange={() => setSelectedIncident(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {selectedIncident.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estado</Label>
                  <Badge variant={statusColors[selectedIncident.status] as any}>
                    {getStatusText(selectedIncident.status)}
                  </Badge>
                </div>
                <div>
                  <Label>Severidad</Label>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${severityColors[selectedIncident.severity]}`} />
                    {getSeverityText(selectedIncident.severity)}
                  </div>
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <p className="mt-1 text-sm">{selectedIncident.description}</p>
              </div>
              <div>
                <Label>Ubicación</Label>
                <p className="mt-1 text-sm">{selectedIncident.location_description}</p>
              </div>
              {selectedIncident.affected_routes.length > 0 && (
                <div>
                  <Label>Rutas Afectadas</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedIncident.affected_routes.map(route => (
                      <Badge key={route} variant="outline">{route}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Reportado por</Label>
                  <p>{selectedIncident.reporter_profile?.first_name} {selectedIncident.reporter_profile?.surname_1}</p>
                </div>
                <div>
                  <Label>Fecha de reporte</Label>
                  <p>{format(new Date(selectedIncident.created_at), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                </div>
              </div>
              {selectedIncident.moderator_profile && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label>Moderado por</Label>
                    <p>{selectedIncident.moderator_profile.first_name} {selectedIncident.moderator_profile.surname_1}</p>
                  </div>
                  <div>
                    <Label>Fecha de moderación</Label>
                    <p>{selectedIncident.moderated_at ? format(new Date(selectedIncident.moderated_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '-'}</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Incidentes;