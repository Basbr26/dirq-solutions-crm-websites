import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  FileSignature,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { VerzuimDocument, DOCUMENT_TYPE_LABELS } from '@/types/verzuimDocumentTypes';
import SignatureCanvas from './SignatureCanvas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PDFDocument } from 'pdf-lib';

interface CaseDocumentsListProps {
  caseId: string;
  employeeId: string;
  userRole?: string;
  userId?: string;
  onRefresh?: () => void;
}

export function CaseDocumentsList({
  caseId,
  employeeId,
  userRole,
  userId,
  onRefresh,
}: CaseDocumentsListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [documents, setDocuments] = useState<VerzuimDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VerzuimDocument | null>(null);
  const [signing, setSigning] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as VerzuimDocument[]);
    } catch (error) {
      console.error('Error loading case documents:', error);
      toast({
        variant: 'destructive',
        title: 'Fout bij laden documenten',
        description: 'Kon documenten niet laden',
      });
    } finally {
      setLoading(false);
    }
  }, [caseId, toast]);

  useEffect(() => {
    loadDocuments();

    // Real-time subscription
    const channel = supabase
      .channel('case_documents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `case_id=eq.${caseId}`,
        },
        () => {
          loadDocuments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, loadDocuments]);

  const handleDownload = async (doc: VerzuimDocument) => {
    try {
      const filePath = doc.signed_file_path || doc.file_url;
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Document gedownload',
      });
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({
        variant: 'destructive',
        title: 'Fout bij downloaden',
        description: 'Kon document niet downloaden',
      });
    }
  };

  const handleSignClick = (doc: VerzuimDocument) => {
    setSelectedDocument(doc);
    setSignDialogOpen(true);
  };

  const handleSign = async (signatureData: string) => {
    if (!selectedDocument || !user) return;

    setSigning(true);
    try {
      // Download het originele document
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(selectedDocument.file_url);

      if (downloadError || !fileData) {
        throw new Error('Kon document niet downloaden');
      }

      // Laad PDF en voeg handtekening toe
      const arrayBuffer = await fileData.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];

      // Converteer signature data URL naar image bytes
      const signatureImageBytes = await fetch(signatureData).then((res) =>
        res.arrayBuffer()
      );
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

      // Voeg handtekening toe aan laatste pagina
      const { width, height } = lastPage.getSize();
      const signatureWidth = 150;
      const signatureHeight = 50;

      // Bepaal positie op basis van rol
      const isEmployee = user.id === employeeId;
      const xPosition = isEmployee ? 50 : width - signatureWidth - 50;

      lastPage.drawImage(signatureImage, {
        x: xPosition,
        y: 50,
        width: signatureWidth,
        height: signatureHeight,
      });

      // Sla getekend PDF op
      const signedPdfBytes = await pdfDoc.save();
      const signedBlob = new Blob([new Uint8Array(signedPdfBytes)], {
        type: 'application/pdf',
      });

      const signedFilePath = `${caseId}/signed_${selectedDocument.file_name}`;

      // Upload getekend document
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(signedFilePath, signedBlob, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Update document record met handtekening info
      const updateData: any = {
        signed_file_path: signedFilePath,
      };

      if (user.id === employeeId) {
        // Medewerker tekent
        updateData.status = selectedDocument.owner_signed ? 'completed' : 'pending';
      } else {
        // Manager/HR tekent
        updateData.owner_signed = true;
        updateData.owner_signature_data = signatureData;
        updateData.owner_signed_at = new Date().toISOString();
        updateData.status = 'completed'; // Als manager tekent, is document compleet
      }

      const { error: updateError } = await supabase
        .from('documents')
        .update(updateData)
        .eq('id', selectedDocument.id);

      if (updateError) throw updateError;

      // Timeline event
      await supabase.from('timeline_events').insert({
        case_id: caseId,
        event_type: 'document_toegevoegd',
        description: `Document ${selectedDocument.file_name} is ondertekend`,
        created_by: user.id,
      });

      toast({
        title: 'Document ondertekend',
        description: 'Uw handtekening is toegevoegd aan het document',
      });

      setSignDialogOpen(false);
      setSelectedDocument(null);
      loadDocuments();
      onRefresh?.();
    } catch (error) {
      console.error('Error signing document:', error);
      toast({
        variant: 'destructive',
        title: 'Fout bij ondertekenen',
        description: 'Kon document niet ondertekenen',
      });
    } finally {
      setSigning(false);
    }
  };

  const canSign = (doc: VerzuimDocument) => {
    if (!user || !doc.requires_signatures) return false;

    const isEmployee = user.id === employeeId;
    const isManager = userRole === 'hr' || userRole === 'manager';

    if (isEmployee && doc.requires_signatures.includes('employee')) {
      return doc.status !== 'completed';
    }

    if (isManager && (doc.requires_signatures.includes('manager') || doc.requires_signatures.includes('hr'))) {
      return !doc.owner_signed;
    }

    return false;
  };

  const getStatusBadge = (doc: VerzuimDocument) => {
    if (doc.status === 'completed') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Compleet
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <Clock className="h-3 w-3 mr-1" />
        Wacht op handtekening
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documenten ({documents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nog geen documenten toegevoegd
            </p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.file_name}</p>
                      {doc.document_type && (
                        <p className="text-sm text-muted-foreground">
                          {DOCUMENT_TYPE_LABELS[doc.document_type]}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(doc.created_at), 'dd MMM yyyy HH:mm', {
                          locale: nl,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusBadge(doc)}
                    {canSign(doc) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSignClick(doc)}
                      >
                        <FileSignature className="h-4 w-4 mr-1" />
                        Ondertekenen
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sign Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Document ondertekenen</DialogTitle>
            <DialogDescription>
              {selectedDocument && `Teken document: ${selectedDocument.file_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1">
            {signing ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <SignatureCanvas
                onSave={handleSign}
                onCancel={() => setSignDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
