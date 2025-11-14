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

const categoryLabels = {
  medisch: 'Medisch',
  correspondentie: 'Correspondentie',
  're-integratie': 'Re-integratie',
  overig: 'Overig',
};

const categoryColors = {
  medisch: 'bg-destructive/10 text-destructive',
  correspondentie: 'bg-primary/10 text-primary',
  're-integratie': 'bg-secondary/10 text-secondary-foreground',
  overig: 'bg-muted text-muted-foreground',
};

export function DocumentList({ documents, onDelete }: DocumentListProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
                  <h4 className="font-medium truncate">{doc.naam}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge variant="outline" className={categoryColors[doc.categorie]}>
                      {categoryLabels[doc.categorie]}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(doc.grootte)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: nl })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Geüpload door {doc.uploaded_by}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="ghost">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost">
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
