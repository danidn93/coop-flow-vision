import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { Users, Loader2 } from 'lucide-react';

export function CreateTestUsersButton() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const createTestUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-users');

      if (error) throw error;

      if (data.success) {
        setUsers(data.results.filter((r: any) => r.status === 'success'));
        setShowResults(true);
        toast({
          title: "Usuarios creados",
          description: `${data.summary.created} usuarios creados exitosamente`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron crear los usuarios de prueba",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
          <Button 
            onClick={createTestUsers} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Usuarios de Prueba
          </Button>
        </CardContent>
      </Card>

      {showResults && users.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Credenciales de Usuarios Creados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map((user, index) => (
                <div key={index} className="p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{user.credentials.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Rol: {user.credentials.role}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono">{user.credentials.password}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}