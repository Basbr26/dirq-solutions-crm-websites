/**
 * Notification Preferences Dialog
 * User preferences for channels, digest frequency, quiet hours
 */

import { useState, useEffect } from 'react';
import { Save, Bell, Mail, Smartphone, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { NotificationRouter } from '@/lib/notifications/router';
import type {
  NotificationPreferences,
  NotificationChannel,
  DigestFrequency,
} from '@/types/notifications';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: NotificationPreferencesDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences
  useEffect(() => {
    if (open && user) {
      loadPreferences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user) return;

    setLoading(true);
    const prefs = await NotificationRouter.getUserPreferences(user.id);
    setPreferences(prefs);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !preferences) return;

    setSaving(true);

    const success = await NotificationRouter.updatePreferences(user.id, preferences);

    if (success) {
      toast({
        title: 'Voorkeuren opgeslagen',
        description: 'Je notificatie-instellingen zijn bijgewerkt',
      });
      onOpenChange(false);
    } else {
      toast({
        title: 'Fout bij opslaan',
        description: 'Kon voorkeuren niet opslaan',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
  };

  const toggleChannel = (
    prefKey: keyof Pick<
      NotificationPreferences,
      | 'deadline_channels'
      | 'approval_channels'
      | 'update_channels'
      | 'reminder_channels'
      | 'escalation_channels'
      | 'urgent_channels'
      | 'high_channels'
      | 'normal_channels'
      | 'low_channels'
    >,
    channel: NotificationChannel
  ) => {
    if (!preferences) return;

    const channels = [...preferences[prefKey]];
    const index = channels.indexOf(channel);

    if (index > -1) {
      channels.splice(index, 1);
    } else {
      channels.push(channel);
    }

    updatePreference(prefKey, channels as never);
  };

  const channelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'in_app':
        return <Bell className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'push':
        return <Smartphone className="h-4 w-4" />;
    }
  };

  const channelLabel = (channel: NotificationChannel) => {
    const labels: Record<NotificationChannel, string> = {
      in_app: 'In-app',
      email: 'Email',
      sms: 'SMS',
      push: 'Push',
    };
    return labels[channel];
  };

  if (!preferences || loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Notificatie-instellingen</DialogTitle>
          <DialogDescription>
            Pas aan hoe en wanneer je notificaties ontvangt
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="channels" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="channels">Kanalen</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="modes">Modes</TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-4 mt-4">
            {/* Per Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per type</CardTitle>
                <CardDescription>
                  Kies welke kanalen je wilt gebruiken per notificatietype
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'deadline_channels' as const, label: 'Deadlines' },
                  { key: 'approval_channels' as const, label: 'Goedkeuringen' },
                  { key: 'update_channels' as const, label: 'Updates' },
                  { key: 'reminder_channels' as const, label: 'Herinneringen' },
                  { key: 'escalation_channels' as const, label: 'Escalaties' },
                ].map((type) => (
                  <div key={type.key}>
                    <Label className="mb-2 block">{type.label}</Label>
                    <div className="flex gap-2">
                      {(['in_app', 'email', 'sms', 'push'] as NotificationChannel[]).map(
                        (channel) => (
                          <Button
                            key={channel}
                            variant={
                              preferences[type.key].includes(channel)
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => toggleChannel(type.key, channel)}
                            className="flex items-center gap-2"
                          >
                            {channelIcon(channel)}
                            {channelLabel(channel)}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Per Priority */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per prioriteit</CardTitle>
                <CardDescription>
                  Prioriteit overschrijft type-instellingen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { key: 'urgent_channels' as const, label: 'Urgent/Kritiek', color: 'text-red-600' },
                  { key: 'high_channels' as const, label: 'Hoog', color: 'text-orange-600' },
                  { key: 'normal_channels' as const, label: 'Normaal', color: 'text-blue-600' },
                  { key: 'low_channels' as const, label: 'Laag', color: 'text-gray-600' },
                ].map((priority) => (
                  <div key={priority.key}>
                    <Label className={`mb-2 block ${priority.color}`}>
                      {priority.label}
                    </Label>
                    <div className="flex gap-2">
                      {(['in_app', 'email', 'sms', 'push'] as NotificationChannel[]).map(
                        (channel) => (
                          <Button
                            key={channel}
                            variant={
                              preferences[priority.key].includes(channel)
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => toggleChannel(priority.key, channel)}
                            className="flex items-center gap-2"
                          >
                            {channelIcon(channel)}
                            {channelLabel(channel)}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timing Tab */}
          <TabsContent value="timing" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Digest frequentie</CardTitle>
                <CardDescription>
                  Combineer notificaties in samenvatting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={preferences.digest_frequency}
                  onValueChange={(value: DigestFrequency) =>
                    updatePreference('digest_frequency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Direct (geen digest)</SelectItem>
                    <SelectItem value="hourly">Elk uur</SelectItem>
                    <SelectItem value="daily">Dagelijks om 9:00</SelectItem>
                    <SelectItem value="weekly">Wekelijks op maandag</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rustige uren</CardTitle>
                <CardDescription>
                  Geen notificaties tijdens deze uren (behalve kritiek)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Start</Label>
                  <Select
                    value={preferences.quiet_hours_start}
                    onValueChange={(value) =>
                      updatePreference('quiet_hours_start', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Einde</Label>
                  <Select
                    value={preferences.quiet_hours_end}
                    onValueChange={(value) =>
                      updatePreference('quiet_hours_end', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => {
                        const hour = i.toString().padStart(2, '0');
                        return (
                          <SelectItem key={hour} value={`${hour}:00`}>
                            {hour}:00
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Modes Tab */}
          <TabsContent value="modes" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekend mode</CardTitle>
                <CardDescription>
                  Alleen urgente notificaties in weekend
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekend-mode">Weekend mode actief</Label>
                  <Switch
                    id="weekend-mode"
                    checked={preferences.weekend_mode}
                    onCheckedChange={(checked) =>
                      updatePreference('weekend_mode', checked)
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vakantie mode</CardTitle>
                <CardDescription>
                  Delegeer notificaties naar collega
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="vacation-mode">Vakantie mode actief</Label>
                  <Switch
                    id="vacation-mode"
                    checked={preferences.vacation_mode}
                    onCheckedChange={(checked) =>
                      updatePreference('vacation_mode', checked)
                    }
                  />
                </div>

                {preferences.vacation_mode && (
                  <div>
                    <Label>Delegeer naar</Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                      Kies een collega die je notificaties ontvangt
                    </p>
                    {/* TODO: Add user selector */}
                    <p className="text-sm text-muted-foreground italic">
                      Gebruikersselectie nog niet geïmplementeerd
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="my-4" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                Opslaan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Opslaan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
