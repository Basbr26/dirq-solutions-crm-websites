import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import { DirqLogo } from '@/components/DirqLogo';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
});


export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const { signIn, user, role, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user && !showAnimation && !showChangePassword) {
    // Check if password change is required
    if (profile?.must_change_password) {
      setShowChangePassword(true);
      return null;
    }
    
    // Redirect naar juiste dashboard per rol
    if (role === 'hr') navigate('/dashboard/hr');
    else if (role === 'manager') navigate('/dashboard/manager');
    else if (role === 'medewerker') navigate('/dashboard/medewerker');
    else navigate('/');
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email, password });
      setLoading(true);
      const { error } = await signIn(email, password);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Inloggen mislukt',
          description: error.message === 'Invalid login credentials' 
            ? 'Onjuiste inloggegevens' 
            : error.message,
        });
      } else {
        // Check if password change is required via profile
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('must_change_password')
            .eq('id', currentUser.id)
            .single();
          
          if (profileData?.must_change_password) {
            setShowChangePassword(true);
            return;
          }
        }
        
        setShowAnimation(true);
        // Redirect pad bepalen op basis van rol
        let path = '/';
        if (role === 'hr') path = '/dashboard/hr';
        else if (role === 'manager') path = '/dashboard/manager';
        else if (role === 'medewerker') path = '/dashboard/medewerker';
        setRedirectPath(path);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validatiefout',
          description: error.errors[0].message,
        });
      }
    } finally {
      setLoading(false);
    }
  };


  return (
    showChangePassword ? (
      <ChangePasswordDialog 
        open={showChangePassword}
        onPasswordChanged={() => {
          setShowChangePassword(false);
          setShowAnimation(true);
          let path = '/';
          if (role === 'hr') path = '/dashboard/hr';
          else if (role === 'manager') path = '/dashboard/manager';
          else if (role === 'medewerker') path = '/dashboard/medewerker';
          setRedirectPath(path);
        }}
      />
    ) : showAnimation ? (
      <LoadingScreen
        duration={3000}
        onComplete={() => {
          if (redirectPath) navigate(redirectPath);
        }}
      />
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dirq-soft-grey to-white px-4 py-8">
        <Card className="w-full max-w-md shadow-dirq-lg">
          <CardHeader className="space-y-4 text-center px-4 sm:px-6">
            <div className="flex justify-center">
              <DirqLogo size="md" className="max-w-xs" />
            </div>
            <CardDescription className="text-base">
              Verzuimbeheer Systeem
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mailadres</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Wachtwoord</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Inloggen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  );
}
