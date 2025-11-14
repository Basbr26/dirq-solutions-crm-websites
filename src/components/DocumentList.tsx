import { Document } from '@/types/sickLeave';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Download, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

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
                  onClick={() => window.open(doc.file_url, '_blank')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = doc.file_url;
                    link.download = doc.file_name;
                    link.click();
                  }}
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
