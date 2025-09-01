import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Gift, Star, Bell, TrendingUp } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UserStats {
  totalPoints: number;
  rewardsCount: number;
  availableRewards: Array<{
    id: string;
    name: string;
    points_required: number;
  }>;
}

export function ClientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalPoints: 0,
    rewardsCount: 0,
    availableRewards: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadClientStats();
    }
  }, [user]);

  const loadClientStats = async () => {
    try {
      // Get user points
      const { data: userPoints } = await supabase
        .from('user_points')
        .select('total_points')
        .eq('user_id', user?.id)
        .maybeSingle();

      // Get redeemed rewards count
      const { count: redeemedCount } = await supabase
        .from('reward_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id);

      // Get available rewards that user can afford
      const { data: availableRewards } = await supabase
        .from('rewards')
        .select('id, name, points_required')
        .eq('is_active', true)
        .lte('points_required', userPoints?.total_points || 0)
        .order('points_required', { ascending: true });

      setStats({
        totalPoints: userPoints?.total_points || 0,
        rewardsCount: redeemedCount || 0,
        availableRewards: availableRewards || []
      });
    } catch (error) {
      console.error('Error loading client stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
                <div className="h-4 w-4 bg-muted rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-32"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert for available rewards */}
      {stats.availableRewards.length > 0 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50">
          <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            ¡Tienes {stats.availableRewards.length} recompensa(s) disponible(s) con tus puntos actuales!
            {stats.availableRewards.slice(0, 2).map(reward => (
              <Badge key={reward.id} variant="secondary" className="ml-2">
                {reward.name} ({reward.points_required} pts)
              </Badge>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Puntos Acumulados
            </CardTitle>
            <Star className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalPoints.toLocaleString()}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Sube tickets para ganar más puntos
            </p>
            <div className="flex items-center text-xs text-blue-600 dark:text-blue-400 mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              Activo
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Recompensas Obtenidas
            </CardTitle>
            <Gift className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
              {stats.rewardsCount}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              Total de recompensas canjeadas
            </p>
            <div className="flex items-center text-xs text-emerald-600 dark:text-emerald-400 mt-2">
              <TrendingUp className="h-3 w-3 mr-1" />
              Historial completo
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Recompensas Disponibles
            </CardTitle>
            <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {stats.availableRewards.length}
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Que puedes obtener ahora
            </p>
            <div className="flex items-center text-xs text-purple-600 dark:text-purple-400 mt-2">
              <Gift className="h-3 w-3 mr-1" />
              ¡Ve a recompensas!
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Como cliente, tienes acceso a:
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Recompensas</Badge>
              <Badge variant="outline">Chat Soporte</Badge>
              <Badge variant="outline">Reportar Incidentes</Badge>
            </div>
          </CardContent>
        </Card>

        {stats.availableRewards.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Próximas Recompensas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.availableRewards.slice(0, 3).map(reward => (
                  <div key={reward.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{reward.name}</span>
                    <Badge variant="secondary">{reward.points_required} pts</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}