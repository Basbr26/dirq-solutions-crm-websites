// Website Preview Tab — shown in ProjectDetailPage
// Allows creating shareable preview links for a project
// Supports: manual URL input OR ZIP/HTML file upload (deployed via Vercel Deploy API)

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Link2, Copy, Plus, Eye, CheckCircle2, XCircle, Clock, Globe, Upload, ExternalLink, Trash2, Loader2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface WebsitePreview {
  id: string;
  title: string;
  preview_url: string;
  token: string;
  status: string;
  deploy_status: string;
  viewed_at: string | null;
  created_at: string;
}

interface Props {
  projectId: string;
  companyId?: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive'; icon: React.ElementType; color: string }> = {
  draft:    { label: 'Concept',      variant: 'outline',     icon: Clock,        color: 'text-gray-500' },
  sent:     { label: 'Verzonden',    variant: 'secondary',   icon: Link2,        color: 'text-blue-600' },
  viewed:   { label: 'Bekeken',      variant: 'default',     icon: Eye,          color: 'text-orange-600' },
  approved: { label: 'Goedgekeurd', variant: 'default',     icon: CheckCircle2, color: 'text-green-600' },
  rejected: { label: 'Feedback',    variant: 'destructive', icon: XCircle,      color: 'text-red-600' },
};

type Mode = 'url' | 'zip';

