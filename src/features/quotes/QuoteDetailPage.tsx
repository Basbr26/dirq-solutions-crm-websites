/**
 * QuoteDetailPage
 * Full quote detail page with line items, status management, and PDF export
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateQuote, useDeleteQuote } from './hooks/useQuoteMutations';
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Building2,
  User,
  Euro,
  Clock,
  Plus,
  Pen,
  Copy,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { QuoteForm } from './components/QuoteForm';
import { QuotePDFDocument } from './components/QuotePDFDocument';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Quote, QuoteStatus } from '@/types/quotes';
import { pdf } from '@react-pdf/renderer';
import { AppLayout } from '@/components/layout/AppLayout';

const statusConfig: Record<QuoteStatus | 'signed', { 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline'; 
  icon: React.ElementType;
  color: string;
}> = {
  draft: { label: 'Concept', variant: 'secondary', icon: FileText, color: 'bg-gray-500/10 text-gray-500' },
  sent: { label: 'Verzonden', variant: 'default', icon: Send, color: 'bg-blue-500/10 text-blue-500' },
  viewed: { label: 'Bekeken', variant: 'outline', icon: Eye, color: 'bg-purple-500/10 text-purple-500' },
  accepted: { label: 'Geaccepteerd', variant: 'default', icon: CheckCircle2, color: 'bg-green-500/10 text-green-500' },
  rejected: { label: 'Afgewezen', variant: 'destructive', icon: XCircle, color: 'bg-red-500/10 text-red-500' },
  expired: { label: 'Verlopen', variant: 'outline', icon: Clock, color: 'bg-orange-500/10 text-orange-500' },
  signed: { label: 'Getekend', variant: 'default', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600' },
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [signerEmail, setSignerEmail] = useState('');
  const [generatedSignLink, setGeneratedSignLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const updateQuote = useUpdateQuote(id!);
  const deleteQuote = useDeleteQuote();

  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  const canDelete = role === 'ADMIN';

  // Fetch quote with all related data
  const { data: quote, isLoading } = useQuery({
    queryKey: ['quotes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          company:companies!quotes_company_id_fkey(id, name, email, phone),
          contact:contacts!quotes_contact_id_fkey(id, first_name, last_name, email, phone, position),
          project:projects!quotes_project_id_fkey(id, title, stage),
          owner:profiles!quotes_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as Quote;
    },
    enabled: !!id,
    refetchInterval: quote?.sign_status === 'sent' || quote?.sign_status === 'viewed' ? 5000 : false, // Poll every 5s if waiting for signature
  });

  // Fetch quote items
  const { data: items } = useQuery({
    queryKey: ['quote-items', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', id!)
        .order('item_order');

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleDelete = () => {
    if (!id) return;
    deleteQuote.mutate(id, {
      onSuccess: () => navigate('/quotes'),
    });
  };

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!id) return;
    
    const updates: any = { status: newStatus };
    
    // Update timestamps based on status
    if (newStatus === 'sent' && !quote?.sent_at) {
      updates.sent_at = new Date().toISOString();
    } else if (newStatus === 'accepted' && !quote?.accepted_at) {
      updates.accepted_at = new Date().toISOString();
    } else if (newStatus === 'rejected' && !quote?.rejected_at) {
      updates.rejected_at = new Date().toISOString();
    }

    updateQuote.mutate(updates, {
      onSuccess: async () => {
        toast.success(`Status gewijzigd naar ${statusConfig[newStatus].label}`);
        
        // Send email when quote is sent
        if (newStatus === 'sent') {
          try {
            toast.loading('Offerte email versturen...');
            
            // Determine recipient email
            const recipientEmail = quote?.contact?.email || quote?.company?.email;
            const recipientName = quote?.contact?.first_name 
              ? `${quote.contact.first_name} ${quote.contact.last_name || ''}`
              : quote?.company?.name || 'Klant';
            
            if (!recipientEmail) {
              toast.dismiss();
              toast.error('Geen email adres gevonden voor klant');
              return;
            }
            
            // Generate view link
            const baseUrl = window.location.origin;
            const viewLink = `${baseUrl}/quotes/${id}`;
            
            // Send email via Edge Function
            const { error: emailError } = await supabase.functions.invoke('send-quote-email', {
              body: {
                to: recipientEmail,
                customerName: recipientName,
                companyName: quote?.company?.name,
                quoteNumber: quote?.quote_number || '',
                quoteTitle: quote?.title || 'Offerte',
                totalAmount: quote?.total_amount || 0,
                validUntil: quote?.valid_until,
                viewLink,
                senderName: quote?.owner?.voornaam || 'Dirq Solutions',
                senderEmail: quote?.owner?.email || 'offerte@dirq.nl',
              },
            });
            
            toast.dismiss();
            
            if (emailError) {
              console.error('Email error:', emailError);
              toast.warning('Offerte status gewijzigd, maar email verzending mislukt');
            } else {
              toast.success('✅ Offerte verzonden en email verstuurd!');
            }
          } catch (emailError) {
            toast.dismiss();
            console.error('Email exception:', emailError);
            toast.warning('Offerte status gewijzigd, maar email verzending mislukt');
          }
        }
      },
    });
  };

  const handleGenerateSignLink = async () => {
    if (!id || !signerEmail) {
      toast.error('Email adres is verplicht');
      return;
    }

    try {
      toast.loading('Sign link genereren...');

      // Generate unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Update quote with sign token
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          sign_token: token,
          sign_status: 'sent',
          sign_link_expires_at: expiresAt.toISOString(),
          signer_email: signerEmail,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Send email via Edge Function
      try {
        const { error: emailError } = await supabase.functions.invoke('send-sign-email', {
          body: {
            to: signerEmail,
            documentTitle: quote?.title || `Offerte ${quote?.quote_number}`,
            documentId: id,
            signToken: token,
            companyName: quote?.company?.name,
            expiresAt: expiresAt.toISOString(),
            senderName: quote?.owner?.voornaam || 'Dirq Solutions',
          },
        });

        if (emailError) {
          console.error('Email error:', emailError);
          toast.warning('Link gegenereerd, maar email verzending mislukt');
        }
      } catch (emailError) {
        console.error('Email exception:', emailError);
        toast.warning('Link gegenereerd, maar email verzending mislukt');
      }

      // Generate full link
      const baseUrl = window.location.origin;
      const signLink = `${baseUrl}/sign-quote/${token}`;
      setGeneratedSignLink(signLink);

      toast.dismiss();
      toast.success('Sign link gegenereerd en email verzonden! 📧✨');

      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
    } catch (error) {
      toast.dismiss();
      toast.error('Sign link genereren mislukt');
      console.error('Generate sign link error:', error);
    }
  };

  const handleCopySignLink = async () => {
    if (!generatedSignLink) return;
    await navigator.clipboard.writeText(generatedSignLink);
    setLinkCopied(true);
    toast.success('Link gekopieerd! 📋');
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleOpenSignDialog = () => {
    // Pre-fill email if contact exists
    if (quote?.contact?.email) {
      setSignerEmail(quote.contact.email);
    } else if (quote?.company?.email) {
      setSignerEmail(quote.company.email);
    }
    setSignDialogOpen(true);
    setGeneratedSignLink('');
    setLinkCopied(false);
  };

  const exportToPDF = async () => {
    if (!quote || !items) {
      toast.error('Offerte data ontbreekt');
      return;
    }

    try {
      toast.loading('PDF genereren...');
      
      // Generate PDF blob
      const blob = await pdf(
        <QuotePDFDocument quote={quote} items={items} />
      ).toBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `offerte-${quote.quote_number}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('PDF gedownload');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.dismiss();
      toast.error('PDF export mislukt');
    }
  };

  const formatCurrency = useMemo(
    () => (amount: number) =>
      new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount),
    []
  );

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Offerte niet gevonden</h3>
            <p className="text-muted-foreground mb-4">
              Deze offerte bestaat niet of je hebt geen toegang.
            </p>
            <Link to="/quotes">
              <Button>Terug naar overzicht</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const StatusIcon = statusConfig[quote.sign_status === 'signed' ? 'signed' : quote.status].icon;
  const displayStatus = quote.sign_status === 'signed' ? 'signed' : quote.status;

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Link to="/quotes">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar overzicht
            </Button>
          </Link>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{quote.title}</h1>
                <Badge className={statusConfig[displayStatus].color} variant="outline">
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[displayStatus].label}
                </Badge>
              </div>
              <p className="text-muted-foreground">Offerte {quote.quote_number}</p>
            </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF Exporteren
            </Button>
            {canEdit && quote.status === 'sent' && (
              <Button variant="default" onClick={handleOpenSignDialog}>
                <Pen className="h-4 w-4 mr-2" />
                Verstuur voor Ondertekening
              </Button>
            )}
            {canEdit && (
              <Button onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Bewerken
              </Button>
            )}
            {canDelete && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijderen
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Quote Info */}
          <Card>
            <CardHeader>
              <CardTitle>Offerte Gegevens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrijf</p>
                    <Link 
                      to={`/companies/${quote.company?.id}`}
                      className="font-medium hover:underline"
                    >
                      {quote.company?.name}
                    </Link>
                  </div>
                </div>

                {quote.contact && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contactpersoon</p>
                      <Link 
                        to={`/contacts/${quote.contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {quote.contact.first_name} {quote.contact.last_name}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Aangemaakt</p>
                    <p className="font-medium">
                      {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: nl })}
                    </p>
                  </div>
                </div>

                {quote.valid_until && (
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Geldig tot</p>
                      <p className="font-medium">
                        {format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {quote.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Beschrijving</p>
                    <p className="text-sm">{quote.description}</p>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                {quote.payment_terms && (
                  <div>
                    <p className="text-muted-foreground">Betalingsvoorwaarden</p>
                    <p className="font-medium">{quote.payment_terms}</p>
                  </div>
                )}
                {quote.delivery_time && (
                  <div>
                    <p className="text-muted-foreground">Levertijd</p>
                    <p className="font-medium">{quote.delivery_time}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Regel Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items && items.length > 0 ? (
                  <>
                    {items.map((item, index) => (
                      <div key={item.id} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-muted-foreground">#{index + 1}</span>
                              <h4 className="font-semibold">{item.title}</h4>
                              {item.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Aantal: {item.quantity}</span>
                          <span>Prijs: {formatCurrency(item.unit_price)}</span>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-2 pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotaal</span>
                        <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">BTW ({quote.tax_rate}%)</span>
                        <span className="font-medium">{formatCurrency(quote.tax_amount)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Totaal</span>
                        <span>{formatCurrency(quote.total_amount)}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Geen regel items gevonden</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {quote.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Interne Notities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Signature Information */}
          {quote.sign_status === 'signed' && quote.signature_data && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-900">Digitaal Ondertekend</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Signature Image */}
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-muted-foreground mb-2">Handtekening</p>
                  <img 
                    src={quote.signature_data} 
                    alt="Handtekening" 
                    className="max-w-full h-24 border border-gray-200 rounded"
                  />
                </div>

                {/* Signature Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ondertekend door</span>
                    <span className="font-medium">{quote.signed_by_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datum & Tijd</span>
                    <span className="font-medium">
                      {quote.signed_at && format(new Date(quote.signed_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                    </span>
                  </div>
                  {quote.signer_email && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{quote.signer_email}</span>
                    </div>
                  )}
                  {quote.signer_ip_address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IP Adres</span>
                      <span className="font-mono text-xs">{quote.signer_ip_address}</span>
                    </div>
                  )}
                </div>

                <div className="bg-green-100/50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800">
                    ✅ Deze digitale handtekening is juridisch geldig en bevat een audit trail met IP-adres en tijdstempel.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Actions */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Status Wijzigen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quote.status === 'draft' && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleStatusChange('sent')}
                    disabled={updateQuote.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Versturen
                  </Button>
                )}
                {['sent', 'viewed'].includes(quote.status) && (
                  <>
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700" 
                      onClick={() => handleStatusChange('accepted')}
                      disabled={updateQuote.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Accepteren
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={() => handleStatusChange('rejected')}
                      disabled={updateQuote.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Afwijzen
                    </Button>
                  </>
                )}
                {quote.status === 'accepted' && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-600">Offerte Geaccepteerd</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Tijdlijn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Aangemaakt</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(quote.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                    </p>
                  </div>
                </div>

                {quote.sent_at && (
                  <div className="flex gap-3">
                    <Send className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Verzonden</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.sent_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}

                {quote.viewed_at && (
                  <div className="flex gap-3">
                    <Eye className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Bekeken</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.viewed_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}

                {quote.accepted_at && (
                  <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Geaccepteerd</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.accepted_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}

                {quote.rejected_at && (
                  <div className="flex gap-3">
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Afgewezen</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(quote.rejected_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Created By */}
          {quote.owner && (
            <Card>
              <CardHeader>
                <CardTitle>Gemaakt door</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {quote.owner.voornaam} {quote.owner.achternaam}
                    </p>
                    <p className="text-sm text-muted-foreground">Aangemaakt door</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <QuoteForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        quote={quote}
        onSubmit={(data) => {
          updateQuote.mutate(data as any, {
            onSuccess: () => setEditDialogOpen(false),
          });
        }}
        isLoading={updateQuote.isPending}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Offerte verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je deze offerte wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuleren</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sign Link Dialog */}
      <Dialog open={signDialogOpen} onOpenChange={setSignDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pen className="h-5 w-5" />
              Verstuur Offerte voor Ondertekening
            </DialogTitle>
            <DialogDescription>
              Genereer een veilige link voor digitale handtekening. De link is 7 dagen geldig.
            </DialogDescription>
          </DialogHeader>

          {!generatedSignLink ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signer-email">Email Ondertekenaar *</Label>
                <Input
                  id="signer-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Er wordt een email verzonden met de ondertekeningslink
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button onClick={handleGenerateSignLink} disabled={!signerEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  Verstuur Link
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Link Verzonden!</p>
                    <p className="text-sm text-green-700 mt-1">
                      Email verzonden naar <strong>{signerEmail}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Ondertekeningslink</Label>
                <div className="flex gap-2">
                  <Input
                    value={generatedSignLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleCopySignLink}
                  >
                    {linkCopied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Link is 7 dagen geldig en kan maar één keer gebruikt worden
                </p>
              </div>

              <DialogFooter>
                <Button onClick={() => setSignDialogOpen(false)}>
                  Sluiten
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}
