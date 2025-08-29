import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';

export function DashboardFleet() {
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBuses();
  }, []);

  const loadBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select(`
          *,
          profiles:owner_id(first_name, surname_1),
          driver_profile:driver_id(first_name, surname_1),
          official_profile:official_id(first_name, surname_1)
        `)
        .eq('status', 'en_servicio')
        .limit(4);

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error loading buses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Flota Activa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-muted rounded-lg"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Flota Activa</span>
          <Badge variant="secondary">Cooperativa Mariscal Sucre</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {buses.length === 0 ? (
            <div className="col-span-2 text-center py-8 text-muted-foreground">
              No hay buses en servicio actualmente
            </div>
          ) : (
            buses.map((bus) => (
              <div key={bus.id} className="relative rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 p-4">
                <div className="flex items-center justify-center h-24 bg-white/50 rounded-lg mb-3">
                  {bus.image_url ? (
                    <img 
                      src={bus.image_url} 
                      alt={`Bus ${bus.plate}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-primary">{bus.plate}</span>
                      <span className="text-xs text-muted-foreground">{bus.alias}</span>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold">{bus.alias || bus.plate}</h4>
                  <p className="text-sm text-muted-foreground">
                    {bus.profiles ? `Propietario: ${bus.profiles.first_name} ${bus.profiles.surname_1}` : 'Sin propietario'}
                  </p>
                  {bus.driver_profile && (
                    <p className="text-xs text-muted-foreground">
                      Conductor: {bus.driver_profile.first_name} {bus.driver_profile.surname_1}
                    </p>
                  )}
                  <Badge variant="outline" className="mt-1">En Servicio</Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}