export function WebsitePreviewTab({ projectId, companyId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<Mode>('url');
  const [title, setTitle] = useState('Website Preview');
  const [url, setUrl] = useState('');

  // ZIP upload state
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Send dialog state
  const [sendDialogPreview, setSendDialogPreview] = useState<WebsitePreview | null>(null);
  const [sendEmail, setSendEmail] = useState('');
  const [sendName, setSendName] = useState('');
  const [sendMessage, setSendMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: previews = [], isLoading } = useQuery({
    queryKey: ['website_previews', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_previews')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as WebsitePreview[];
    },
  });

  // Fetch primary contact for email pre-fill
  const { data: primaryContact } = useQuery({
    queryKey: ['company_primary_contact', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('email, first_name, last_name')
        .eq('company_id', companyId!)
        .eq('is_primary', true)
        .maybeSingle();
      return data;
    },
  });

  const { data: company } = useQuery({
    queryKey: ['company_email', companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('name, email')
        .eq('id', companyId!)
        .maybeSingle();
      return data;
    },
  });

  const deletePreview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('website_previews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website_previews', projectId] });
      toast.success('Preview verwijderd');
    },
    onError: () => toast.error('Fout bij verwijderen'),
  });

  const createPreview = useMutation({
    mutationFn: async ({ url, deployStatus }: { url: string; deployStatus: string }) => {
      const { data, error } = await supabase
        .from('website_previews')
        .insert({
          project_id: projectId,
          company_id: companyId ?? null,
          title: title.trim() || 'Website Preview',
          preview_url: url,
          deploy_status: deployStatus,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website_previews', projectId] });
      toast.success('Preview link aangemaakt!');
      resetForm();
    },
    onError: () => {
      toast.error('Fout bij aanmaken preview link');
    },
  });

  function resetForm() {
    setShowForm(false);
    setTitle('Website Preview');
    setUrl('');
    setZipFile(null);
    setUploadProgress(0);
    setMode('url');
  }

  function getShareLink(token: string) {
    return `${window.location.origin}/preview/${token}`;
  }

  function copyLink(token: string, previewTitle: string) {
    navigator.clipboard.writeText(getShareLink(token));
    toast.success(`Link gekopieerd: ${previewTitle}`);
  }

  function openSendDialog(preview: WebsitePreview) {
    setSendDialogPreview(preview);
    const email = primaryContact?.email ?? company?.email ?? '';
    const name = primaryContact
      ? `${primaryContact.first_name ?? ''} ${primaryContact.last_name ?? ''}`.trim()
      : '';
    setSendEmail(email);
    setSendName(name);
    setSendMessage('');
  }

  function closeSendDialog() {
    setSendDialogPreview(null);
    setSendEmail('');
    setSendName('');
    setSendMessage('');
  }

  async function handleSend() {
    if (!sendDialogPreview) return;
    if (!sendEmail.trim()) { toast.error('Vul een e-mailadres in'); return; }

    setSending(true);
    try {
      const shareLink = getShareLink(sendDialogPreview.token);

      const { error: fnError } = await supabase.functions.invoke('send-preview-email', {
        body: {
          to: sendEmail.trim(),
          recipientName: sendName.trim() || undefined,
          companyName: company?.name || undefined,
          previewTitle: sendDialogPreview.title,
          previewLink: shareLink,
          senderName: user?.email ? user.email.split('@')[0] : 'Dirq Solutions',
          message: sendMessage.trim() || undefined,
        },
      });

      if (fnError) throw fnError;

      await supabase
        .from('website_previews')
        .update({ status: 'sent', viewer_email: sendEmail.trim() })
        .eq('id', sendDialogPreview.id);

      queryClient.invalidateQueries({ queryKey: ['website_previews', projectId] });
      toast.success(`Preview verstuurd naar ${sendEmail.trim()}`);
      closeSendDialog();
    } catch (err) {
      console.error(err);
      toast.error('Fout bij versturen');
    } finally {
      setSending(false);
    }
  }

  function handleCreate() {
    if (!url.trim()) { toast.error('Vul een preview URL in'); return; }
    try { new URL(url.trim()); } catch { toast.error('Voer een geldige URL in (inclusief https://)'); return; }
    createPreview.mutate({ url: url.trim(), deployStatus: 'ready' });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.zip') && !name.endsWith('.html') && !name.endsWith('.htm')) {
      toast.error('Selecteer een .zip of .html bestand');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Bestand is groter dan 50 MB');
      return;
    }
    setZipFile(file);
  }

  async function handleZipUpload() {
    if (!zipFile) { toast.error('Selecteer eerst een bestand'); return; }

    setUploading(true);
    setUploadProgress(10);

    try {
      const isHtml = zipFile.name.toLowerCase().endsWith('.html') || zipFile.name.toLowerCase().endsWith('.htm');
      let zipBlob: Blob;

      if (isHtml) {
        const zip = new JSZip();
        zip.file('index.html', await zipFile.arrayBuffer());
        zipBlob = await zip.generateAsync({ type: 'blob' });
      } else {
        zipBlob = zipFile;
      }

      setUploadProgress(30);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Sessie verlopen, log opnieuw in');
        return;
      }

      setUploadProgress(50);

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-to-netlify`;
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/zip',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: zipBlob,
      });

      setUploadProgress(80);

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Deploy mislukt (${response.status})`);
      }

      setUploadProgress(100);
      createPreview.mutate({ url: result.url, deployStatus: result.deploy_status ?? 'ready' });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Deploy mislukt');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Website Preview Links
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Deel een website preview met de prospect via een beveiligde link
          </p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nieuwe preview
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Naam</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Website Preview v1"
                className="mt-1"
              />
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-md overflow-hidden border border-input w-fit text-sm">
              <button
                type="button"
                onClick={() => setMode('url')}
                className={`px-3 py-1.5 transition-colors ${mode === 'url' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              >
                URL invoeren
              </button>
              <button
                type="button"
                onClick={() => setMode('zip')}
                className={`px-3 py-1.5 transition-colors ${mode === 'zip' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
              >
                Bestand uploaden
              </button>
            </div>

            {mode === 'url' ? (
              <div>
                <Label className="text-sm">Preview URL *</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://lovable.app/projects/..."
                  className="mt-1"
                  type="url"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Plak hier de URL van Lovable, Emergent, Vercel of een andere preview
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-sm">ZIP-bestand *</Label>
                <div
                  className="mt-1 border-2 border-dashed border-input rounded-md p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                  {zipFile ? (
                    <p className="text-sm font-medium">{zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Klik om een .html of .zip te selecteren (max 50 MB)</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.html,.htm"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ZIP of HTML-bestand — broncode of gebouwde versie. Wordt automatisch gebouwd en gehost via Vercel.
                </p>
                {uploading && (
                  <div className="mt-2 space-y-1">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {uploadProgress < 40 ? 'Bestanden uploaden...'
                        : uploadProgress < 80 ? 'Bouwen... (dit duurt ~1-2 minuten)'
                        : 'Bijna klaar...'}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {mode === 'url' ? (
                <Button onClick={handleCreate} disabled={createPreview.isPending} size="sm">
                  {createPreview.isPending ? 'Aanmaken...' : 'Link genereren'}
                </Button>
              ) : (
                <Button onClick={handleZipUpload} disabled={uploading || !zipFile || createPreview.isPending} size="sm">
                  {uploading ? `Uploaden... ${uploadProgress}%` : createPreview.isPending ? 'Opslaan...' : 'Uploaden & link genereren'}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={resetForm} disabled={uploading}>
                Annuleren
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Preview list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : previews.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-sm">Geen preview links</p>
            <p className="text-xs mt-1">Maak een nieuwe preview aan om te delen met de prospect</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {previews.map((preview) => {
            const cfg = STATUS_CONFIG[preview.status] ?? STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const shareLink = getShareLink(preview.token);
            const isBuilding = preview.deploy_status === 'building';

            return (
              <Card key={preview.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-sm">{preview.title}</span>
                      <Badge variant={cfg.variant} className={`text-xs gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                      {isBuilding && (
                        <Badge variant="secondary" className="text-xs gap-1 text-yellow-600">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Bouwen...
                        </Badge>
                      )}
                      {preview.deploy_status === 'failed' && (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <XCircle className="w-3 h-3" />
                          Build mislukt
                        </Badge>
                      )}
                    </div>
                    <a
                      href={preview.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      {preview.preview_url}
                    </a>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Aangemaakt: {format(new Date(preview.created_at), 'd MMM yyyy', { locale: nl })}</span>
                      {preview.viewed_at && (
                        <span>Bekeken: {format(new Date(preview.viewed_at), 'd MMM yyyy HH:mm', { locale: nl })}</span>
                      )}
                    </div>
                    {/* Share link */}
                    <div className="flex items-center gap-2 mt-2 bg-gray-50 rounded px-2 py-1.5">
                      <Link2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-xs text-gray-600 truncate flex-1">{shareLink}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => copyLink(preview.token, preview.title)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-primary gap-1"
                      onClick={() => openSendDialog(preview)}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Verstuur
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => deletePreview.mutate(preview.id)}
                      disabled={deletePreview.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Send dialog */}
      <Dialog open={!!sendDialogPreview} onOpenChange={(open) => { if (!open) closeSendDialog(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Preview versturen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">E-mailadres *</Label>
              <Input
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
                placeholder="klant@bedrijf.nl"
                type="email"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Naam ontvanger</Label>
              <Input
                value={sendName}
                onChange={(e) => setSendName(e.target.value)}
                placeholder="Jan de Vries"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm">Persoonlijk bericht (optioneel)</Label>
              <Textarea
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
                placeholder="Hierbij de website preview zoals besproken..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={closeSendDialog} disabled={sending}>
              Annuleren
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Versturen...' : 'Verstuur preview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
