import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Upload } from 'lucide-react';

export function ProfileSettings() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    voornaam: '',
    achternaam: '',
    email: '',
    phone: '',
    avatar_url: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        voornaam: profile.voornaam || '',
        achternaam: profile.achternaam || '',
        email: profile.email || '',
        phone: profile.phone || '',
        avatar_url: profile.avatar_url || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          voornaam: formData.voornaam,
          achternaam: formData.achternaam,
          full_name: `${formData.voornaam} ${formData.achternaam}`,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profiel bijgewerkt',
        description: 'Je profielgegevens zijn succesvol opgeslagen.',
      });
    } catch (error: any) {
      toast({
        title: 'Fout bij opslaan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    return `${formData.voornaam.charAt(0)}${formData.achternaam.charAt(0)}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persoonlijke Gegevens</CardTitle>
        <CardDescription>
          Update je persoonlijke informatie en avatar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={formData.avatar_url} />
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button type="button" variant="outline" size="sm" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Upload foto
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, PNG max 2MB (Binnenkort beschikbaar)
              </p>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="voornaam">Voornaam</Label>
              <Input
                id="voornaam"
                value={formData.voornaam}
                onChange={(e) => setFormData({ ...formData, voornaam: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="achternaam">Achternaam</Label>
              <Input
                id="achternaam"
                value={formData.achternaam}
                onChange={(e) => setFormData({ ...formData, achternaam: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              E-mailadres kan niet worden gewijzigd. Neem contact op met een administrator.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Telefoonnummer</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+31 6 12345678"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Opslaan
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
