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

interface DocumentSigningDialogProps {
  document: {
    id: string;
    title: string;
    file_name: string;
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

      // Update document with signature
      const { error } = await supabase
        .from('documents')
        .update({
          owner_signed: true,
          owner_signature_data: signatureDataUrl,
          owner_signed_at: new Date().toISOString(),
          status: 'signed',
        })
        .eq('id', document.id);

      if (error) throw error;

      toast.success('Document succesvol ondertekend');
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
