import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';

export function CreateTestUsersButton() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ total: number; created: number; errors: number; existing: number } | null>(null);
  const { toast } = useToast();

  const createTestUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-users');
      if (error) throw error;

      setResults(data.results || []);
      setSummary(data.summary || null);

      const created = data.summary?.created || 0;
      const updated = (data.results || []).filter((r: any) => r.status === 'updated').length;

      toast({
        title: created + updated > 0 ? 'Usuarios listos' : 'Sin cambios',
        description: created + updated > 0
          ? `${created} creados, ${updated} actualizados`
          : 'Todos los usuarios ya existían',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron crear/actualizar los usuarios de prueba",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const iconByStatus = (status: string) => {
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'updated') return <RefreshCw className="h-4 w-4 text-blue-600" />;
    if (status === 'error') return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <Users className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuarios de Prueba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={createTestUsers} disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear/Actualizar Usuarios de Prueba
          </Button>
          {summary && (
            <div className="mt-3 text-sm text-muted-foreground">
              Total: {summary.total} · Creados: {summary.created} · Actualizados: {(results || []).filter(r => r.status==='updated').length} · Errores: {summary.errors}
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    {iconByStatus(r.status)}
                    <div>
                      <p className="font-medium">{r.email}</p>
                      <p className="text-xs text-muted-foreground">{r.message}</p>
                    </div>
                  </div>
                  {r.credentials && (
                    <div className="text-right">
                      <p className="text-xs">Rol: {r.credentials.role}</p>
                      <p className="text-xs font-mono">{r.credentials.password}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
