import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const { user, signIn, signUp, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

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

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await signIn(loginEmail, loginPassword);
      if (!error) {
        window.location.href = '/';
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
      await signUp(email, password, userData);
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
    <div className="min-h-screen flex items-center justify-center bg-secondary/20 py-12 px-4">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Cooperativa de Transporte Mariscal Sucre
          </CardTitle>
          <CardDescription className="text-lg">
            Sistema de Gestión y Control
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
              <form onSubmit={handleLogin} className="space-y-6">
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
              </form>
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
  );
};

export default Auth;