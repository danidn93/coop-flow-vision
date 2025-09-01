import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  middle_name?: string;
  surname_1: string;
  surname_2?: string;
  id_number: string;
  phone: string;
  address: string;
  avatar_url?: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'administrator' | 'president' | 'manager' | 'employee' | 'partner' | 'driver' | 'official' | 'client';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  userRoles: UserRole[];
  activeRole: string | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: Omit<Profile, 'id' | 'user_id'>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return;
      }

      const roles = data || [];
      setUserRoles(roles);

      // Get stored active role or select priority role
      const storedRole = localStorage.getItem(`activeRole_${userId}`);
      const availableRoles = roles.map(r => r.role);
      
      let selectedRole: string | null = null;
      
      if (storedRole && availableRoles.includes(storedRole as any)) {
        selectedRole = storedRole;
      } else {
        // Default priority selection
        const priority = ['administrator', 'president', 'manager', 'employee', 'partner', 'official', 'driver', 'client'] as const;
        selectedRole = priority.find(r => availableRoles.includes(r as any)) || availableRoles[0] || null;
      }

      setActiveRole(selectedRole);
      
      const activeRoleData = roles.find(r => r.role === selectedRole);
      setUserRole(activeRoleData || null);
      
      if (selectedRole) {
        localStorage.setItem(`activeRole_${userId}`, selectedRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const switchRole = (role: string) => {
    if (user && userRoles.some(r => r.role === role)) {
      setActiveRole(role);
      const roleData = userRoles.find(r => r.role === role);
      setUserRole(roleData || null);
      localStorage.setItem(`activeRole_${user.id}`, role);
      
      toast({
        title: "Rol cambiado",
        description: `Ahora estás usando el rol: ${getRoleDisplayName(role)}`
      });
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      administrator: 'Administrador',
      president: 'Presidente',
      manager: 'Manager',
      employee: 'Empleado',
      partner: 'Socio',
      driver: 'Conductor',
      official: 'Dirigente',
      client: 'Cliente'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer data fetching to prevent deadlocks
          setTimeout(() => {
            fetchProfile(session.user.id);
            fetchUserRole(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
          setUserRoles([]);
          setActiveRole(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchUserRole(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: Omit<Profile, 'id' | 'user_id'>) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: userData
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error al registrarse",
          description: error.message
        });
        return { error };
      }

      toast({
        title: "Registro exitoso",
        description: "Revisa tu email para confirmar tu cuenta"
      });

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Error al registrarse",
        description: err.message
      });
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Clean up existing state
      setProfile(null);
      setUserRole(null);
      setUserRoles([]);
      setActiveRole(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error al iniciar sesión",
          description: error.message
        });
        return { error };
      }

      return { error: null };
    } catch (error) {
      const err = error as Error;
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: err.message
      });
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      // Clean up auth state
      setProfile(null);
      setUserRole(null);
      setUserRoles([]);
      setActiveRole(null);
      
      // Clear stored active role
      if (user) {
        localStorage.removeItem(`activeRole_${user.id}`);
      }
      
      await supabase.auth.signOut({ scope: 'global' });
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Force reload even if signOut fails
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    profile,
    userRole,
    userRoles,
    activeRole,
    loading,
    signUp,
    signIn,
    signOut,
    switchRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};