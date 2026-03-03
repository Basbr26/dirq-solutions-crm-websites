import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  initGoogleCalendar,
  signInToGoogle,
  signOutFromGoogle,
  isGoogleSignedIn,
  setCalendarToken,
  syncToGoogleCalendar,
  syncFromGoogleCalendar,
  refreshCalendarTokenSilently,
  isTokenExpired,
  registerGoogleCalendarWebhook,
  stopGoogleCalendarWebhook,
  webhookNeedsRenewal,
} from '@/lib/googleCalendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

export function GoogleCalendarSync() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Debug logging helper
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
    // Silent debug info for UI only
  }, []);

  const initializeGoogle = useCallback(async () => {
    setIsLoading(true);
    addDebugLog('🚀 Initializing Google Calendar API...');
    try {
      const initialized = await initGoogleCalendar();
      setIsInitialized(initialized);
      if (initialized) {
        addDebugLog('✅ Google Calendar API initialized');
        setIsSignedIn(isGoogleSignedIn());
        setConnectionError(null);
      } else {
        addDebugLog('❌ Google Calendar API initialization failed');
        setConnectionError('Google API kon niet worden geïnitialiseerd');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      addDebugLog(`❌ Error during initialization: ${errorMsg}`);
      setConnectionError(`Initialisatie fout: ${errorMsg}`);
      logger.error(error, { context: 'google_calendar_init' });
      toast.error('Google Calendar kon niet worden geïnitialiseerd');
    } finally {
      setIsLoading(false);
    }
  }, [addDebugLog]);

  useEffect(() => {
    initializeGoogle();
  }, [initializeGoogle]);

  const loadSyncSettings = useCallback(async () => {
    if (!user) {
      addDebugLog('❌ No user found, skipping settings load');
      return;
    }

    addDebugLog('🔍 Loading sync settings from database...');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      addDebugLog(`❌ Database error: ${error.message}`);
      setConnectionError(`Database fout: ${error.message}`);
      toast.error('Kon synchronisatie-instellingen niet laden');
      return;
    }

    if (data) {
      addDebugLog('✅ Settings loaded successfully');
      setAutoSync(data.google_calendar_sync || false);
      setLastSyncTime(data.last_calendar_sync ? new Date(data.last_calendar_sync) : null);
      
      // Check if user has valid token
      if (data.google_access_token && data.google_token_expires_at) {
        addDebugLog('🔑 Found stored access token');
        const expiresAt = new Date(data.google_token_expires_at);
        const isExpired = expiresAt < new Date();
        const minutesUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / 60000);
        
        addDebugLog(`⏱️ Token expires at: ${expiresAt.toLocaleString()}`);
        addDebugLog(`⏱️ Minutes until expiry: ${minutesUntilExpiry}`);
        
        if (!isExpired) {
          addDebugLog('✅ Token is still valid, restoring session...');
          setCalendarToken(data.google_access_token);
          setIsSignedIn(true);
          setConnectionError(null);
          addDebugLog('✅ Google Calendar sessie hersteld uit database');
          toast.success('Google Calendar verbinding hersteld');
        } else {
          addDebugLog('⚠️ Token expired, clearing from database...');
          // Token expired, clear from database
          const { error: clearError } = await supabase
            .from('profiles')
            .update({
              google_access_token: null,
              google_token_expires_at: null,
            })
            .eq('id', user.id);
          
          if (clearError) {
            addDebugLog(`❌ Error clearing expired token: ${clearError.message}`);
          } else {
            addDebugLog('✅ Expired token cleared');
          }
          setConnectionError('Google token verlopen - log opnieuw in');
          toast.warning('Google Calendar sessie verlopen, log opnieuw in');
        }
      } else {
        addDebugLog('ℹ️ No stored tokens found');
      }
    } else {
      addDebugLog('❌ No profile data found');
    }
  }, [user, addDebugLog]);

  useEffect(() => {
    // Load sync settings from database
    if (user) {
      loadSyncSettings();
    }
  }, [user, loadSyncSettings]);

  // Real-time subscription for connection status updates
  useEffect(() => {
    if (!user) return;

    addDebugLog('📡 Setting up real-time connection status monitoring...');

    // Subscribe to profile changes for real-time status updates
    const channel = supabase
      .channel(`profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          addDebugLog('📡 Profile update detected via real-time subscription');
          const newData = payload.new;
          
          // Update connection status based on token presence
          if (newData.google_access_token && newData.google_token_expires_at) {
            const expiresAt = new Date(newData.google_token_expires_at);
            const isExpired = expiresAt < new Date();
            
            if (!isExpired) {
              addDebugLog('✅ Connection status: CONNECTED (via real-time update)');
              setIsSignedIn(true);
              setConnectionError(null);
            } else {
              addDebugLog('⚠️ Connection status: TOKEN EXPIRED (via real-time update)');
              setIsSignedIn(false);
              setConnectionError('Token verlopen');
            }
          } else {
            addDebugLog('❌ Connection status: DISCONNECTED (via real-time update)');
            setIsSignedIn(false);
            setConnectionError('Geen actieve verbinding');
          }
        }
      )
      .subscribe();

    return () => {
      addDebugLog('📡 Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [user, addDebugLog]);

  const saveSyncSettings = async (enabled: boolean) => {
    if (!user) return;

    addDebugLog(`💾 Saving sync settings: ${enabled}`);
    const { error } = await supabase
      .from('profiles')
      .update({
        google_calendar_sync: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      addDebugLog(`❌ Error saving settings: ${error.message}`);
      logger.error(error, { context: 'google_calendar_save_settings', user_id: user.id });
      toast.error('Kon instellingen niet opslaan');
    } else {
      addDebugLog('✅ Settings saved successfully');
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    addDebugLog('🔐 Starting Google sign-in flow...');
    try {
      const tokenResponse = await signInToGoogle();
      if (tokenResponse && user) {
        addDebugLog('✅ Sign-in successful, received token');
        // Calculate token expiry time
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);
        addDebugLog(`⏱️ Token expires at: ${expiresAt.toLocaleString()}`);

        // Ensure Supabase session is still valid after OAuth popup
        const { data: { session: sbSession } } = await supabase.auth.getSession();
        addDebugLog(`🔑 Supabase session: ${sbSession ? 'VALID' : 'MISSING'}`);
        if (!sbSession) {
          setConnectionError('Supabase sessie verlopen — log opnieuw in');
          toast.error('Sessie verlopen, log opnieuw in');
          return;
        }

        // Store token via Edge Function (service role — bypasses all RLS/PostgREST issues)
        addDebugLog('💾 Storing token via Edge Function...');
        const saveResp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${sbSession.access_token}`,
            },
            body: JSON.stringify({
              type: 'google_calendar',
              access_token: tokenResponse.access_token,
              expires_at: expiresAt.toISOString(),
            }),
          }
        );
        const saveResult = await saveResp.json();
        if (!saveResp.ok || !saveResult.success) {
          const errMsg = saveResult.error || `HTTP ${saveResp.status}`;
          addDebugLog(`❌ save-token error: ${errMsg}`);
          setConnectionError(`Token opslaan mislukt: ${errMsg}`);
          logger.error(saveResult, { context: 'google_calendar_store_tokens', user_id: user.id });
          toast.error('Kon tokens niet opslaan in database');
          return;
        }

        addDebugLog('✅ Token stored in database');
        setIsSignedIn(true);
        setConnectionError(null);
        toast.success('Verbonden met Google Calendar');
        
        // Register webhook for real-time sync
        try {
          const webhookResult = await registerGoogleCalendarWebhook(user.id);
          if (webhookResult) {
            // Store webhook info in database
            await supabase
              .from('profiles')
              .update({
                webhook_channel_id: webhookResult.channelId,
                webhook_resource_id: webhookResult.resourceId,
                webhook_expiration: new Date(parseInt(webhookResult.expiration)).toISOString(),
              })
              .eq('id', user.id);
            addDebugLog('✅ Webhook registered successfully');
          }
        } catch (webhookError) {
          logger.error(webhookError, { context: 'google_calendar_register_webhook', user_id: user.id });
          // Don't fail sign-in if webhook fails
          toast.warning('Webhook registratie mislukt, fallback naar polling');
        }
        
        // Perform initial sync
        if (autoSync) {
          handleSync();
        }
      } else {
        toast.error('Kon niet verbinden met Google Calendar');
      }
    } catch (error) {
      logger.error(error, { context: 'google_calendar_signin', user_id: user?.id });
      toast.error(t('errors.errorSigning'));
    } finally {
      setIsLoading(false);
    }
  };


  const handleSignOut = async () => {
    if (!user) return;

    // Stop webhook before signing out
    try {
      const { data } = await supabase
        .from('profiles')
        .select('webhook_channel_id, webhook_resource_id')
        .eq('id', user.id)
        .single();

      if (data?.webhook_channel_id && data?.webhook_resource_id) {
        await stopGoogleCalendarWebhook(data.webhook_channel_id, data.webhook_resource_id);
        addDebugLog('✅ Webhook stopped');
      }
    } catch (webhookError) {
      logger.error(webhookError, { context: 'google_calendar_signout_webhook', user_id: user.id });
      // Continue with sign out even if webhook stop fails
    }

    // Revoke token at Google
    signOutFromGoogle();

    // Clear tokens from database
    const { error } = await supabase
      .from('profiles')
      .update({
        google_access_token: null,
        google_refresh_token: null,
        google_token_expires_at: null,
        webhook_channel_id: null,
        webhook_resource_id: null,
        webhook_expiration: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      logger.error(error, { context: 'google_calendar_clear_tokens', user_id: user.id });
    }

    setIsSignedIn(false);
    toast.info('Verbinding met Google Calendar verbroken - Tokens verwijderd');
  };

  const handleSync = useCallback(async () => {
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

      // Update local events with Google IDs
      for (const syncedEvent of syncToResults.syncedEvents) {
        const { error: updateError } = await supabase
          .from('calendar_events')
          .update({ google_event_id: syncedEvent.googleEventId })
          .eq('id', syncedEvent.localId);

        if (updateError) {
          logger.error(updateError, { context: 'google_calendar_update_event_id', event_id: syncedEvent.localId, user_id: user.id });
        }
      }

      // Sync from Google Calendar
      const syncFromResults = await syncFromGoogleCalendar(async (googleEvent) => {
        try {
          // Handle deletions
          if ((googleEvent as any)._action === 'delete') {
            const { error: deleteError } = await supabase
              .from('calendar_events')
              .delete()
              .eq('google_event_id', googleEvent.google_event_id);
            
            if (deleteError) {
              logger.error(deleteError, { context: 'google_calendar_delete_event', google_event_id: googleEvent.google_event_id, user_id: user.id });
            }
            return;
          }

          // Check if event already exists
          const { data: existing, error: checkError } = await supabase
            .from('calendar_events')
            .select('id')
            .eq('google_event_id', googleEvent.google_event_id)
            .maybeSingle();

          if (checkError) {
            logger.error(checkError, { context: 'google_calendar_check_existing', google_event_id: googleEvent.google_event_id, user_id: user.id });
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
              google_event_id: googleEvent.google_event_id,
            });

          if (insertError) {
            logger.error(insertError, { context: 'google_calendar_insert_event', google_event_id: googleEvent.google_event_id, user_id: user.id });
          }
        } catch (err) {
          logger.error(err, { context: 'google_calendar_process_event', user_id: user.id });
        }
      });

      // Update last sync time
      const now = new Date();
      setLastSyncTime(now);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_calendar_sync: now.toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        logger.error(updateError, { context: 'google_calendar_update_sync_time', user_id: user.id });
      }

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
      logger.error(error, { context: 'google_calendar_sync', user_id: user.id });
      toast.error(t('errors.errorSending'));
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSignedIn, t]);

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setAutoSync(enabled);
    await saveSyncSettings(enabled);
    
    if (enabled && isSignedIn) {
      toast.success('Automatische synchronisatie ingeschakeld');
    } else {
      toast.info('Automatische synchronisatie uitgeschakeld');
    }
  };

  // Auto-refresh token elke 50 minuten (voor 1-uur expiry)
  useEffect(() => {
    if (!user || !isSignedIn) return;

    addDebugLog('🔄 Setting up auto-refresh interval (every 5 minutes)');

    const refreshInterval = setInterval(async () => {
      addDebugLog('🔍 Checking if token needs refresh...');
      const { data, error } = await supabase
        .from('profiles')
        .select('google_token_expires_at')
        .eq('id', user.id)
        .single();

      if (error || !data?.google_token_expires_at) return;

      if (isTokenExpired(data.google_token_expires_at)) {
        addDebugLog('⏰ Token expiring soon, attempting silent refresh...');
        const newToken = await refreshCalendarTokenSilently();

        if (newToken) {
          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + 3600);
          addDebugLog(`✅ Token silently refreshed, expires at: ${expiresAt.toLocaleString()}`);
          await supabase
            .from('profiles')
            .update({ google_access_token: newToken, google_token_expires_at: expiresAt.toISOString() })
            .eq('id', user.id);
          setConnectionError(null);
          setIsSignedIn(true);
        } else {
          addDebugLog('❌ Silent refresh failed - user needs to re-authenticate');
          setConnectionError('Sessie verlopen - herverbind alsjeblieft');
          setIsSignedIn(false);
          toast.error('Google Calendar sessie verlopen, verbind opnieuw');
        }
      } else {
        const minutesRemaining = Math.floor((new Date(data.google_token_expires_at).getTime() - Date.now()) / 60000);
        addDebugLog(`✅ Token still valid (${minutesRemaining} minutes remaining)`);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, [user, isSignedIn, addDebugLog]);

  // Automatic sync interval (elke 15 minuten als autoSync enabled)
  useEffect(() => {
    if (!autoSync || !isSignedIn) return;

    const syncInterval = setInterval(() => {
      addDebugLog('⌛ Automatic sync triggered');
      handleSync();
    }, 15 * 60 * 1000); // Every 15 minutes

    return () => clearInterval(syncInterval);
  }, [autoSync, isSignedIn, handleSync, addDebugLog]);

  // Check and renew webhook if needed (check every hour)
  useEffect(() => {
    if (!user || !isSignedIn) return;

    const checkWebhook = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('webhook_expiration')
          .eq('id', user.id)
          .single();

        if (data?.webhook_expiration && webhookNeedsRenewal(new Date(data.webhook_expiration).getTime())) {
          addDebugLog('🔔 Webhook expiring soon, renewing...');
          const webhookResult = await registerGoogleCalendarWebhook(user.id);
          if (webhookResult) {
            const { error: webhookUpdateError } = await supabase
              .from('profiles')
              .update({
                webhook_channel_id: webhookResult.channelId,
                webhook_resource_id: webhookResult.resourceId,
                webhook_expiration: new Date(parseInt(webhookResult.expiration)).toISOString(),
              })
              .eq('id', user.id);
            
            if (webhookUpdateError) {
              addDebugLog(`❌ Failed to update webhook info: ${webhookUpdateError.message}`);
            } else {
              addDebugLog('✅ Webhook successfully renewed');
              toast.success('Google Calendar real-time sync verlengd');
            }
          } else {
            addDebugLog('❌ Webhook renewal failed');
            toast.error('Kon webhook niet verlengen - real-time sync mogelijk beperkt');
          }
        }
      } catch (error) {
        logger.error(error, { context: 'google_calendar_webhook_expiration_check', user_id: user.id });
      }
    };

    // Check immediately on mount
    checkWebhook();

    // Then check every hour
    const webhookCheckInterval = setInterval(checkWebhook, 60 * 60 * 1000);

    return () => clearInterval(webhookCheckInterval);
  }, [user, isSignedIn, addDebugLog]);

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

            {/* Debug Info Panel */}
            {debugInfo.length > 0 && (
              <div className="rounded-lg bg-muted/50 p-3 space-y-2 border border-border">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground">Debug Log</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDebugInfo([])}
                    className="h-6 px-2 text-xs"
                  >
                    Wissen
                  </Button>
                </div>
                <div className="space-y-0.5 max-h-32 overflow-y-auto font-mono text-xs">
                  {debugInfo.map((log, i) => (
                    <div key={i} className="text-muted-foreground">{log}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Connection Error Alert */}
            {connectionError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <h4 className="text-sm font-medium text-destructive">Verbindingsprobleem</h4>
                    <p className="text-xs text-destructive/80">{connectionError}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
