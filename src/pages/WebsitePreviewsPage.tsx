// Website Previews overview — all previews across all projects
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Globe, Link2, Copy, Eye, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Preview {
  id: string;
  title: string;
  preview_url: string;
  token: string;
  status: string;
  viewed_at: string | null;
  created_at: string;
  project: { id: string; title: string } | null;
  company: { name: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive'; icon: React.ElementType; color: string }> = {
  draft:    { label: 'Concept',      variant: 'outline',     icon: Clock,        color: 'text-gray-500' },
  sent:     { label: 'Verzonden',    variant: 'secondary',   icon: Link2,        color: 'text-blue-600' },
  viewed:   { label: 'Bekeken',      variant: 'default',     icon: Eye,          color: 'text-orange-600' },
  approved: { label: 'Goedgekeurd', variant: 'default',     icon: CheckCircle2, color: 'text-green-600' },
  rejected: { label: 'Feedback',    variant: 'destructive', icon: XCircle,      color: 'text-red-600' },
};

export default function WebsitePreviewsPage() {
  const { data: previews = [], isLoading } = useQuery({
    queryKey: ['website_previews_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('website_previews')
        .select('*, project:projects(id, title), company:companies(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Preview[];
    },
  });

  function getShareLink(token: string) {
    return `${window.location.origin}/preview/${token}`;
  }

  function copyLink(token: string, title: string) {
    navigator.clipboard.writeText(getShareLink(token));
    toast.success(`Link gekopieerd: ${title}`);
  }

  return (
    <AppLayout title="Website Previews" subtitle="Alle gedeelde previews met prospects">
      <div className="space-y-4">
      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : previews.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nog geen previews aangemaakt</p>
            <p className="text-sm mt-1">Ga naar een project om een website preview te delen.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/projects">Naar projecten</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {previews.map((preview) => {
            const cfg = STATUS_CONFIG[preview.status] ?? STATUS_CONFIG.draft;
            const StatusIcon = cfg.icon;
            const shareLink = getShareLink(preview.token);

            return (
              <Card key={preview.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-sm">{preview.title}</span>
                      <Badge variant={cfg.variant} className={`text-xs gap-1 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </Badge>
                      {preview.project && (
                        <Link
                          to={`/projects/${preview.project.id}`}
                          className="text-xs text-muted-foreground hover:text-primary hover:underline"
                        >
                          {preview.project.title}
                        </Link>
                      )}
                      {preview.company && (
                        <span className="text-xs text-muted-foreground">· {preview.company.name}</span>
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

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
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
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </AppLayout>
  );
}
