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
import { useTranslation } from 'react-i18next';

const createUserSchema = z.object({
  email: z.string().email('errors.invalidEmail'),
  voornaam: z.string().min(2, 'errors.firstNameRequired'),
  achternaam: z.string().min(2, 'errors.lastNameRequired'),
  role: z.enum(['hr', 'manager', 'medewerker', 'super_admin'], { required_error: 'errors.roleRequired' }),
});

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated?: () => void;
}

export function CreateUserDialog({ open, onOpenChange, onUserCreated }: CreateUserDialogProps) {
  const { t } = useTranslation();
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

      // Call secure edge function for user creation
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: { email, voornaam, achternaam, role },
      });

      if (error) {
        toast({
          variant: 'destructive',
          title: t('errors.createUserFailed'),
          description: error.message || t('errors.errorOccurred'),
        });
        return;
      }

      if (data?.error) {
        toast({
          variant: 'destructive',
          title: t('errors.createUserFailed'),
          description: data.error,
        });
        return;
      }

      toast({
        title: t('success.userCreated'),
        description: t('success.userCreatedDescription', { name: `${voornaam} ${achternaam}`, role }),
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
          title: t('errors.validationError'),
          description: error.errors[0].message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('users.createUser')}</DialogTitle>
          <DialogDescription>
            {t('users.createUserDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voornaam">{t('common.firstName')}</Label>
              <Input
                id="voornaam"
                type="text"
                value={voornaam}
                onChange={(e) => setVoornaam(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achternaam">{t('common.lastName')}</Label>
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
            <Label htmlFor="email">{t('common.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('common.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">{t('common.role')}</Label>
            <Select value={role} onValueChange={(value: 'hr' | 'manager' | 'medewerker' | 'super_admin') => setRole(value)}>
              <SelectTrigger>
                <SelectValue placeholder={t('users.selectRole')} />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="medewerker">{t('users.roles.employee')}</SelectItem>
                <SelectItem value="manager">{t('users.roles.manager')}</SelectItem>
                <SelectItem value="hr">{t('users.roles.hr')}</SelectItem>
                <SelectItem value="super_admin">{t('users.roles.superAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('users.createUser')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
