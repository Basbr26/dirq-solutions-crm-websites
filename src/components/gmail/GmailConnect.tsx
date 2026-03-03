import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { initGmail, signInToGmail, setGmailToken, refreshGmailTokenSilently } from '@/lib/gmail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function GmailConnect() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    try {
      const ok = await initGmail();
      setIsInitialized(ok);
      if (!ok) setConnectionError('Gmail API kon niet worden geïnitialiseerd');
    } catch (error) {
      logger.error(error, { context: 'gmail_init' });
      setConnectionError('Initialisatie mislukt');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const loadSettings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('gmail_access_token, gmail_token_expires_at, gmail_sync_enabled, gmail_last_sync')
      .eq('id', user.id)
      .single();

    if (data) {
      setAutoSync(data.gmail_sync_enabled || false);
      setLastSync(data.gmail_last_sync ? new Date(data.gmail_last_sync) : null);

      if (data.gmail_access_token && data.gmail_token_expires_at) {
        const expiresAt = new Date(data.gmail_token_expires_at);
        if (expiresAt > new Date()) {
          // Restore token in gapi
          const expiresIn = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
          setGmailToken(data.gmail_access_token, expiresIn);
          setIsConnected(true);
          setConnectionError(null);
        } else {
          setConnectionError('Gmail token verlopen — verbind opnieuw');
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) loadSettings();
  }, [user, loadSettings]);

  // Silent token refresh every 5 minutes when connected
  useEffect(() => {
    if (!user || !isConnected) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('gmail_token_expires_at')
        .eq('id', user.id)
        .single();
      if (!data?.gmail_token_expires_at) return;
      const expiresAt = new Date(data.gmail_token_expires_at);
      const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
      if (expiresAt <= fiveMinFromNow) {
        const newToken = await refreshGmailTokenSilently();
        if (newToken) {
          const newExpiry = new Date(Date.now() + 3600 * 1000);
          await supabase
            .from('profiles')
            .update({ gmail_access_token: newToken, gmail_token_expires_at: newExpiry.toISOString() })
            .eq('id', user.id);
          setConnectionError(null);
        } else {
          setIsConnected(false);
          setConnectionError('Gmail sessie verlopen — verbind opnieuw');
        }
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, isConnected]);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const tokenResponse = await signInToGmail();
      if (!tokenResponse || !user) {
        if (!tokenResponse) toast.info('Gmail verbinding geannuleerd');
        return;
      }

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          role: 'SUPPORT',
          gmail_access_token: tokenResponse.access_token,
          gmail_token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) {
        setConnectionError('Token opslaan mislukt');
        toast.error('Kon Gmail-tokens niet opslaan');
        return;
      }

      setIsConnected(true);
      setConnectionError(null);
      toast.success('Gmail succesvol verbonden');
    } catch (error) {
      logger.error(error, { context: 'gmail_connect', user_id: user?.id });
      toast.error('Gmail verbinden mislukt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        gmail_access_token: null,
        gmail_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setIsConnected(false);
    toast.info('Gmail verbinding verbroken');
  };

  const handleSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gmail-sync`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({}),
        }
      );
      const data = await resp.json();
      if (data.success) {
        const now = new Date();
        setLastSync(now);
        toast.success(`${data.synced} emails gesynchroniseerd`);
      } else {
        toast.error(data.error || 'Synchronisatie mislukt');
      }
    } catch (error) {
      logger.error(error, { context: 'gmail_manual_sync', user_id: user.id });
      toast.error('Synchronisatie mislukt');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAutoSyncToggle = async (enabled: boolean) => {
    setAutoSync(enabled);
    if (user) {
      await supabase
        .from('profiles')
        .update({ gmail_sync_enabled: enabled })
        .eq('id', user.id);
    }
    toast.info(enabled ? 'Auto-sync ingeschakeld' : 'Auto-sync uitgeschakeld');
  };

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label>Verbindingsstatus</Label>
          <p className="text-sm text-muted-foreground">
            {isConnected ? 'Verbonden met Gmail' : 'Niet verbonden'}
          </p>
        </div>
        <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
          {isConnected ? (
            <><CheckCircle2 className="h-3 w-3" /> Verbonden</>
          ) : (
            <><AlertCircle className="h-3 w-3" /> Niet verbonden</>
          )}
        </Badge>
      </div>

      {/* Connect / Disconnect */}
      {!isConnected ? (
        <Button
          onClick={handleConnect}
          disabled={isLoading || !isInitialized}
          className="w-full gap-2"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Verbind Gmail
        </Button>
      ) : (
        <Button onClick={handleDisconnect} variant="outline" className="w-full">
          Verbinding verbreken
        </Button>
      )}

      {isConnected && (
        <>
          {/* Auto-sync toggle */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="gmail-auto-sync">Automatische synchronisatie</Label>
              <p className="text-sm text-muted-foreground">Emails periodiek synchroniseren</p>
            </div>
            <Switch
              id="gmail-auto-sync"
              checked={autoSync}
              onCheckedChange={handleAutoSyncToggle}
            />
          </div>

          {/* Manual sync */}
          <div className="space-y-2">
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="secondary"
              className="w-full gap-2"
            >
              {isSyncing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Synchroniseren...</>
              ) : (
                <><RefreshCw className="h-4 w-4" /> Nu synchroniseren</>
              )}
            </Button>
            {lastSync && (
              <p className="text-xs text-center text-muted-foreground">
                Laatste sync: {lastSync.toLocaleString('nl-NL')}
              </p>
            )}
          </div>
        </>
      )}

      {/* Error */}
      {connectionError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive/80">{connectionError}</p>
        </div>
      )}
    </div>
  );
}
