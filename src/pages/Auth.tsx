import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
});

const signupSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 tekens zijn'),
  voornaam: z.string().min(2, 'Voornaam is verplicht'),
  achternaam: z.string().min(2, 'Achternaam is verplicht'),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [voornaam, setVoornaam] = useState('');
  const [achternaam, setAchternaam] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Redirect if already logged in
  if (user && !showAnimation) {
    navigate('/dashboard');
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
        setShowAnimation(true);
        setRedirectPath('/dashboard');
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      signupSchema.parse({ email, password, voornaam, achternaam });
      setLoading(true);
      
      const { error } = await signUp(email, password, voornaam, achternaam);
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Registratie mislukt',
          description: error.message === 'User already registered' 
            ? 'Dit e-mailadres is al geregistreerd' 
            : error.message,
        });
      } else {
        toast({
          title: 'Account aangemaakt',
          description: 'Controleer je e-mail om je account te bevestigen.',
        });
        setIsLogin(true);
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
    showAnimation ? (
      <LoadingScreen
        duration={3000}
        onComplete={() => {
          if (redirectPath) navigate(redirectPath);
        }}
      />
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
        <Card className="w-full max-w-md shadow-dirq-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl font-bold text-primary-foreground">D</span>
            </div>
            <CardTitle className="text-2xl">Dirq Poortwachter</CardTitle>
            <CardDescription>
              Verzuimbeheer volgens de wet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'signup'} onValueChange={(v) => setIsLogin(v === 'login')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Inloggen</TabsTrigger>
                <TabsTrigger value="signup">Registreren</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
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
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-voornaam">Voornaam</Label>
                      <Input
                        id="signup-voornaam"
                        type="text"
                        value={voornaam}
                        onChange={(e) => setVoornaam(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-achternaam">Achternaam</Label>
                      <Input
                        id="signup-achternaam"
                        type="text"
                        value={achternaam}
                        onChange={(e) => setAchternaam(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">E-mailadres</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="naam@bedrijf.nl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Wachtwoord</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Minimaal 6 tekens"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Account aanmaken
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  );
}
