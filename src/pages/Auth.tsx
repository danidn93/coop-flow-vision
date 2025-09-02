import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import RoleSelector from '@/components/RoleSelector';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { user, signIn, signUp, loading, userRoles, switchRole } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [emailStep, setEmailStep] = useState(true);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    first_name: '',
    middle_name: '',
    surname_1: '',
    surname_2: '',
    id_number: '',
    phone: '',
    address: ''
  });

  // Show role selector if user is authenticated but hasn't selected a role
  if (user && !loading && userRoles.length > 1 && showRoleSelector) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 py-12 px-4">
        <RoleSelector
          userEmail={user.email || ''}
          onRoleSelected={(role) => {
            switchRole(role);
            setShowRoleSelector(false);
            // Allow time for auth context to update
            setTimeout(() => {
              window.location.href = '/';
            }, 500);
          }}
          onCancel={() => {
            setShowRoleSelector(false);
            window.location.href = '/';
          }}
        />
      </div>
    );
  }

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) return;
    
    setIsLoading(true);
    try {
      // Check if user exists and get their roles
      const { data: roles, error } = await supabase.rpc('get_user_roles_by_email', {
        user_email: loginEmail
      });

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo verificar el usuario",
          variant: "destructive",
        });
        return;
      }

      if (!roles || roles.length === 0) {
        toast({
          title: "Usuario no encontrado",
          description: "No se encontraron roles para este email",
          variant: "destructive",
        });
        return;
      }

      setAvailableRoles(roles.map(r => r.role));
      
      if (roles.length === 1) {
        // If only one role, select it automatically and proceed
        setSelectedRole(roles[0].role);
        setEmailStep(false);
      } else {
        // Multiple roles, show selector
        setEmailStep(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al verificar el usuario",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (!error) {
        // Switch to selected role after successful login
        setTimeout(() => {
          switchRole(selectedRole);
          window.location.href = '/';
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { email, password, ...userData } = signupData;
      const { error } = await signUp(email, password, userData);
      
      if (!error) {
        // For new users registering themselves, they only get client role
        // Additional roles must be requested through administrators
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 py-12 px-4">
      <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden lg:flex flex-col items-center justify-center p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
          <div className="w-48 h-48 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            {/* Placeholder for cooperative shield/logo */}
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
              <div className="w-28 h-28 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">CTS</span>
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-primary text-center mb-4">
            Cooperativa de Transporte<br />Mariscal Sucre
          </h1>
          <p className="text-lg text-muted-foreground text-center">
            Sistema de Gestión y Control
          </p>
          <div className="mt-8 w-full h-32 bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-green-500/20"></div>
            <div className="relative z-10 text-center">
              <span className="text-muted-foreground text-sm font-medium">Flota Cooperativa Mariscal Sucre</span>
              <p className="text-xs text-muted-foreground mt-1">Servicio de Transporte - Milagro</p>
            </div>
          </div>
        </div>

        {/* Right side - Auth Form */}
        <Card className="w-full max-w-md mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="lg:hidden w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-primary">CTS</span>
            </div>
            <CardTitle className="text-2xl font-bold text-primary lg:hidden">
              Cooperativa Mariscal Sucre
            </CardTitle>
            <CardTitle className="text-2xl font-bold text-primary hidden lg:block">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Accede a tu cuenta del sistema
            </CardDescription>
          </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login" className="text-lg py-3">
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-lg py-3">
                Registrarse
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              {emailStep ? (
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="h-12 text-base"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Continuar
                  </Button>
                </form>
              ) : availableRoles.length > 1 ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">Seleccionar Rol</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tienes múltiples roles. Selecciona con cuál deseas acceder:
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    {availableRoles.map((role) => (
                      <Button
                        key={role}
                        variant={selectedRole === role ? "default" : "outline"}
                        className="w-full h-12 text-left justify-start"
                        onClick={() => setSelectedRole(role)}
                      >
                        {role === 'administrator' && 'Administrador'}
                        {role === 'manager' && 'Gerente'}
                        {role === 'president' && 'Presidente'}
                        {role === 'employee' && 'Empleado'}
                        {role === 'partner' && 'Socio'}
                        {role === 'driver' && 'Conductor'}
                        {role === 'official' && 'Oficial'}
                        {role === 'client' && 'Cliente'}
                      </Button>
                    ))}
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-base">
                        Contraseña
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        className="h-12 text-base"
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-12 text-lg font-semibold"
                      disabled={isLoading || !selectedRole}
                    >
                      {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Iniciar Sesión
                    </Button>
                    
                    <Button 
                      type="button"
                      variant="ghost" 
                      className="w-full"
                      onClick={() => {
                        setEmailStep(true);
                        setAvailableRoles([]);
                        setSelectedRole('');
                      }}
                    >
                      ← Cambiar email
                    </Button>
                  </form>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email_display" className="text-base">
                      Correo Electrónico
                    </Label>
                    <Input
                      id="email_display"
                      type="email"
                      value={loginEmail}
                      disabled
                      className="h-12 text-base"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base">
                      Contraseña
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      className="h-12 text-base"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Iniciar Sesión
                  </Button>
                  
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="w-full"
                    onClick={() => {
                      setEmailStep(true);
                      setAvailableRoles([]);
                      setSelectedRole('');
                    }}
                  >
                    ← Cambiar email
                  </Button>
                </form>
              )}
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name" className="text-sm">
                      Primer Nombre *
                    </Label>
                    <Input
                      id="first_name"
                      value={signupData.first_name}
                      onChange={(e) => setSignupData({...signupData, first_name: e.target.value})}
                      required
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="middle_name" className="text-sm">
                      Segundo Nombre
                    </Label>
                    <Input
                      id="middle_name"
                      value={signupData.middle_name}
                      onChange={(e) => setSignupData({...signupData, middle_name: e.target.value})}
                      className="h-10"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surname_1" className="text-sm">
                      Primer Apellido *
                    </Label>
                    <Input
                      id="surname_1"
                      value={signupData.surname_1}
                      onChange={(e) => setSignupData({...signupData, surname_1: e.target.value})}
                      required
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="surname_2" className="text-sm">
                      Segundo Apellido
                    </Label>
                    <Input
                      id="surname_2"
                      value={signupData.surname_2}
                      onChange={(e) => setSignupData({...signupData, surname_2: e.target.value})}
                      className="h-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="id_number" className="text-sm">
                    Número de Cédula *
                  </Label>
                  <Input
                    id="id_number"
                    value={signupData.id_number}
                    onChange={(e) => setSignupData({...signupData, id_number: e.target.value})}
                    required
                    className="h-10"
                    placeholder="1234567890"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup_email" className="text-sm">
                    Correo Electrónico *
                  </Label>
                  <Input
                    id="signup_email"
                    type="email"
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                    required
                    className="h-10"
                    placeholder="tu@email.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">
                    Teléfono *
                  </Label>
                  <Input
                    id="phone"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                    required
                    className="h-10"
                    placeholder="0987654321"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm">
                    Dirección *
                  </Label>
                  <Input
                    id="address"
                    value={signupData.address}
                    onChange={(e) => setSignupData({...signupData, address: e.target.value})}
                    required
                    className="h-10"
                    placeholder="Ciudad, sector, calle principal"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup_password" className="text-sm">
                    Contraseña *
                  </Label>
                  <Input
                    id="signup_password"
                    type="password"
                    value={signupData.password}
                    onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                    required
                    className="h-10"
                    minLength={6}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-lg font-semibold"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Registrarse
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