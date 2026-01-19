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
import { DocumentSigningDialog } from './DocumentSigningDialog';
import { useTranslation } from 'react-i18next';

interface Document {
  id: string;
  title: string;
  document_type?: string;
  file_name: string;
  file_path: string;
  signed_file_path?: string;
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
  const { t } = useTranslation();
  const handleDownload = async () => {
    try {
      // Use signed PDF if available, otherwise original
      const filePath = document.signed_file_path || document.file_path;
      const bucketName = document.signed_file_path ? 'signed-documents' : 'documents';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.signed_file_path ? `signed_${document.file_name}` : document.file_name;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(t('success.documentDownloaded'));
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error(t('errors.downloadFailed'));
    }
  };

  const handleView = async () => {
    try {
      // Use signed PDF if available, otherwise original
      const filePath = document.signed_file_path || document.file_path;
      const bucketName = document.signed_file_path ? 'signed-documents' : 'documents';
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 3600); // 1 hour

      if (error) throw error;
      if (!data?.signedUrl) throw new Error(t('errors.noUrlReceived'));

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error(t('errors.openFailed'));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('documents.deleteConfirmation'))) return;

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

      toast.success(t('success.documentDeleted'));
      onDelete?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(t('errors.deleteFailed'));
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
            {t('documents.signed')}
          </Badge>
        );
      } else {
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t('documents.awaitingSignature')}
          </Badge>
        );
      }
    }
    return (
      <Badge variant="outline">
        {document.status === 'completed' ? t('documents.completed') : t('documents.draft')}
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
          <div className="flex items-center gap-2">
            {/* Show sign button if document requires signature and not yet signed */}
            {document.requires_signatures && 
             document.requires_signatures.length > 0 && 
             !document.owner_signed && (
              <DocumentSigningDialog 
                document={document} 
                onSigned={onDelete} 
              />
            )}
            
            <Button variant="ghost" size="icon" onClick={handleView} title={t('documents.view')}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDownload} title={t('documents.download')}>
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
                  {t('documents.view')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  {t('documents.download')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
