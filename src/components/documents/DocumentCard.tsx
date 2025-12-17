import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Download, Eye, Trash2, MoreVertical, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DOCUMENT_TYPE_LABELS } from '@/types/verzuimDocumentTypes';

interface Document {
  id: string;
  title: string;
  document_type?: string;
  file_name: string;
  file_path: string;
  status: string;
  created_at: string;
  uploaded_by?: string;
  requires_signatures?: string[];
  owner_signed?: boolean;
}

interface DocumentCardProps {
  document: Document;
  onDelete?: () => void;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  const handleDownload = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.file_name;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Document gedownload');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Fout bij downloaden document');
    }
  };

  const handleView = async () => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600); // 1 hour

      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Geen URL ontvangen');

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Fout bij openen document');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      toast.success('Document verwijderd');
      onDelete?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Fout bij verwijderen document');
    }
  };

  const getFileIcon = () => {
    const extension = document.file_name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      default:
        return '📎';
    }
  };

  const getStatusBadge = () => {
    if (document.requires_signatures && document.requires_signatures.length > 0) {
      if (document.owner_signed) {
        return (
          <Badge variant="default" className="bg-success text-success-foreground">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ondertekend
          </Badge>
        );
      } else {
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Wacht op handtekening
          </Badge>
        );
      }
    }
    return (
      <Badge variant="outline">
        {document.status === 'completed' ? 'Voltooid' : 'Concept'}
      </Badge>
    );
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Icon and info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">{getFileIcon()}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{document.title}</h4>
                {getStatusBadge()}
              </div>
              {document.document_type && (
                <p className="text-xs text-muted-foreground mb-1">
                  {DOCUMENT_TYPE_LABELS[document.document_type as keyof typeof DOCUMENT_TYPE_LABELS] || document.document_type}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(document.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleView} title="Bekijken">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title="Downloaden">
              <Download className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleView}>
                  <Eye className="h-4 w-4 mr-2" />
                  Bekijken
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Downloaden
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Verwijderen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
