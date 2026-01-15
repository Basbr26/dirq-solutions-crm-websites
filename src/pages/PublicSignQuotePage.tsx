/**
 * Public Quote Signing Page
 * Accessible via /sign-quote/:token without authentication
 * Allows customers to digitally sign quotes
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FileSignature, CheckCircle, XCircle, Clock } from 'lucide-react';
import SignatureCanvas from '@/components/SignatureCanvas';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  total_amount: number;
  sign_token: string;
  sign_status: string;
  sign_link_expires_at: string;
  signer_email: string;
  signed_at?: string;
  signed_by_name?: string;
  company?: {
    name: string;
  };
}

export default function PublicSignQuotePage() {
  const { token } = useParams<{ token: string }>();
  
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [showSignatureCanvas, setShowSignatureCanvas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadQuote();
    }
  }, [token]);

  const loadQuote = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('quotes')
        .select(`
          id,
          quote_number,
          title,
          total_amount,
          sign_token,
          sign_status,
          sign_link_expires_at,
          signer_email,
          signed_at,
          signed_by_name,
          company:companies!quotes_company_id_fkey(name)
        `)
        .eq('sign_token', token)
        .single();

      if (fetchError || !data) {
        setError('Ongeldige of verlopen sign link');
        setLoading(false);
        return;
      }

      // Check if expired
      if (data.sign_link_expires_at && new Date(data.sign_link_expires_at) < new Date()) {
        setError('Deze sign link is verlopen');
        setLoading(false);
        return;
      }

      // Check if already signed
      if (data.sign_status === 'signed') {
        setQuote(data as Quote);
        setLoading(false);
        return;
      }

      setQuote(data as Quote);
      
      // Update status to 'viewed' if not already
      if (data.sign_status === 'sent') {
        await supabase
          .from('quotes')
          .update({ sign_status: 'viewed' })
          .eq('id', data.id);
      }

      setLoading(false);
    } catch (err) {
      console.error('Load quote error:', err);
      setError('Er is een fout opgetreden bij het laden');
      setLoading(false);
    }
  };

  const handleSignatureSubmit = async (signatureData: string) => {
    if (!quote || !signerName.trim()) {
      toast.error('Vul uw naam in');
      return;
    }

    setSigning(true);

    try {
      // Get client user agent
      const userAgent = navigator.userAgent;
      
      // Update quote with signature
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          sign_status: 'signed',
          signature_data: signatureData,
          signed_at: new Date().toISOString(),
          signed_by_name: signerName,
          signer_user_agent: userAgent,
        })
        .eq('id', quote.id)
        .eq('sign_token', token);

      if (updateError) {
        console.error('Signature save error:', updateError);
        throw new Error('Kon handtekening niet opslaan');
      }

      // Reload quote to show signed state
      await loadQuote();
      
      toast.success('✅ Offerte succesvol ondertekend!');
      setShowSignatureCanvas(false);
    } catch (err: any) {
      console.error('Signing error:', err);
      toast.error(err.message || 'Ondertekenen mislukt');
    } finally {
      setSigning(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Offerte laden...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <Card className="w-full max-w-md text-center border-red-200">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-red-700">Link Ongeldig</CardTitle>
            <CardDescription className="text-red-600">
              {error || 'Deze sign link is ongeldig of verlopen'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Neem contact op met de afzender als u denkt dat dit een fout is.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already signed state
  if (quote.sign_status === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
        <Card className="w-full max-w-2xl text-center border-green-200">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-20 w-20 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">✅ Offerte Ondertekend</CardTitle>
            <CardDescription className="text-green-600 text-lg">
              Deze offerte is reeds ondertekend
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white/50 p-6 rounded-lg border border-green-200">
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Offerte</span>
                  <span className="font-semibold">{quote.quote_number}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Titel</span>
                  <span className="font-semibold">{quote.title}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-sm text-muted-foreground">Ondertekend door</span>
                  <span className="font-semibold">{quote.signed_by_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Datum</span>
                  <span className="font-semibold">
                    {quote.signed_at && format(new Date(quote.signed_at), 'dd MMMM yyyy HH:mm', { locale: nl })}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              U ontvangt een bevestigingsmail met de ondertekende offerte.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Signing interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 py-8">
      <div className="container mx-auto max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3 mb-2">
              <FileSignature className="h-8 w-8" />
              <div>
                <CardTitle className="text-2xl">Offerte Ondertekenen</CardTitle>
                <CardDescription className="text-purple-100">
                  {quote.company?.name && `${quote.company.name} • `}
                  Offerte {quote.quote_number}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Quote Info */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-lg mb-4 text-purple-900">{quote.title}</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-purple-200">
                  <span className="text-sm text-muted-foreground">Offertenummer</span>
                  <span className="font-semibold">{quote.quote_number}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-purple-200">
                  <span className="text-sm text-muted-foreground">Totaalbedrag</span>
                  <span className="font-bold text-xl text-purple-700">{formatCurrency(quote.total_amount)}</span>
                </div>
                {quote.sign_link_expires_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Geldig tot</span>
                    <span className="font-medium flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(quote.sign_link_expires_at), 'dd MMMM yyyy', { locale: nl })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Section */}
            {!showSignatureCanvas ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="signer-name">Uw volledige naam *</Label>
                  <Input
                    id="signer-name"
                    placeholder="Voornaam Achternaam"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Deze naam wordt gebruikt bij uw digitale handtekening
                  </p>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                  <p className="text-sm text-amber-900 font-medium mb-2">
                    ⚠️ Let op
                  </p>
                  <p className="text-sm text-amber-800">
                    Door deze offerte te ondertekenen gaat u akkoord met de voorwaarden en het genoemde bedrag van <strong>{formatCurrency(quote.total_amount)}</strong>.
                  </p>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  size="lg"
                  onClick={() => {
                    if (!signerName.trim()) {
                      toast.error('Vul eerst uw naam in');
                      return;
                    }
                    setShowSignatureCanvas(true);
                  }}
                >
                  <FileSignature className="h-5 w-5 mr-2" />
                  Ga naar Ondertekenen
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Ondertekenen als: {signerName}
                  </p>
                  <p className="text-xs text-blue-700">
                    Teken hieronder om de offerte te accepteren
                  </p>
                </div>

                <SignatureCanvas
                  onSave={handleSignatureSubmit}
                  onCancel={() => setShowSignatureCanvas(false)}
                />

                {signing && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Handtekening opslaan...</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Dirq Solutions</p>
        </div>
      </div>
    </div>
  );
}
