import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import RoleSelector from '@/components/RoleSelector';

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname1, setSurname1] = useState('');
  const [surname2, setSurname2] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          navigate('/');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Proceed with normal login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id);

        if (rolesError) throw rolesError;

        // If user is administrator, skip role selection
        const hasAdminRole = rolesData?.some(r => r.role === 'administrator');
        if (hasAdminRole) {
          localStorage.setItem('selectedRole', 'administrator');
          toast({
            title: "¡Bienvenido!",
            description: "Has iniciado sesión como Administrador",
          });
          navigate('/');
          return;
        }

        // If user has employee role and valid schedule, auto-select employee role
        const hasEmployeeRole = rolesData?.some(r => r.role === 'employee');
        if (hasEmployeeRole) {
          try {
            const { data: scheduleValid, error: scheduleError } = await supabase.rpc('validate_employee_schedule_access', {
              p_user_id: data.user.id,
              p_role: 'employee'
            });

            if (!scheduleError && scheduleValid) {
              localStorage.setItem('selectedRole', 'employee');
              toast({
                title: "¡Bienvenido!",
                description: "Has iniciado sesión como Empleado",
              });
              navigate('/');
              return;
            }
          } catch (error) {
            console.error('Error validating employee schedule:', error);
          }
        }

        // If user has multiple non-admin roles, show role selector
        if (rolesData && rolesData.length > 1) {
          setShowRoleSelector(true);
          setLoading(false);
          return;
        }

        // Store the single role if available
        if (rolesData && rolesData.length === 1) {
          localStorage.setItem('selectedRole', rolesData[0].role);
        }

        toast({
          title: "¡Bienvenido!",
          description: "Has iniciado sesión correctamente",
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: "Error de autenticación",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelected = async (role: string) => {
    localStorage.setItem('selectedRole', role);
    toast({
      title: "¡Bienvenido!",
      description: `Has iniciado sesión como ${role}`,
    });
    navigate('/');
  };

  const handleRoleSelectorCancel = () => {
    setShowRoleSelector(false);
    setEmail('');
    setPassword('');
    // Sign out the user since they cancelled role selection
    supabase.auth.signOut();
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            middle_name: middleName,
            surname_1: surname1,
            surname_2: surname2,
            id_number: idNumber,
            phone,
            address
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Registro exitoso",
          description: "Revisa tu correo para confirmar tu cuenta",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error de registro",
        description: error.message || "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (showRoleSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-4">
        <RoleSelector
          userEmail={email}
          onRoleSelected={handleRoleSelected}
          onCancel={handleRoleSelectorCancel}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Cooperativa Mariscal Sucre</CardTitle>
            <p className="text-center text-muted-foreground">
              Sistema de Gestión Integral
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="signup">Registro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Correo Electrónico</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="tu@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contraseña</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Primer Nombre</label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Segundo Nombre</label>
                      <Input
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Primer Apellido</label>
                      <Input
                        value={surname1}
                        onChange={(e) => setSurname1(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Segundo Apellido</label>
                      <Input
                        value={surname2}
                        onChange={(e) => setSurname2(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número de Cédula</label>
                    <Input
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      required
                      placeholder="1234567890"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Correo Electrónico</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="tu@email.com"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Teléfono</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      placeholder="0987654321"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Dirección</label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      placeholder="Ciudad, sector, calle principal"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contraseña</label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Registrando...' : 'Registrarse'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;