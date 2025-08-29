import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Settings, Building, Gift, Upload, Users, Database,
  Bell, Shield, Palette, Target, Star
} from "lucide-react";

interface CooperativeConfig {
  id: string;
  name: string;
  ruc: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
  max_daily_tickets: number;
  reward_points_per_ticket: number;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  image_url?: string;
  is_active: boolean;
}

const ConfiguracionCooperativa = () => {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [config, setConfig] = useState<CooperativeConfig | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [rewardImageFile, setRewardImageFile] = useState<File | null>(null);
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    ruc: '',
    address: '',
    phone: '',
    email: '',
    max_daily_tickets: 5,
    reward_points_per_ticket: 10
  });

  const [newReward, setNewReward] = useState({
    name: '',
    description: '',
    points_required: 0
  });

  const isAdmin = userRole?.role === 'administrator';

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    try {
      const { data: configData, error: configError } = await supabase
        .from('cooperative_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (configError) throw configError;

      // Load rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .order('points_required');

      if (rewardsError) throw rewardsError;

      if (configData) {
        setConfig(configData);
        setFormData({
          name: configData.name,
          ruc: configData.ruc || '',
          address: configData.address || '',
          phone: configData.phone || '',
          email: configData.email || '',
          max_daily_tickets: configData.max_daily_tickets,
          reward_points_per_ticket: configData.reward_points_per_ticket
        });
      }

      setRewards(rewardsData || []);
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

  const uploadLogo = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo.${fileExt}`;
      const filePath = `cooperative-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cooperative-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cooperative-logos')
        .getPublicUrl(filePath);

      return publicUrl;
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

  const handleSubmitConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let updateData: any = { ...formData };
      
      if (logoFile) {
        const logoUrl = await uploadLogo(logoFile);
        updateData.logo_url = logoUrl;
      }
      if (config?.id) {
        const { error } = await supabase
          .from('cooperative_config')
          .update(updateData)
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('cooperative_config')
          .insert([updateData])
          .select()
          .single();
        if (error) throw error;
        if (data) setConfig(data as any);
      }

      toast({
        title: "Éxito",
        description: "Configuración actualizada correctamente",
      });

      setLogoFile(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive",
      });
    }
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingReward) {
        let updateData: any = { ...newReward };
        
        if (rewardImageFile) {
          const imageUrl = await uploadRewardImage(rewardImageFile, editingReward.id);
          updateData.image_url = imageUrl;
        }

        const { error } = await supabase
          .from('rewards')
          .update(updateData)
          .eq('id', editingReward.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Recompensa actualizada correctamente",
        });
      } else {
        const { data, error } = await supabase
          .from('rewards')
          .insert([newReward])
          .select()
          .single();

        if (error) throw error;

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
      }

      setIsRewardDialogOpen(false);
      setEditingReward(null);
      setRewardImageFile(null);
      setNewReward({ name: '', description: '', points_required: 0 });
      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo guardar la recompensa",
        variant: "destructive",
      });
    }
  };

  const toggleRewardStatus = async (rewardId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('rewards')
        .update({ is_active: !isActive })
        .eq('id', rewardId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Recompensa ${!isActive ? 'activada' : 'desactivada'}`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la recompensa",
        variant: "destructive",
      });
    }
  };

  const handleEditReward = (reward: Reward) => {
    setEditingReward(reward);
    setNewReward({
      name: reward.name,
      description: reward.description || '',
      points_required: reward.points_required
    });
    setIsRewardDialogOpen(true);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acceso Restringido</h2>
          <p className="text-muted-foreground">Solo los administradores pueden acceder a esta sección.</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight">Configuración de la Cooperativa</h1>
          <p className="text-muted-foreground">
            Administra la información y configuración general de la cooperativa
          </p>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Información General</TabsTrigger>
          <TabsTrigger value="rewards">Sistema de Recompensas</TabsTrigger>
          <TabsTrigger value="settings">Configuraciones</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Información de la Cooperativa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitConfig} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Nombre de la Cooperativa</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ruc">RUC</Label>
                    <Input
                      id="ruc"
                      value={formData.ruc}
                      onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="address">Dirección</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="logo">Logo de la Cooperativa</Label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="w-full p-2 border rounded"
                    />
                    {config?.logo_url && (
                      <div className="flex items-center space-x-2">
                        <img 
                          src={config.logo_url} 
                          alt="Logo actual" 
                          className="w-16 h-16 object-cover rounded"
                        />
                        <span className="text-sm text-muted-foreground">Logo actual</span>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Gestión de Recompensas</h3>
              <p className="text-muted-foreground text-sm">Administra las recompensas disponibles para los usuarios</p>
            </div>
            <Dialog open={isRewardDialogOpen} onOpenChange={setIsRewardDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingReward(null);
                  setNewReward({ name: '', description: '', points_required: 0 });
                }}>
                  <Gift className="mr-2 h-4 w-4" />
                  Nueva Recompensa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingReward ? 'Editar Recompensa' : 'Nueva Recompensa'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitReward} className="space-y-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={newReward.name}
                      onChange={(e) => setNewReward({...newReward, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Textarea
                      value={newReward.description}
                      onChange={(e) => setNewReward({...newReward, description: e.target.value})}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Puntos Requeridos</Label>
                    <Input
                      type="number"
                      value={newReward.points_required}
                      onChange={(e) => setNewReward({...newReward, points_required: parseInt(e.target.value)})}
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <Label>Imagen</Label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setRewardImageFile(e.target.files?.[0] || null)}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    {editingReward ? 'Actualizar' : 'Crear'} Recompensa
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rewards.map((reward) => (
              <Card key={reward.id}>
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
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {reward.points_required} pts
                      </Badge>
                      <Switch
                        checked={reward.is_active}
                        onCheckedChange={() => toggleRewardStatus(reward.id, reward.is_active)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">{reward.description}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditReward(reward)}
                      className="flex-1"
                    >
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Configuración de Recompensas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitConfig} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="max_tickets">Máximo de Boletos Diarios</Label>
                    <Input
                      id="max_tickets"
                      type="number"
                      value={formData.max_daily_tickets}
                      onChange={(e) => setFormData({...formData, max_daily_tickets: parseInt(e.target.value)})}
                      min="1"
                      max="20"
                    />
                    <p className="text-sm text-muted-foreground">Cantidad máxima de boletos que un usuario puede subir por día</p>
                  </div>
                  <div>
                    <Label htmlFor="points_per_ticket">Puntos por Boleto</Label>
                    <Input
                      id="points_per_ticket"
                      type="number"
                      value={formData.reward_points_per_ticket}
                      onChange={(e) => setFormData({...formData, reward_points_per_ticket: parseInt(e.target.value)})}
                      min="1"
                      max="100"
                    />
                    <p className="text-sm text-muted-foreground">Cantidad de puntos que gana un usuario por cada boleto validado</p>
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  <Settings className="mr-2 h-4 w-4" />
                  Actualizar Configuración
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estadísticas del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Recompensas Activas</span>
                    <Badge>{rewards.filter(r => r.is_active).length}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Total de Recompensas</span>
                    <Badge variant="outline">{rewards.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Configuración Actual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Límite Diario</span>
                    <Badge>{formData.max_daily_tickets} boletos</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Puntos por Boleto</span>
                    <Badge variant="outline">{formData.reward_points_per_ticket} pts</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ConfiguracionCooperativa;