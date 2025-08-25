import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, User, Settings, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Configuracion = () => {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: profile?.first_name || '',
    middle_name: profile?.middle_name || '',
    surname_1: profile?.surname_1 || '',
    surname_2: profile?.surname_2 || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    id_number: profile?.id_number || ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast.success('Foto de perfil actualizada');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Administra tu información personal y configuración
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  {profile?.first_name?.[0]}{profile?.surname_1?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {uploading ? 'Subiendo...' : 'Cambiar Foto'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG hasta 5MB
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="first_name">Primer Nombre</Label>
                <Input
                  id="first_name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="middle_name">Segundo Nombre</Label>
                <Input
                  id="middle_name"
                  value={profileData.middle_name}
                  onChange={(e) => setProfileData({ ...profileData, middle_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="surname_1">Primer Apellido</Label>
                <Input
                  id="surname_1"
                  value={profileData.surname_1}
                  onChange={(e) => setProfileData({ ...profileData, surname_1: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="surname_2">Segundo Apellido</Label>
                <Input
                  id="surname_2"
                  value={profileData.surname_2}
                  onChange={(e) => setProfileData({ ...profileData, surname_2: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="id_number">Cédula</Label>
                <Input
                  id="id_number"
                  value={profileData.id_number}
                  onChange={(e) => setProfileData({ ...profileData, id_number: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
              />
            </div>

            <Button onClick={handleSaveProfile} className="w-full">
              Guardar Cambios
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuración del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Accede a las diferentes configuraciones del sistema
            </p>
            
            <Link to="/configuracion-cooperativa">
              <Button variant="outline" className="w-full justify-between">
                <span>Configuración de la Cooperativa</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email:</span>
                <span className="text-sm text-muted-foreground">{user?.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Usuario desde:</span>
                <span className="text-sm text-muted-foreground">
                  {new Date(user?.created_at || '').toLocaleDateString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Configuracion;