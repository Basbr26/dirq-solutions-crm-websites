import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import SignatureCanvas from '@/components/SignatureCanvas';
import { PDFDocument } from 'pdf-lib';

interface DocumentSigningDialogProps {
  document: {
    id: string;
    title: string;
    file_name: string;
    file_path: string;
  };
  onSigned?: () => void;
}

export function DocumentSigningDialog({ document, onSigned }: DocumentSigningDialogProps) {
  const [open, setOpen] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleSign = async (signatureDataUrl: string) => {
    setSigning(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Niet ingelogd');

      console.log('Starting sign process...');
      
      // 1. Download the original PDF from storage
      console.log('Downloading original PDF from:', document.file_path);
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(document.file_path);

      if (downloadError || !fileData) {
        console.error('Download error:', downloadError);
        throw new Error('Kon document niet downloaden');
      }

      console.log('PDF downloaded, size:', fileData.size);

      // 2. Load the PDF
      const arrayBuffer = await fileData.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      console.log('PDF loaded, pages:', pdfDoc.getPageCount());
      
      // 3. Embed the signature image
      const base64Data = signatureDataUrl.split(',')[1];
      const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      console.log('Signature bytes:', signatureBytes.length);
      
      const signatureImage = await pdfDoc.embedPng(signatureBytes);
      console.log('Signature embedded');
      
      // 4. Add signature to ALL pages
      const pages = pdfDoc.getPages();
      const signatureWidth = 150;
      const signatureHeight = 75;
      const signatureText = `Digitaal ondertekend door: ${user.user.email}\nDatum: ${new Date().toLocaleDateString('nl-NL')}`;

      pages.forEach((page, index) => {
        const { width, height } = page.getSize();
        const x = width - signatureWidth - 50;
        const y = 50;

        // Draw signature image
        page.drawImage(signatureImage, {
          x,
          y,
          width: signatureWidth,
          height: signatureHeight,
        });

        // Draw signature text
        page.drawText(signatureText, {
          x: x,
          y: y - 20,
          size: 8,
        });

        console.log(`Signature added to page ${index + 1}`);
      });
      
      console.log('All pages signed');

      // 5. Save the modified PDF
      const pdfBytes = await pdfDoc.save();
      console.log('PDF saved, size:', pdfBytes.length);
      const signedBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

      // 6. Upload the signed PDF to signed-documents bucket
      const signedFileName = `signed_${document.file_name}`;
      const signedFilePath = `${document.id}/${signedFileName}`;
      
      console.log('Uploading signed PDF to:', signedFilePath);
      const { error: uploadError } = await supabase
        .storage
        .from('signed-documents')
        .upload(signedFilePath, signedBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Kon ondertekend document niet uploaden: ' + uploadError.message);
      }

      console.log('Signed PDF uploaded successfully');

      // 7. Update document with signature data and signed file path
      console.log('Updating document...');
      const { error } = await supabase
        .from('documents')
        .update({
          owner_signed: true,
          owner_signature_data: signatureDataUrl,
          owner_signed_at: new Date().toISOString(),
          status: 'signed',
          signed_file_path: signedFilePath,
        })
        .eq('id', document.id);

      if (error) throw error;

      console.log('Document updated successfully');

      toast.success('Document succesvol ondertekend en opgeslagen!');
      setOpen(false);
      setShowCanvas(false);
      onSigned?.();
    } catch (error) {
      console.error('Error signing document:', error);
      toast.error(error instanceof Error ? error.message : 'Fout bij ondertekenen document');
    } finally {
      setSigning(false);
    }
  };

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setOpen(true)}>
        <Pen className="h-4 w-4 mr-2" />
        Onderteken
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Document ondertekenen</DialogTitle>
            <DialogDescription>
              {document.title} ({document.file_name})
            </DialogDescription>
          </DialogHeader>

          {!showCanvas ? (
            <div className="py-8 text-center space-y-4">
              <div className="text-muted-foreground">
                <p className="mb-4">
                  U staat op het punt het volgende document te ondertekenen:
                </p>
                <p className="font-medium text-foreground mb-6">
                  {document.title}
                </p>
                <p className="text-sm mb-6">
                  Door dit document te ondertekenen bevestigt u dat u:
                </p>
                <ul className="text-sm space-y-2 mb-8 max-w-md mx-auto text-left">
                  <li>✓ De inhoud van het document heeft gelezen</li>
                  <li>✓ Akkoord gaat met de inhoud</li>
                  <li>✓ Uw digitale handtekening rechtsgeldig is</li>
                </ul>
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={() => setShowCanvas(true)}>
                  <Pen className="h-4 w-4 mr-2" />
                  Doorgaan naar ondertekenen
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Teken hieronder uw handtekening:
              </div>
              
              {signing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-3">Document ondertekenen...</span>
                </div>
              ) : (
                <SignatureCanvas
                  onSave={handleSign}
                  onCancel={() => {
                    setShowCanvas(false);
                    setOpen(false);
                  }}
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
