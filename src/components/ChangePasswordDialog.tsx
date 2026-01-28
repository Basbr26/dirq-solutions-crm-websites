import { useState } from 'react';
import { logger } from '@/lib/logger';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 tekens zijn'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Wachtwoorden komen niet overeen',
  path: ['confirmPassword'],
});

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onPasswordChanged?: () => void;
}

export function ChangePasswordDialog({ open, onOpenChange, onPasswordChanged }: ChangePasswordDialogProps) {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse({ password, confirmPassword });
      setLoading(true);

      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        toast({
          variant: 'destructive',
          title: 'Wachtwoord wijzigen mislukt',
          description: updateError.message,
        });
        return;
      }

      // Update must_change_password flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ must_change_password: false })
          .eq('id', user.id);

        if (profileError) {
          logger.error('Failed to update profile after password change', { userId: user.id, error: profileError });
        }
      }

      toast({
        title: 'Wachtwoord gewijzigd',
        description: 'Je wachtwoord is succesvol gewijzigd.',
      });

      onPasswordChanged?.();
      onOpenChange?.(false);
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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px] max-h-[85vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Wachtwoord wijzigen</DialogTitle>
          <DialogDescription>
            Je moet je wachtwoord wijzigen voordat je verder kunt. Kies een sterk wachtwoord met minimaal 8 tekens.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="password">Nieuw wachtwoord</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimaal 8 tekens"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Bevestig wachtwoord</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Herhaal wachtwoord"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end pt-4 border-t flex-shrink-0">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Wachtwoord wijzigen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
