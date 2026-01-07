import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  initGoogleCalendar,
  signInToGoogle,
  signOutFromGoogle,
  isGoogleSignedIn,
  syncToGoogleCalendar,
  syncFromGoogleCalendar,
} from '@/lib/googleCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function GoogleCalendarSync() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    initializeGoogle();
  }, []);

  const loadSyncSettings = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setAutoSync(data.google_calendar_sync || false);
      setLastSyncTime(data.last_calendar_sync ? new Date(data.last_calendar_sync) : null);
      
      // Check if user has valid token
      if (data.google_access_token) {
        const expiresAt = data.google_token_expires_at ? new Date(data.google_token_expires_at) : null;
        const isExpired = expiresAt ? expiresAt < new Date() : true;
        
        if (!isExpired) {
          // Token is valid, restore session
          setIsSignedIn(true);
        } else {
          // Token expired, clear from database
          await supabase
            .from('profiles')
            .update({
              google_access_token: null,
              google_token_expires_at: null,
            })
            .eq('id', user.id);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    // Load sync settings from database
    if (user) {
      loadSyncSettings();
    }
  }, [user, loadSyncSettings]);

  const initializeGoogle = async () => {
    setIsLoading(true);
    try {
      const initialized = await initGoogleCalendar();
      setIsInitialized(initialized);
      if (initialized) {
        setIsSignedIn(isGoogleSignedIn());
      }
    } catch (error) {
      console.error('Failed to initialize Google Calendar:', error);
      toast.error('Google Calendar kon niet worden geïnitialiseerd');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSyncSettings = async (enabled: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        google_calendar_sync: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error saving sync settings:', error);
      toast.error('Kon instellingen niet opslaan');
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      const tokenResponse = await signInToGoogle();
      if (tokenResponse && user) {
        // Calculate token expiry time
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

        // Store tokens securely in Supabase profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            google_access_token: tokenResponse.access_token,
            google_token_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          console.error('Error storing Google tokens:', updateError);
          toast.error('Kon tokens niet opslaan in database');
          return;
        }

        setIsSignedIn(true);
        toast.success('Verbonden met Google Calendar - Tokens veilig opgeslagen');
        
        // Perform initial sync
        if (autoSync) {
          handleSync();
        }
      } else {
        toast.error('Kon niet verbinden met Google Calendar');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Fout bij inloggen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    if (!user) return;

    // Revoke token at Google
    signOutFromGoogle();

    // Clear tokens from database
    const { error } = await supabase
      .from('profiles')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error clearing Google tokens:', error);
    }

    setIsSignedIn(false);
    toast.info('Verbinding met Google Calendar verbroken - Tokens verwijderd');
  };

  const handleSync = async () => {
    if (!user || !isSignedIn) return;

    setIsSyncing(true);
    try {
      // Fetch local events without Google ID
      const { data: localEvents } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .is('google_event_id', null);

      // Sync to Google Calendar
      const syncToResults = await syncToGoogleCalendar(localEvents || []);

      // Sync from Google Calendar
      const syncFromResults = await syncFromGoogleCalendar(async (googleEvent) => {
        try {
          // Check if event already exists
          const { data: existing, error: checkError } = await supabase
            .from('calendar_events')
            .select('id')
            .eq('google_event_id', googleEvent.google_event_id)
            .maybeSingle(); // Use maybeSingle instead of single to avoid 406 error

          if (checkError) {
            console.error('Error checking existing event:', checkError);
            return;
          }

          if (existing) {
            return; // Skip if already imported
          }

          // Import the event with all required fields
          const { error: insertError } = await supabase
            .from('calendar_events')
            .insert({
              user_id: user.id,
              title: googleEvent.title || 'Untitled Event',
              description: googleEvent.description || null,
              start_time: googleEvent.start_time,
              end_time: googleEvent.end_time,
              all_day: googleEvent.all_day || false,
              location: googleEvent.location || null,
              event_type: googleEvent.event_type || 'meeting',
              color: googleEvent.color || '#10b981',
              is_virtual: googleEvent.is_virtual || false,
              meeting_url: googleEvent.meeting_url || null,
              google_event_id: googleEvent.google_event_id,
            });

          if (insertError) {
            console.error('Error inserting event:', insertError);
          }
        } catch (err) {
          console.error('Error processing event:', err);
        }
      });

      // Update last sync time
      const now = new Date();
      setLastSyncTime(now);
      
      await supabase
        .from('profiles')
        .update({
          last_calendar_sync: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', user.id);

      const totalSynced = syncToResults.synced + syncFromResults.imported;
      const totalErrors = syncToResults.errors + syncFromResults.errors;

      if (totalErrors > 0) {
        toast.warning(
          `Synchronisatie voltooid: ${totalSynced} gebeurtenissen gesynchroniseerd, ${totalErrors} fouten`
        );
      } else {
        toast.success(`${totalSynced} gebeurtenissen succesvol gesynchroniseerd`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Fout bij synchroniseren');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setAutoSync(enabled);
    await saveSyncSettings(enabled);
    
    if (enabled && isSignedIn) {
      toast.success('Automatische synchronisatie ingeschakeld');
    } else {
      toast.info('Automatische synchronisatie uitgeschakeld');
    }
  };

  if (!isInitialized && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Synchronisatie
          </CardTitle>
          <CardDescription>
            Google Calendar API is niet beschikbaar. Controleer uw internetverbinding.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Synchronisatie
        </CardTitle>
        <CardDescription>
          Synchroniseer uw CRM agenda met Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Verbindingsstatus</Label>
            <p className="text-sm text-muted-foreground">
              {isSignedIn ? 'Verbonden met Google Calendar' : 'Niet verbonden'}
            </p>
          </div>
          <Badge variant={isSignedIn ? 'default' : 'secondary'} className="gap-1">
            {isSignedIn ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Verbonden
              </>
            ) : (
              <>
                <AlertCircle className="h-3 w-3" />
                Niet verbonden
              </>
            )}
          </Badge>
        </div>

        {/* Sign In/Out Button */}
        <div>
          {!isSignedIn ? (
            <Button
              onClick={handleSignIn}
              disabled={isLoading || !isInitialized}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verbind met Google Calendar
            </Button>
          ) : (
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full"
            >
              Verbreek verbinding
            </Button>
          )}
        </div>

        {isSignedIn && (
          <>
            {/* Auto Sync Toggle */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="auto-sync">Automatische synchronisatie</Label>
                <p className="text-sm text-muted-foreground">
                  Synchroniseer automatisch bij wijzigingen
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={autoSync}
                onCheckedChange={handleAutoSyncToggle}
              />
            </div>

            {/* Manual Sync Button */}
            <div className="space-y-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="secondary"
                className="w-full"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Synchroniseren...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Nu synchroniseren
                  </>
                )}
              </Button>

              {lastSyncTime && (
                <p className="text-xs text-center text-muted-foreground">
                  Laatst gesynchroniseerd:{' '}
                  {lastSyncTime.toLocaleString('nl-NL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </div>

            {/* Sync Information */}
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="text-sm font-medium">Synchronisatie informatie</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Gebeurtenissen van de afgelopen en komende 3 maanden worden gesynchroniseerd</li>
                <li>• Wijzigingen in de CRM worden automatisch naar Google gestuurd</li>
                <li>• Google Calendar gebeurtenissen worden geïmporteerd naar de CRM</li>
                <li>• Dubbele gebeurtenissen worden voorkomen</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
