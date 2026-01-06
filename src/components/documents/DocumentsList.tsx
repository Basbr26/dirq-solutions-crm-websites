/**
 * DocumentsList Component
 * Display and manage uploaded documents
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  File,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  FileImage,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface Document {
  id: string;
  created_at: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  category: string | null;
  uploaded_by: string | null;
  profiles?: {
    voornaam: string;
    achternaam: string;
  } | null;
}

interface DocumentsListProps {
  companyId?: string;
  contactId?: string;
  projectId?: string;
  quoteId?: string;
}

const categoryLabels: Record<string, string> = {
  contract: 'Contract',
  proposal: 'Voorstel',
  invoice: 'Factuur',
  agreement: 'Overeenkomst',
  specification: 'Specificatie',
  other: 'Anders',
};

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  if (fileType.includes('image')) return FileImage;
  return File;
};

export const DocumentsList = ({
  companyId,
  contactId,
  projectId,
  quoteId,
}: DocumentsListProps) => {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents', { companyId, contactId, projectId, quoteId }],
    queryFn: async () => {
      let query = supabase
        .from('documents')
        .select(`
          *,
          profiles:profiles!documents_uploaded_by_fkey(voornaam, achternaam)
        `)
        .order('created_at', { ascending: false });

      // Filter by association
      if (companyId) query = query.eq('company_id', companyId);
      if (contactId) query = query.eq('contact_id', contactId);
      if (projectId) query = query.eq('project_id', projectId);
      if (quoteId) query = query.eq('quote_id', quoteId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const doc = documents.find((d) => d.id === id);
      if (!doc) throw new Error('Document niet gevonden');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Document verwijderd');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (error: Error) => {
      toast.error(`Verwijderen mislukt: ${error.message}`);
    },
  });

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Document gedownload');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download mislukt');
    }
  };

  const canDelete = (doc: Document) => {
    return role === 'ADMIN' || doc.uploaded_by === user?.id;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <File className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Geen documenten gevonden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Gebruik de upload knop om documenten toe te voegen
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {documents.map((doc) => {
          const FileIcon = getFileIcon(doc.file_type);

          return (
            <Card key={doc.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                    <FileIcon className="h-6 w-6 text-primary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-semibold truncate">
                        {doc.title || doc.file_name}
                      </h4>
                      {doc.category && (
                        <Badge variant="secondary" className="flex-shrink-0">
                          {categoryLabels[doc.category] || doc.category}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {doc.file_name}
                    </p>

                    {doc.description && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>
                        {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: nl })}
                      </span>
                      {doc.profiles && (
                        <span>
                          door {doc.profiles.voornaam} {doc.profiles.achternaam}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canDelete(doc) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteId(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Document verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit document wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
