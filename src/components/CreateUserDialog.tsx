import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  voornaam: z.string().min(2, 'Voornaam is verplicht'),
  achternaam: z.string().min(2, 'Achternaam is verplicht'),
  role: z.enum(['hr', 'manager', 'medewerker', 'super_admin'], { required_error: 'Rol is verplicht' }),
});

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [voornaam, setVoornaam] = useState('');
  const [achternaam, setAchternaam] = useState('');
  const [role, setRole] = useState<'hr' | 'manager' | 'medewerker' | 'super_admin'>('medewerker');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      createUserSchema.parse({ email, voornaam, achternaam, role });
      setLoading(true);

      // Create user via Supabase Auth Admin API
      const { data: { user }, error: signUpError } = await supabase.auth.signUp({
        email,
        password: 'Welkom123',
        options: {
          data: {
            voornaam,
            achternaam,
            must_change_password: true,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (signUpError) {
        toast({
          variant: 'destructive',
          title: 'Gebruiker aanmaken mislukt',
          description: signUpError.message === 'User already registered' 
            ? 'Dit e-mailadres is al geregistreerd' 
            : signUpError.message,
        });
        return;
      }

      if (!user) {
        toast({
          variant: 'destructive',
          title: 'Fout',
          description: 'Geen gebruiker data ontvangen',
        });
        return;
      }

      // Add role to user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: role,
        });

      if (roleError) {
        toast({
          variant: 'destructive',
          title: 'Rol toewijzen mislukt',
          description: roleError.message,
        });
        return;
      }

      toast({
        title: 'Gebruiker aangemaakt',
        description: `${voornaam} ${achternaam} is aangemaakt met rol ${role}. Standaard wachtwoord: Welkom123`,
      });

      // Reset form
      setEmail('');
      setVoornaam('');
      setAchternaam('');
      setRole('medewerker');
      onOpenChange(false);
      onUserCreated?.();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nieuwe gebruiker aanmaken</DialogTitle>
          <DialogDescription>
            Maak een nieuwe gebruiker aan. Het standaard wachtwoord is Welkom123 en moet bij eerste inlog gewijzigd worden.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voornaam">Voornaam</Label>
              <Input
                id="voornaam"
                type="text"
                value={voornaam}
                onChange={(e) => setVoornaam(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achternaam">Achternaam</Label>
              <Input
                id="achternaam"
                type="text"
                value={achternaam}
                onChange={(e) => setAchternaam(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              placeholder="naam@bedrijf.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select value={role} onValueChange={(value: 'hr' | 'manager' | 'medewerker' | 'super_admin') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer een rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medewerker">Medewerker</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gebruiker aanmaken
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
