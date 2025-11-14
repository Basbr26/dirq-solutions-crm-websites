import { createContext, useContext } from 'react';
import { User } from '@supabase/supabase-js';
import { AppRole, Profile } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: any;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, voornaam: string, achternaam: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock gebruiker voor testing zonder Supabase
const MOCK_USER: User = {
  id: 'mock-user-id-123',
  email: 'bas@dirqsolutions.nl',
  app_metadata: {},
  user_metadata: { voornaam: 'Bas', achternaam: 'Brouwer' },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User;

const MOCK_PROFILE: Profile = {
  id: 'mock-user-id-123',
  voornaam: 'Bas',
  achternaam: 'Brouwer',
  email: 'bas@dirqsolutions.nl',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_ROLE: AppRole = 'hr';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Hardcoded mock data voor testing zonder Supabase
  const value: AuthContextType = {
    user: MOCK_USER,
    session: { user: MOCK_USER },
    profile: MOCK_PROFILE,
    role: MOCK_ROLE,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
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
