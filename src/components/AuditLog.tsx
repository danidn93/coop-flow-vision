import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, Filter, Calendar } from "lucide-react";

interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id?: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  created_at: string;
  profiles?: {
    first_name: string;
    surname_1: string;
  };
}

const AuditLog: React.FC = () => {
  const { user } = useAuth();
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');

  useEffect(() => {
    loadAuditLog();
  }, []);

  const loadAuditLog = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load audit log entries first
      const { data: auditData, error: auditError } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) throw auditError;

      // Get unique user IDs and load their profiles
      if (auditData && auditData.length > 0) {
        const userIds = [...new Set(auditData.map(entry => entry.user_id))];
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name, surname_1')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const entriesWithProfiles = auditData.map(entry => ({
          ...entry,
          profiles: profilesData?.find(p => p.user_id === entry.user_id) || {
            first_name: 'N/A',
            surname_1: ''
          }
        }));

        setAuditEntries(entriesWithProfiles);
      } else {
        setAuditEntries([]);
      }
    } catch (error: any) {
      console.error('Error loading audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'update':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'delete':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'assign':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'deactivate':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatTableName = (tableName: string) => {
    const tableNames: { [key: string]: string } = {
      'terminals': 'Terminales',
      'terminal_assignments': 'Asignaciones de Terminal',
      'terminal_operations': 'Operaciones de Terminal',
      'route_frequencies': 'Frecuencias de Ruta',
      'buses': 'Buses',
      'routes': 'Rutas',
    };
    return tableNames[tableName] || tableName;
  };

  const filteredEntries = auditEntries.filter(entry => {
    const matchesSearch = searchTerm === '' || 
      entry.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.profiles && (
        entry.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.profiles.surname_1.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    
    const matchesAction = selectedAction === '' || entry.action === selectedAction;
    const matchesTable = selectedTable === '' || entry.table_name === selectedTable;
    
    return matchesSearch && matchesAction && matchesTable;
  });

  const uniqueActions = [...new Set(auditEntries.map(entry => entry.action))];
  const uniqueTables = [...new Set(auditEntries.map(entry => entry.table_name))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Registro de Auditoría
        </h2>
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
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">Buscar</label>
              <Input
                placeholder="Buscar por acción, tabla o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Acción</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las acciones</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action.charAt(0).toUpperCase() + action.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tabla</label>
              <Select value={selectedTable} onValueChange={setSelectedTable}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las tablas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las tablas</SelectItem>
                  {uniqueTables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {formatTableName(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Entradas de Auditoría</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Cargando...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No se encontraron entradas de auditoría
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getActionColor(entry.action)}>
                        {entry.action.charAt(0).toUpperCase() + entry.action.slice(1)}
                      </Badge>
                      <span className="font-medium">
                        {formatTableName(entry.table_name)}
                      </span>
                      {entry.profiles && (
                        <span className="text-sm text-muted-foreground">
                          por {entry.profiles.first_name} {entry.profiles.surname_1}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(entry.created_at).toLocaleString()}
                    </div>
                  </div>

                  {(entry.new_values || entry.old_values || entry.metadata) && (
                    <div className="grid gap-2 text-sm">
                      {entry.new_values && (
                        <div>
                          <span className="font-medium text-green-600 dark:text-green-400">Nuevos valores:</span>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.new_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {entry.old_values && (
                        <div>
                          <span className="font-medium text-red-600 dark:text-red-400">Valores anteriores:</span>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.old_values, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                        <div>
                          <span className="font-medium text-blue-600 dark:text-blue-400">Metadatos:</span>
                          <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;