import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Gift, Plus, Upload, Camera, Star, Trophy, 
  Ticket, Target, Award, Eye
} from "lucide-react";

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  tickets_today: number;
  last_ticket_date: string;
}

interface UserTicket {
  id: string;
  user_id: string;
  route_id: string;
  ticket_number: string;
  points_earned: number;
  validated: boolean;
  created_at: string;
  routes?: {
    name: string;
    origin: string;
    destination: string;
  };
}

const Recompensas = () => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [rewardImageFile, setRewardImageFile] = useState<File | null>(null);
  const [selectedRoute, setSelectedRoute] = useState('');
  
  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    points_required: 0
  });

  const isAdmin = userRole?.role === 'administrator';
  const canUploadTickets = user && ['client', 'driver', 'partner'].includes(userRole?.role || '');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    
    try {
      // Load rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required');

      if (rewardsError) throw rewardsError;

      // Load user points
      const { data: pointsData, error: pointsError } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (pointsError && pointsError.code !== 'PGRST116') {
        throw pointsError;
      }

      // Load user tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('user_tickets')
        .select(`
          *,
          routes(name, origin, destination)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ticketsError) throw ticketsError;

      // Load routes
      const { data: routesData, error: routesError } = await supabase
        .from('routes')
        .select('*')
        .eq('status', 'active')
        .order('name');

      if (routesError) throw routesError;

      setRewards(rewardsData || []);
      setUserPoints(pointsData);
      setUserTickets(ticketsData || []);
      setRoutes(routesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validateTicketNumber = async (ticketNumber: string) => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      // Check if ticket number already exists
      const { data: existingTicket, error } = await supabase
        .from('user_tickets')
        .select('id')
        .eq('ticket_number', ticketNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !existingTicket; // Return true if ticket doesn't exist
    } catch (error: any) {
      throw error;
    }
  };

  const uploadRewardImage = async (file: File, rewardId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${rewardId}.${fileExt}`;
      const filePath = `rewards/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('rewards')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('rewards')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      throw error;
    }
  };

  const handleUploadTicket = async () => {
    if (!user || !ticketNumber || !selectedRoute) return;

    try {
      // Validate ticket number is not empty and has minimum length
      if (ticketNumber.trim().length < 3) {
        toast({
          title: "Error",
          description: "El número de boleto debe tener al menos 3 caracteres",
          variant: "destructive",
        });
        return;
      }

      // Check if ticket number already exists
      const isValid = await validateTicketNumber(ticketNumber.trim());
      if (!isValid) {
        toast({
          title: "Boleto duplicado",
          description: "Este número de boleto ya ha sido registrado",
          variant: "destructive",
        });
        return;
      }

      // Check daily limit
      const today = new Date().toISOString().split('T')[0];
      const { data: config } = await supabase
        .from('cooperative_config')
        .select('max_daily_tickets, reward_points_per_ticket')
        .limit(1)
        .single();

      const maxTickets = config?.max_daily_tickets || 5;
      const pointsPerTicket = config?.reward_points_per_ticket || 10;

      if (userPoints?.last_ticket_date === today && userPoints.tickets_today >= maxTickets) {
        toast({
          title: "Límite alcanzado",
          description: `Solo puedes registrar ${maxTickets} boletos por día`,
          variant: "destructive",
        });
        return;
      }

      // Create ticket record - auto-validate for clients
      const { error: ticketError } = await supabase
        .from('user_tickets')
        .insert({
          user_id: user.id,
          route_id: selectedRoute,
          ticket_number: ticketNumber.trim(),
          points_earned: pointsPerTicket,
          validated: true, // Auto-validate for clients
          validated_at: new Date().toISOString(),
          validated_by: user.id
        });

      if (ticketError) throw ticketError;

      // Update or create user points
      const { error: pointsError } = await supabase
        .from('user_points')
        .upsert({
          user_id: user.id,
          total_points: (userPoints?.total_points || 0) + pointsPerTicket,
          tickets_today: userPoints?.last_ticket_date === today ? (userPoints.tickets_today + 1) : 1,
          last_ticket_date: today
        }, {
          onConflict: 'user_id'
        });

      if (pointsError) throw pointsError;

      toast({
        title: "Éxito",
        description: `Boleto registrado. Has ganado ${pointsPerTicket} puntos!`,
      });

      setIsTicketDialogOpen(false);
      setTicketNumber('');
      setSelectedRoute('');
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo registrar el boleto",
        variant: "destructive",
      });
    }
  };

  const handleCreateReward = async () => {
    if (!isAdmin) return;

    try {
      const { data, error } = await supabase
        .from('rewards')
        .insert([newReward])
        .select()
        .single();

      if (error) throw error;

      // Upload image if provided
      if (rewardImageFile && data) {
        const imageUrl = await uploadRewardImage(rewardImageFile, data.id);
        await supabase
          .from('rewards')
          .update({ image_url: imageUrl })
          .eq('id', data.id);
      }

      toast({
        title: "Éxito",
        description: "Recompensa creada correctamente",
      });

      setIsRewardDialogOpen(false);
      setRewardImageFile(null);
      setNewReward({ name: '', description: '', points_required: 0 });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo crear la recompensa",
        variant: "destructive",
      });
    }
  };

  const redeemReward = async (reward: Reward) => {
    if (!user || !userPoints || userPoints.total_points < reward.points_required) return;

    try {
      // Create redemption record
      const { error: redemptionError } = await supabase
        .from('reward_redemptions')
        .insert({
          user_id: user.id,
          reward_id: reward.id,
          points_used: reward.points_required
        });

      if (redemptionError) throw redemptionError;

      // Update user points
      const { error: pointsError } = await supabase
        .from('user_points')
        .update({
          total_points: userPoints.total_points - reward.points_required
        })
        .eq('user_id', user.id);

      if (pointsError) throw pointsError;

      toast({
        title: "¡Felicitaciones!",
        description: `Has canjeado: ${reward.name}`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo canjear la recompensa",
        variant: "destructive",
      });
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
          <h1 className="text-3xl font-bold tracking-tight">Sistema de Recompensas</h1>
          <p className="text-muted-foreground">
            Acumula puntos registrando boletos y canjea recompensas
          </p>
        </div>
        <div className="flex gap-2">
          {canUploadTickets && (
            <Dialog open={isTicketDialogOpen} onOpenChange={setIsTicketDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Ticket className="mr-2 h-4 w-4" />
                  Registrar Boleto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Boleto</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Seleccionar Ruta</Label>
                    <select
                      className="w-full p-2 border rounded"
                      value={selectedRoute}
                      onChange={(e) => setSelectedRoute(e.target.value)}
                    >
                      <option value="">Selecciona una ruta</option>
                      {routes.map(route => (
                        <option key={route.id} value={route.id}>
                          {route.origin} - {route.destination}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Número del Boleto</Label>
                    <Input
                      type="text"
                      value={ticketNumber}
                      onChange={(e) => setTicketNumber(e.target.value)}
                      placeholder="Ingresa el número del boleto"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Cada boleto debe tener un número único
                    </p>
                  </div>
                  <Button 
                    onClick={handleUploadTicket}
                    disabled={!ticketNumber.trim() || !selectedRoute}
                    className="w-full"
                  >
                    Registrar Boleto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isAdmin && (
            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Recompensa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Crear Nueva Recompensa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={newReward.name}
                      onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                      placeholder="Nombre de la recompensa"
                    />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={newReward.description}
                      onChange={(e) => setNewReward({...newReward, description: e.target.value})}
                      placeholder="Descripción de la recompensa"
                    />
                  </div>
                  <div>
                    <Label>Puntos Requeridos</Label>
                    <Input
                      type="number"
                      value={newReward.points_required}
                      onChange={(e) => setNewReward({...newReward, points_required: parseInt(e.target.value)})}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label>Imagen de la Recompensa</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setRewardImageFile(e.target.files?.[0] || null)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateReward}
                    disabled={!newReward.name || !newReward.points_required}
                    className="w-full"
                  >
                    Crear Recompensa
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="rewards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rewards">Recompensas Disponibles</TabsTrigger>
          <TabsTrigger value="points">Mis Puntos</TabsTrigger>
          {canUploadTickets && <TabsTrigger value="tickets">Mis Boletos</TabsTrigger>}
        </TabsList>

        <TabsContent value="rewards" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => (
              <Card key={reward.id} className="overflow-hidden">
                {reward.image_url && (
                  <div className="aspect-video overflow-hidden">
                    <img 
                      src={reward.image_url} 
                      alt={reward.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{reward.name}</CardTitle>
                    <Badge variant="secondary">
                      {reward.points_required} pts
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{reward.description}</p>
                  <Button
                    onClick={() => redeemReward(reward)}
                    disabled={!userPoints || userPoints.total_points < reward.points_required}
                    className="w-full"
                  >
                    {userPoints && userPoints.total_points >= reward.points_required ? 
                      'Canjear' : 'Puntos Insuficientes'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="points" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Puntos Totales</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userPoints?.total_points || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Boletos Hoy</CardTitle>
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userPoints?.tickets_today || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Límite diario: 5 boletos
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Próximo Objetivo</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rewards.find(r => r.points_required > (userPoints?.total_points || 0))?.points_required || '🏆'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {rewards.find(r => r.points_required > (userPoints?.total_points || 0))?.name || 'Todas las metas alcanzadas'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {canUploadTickets && (
          <TabsContent value="tickets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Boletos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Ticket className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {ticket.routes?.origin} - {ticket.routes?.destination}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Boleto #{ticket.ticket_number}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={ticket.validated ? 'default' : 'secondary'}>
                          {ticket.validated ? 'Validado' : 'Pendiente'}
                        </Badge>
                        <p className="text-sm text-muted-foreground">
                          +{ticket.points_earned} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Recompensas;