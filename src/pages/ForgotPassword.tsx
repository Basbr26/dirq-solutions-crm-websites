import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { DirqLogo } from '@/components/DirqLogo';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
});

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse({ email });
      setLoading(true);
      
      const { error } = await resetPassword(email);
      
      if (error) {
        toast({
          variant: 'destructive',
          title: t('errors.errorSending'),
          description: error.message,
        });
      } else {
        setEmailSent(true);
        toast({
          title: 'E-mail verzonden',
          description: 'Controleer je inbox voor verdere instructies.',
        });
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4 py-8">
      <Card className="w-full max-w-md shadow-lg border-border/50">
        <CardHeader className="space-y-4 text-center px-4 sm:px-6">
          <div className="flex justify-center">
            <DirqLogo size="md" className="max-w-xs" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">
              {emailSent ? 'Check je e-mail' : 'Wachtwoord vergeten?'}
            </h1>
            <CardDescription className="text-sm">
              {emailSent 
                ? 'We hebben je een link gestuurd om je wachtwoord te resetten.'
                : 'Voer je e-mailadres in om je wachtwoord te resetten.'
              }
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {emailSent ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Als er een account bestaat met <strong>{email}</strong>, dan ontvang je binnen enkele minuten een e-mail met instructies.
              </p>
              <div className="space-y-2">
                <Link to="/auth">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Terug naar inloggen
                  </Button>
                </Link>
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  Opnieuw versturen
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Reset link versturen
              </Button>
              <Link to="/auth">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Terug naar inloggen
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
