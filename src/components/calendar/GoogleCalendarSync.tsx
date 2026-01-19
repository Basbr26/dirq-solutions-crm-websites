import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  initGoogleCalendar,
  signInToGoogle,
  signOutFromGoogle,
  isGoogleSignedIn,
  syncToGoogleCalendar,
  syncFromGoogleCalendar,
  refreshAccessToken,
  refreshGoogleAccessToken,
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
    console.log(`[GoogleCalendarSync] ${message}`);
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
      console.error('Failed to initialize Google Calendar:', error);
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
          // Token is valid, restore session in gapi client
          try {
            let gapiCheckAttempts = 0;
            // Wait for gapi to be initialized
            const checkGapi = setInterval(() => {
              gapiCheckAttempts++;
              if (window.gapi?.client) {
                clearInterval(checkGapi);
                // Restore token in gapi client
                window.gapi.client.setToken({
                  access_token: data.google_access_token,
                  expires_in: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
                });
                setIsSignedIn(true);
                setConnectionError(null);
                addDebugLog('✅ Google Calendar sessie hersteld uit database');
                toast.success('Google Calendar verbinding hersteld');
              } else if (gapiCheckAttempts > 50) {
                clearInterval(checkGapi);
                addDebugLog('❌ Timeout: gapi.client niet beschikbaar na 5 seconden');
                setConnectionError('Google API kon niet worden geladen');
              }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => clearInterval(checkGapi), 5000);
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            addDebugLog(`❌ Error restoring session: ${errorMsg}`);
            setConnectionError(`Sessie herstel fout: ${errorMsg}`);
            console.error('Error restoring Google session:', error);
          }
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
      console.error('Error saving sync settings:', error);
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

        // Store tokens securely in Supabase profiles table
        addDebugLog('💾 Storing token in database...');
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            google_access_token: tokenResponse.access_token,
            google_token_expires_at: expiresAt.toISOString(),
            google_refresh_token: tokenResponse.refresh_token || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          addDebugLog(`❌ Database error: ${updateError.message}`);
          setConnectionError(`Token opslaan mislukt: ${updateError.message}`);
          console.error('Error storing Google tokens:', updateError);
          toast.error('Kon tokens niet opslaan in database');
          return;
        }

        addDebugLog('✅ Token stored in database');
        setIsSignedIn(true);
        setConnectionError(null);
        
        // Check if we have refresh token
        if (!tokenResponse.refresh_token) {
          addDebugLog('⚠️ No refresh_token received');
          setConnectionError('Let op: geen refresh token - sessie verloopt na 1 uur');
          toast.warning('Verbonden - Maar sessie verloopt na 1 uur (geen refresh token)', { duration: 5000 });
        } else {
          addDebugLog('✅ Refresh token ontvangen - persistente authenticatie actief');
          toast.success('Verbonden met Google Calendar met persistente authenticatie');
          
          // Setup automatic token refresh
          setupTokenRefresh(tokenResponse.refresh_token, expiresAt);
        }
        
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
            console.log('Google Calendar webhook registered successfully');
          }
        } catch (webhookError) {
          console.error('Error registering webhook:', webhookError);
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
      console.error('Sign in error:', error);
      toast.error(t('errors.errorSigning'));
    } finally {
      setIsLoading(false);
    }
  };

  // Setup automatic token refresh before expiry
  const setupTokenRefresh = useCallback((refreshToken: string, expiresAt: Date) => {
    if (!user) return;

    // Calculate time until token expires (refresh 5 minutes before)
    const now = new Date();
    const timeUntilExpiry = expiresAt.getTime() - now.getTime();
    const refreshTime = Math.max(timeUntilExpiry - (5 * 60 * 1000), 60000); // Min 1 minute

    addDebugLog(`🔄 Setting up auto-refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);

    const timeoutId = setTimeout(async () => {
      addDebugLog('🔄 Auto-refreshing access token...');
      try {
        const newTokenData = await refreshGoogleAccessToken(refreshToken);
        
        if (newTokenData) {
          const newExpiresAt = new Date();
          newExpiresAt.setSeconds(newExpiresAt.getSeconds() + newTokenData.expires_in);
          
          // Update database with new access token
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              google_access_token: newTokenData.access_token,
              google_token_expires_at: newExpiresAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          if (updateError) {
            addDebugLog(`❌ Failed to update token: ${updateError.message}`);
            console.error('Error updating refreshed token:', updateError);
          } else {
            addDebugLog('✅ Token auto-refreshed successfully');
            // Schedule next refresh
            setupTokenRefresh(refreshToken, newExpiresAt);
          }
        } else {
          addDebugLog('❌ Token refresh failed');
          setConnectionError('Token vernieuwen mislukt - herverbind alsjeblieft');
        }
      } catch (error) {
        console.error('Error auto-refreshing token:', error);
        addDebugLog('❌ Auto-refresh error');
      }
    }, refreshTime);

    return () => clearTimeout(timeoutId);
  }, [user, addDebugLog]);

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
        console.log('Google Calendar webhook stopped');
      }
    } catch (webhookError) {
      console.error('Error stopping webhook:', webhookError);
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
      console.error('Error clearing Google tokens:', error);
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
          console.error('Error updating google_event_id:', updateError);
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
              console.error('Error deleting event:', deleteError);
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
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          last_calendar_sync: now.toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating last sync time:', updateError);
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
      console.error('Sync error:', error);
      toast.error(t('errors.errorSending'));
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSignedIn]);

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
        .select('google_refresh_token, google_token_expires_at')
        .eq('id', user.id)
        .single();

      if (error) {
        addDebugLog(`❌ Error fetching token data: ${error.message}`);
        return;
      }

      if (!data?.google_refresh_token || !data?.google_token_expires_at) {
        addDebugLog('⚠️ No refresh token available - user needs to re-authenticate');
        setConnectionError('Geen refresh token - log opnieuw in voor blijvende toegang');
        toast.warning('Google Calendar: log opnieuw in voor automatische vernieuwing');
        return;
      }

      // Check if token needs refresh (expires binnen 10 minuten)
      if (isTokenExpired(data.google_token_expires_at)) {
        addDebugLog('⏰ Token expiring soon, attempting refresh...');
        
        const newToken = await refreshAccessToken(data.google_refresh_token);
        
        if (!newToken) {
          addDebugLog('❌ Token refresh returned null');
        }
        
        if (newToken) {
          // Calculate new expiry
          const expiresAt = new Date();
          expiresAt.setSeconds(expiresAt.getSeconds() + newToken.expires_in);

          addDebugLog(`✅ New token received, expires at: ${expiresAt.toLocaleString()}`);

          // Update database
          const { error } = await supabase
            .from('profiles')
            .update({
              google_access_token: newToken.access_token,
              google_token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', user.id);

          if (error) {
            addDebugLog(`❌ Error updating refreshed token in DB: ${error.message}`);
            setConnectionError(`Token update fout: ${error.message}`);
            console.error('Error updating refreshed token:', error);
          } else {
            // Update gapi client
            window.gapi?.client?.setToken({
              access_token: newToken.access_token,
              expires_in: newToken.expires_in,
            });
            addDebugLog('✅ Token automatically refreshed and stored');
            setConnectionError(null);
          }
        } else {
          addDebugLog('❌ Token refresh failed - refresh token may be revoked');
          setConnectionError('Token refresh gefaald - mogelijk ingetrokken door Google');
          console.error('Token refresh failed, user needs to re-authenticate');
          toast.error('Google Calendar sessie verlopen, log opnieuw in');
          setIsSignedIn(false);
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
      console.log('Automatic sync triggered');
      handleSync();
    }, 15 * 60 * 1000); // Every 15 minutes

    return () => clearInterval(syncInterval);
  }, [autoSync, isSignedIn, handleSync]); // Added handleSync to dependencies

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
          console.log('Webhook expiring soon, renewing...');
          const webhookResult = await registerGoogleCalendarWebhook(user.id);
          if (webhookResult) {
            await supabase
              .from('profiles')
              .update({
                webhook_channel_id: webhookResult.channelId,
                webhook_resource_id: webhookResult.resourceId,
                webhook_expiration: new Date(parseInt(webhookResult.expiration)).toISOString(),
              })
              .eq('id', user.id);
            toast.info('Webhook verlengd voor real-time sync');
          }
        }
      } catch (error) {
        console.error('Error checking webhook expiration:', error);
      }
    };

    // Check immediately on mount
    checkWebhook();

    // Then check every hour
    const webhookCheckInterval = setInterval(checkWebhook, 60 * 60 * 1000);

    return () => clearInterval(webhookCheckInterval);
  }, [user, isSignedIn]);

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
