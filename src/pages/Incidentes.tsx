import { useState, useEffect, useRef } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { 
  AlertTriangle, Plus, Eye, CheckCircle, X, Camera, 
  MapPin, Clock, User, Filter, Search, Upload, Trash2
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
  photos: string[];
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

// This will be loaded from Supabase
let availableRoutes: any[] = [];

const Incidentes = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<RoadIncident[]>([]);
  const [filteredIncidents, setFilteredIncidents] = useState<RoadIncident[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
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
    affected_routes: [],
    photos: []
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canCreateIncident = user && (
                           userRole?.role === 'client' ||
                           userRole?.role === 'driver' || 
                           userRole?.role === 'official' || 
                           userRole?.role === 'administrator'
                         );

  const canModerate = userRole?.role === 'administrator' || 
                     userRole?.role === 'manager' || 
                     userRole?.role === 'president';

  useEffect(() => {
    loadIncidents();
    loadRoutes();
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

  const loadRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, name, origin, destination')
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setRoutes(data || []);
      availableRoutes = data || [];
    } catch (error: any) {
      console.error('Error loading routes:', error);
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
        affected_routes: [],
        photos: []
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

  const handleRouteChange = (routeId: string, checked: boolean) => {
    setNewIncident(prev => ({
      ...prev,
      affected_routes: checked 
        ? [...prev.affected_routes, routeId]
        : prev.affected_routes.filter(id => id !== routeId)
    }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('incident-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('incident-photos')
          .getPublicUrl(fileName);

        return data.publicUrl;
      });

      const photoUrls = await Promise.all(uploadPromises);
      
      setNewIncident(prev => ({
        ...prev,
        photos: [...prev.photos, ...photoUrls]
      }));

      toast({
        title: "Éxito",
        description: `${photoUrls.length} foto(s) subida(s) correctamente`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron subir las fotos",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photoUrl: string) => {
    setNewIncident(prev => ({
      ...prev,
      photos: prev.photos.filter(url => url !== photoUrl)
    }));
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
                    {routes.map(route => (
                      <label key={route.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={newIncident.affected_routes.includes(route.id)}
                          onChange={(e) => handleRouteChange(route.id, e.target.checked)}
                        />
                        <span className="text-sm">{route.origin} - {route.destination}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Fotos del Incidente (Opcional)</Label>
                  <div className="space-y-3 mt-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploading ? 'Subiendo...' : 'Agregar Fotos'}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Máximo 5 fotos
                      </span>
                    </div>
                    
                    {newIncident.photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {newIncident.photos.map((photo, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={photo}
                              alt={`Foto ${index + 1}`}
                              className="w-full h-20 object-cover rounded border"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => removePhoto(photo)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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