import { Document } from '@/types/sickLeave';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentListProps {
  documents: Document[];
  onDelete?: (id: string) => void;
}

const categoryLabels: Record<string, string> = {
  medisch_attest: 'Medisch attest',
  probleemanalyse: 'Probleemanalyse',
  plan_van_aanpak: 'Plan van aanpak',
  evaluatie_3_maanden: 'Evaluatie 3 maanden',
  evaluatie_6_maanden: 'Evaluatie 6 maanden',
  evaluatie_1_jaar: 'Evaluatie 1 jaar',
  herstelmelding: 'Herstelmelding',
  overig: 'Overig',
};

const categoryColors: Record<string, string> = {
  medisch_attest: 'bg-destructive/10 text-destructive',
  probleemanalyse: 'bg-primary/10 text-primary',
  plan_van_aanpak: 'bg-secondary/10 text-secondary-foreground',
  evaluatie_3_maanden: 'bg-accent/10 text-accent-foreground',
  evaluatie_6_maanden: 'bg-accent/10 text-accent-foreground',
  evaluatie_1_jaar: 'bg-accent/10 text-accent-foreground',
  herstelmelding: 'bg-primary/10 text-primary',
  overig: 'bg-muted text-muted-foreground',
};

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const isFullUrl = (url: string) => /^https?:\/\//i.test(url);

  const viewDocument = async (doc: Document) => {
    if (isFullUrl(doc.file_url)) {
      window.open(doc.file_url, '_blank');
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_url);

      if (error || !data) {
        throw error || new Error('Bestand niet gevonden');
      }

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error('Error viewing document:', error);
      toast.error('Kon document niet openen');
    }
  };

  const downloadDocument = async (doc: Document) => {
    if (isFullUrl(doc.file_url)) {
      const link = document.createElement('a');
      link.href = doc.file_url;
      link.download = doc.file_name;
      link.click();
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_url);

      if (error || !data) {
        throw error || new Error('Bestand niet gevonden');
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Kon document niet downloaden');
    }
  };

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Nog geen documenten geüpload</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <Card key={doc.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{doc.file_name}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="outline" className={categoryColors[doc.document_type]}>
                      {categoryLabels[doc.document_type]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {doc.created_at && format(new Date(doc.created_at), 'dd MMM yyyy', { locale: nl })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => viewDocument(doc)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => downloadDocument(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                {onDelete && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onDelete(doc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
