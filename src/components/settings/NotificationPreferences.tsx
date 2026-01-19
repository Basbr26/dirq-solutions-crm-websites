import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { getNotificationPreferences, updateNotificationPreferences } from '@/lib/notifications/aiNotifications';
import { Loader2, Bell, Mail, Smartphone, Clock, Bot, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NotificationPrefs {
  channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
  };
  enabled_types: string[];
  digest_enabled: boolean;
  digest_frequency: 'hourly' | 'daily' | 'weekly';
  ai_notifications_enabled: boolean;
  ai_digest_only: boolean;
  ai_failure_notify: boolean;
  dnd_enabled: boolean;
}

const NOTIFICATION_TYPES = [
  { value: 'deadline', label: 'Deadlines & Verlopen', description: 'Taken en offertes die verlopen zijn' },
  { value: 'approval', label: 'Goedkeuringen', description: 'Quote acceptaties en belangrijke beslissingen' },
  { value: 'update', label: 'Updates', description: 'Status wijzigingen van leads, projecten en bedrijven' },
  { value: 'reminder', label: 'Herinneringen', description: 'Aankomende afspraken en taken' },
  { value: 'escalation', label: 'Escalaties', description: 'Urgente zaken die aandacht vereisen' },
  { value: 'digest', label: 'Samenvattingen', description: 'Dagelijkse of wekelijkse overzichten' },
];

export function NotificationPreferences() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPrefs>({
    channels: { in_app: true, email: false, sms: false },
    enabled_types: ['deadline', 'approval', 'update', 'reminder', 'escalation', 'digest'],
    digest_enabled: true,
    digest_frequency: 'daily',
    ai_notifications_enabled: true,
    ai_digest_only: true,
    ai_failure_notify: true,
    dnd_enabled: false,
  });

  const loadPreferences = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const prefs = await getNotificationPreferences(user.id);
      if (prefs) {
        setPreferences({
          channels: prefs.channels as { in_app: boolean; email: boolean; sms: boolean },
          enabled_types: prefs.enabled_types as string[],
          digest_enabled: prefs.digest_enabled,
          digest_frequency: prefs.digest_frequency as 'hourly' | 'daily' | 'weekly',
          ai_notifications_enabled: prefs.ai_notifications_enabled,
          ai_digest_only: prefs.ai_digest_only,
          ai_failure_notify: prefs.ai_failure_notify,
          dnd_enabled: prefs.dnd_enabled,
        });
      }
    } catch (error: any) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const result = await updateNotificationPreferences(user.id, preferences);
      
      if (result.success) {
        toast({
          title: 'Voorkeuren opgeslagen',
          description: 'Je notificatie instellingen zijn bijgewerkt.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: 'Fout bij opslaan',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleNotificationType = (type: string) => {
    const newTypes = preferences.enabled_types.includes(type)
      ? preferences.enabled_types.filter(t => t !== type)
      : [...preferences.enabled_types, type];
    
    setPreferences({ ...preferences, enabled_types: newTypes });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notificatie Kanalen</CardTitle>
          <CardDescription>
            Kies hoe je notificaties wilt ontvangen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="in-app">In-app notificaties</Label>
                <p className="text-sm text-muted-foreground">Ontvang notificaties in de applicatie</p>
              </div>
            </div>
            <Switch
              id="in-app"
              checked={preferences.channels.in_app}
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  channels: { ...preferences.channels, in_app: checked },
                })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="email">E-mail notificaties</Label>
                  <Badge variant="outline" className="text-xs">Binnenkort</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Ontvang notificaties per e-mail</p>
              </div>
            </div>
            <Switch
              id="email"
              checked={preferences.channels.email}
              disabled
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  channels: { ...preferences.channels, email: checked },
                })
              }
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="sms">SMS notificaties</Label>
                  <Badge variant="outline" className="text-xs">Binnenkort</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Ontvang urgente notificaties per SMS</p>
              </div>
            </div>
            <Switch
              id="sms"
              checked={preferences.channels.sms}
              disabled
              onCheckedChange={(checked) =>
                setPreferences({
                  ...preferences,
                  channels: { ...preferences.channels, sms: checked },
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notificatie Types</CardTitle>
          <CardDescription>
            Selecteer welke type notificaties je wilt ontvangen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {NOTIFICATION_TYPES.map((type, index) => (
            <div key={type.value}>
              <div className="flex items-start justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={type.value}>{type.label}</Label>
                  <p className="text-sm text-muted-foreground">{type.description}</p>
                </div>
                <Switch
                  id={type.value}
                  checked={preferences.enabled_types.includes(type.value)}
                  onCheckedChange={() => toggleNotificationType(type.value)}
                />
              </div>
              {index < NOTIFICATION_TYPES.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Digest Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Samenvatting Instellingen
          </CardTitle>
          <CardDescription>
            Ontvang periodieke samenvattingen van je notificaties
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="digest-enabled">Samenvattingen inschakelen</Label>
              <p className="text-sm text-muted-foreground">Groepeer notificaties in samenvattingen</p>
            </div>
            <Switch
              id="digest-enabled"
              checked={preferences.digest_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, digest_enabled: checked })
              }
            />
          </div>

          {preferences.digest_enabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="digest-frequency">Frequentie</Label>
                <Select
                  value={preferences.digest_frequency}
                  onValueChange={(value: any) =>
                    setPreferences({ ...preferences, digest_frequency: value })
                  }
                >
                  <SelectTrigger id="digest-frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Elk uur</SelectItem>
                    <SelectItem value="daily">Dagelijks (09:00)</SelectItem>
                    <SelectItem value="weekly">Wekelijks (Maandag 09:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Automation Notificaties
          </CardTitle>
          <CardDescription>
            Instellingen voor notificaties van geautomatiseerde AI processen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-notifications">AI notificaties</Label>
              <p className="text-sm text-muted-foreground">
                Ontvang updates van AI scraping, imports en bulk operaties
              </p>
            </div>
            <Switch
              id="ai-notifications"
              checked={preferences.ai_notifications_enabled}
              onCheckedChange={(checked) =>
                setPreferences({ ...preferences, ai_notifications_enabled: checked })
              }
            />
          </div>

          {preferences.ai_notifications_enabled && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai-digest-only">Alleen samenvattingen</Label>
                  <p className="text-sm text-muted-foreground">
                    Ontvang alleen samenvattingen van AI bulk operaties
                  </p>
                </div>
                <Switch
                  id="ai-digest-only"
                  checked={preferences.ai_digest_only}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, ai_digest_only: checked })
                  }
                />
              </div>

              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <Label htmlFor="ai-failure-notify">Altijd notificeren bij fouten</Label>
                    <p className="text-sm text-muted-foreground">
                      Ontvang onmiddellijk bericht bij AI automation failures
                    </p>
                  </div>
                </div>
                <Switch
                  id="ai-failure-notify"
                  checked={preferences.ai_failure_notify}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, ai_failure_notify: checked })
                  }
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Voorkeuren Opslaan
        </Button>
      </div>
    </div>
  );
}
