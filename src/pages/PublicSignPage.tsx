/**
 * Public Document Signing Page
 * Accessible via /sign/:token without authentication
 * Captures signature with full audit trail
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import SignatureCanvas from '@/components/SignatureCanvas';
import { DirqLogo } from '@/components/DirqLogo';
import { 
  FileText, 
  Download, 
  Pen, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  Shield,
  Mail,
  Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';

interface PublicDocument {
  id: string;
  title: string;
  file_name: string;
  storage_path: string;
  status: string;
  sign_link_expires_at: string | null;
  company?: { naam: string } | null;
  description?: string;
}

export default function PublicSignPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  // Form state
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureComplete, setSignatureComplete] = useState(false);
  const [declined, setDeclined] = useState(false);
  
  // Fetch document by token
  const { data: document, isLoading, error } = useQuery<PublicDocument | null>({
    queryKey: ['public-document', token],
    queryFn: async () => {
      if (!token) return null;
      
      // Log access
      const clientInfo = await getClientInfo();
      await supabase.rpc('log_document_access', {
        sign_token: token,
        ip_addr: clientInfo.ip,
        user_agent_str: navigator.userAgent,
      });
      
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          file_name,
          storage_path,
          status,
          sign_link_expires_at,
          description,
          company:companies(naam)
        `)
        .eq('public_sign_token', token)
        .single();
      
      if (error) throw error;
      return data as PublicDocument;
    },
    enabled: !!token,
    retry: false,
  });
  
  // Get client IP address
  async function getClientInfo(): Promise<{ ip: string | null }> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return { ip: data.ip };
    } catch {
      return { ip: null };
    }
  }
  
  // Check if link is expired
  const isExpired = document?.sign_link_expires_at 
    ? new Date(document.sign_link_expires_at) < new Date() 
    : false;
  
  const isAlreadySigned = document?.status === 'signed';
  const isDeclined = document?.status === 'declined';
  
  // Sign document mutation
  const signMutation = useMutation({
    mutationFn: async (signatureDataUrl: string) => {
      if (!document) throw new Error('Document niet gevonden');
      
      setIsSigning(true);
      
      // Get client info for audit
      const clientInfo = await getClientInfo();
      
      // Download original PDF
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('documents')
        .download(document.storage_path);
      
      if (downloadError) throw new Error('Kon document niet downloaden');
      
      // Load and sign PDF
      const arrayBuffer = await fileData.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      
      // Embed signature
      const base64Data = signatureDataUrl.split(',')[1];
      const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureBytes);
      
      // Add signature to last page
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      const { width, height } = lastPage.getSize();
      
      const signatureWidth = 150;
      const signatureHeight = 75;
      // Position customer signature on the LEFT side, at the bottom
      const x = 50;
      const y = 200; // Moved higher to ensure visibility
      
      // Draw signature box
      // Draw border box around signature area
      lastPage.drawRectangle({
        x: x - 10,
        y: y - 40,
        width: signatureWidth + 20,
        height: signatureHeight + 75,
        borderWidth: 1,
      });
      
      // Draw signature
      lastPage.drawImage(signatureImage, {
        x,
        y,
        width: signatureWidth,
        height: signatureHeight,
      });
      
      // Add signature info (shorter labels)
      lastPage.drawText(`Ondertekend door: ${signerName}`, {
        x,
        y: y - 15,
        size: 7,
      });
      
      lastPage.drawText(`(Klant)`, {
        x,
        y: y - 25,
        size: 7,
      });
      
      lastPage.drawText(`Datum: ${format(new Date(), 'dd-MM-yyyy HH:mm', { locale: nl })}`, {
        x,
        y: y - 35,
        size: 7,
      });
      
      // Add "Digitaal Ondertekend" watermark
      pages.forEach((page) => {
        page.drawText('✓ DIGITAAL ONDERTEKEND', {
          x: 20,
          y: 20,
          size: 8,
          opacity: 0.5,
        });
      });
      
      // Save signed PDF
      const pdfBytes = await pdfDoc.save();
      const signedBlob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      
      // Upload to signed-documents bucket
      const signedFilePath = `${document.id}/signed_${document.file_name}`;
      const { error: uploadError } = await supabase
        .storage
        .from('signed-documents')
        .upload(signedFilePath, signedBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });
      
      if (uploadError) throw new Error('Kon ondertekend document niet opslaan');
      
      // Update document record
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'signed',
          signature_data: signatureDataUrl,
          signed_at: new Date().toISOString(),
          signed_by_name: signerName,
          signed_by_email: signerEmail,
          signed_file_path: signedFilePath,
          signer_ip_address: clientInfo.ip,
          signer_user_agent: navigator.userAgent,
        })
        .eq('id', document.id);
      
      if (updateError) throw updateError;
      
      return { success: true };
    },
    onSuccess: () => {
      setSignatureComplete(true);
      setIsSigning(false);
      toast.success('Document succesvol ondertekend!');
    },
    onError: (error) => {
      setIsSigning(false);
      toast.error(error instanceof Error ? error.message : t('errors.errorSigning'));
    },
  });
  
  // Decline document mutation
  const declineMutation = useMutation({
    mutationFn: async () => {
      if (!document) throw new Error('Document niet gevonden');
      
      const clientInfo = await getClientInfo();
      
      const { error } = await supabase
        .from('documents')
        .update({
          status: 'declined',
          signer_ip_address: clientInfo.ip,
          signer_user_agent: navigator.userAgent,
        })
        .eq('id', document.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      setDeclined(true);
      toast.info('U heeft het document geweigerd te ondertekenen.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t('errors.errorRejecting'));
    },
  });
  
  // Handle signature save
  const handleSignature = (signatureDataUrl: string) => {
    signMutation.mutate(signatureDataUrl);
  };
  
  // Download original document
  const handleDownload = async () => {
    if (!document) return;
    
    const { data, error } = await supabase
      .storage
      .from('documents')
      .download(document.storage_path);
    
    if (error) {
      toast.error('Kon document niet downloaden');
      return;
    }
    
    const url = URL.createObjectURL(data);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = document.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <PublicPageLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PublicPageLayout>
    );
  }
  
  // Error or not found
  if (error || !document) {
    return (
      <PublicPageLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document niet gevonden</h2>
            <p className="text-muted-foreground">
              Deze link is ongeldig of het document bestaat niet meer.
            </p>
          </CardContent>
        </Card>
      </PublicPageLayout>
    );
  }
  
  // Expired
  if (isExpired) {
    return (
      <PublicPageLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <Clock className="h-16 w-16 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Link verlopen</h2>
            <p className="text-muted-foreground mb-4">
              De ondertekeningslink voor dit document is verlopen.
            </p>
            <p className="text-sm text-muted-foreground">
              Neem contact op met de afzender voor een nieuwe link.
            </p>
          </CardContent>
        </Card>
      </PublicPageLayout>
    );
  }
  
  // Already signed
  if (isAlreadySigned || signatureComplete) {
    return (
      <PublicPageLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document ondertekend</h2>
            <p className="text-muted-foreground mb-6">
              {signatureComplete 
                ? 'Bedankt! Uw handtekening is succesvol vastgelegd.'
                : 'Dit document is al ondertekend.'}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Beveiligd met digitale handtekening</span>
            </div>
          </CardContent>
        </Card>
      </PublicPageLayout>
    );
  }
  
  // Declined
  if (isDeclined || declined) {
    return (
      <PublicPageLayout>
        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Document geweigerd</h2>
            <p className="text-muted-foreground">
              {declined 
                ? 'U heeft gekozen om dit document niet te ondertekenen.'
                : 'Dit document is geweigerd door de ontvanger.'}
            </p>
          </CardContent>
        </Card>
      </PublicPageLayout>
    );
  }
  
  // Main signing form
  return (
    <PublicPageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Document Info */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{document.title || document.file_name}</CardTitle>
                  {document.company && (
                    <CardDescription>Van: {document.company.naam}</CardDescription>
                  )}
                </div>
              </div>
              <Badge variant="secondary">
                <Clock className="h-3 w-3 mr-1" />
                Wacht op handtekening
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {document.description && (
              <p className="text-sm text-muted-foreground mb-4">{document.description}</p>
            )}
            <Button variant="outline" onClick={handleDownload} className="w-full sm:w-auto">
              <Eye className="h-4 w-4 mr-2" />
              Bekijk document
            </Button>
          </CardContent>
        </Card>
        
        {/* Signer Info Form */}
        {!showSignature ? (
          <Card>
            <CardHeader>
              <CardTitle>Uw gegevens</CardTitle>
              <CardDescription>
                Vul uw gegevens in voordat u het document ondertekent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Volledige naam *</Label>
                <Input
                  id="name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Bijv. Jan de Vries"
                  data-agent="signer-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">E-mailadres *</Label>
                <Input
                  id="email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="Bijv. jan@bedrijf.nl"
                  data-agent="signer-email"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                >
                  Ik verklaar dat ik het document heb gelezen en akkoord ga met de inhoud. 
                  Ik begrijp dat mijn digitale handtekening rechtsgeldig is.
                </label>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={() => setShowSignature(true)}
                  disabled={!signerName || !signerEmail || !agreedToTerms}
                  className="flex-1"
                  data-agent-action="proceed-to-sign"
                >
                  <Pen className="h-4 w-4 mr-2" />
                  Doorgaan naar ondertekenen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => declineMutation.mutate()}
                  disabled={declineMutation.isPending}
                  data-agent-action="decline-document"
                >
                  {declineMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Weigeren'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          // Signature Canvas
          <Card>
            <CardHeader>
              <CardTitle>Uw handtekening</CardTitle>
              <CardDescription>
                Teken uw handtekening in het onderstaande vak
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSigning ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Document ondertekenen...</p>
                </div>
              ) : (
                <SignatureCanvas
                  onSave={handleSignature}
                  onCancel={() => setShowSignature(false)}
                />
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>
            Beveiligd met SSL-encryptie. Uw gegevens worden veilig opgeslagen.
          </span>
        </div>
      </div>
    </PublicPageLayout>
  );
}

// Layout wrapper for public pages
function PublicPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <DirqLogo size="sm" />
          <Badge variant="outline" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Beveiligd document
          </Badge>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t py-6 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Dirq Solutions. Alle rechten voorbehouden.</p>
          <p className="mt-1">
            Digitale handtekeningen voldoen aan eIDAS-regelgeving voor elektronische ondertekening.
          </p>
        </div>
      </footer>
    </div>
  );
}
