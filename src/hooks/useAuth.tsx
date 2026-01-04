import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// CRM Roles: ADMIN (full access), SALES (sales team), MANAGER (sales managers), SUPPORT (support team)
export type AppRole = 'ADMIN' | 'SALES' | 'MANAGER' | 'SUPPORT';

export interface Profile {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon?: string | null;
  functie?: string | null;
  manager_id?: string | null;
  foto_url?: string | null;
  department_id?: string | null;
  created_at: string | null;
  updated_at: string | null;
  must_change_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, voornaam: string, achternaam: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle auth errors (expired/invalid tokens)
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, clearing session');
        localStorage.clear();
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        localStorage.clear();
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      // Defer profile and role fetching to avoid deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchProfileAndRole(session.user.id);
        }, 0);
      } else {
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Session error, clearing tokens:', error);
        localStorage.clear();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfileAndRole(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Fatal auth error, clearing all data:', error);
      localStorage.clear();
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // If profile fetch fails due to auth error, sign out
        if (profileError.message?.includes('JWT') || profileError.message?.includes('token')) {
          console.error('Auth error loading profile, signing out:', profileError);
          await signOut();
          return;
        }
        throw profileError;
      }
      setProfile(profileData);

      // Fetch role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        // If role fetch fails due to auth error, sign out
        if (roleError.message?.includes('JWT') || roleError.message?.includes('token')) {
          console.error('Auth error loading role, signing out:', roleError);
          await signOut();
          return;
        }
        throw roleError;
      }
      setRole(roleData.role as AppRole);
    } catch (error) {
      console.error('Error fetching profile/role:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔐 Attempting sign in for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error.message);
        console.error('Error details:', {
          status: error.status,
          code: error.code,
          name: error.name
        });
      } else {
        console.log('✅ Sign in successful:', data.user?.email);
      }
      
      return { error };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, voornaam: string, achternaam: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            voornaam,
            achternaam,
          },
        },
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always clear local state and storage
      localStorage.clear();
      setUser(null);
      setSession(null);
      setProfile(null);
      setRole(null);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
