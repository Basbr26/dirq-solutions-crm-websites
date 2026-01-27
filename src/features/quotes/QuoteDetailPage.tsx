/**
 * QuoteDetailPage
 * Full quote detail page with line items, status management, and PDF export
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateQuote, useDeleteQuote } from './hooks/useQuoteMutations';
import { useQuoteStatusConfig } from './hooks/useQuoteStatusConfig';
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
  MessageSquare,
  Phone,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { InteractionTimeline } from '@/features/interactions/components/InteractionTimeline';
import { AddInteractionDialog } from '@/features/interactions/components/AddInteractionDialog';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Quote, QuoteStatus } from '@/types/quotes';
import { pdf } from '@react-pdf/renderer';
import { AppLayout } from '@/components/layout/AppLayout';
import SignatureCanvas from '@/components/SignatureCanvas';
import { PDFDocument } from 'pdf-lib';

export default function QuoteDetailPage() {
  const { t } = useTranslation();
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
  const [addInteractionDialogOpen, setAddInteractionDialogOpen] = useState(false);
  const [interactionDefaultType, setInteractionDefaultType] = useState<'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo'>('note');
  const [providerSignDialogOpen, setProviderSignDialogOpen] = useState(false);
  const [providerSigning, setProviderSigning] = useState(false);
  const [showProviderSignatureCanvas, setShowProviderSignatureCanvas] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});

  const statusConfig = useQuoteStatusConfig();

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Helper to format text with bullets and newlines
  const formatDescription = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let currentList: string[] = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('•')) {
        currentList.push(trimmed.substring(1).trim());
      } else {
        if (currentList.length > 0) {
          elements.push(
            <ul key={`list-${index}`} className="list-disc list-inside space-y-1 my-2 ml-2">
              {currentList.map((item, i) => (
                <li key={i} className="text-sm text-gray-600">{item}</li>
              ))}
            </ul>
          );
          currentList = [];
        }
        if (trimmed) {
          elements.push(
            <p key={`p-${index}`} className="text-sm text-gray-700 leading-relaxed">{trimmed}</p>
          );
        }
      }
    });
    
    if (currentList.length > 0) {
      elements.push(
        <ul key="list-final" className="list-disc list-inside space-y-1 my-2 ml-2">
          {currentList.map((item, i) => (
            <li key={i} className="text-sm text-gray-600">{item}</li>
          ))}
        </ul>
      );
    }
    
    return <div className="space-y-2">{elements}</div>;
  };

  const updateQuote = useUpdateQuote(id!);
  const deleteQuote = useDeleteQuote();

  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  const canDelete = role === 'ADMIN';

  const handleSaveInlineEdit = async () => {
    if (!quote || Object.keys(editedFields).length === 0) return;
    
    try {
      await updateQuote.mutateAsync(editedFields as any);
      setIsEditMode(false);
      setEditedFields({});
      toast.success('Offerte bijgewerkt');
    } catch (error) {
      console.error('Error updating quote:', error);
      toast.error('Fout bij opslaan');
    }
  };

  const handleCancelInlineEdit = () => {
    setIsEditMode(false);
    setEditedFields({});
  };

  const updateField = (field: string, value: any) => {
    setEditedFields(prev => ({ ...prev, [field]: value }));
  };

  const getFieldValue = (field: string, defaultValue: any) => {
    return editedFields[field] !== undefined ? editedFields[field] : defaultValue;
  };

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
    
    // Validate email exists when changing to 'sent' status
    if (newStatus === 'sent') {
      const contactEmail = quote?.contact?.email;
      const signerEmailValue = signerEmail || contactEmail;
      
      if (!signerEmailValue) {
        toast.error(t('errors.emailMissing'), {
          description: t('errors.emailMissingDescription'),
          duration: 5000,
        });
        return;
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(signerEmailValue)) {
        toast.error(t('errors.invalidEmail'), {
          description: t('errors.invalidEmailDescription'),
          duration: 5000,
        });
        return;
      }
    }
    
    // Validate rejection - cannot reject a digitally signed quote
    if (newStatus === 'rejected' && quote?.sign_status === 'signed') {
      toast.error(t('errors.cannotRejectSigned'), {
        description: t('errors.cannotRejectSignedDescription'),
        duration: 5000,
      });
      return;
    }
    
    // Validate rejection - cannot reject an already accepted quote
    if (newStatus === 'rejected' && quote?.status === 'accepted') {
      toast.error(t('errors.cannotRejectAccepted'), {
        description: t('errors.cannotRejectAcceptedDescription'),
        duration: 5000,
      });
      return;
    }
    
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
        toast.success(t('quotes.statusChangedTo', { status: statusConfig[newStatus].label }));
      },
    });
  };

  const handleGenerateSignLink = async () => {
    if (!id || !signerEmail) {
      toast.error(t('errors.emailMissing'), {
        description: t('errors.emailRequired'),
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(signerEmail)) {
      toast.error(t('errors.invalidEmail'), {
        description: t('errors.enterValidEmail'),
      });
      return;
    }

    try {
      toast.loading(t('quotes.generatingSignLink'));

      // Generate unique token
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      // Update quote with sign token AND status
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          sign_token: token,
          sign_status: 'sent',
          sign_link_expires_at: expiresAt.toISOString(),
          signer_email: signerEmail,
          status: 'sent',
          sent_at: quote?.sent_at || new Date().toISOString(),
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
            senderName: quote?.owner?.voornaam ? `${quote.owner?.voornaam} ${quote.owner?.achternaam}` : 'Dirq Solutions',
          },
        });

        if (emailError) {
          console.error('Email error:', emailError);
          toast.warning(t('quotes.linkGeneratedEmailFailed'));
        }
      } catch (emailError) {
        console.error('Email exception:', emailError);
        toast.warning(t('quotes.linkGeneratedEmailFailed'));
      }

      // Generate full link
      const baseUrl = window.location.origin;
      const signLink = `${baseUrl}/sign-quote/${token}`;
      setGeneratedSignLink(signLink);

      toast.dismiss();
      toast.success(t('quotes.signLinkSent'));

      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
    } catch (error) {
      toast.dismiss();
      toast.error(t('errors.generateSignLinkFailed'));
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

  const handleProviderSignature = async (signatureData: string) => {
    if (!quote || !items) return;

    setProviderSigning(true);
    try {
      // Generate PDF with signature embedded
      const pdfBlob = await pdf(
        <QuotePDFDocument quote={quote} items={items} />
      ).toBlob();

      // Load PDF and add signature
      const arrayBuffer = await pdfBlob.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];

      // Embed signature image
      const base64Data = signatureData.split(',')[1];
      const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const signatureImage = await pdfDoc.embedPng(signatureBytes);

      const { width, height } = lastPage.getSize();
      const signatureWidth = 150;
      const signatureHeight = 75;
      
      // Position provider signature on the RIGHT side, at the bottom
      const x = width - signatureWidth - 50;
      const y = 200; // Moved higher to ensure visibility

      // Draw border box around signature area
      lastPage.drawRectangle({
        x: x - 10,
        y: y - 35,
        width: signatureWidth + 20,
        height: signatureHeight + 70,
        borderWidth: 1,
      });

      // Draw signature
      lastPage.drawImage(signatureImage, {
        x,
        y,
        width: signatureWidth,
        height: signatureHeight,
      });

      // Add text below signature
      lastPage.drawText('Namens Dirq Solutions', { x, y: y - 15, size: 8 });
      lastPage.drawText('(Leverancier)', { x, y: y - 25, size: 7 });
      lastPage.drawText(`Datum: ${format(new Date(), 'dd-MM-yyyy HH:mm', { locale: nl })}`, { x, y: y - 35, size: 7 });

      // Save signed PDF
      const signedPdfBytes = await pdfDoc.save();
      const signedBlob = new Blob([signedPdfBytes], { type: 'application/pdf' });

      // Upload to Supabase Storage
      const fileName = `quote-${quote.id}-provider-signed-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, signedBlob);

      if (uploadError) throw uploadError;

      // Get signed URL (valid for 1 year)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(fileName, 31536000); // 1 year in seconds

      if (urlError) throw urlError;

      // Update quote with provider signature info
      const { error: updateError } = await supabase
        .from('quotes')
        .update({
          provider_signature_data: signatureData,
          provider_signed_at: new Date().toISOString(),
          provider_signed_document_url: urlData.signedUrl,
        })
        .eq('id', quote.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ['quotes', id] });
      toast.success(t('quotes.signedAsProvider'));
      setProviderSignDialogOpen(false);
      setShowProviderSignatureCanvas(false);
    } catch (error) {
      console.error('Provider signature error:', error);
      toast.error('Fout bij ondertekenen');
    } finally {
      setProviderSigning(false);
    }
  };

  const downloadSignedDocument = async () => {
    if (!quote?.provider_signed_document_url) {
      toast.error('Geen getekend document beschikbaar');
      return;
    }

    try {
      const response = await fetch(quote.provider_signed_document_url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `offerte-${quote.quote_number}-getekend.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Getekend document gedownload');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download mislukt');
    }
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
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-lg border-0">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Offerte niet gevonden</h3>
            <p className="text-muted-foreground mb-6">
              Deze offerte bestaat niet of je hebt geen toegang.
            </p>
            <Link to="/quotes">
              <Button className="shadow-md">Terug naar overzicht</Button>
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
              <h1 className="text-3xl font-bold mb-2">{quote.title}</h1>
              <p className="text-muted-foreground">{t('quotes.quoteLabel')} {quote.quote_number}</p>
            </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              {t('quotes.exportPDF')}
            </Button>
            {canEdit && quote.sign_status !== 'signed' && (
              <Button variant="default" onClick={handleOpenSignDialog}>
                <Pen className="h-4 w-4 mr-2" />
                {t('quotes.sendForSignature')}
              </Button>
            )}
            {canEdit && !quote.provider_signature_data && (
              <Button variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50" onClick={() => setProviderSignDialogOpen(true)}>
                <Pen className="h-4 w-4 mr-2" />
                {t('quotes.signAsProvider')}
              </Button>
            )}
            {quote.provider_signed_document_url && (
              <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={downloadSignedDocument}>
                <Download className="h-4 w-4 mr-2" />
                {t('quotes.downloadSigned')}
              </Button>
            )}
            {canEdit && (
              <>
                {!isEditMode ? (
                  <Button onClick={() => setIsEditMode(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    {t('common.edit')}
                  </Button>
                ) : (
                  <>
                    <Button onClick={handleSaveInlineEdit} disabled={updateQuote.isPending}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Opslaan
                    </Button>
                    <Button variant="outline" onClick={handleCancelInlineEdit}>
                      <XCircle className="h-4 w-4 mr-2" />
                      Annuleren
                    </Button>
                  </>
                )}
              </>
            )}
            {canDelete && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common.delete')}
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
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{t('quotes.quoteDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground mb-1">{t('companies.singular')}</p>
                    <Link 
                      to={`/companies/${quote.company?.id}`}
                      className="font-medium hover:underline block truncate"
                    >
                      {quote.company?.name}
                    </Link>
                  </div>
                </div>

                {quote.contact && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                    <User className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-purple-900 mb-1">{t('quotes.contactPerson')}</p>
                      <Link 
                        to={`/contacts/${quote.contact.id}`}
                        className="font-semibold text-purple-700 hover:text-purple-900 hover:underline block truncate"
                      >
                        {quote.contact.first_name} {quote.contact.last_name}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
                  <Calendar className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-green-900 mb-1">{t('common.created')}</p>
                    <p className="font-semibold text-green-700">
                      {format(new Date(quote.created_at), 'dd MMMM yyyy', { locale: nl })}
                    </p>
                  </div>
                </div>

                {quote.valid_until && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100">
                    <Clock className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-orange-900 mb-1">{t('quotes.validUntil')}</p>
                      <p className="font-semibold text-orange-700">
                        {format(new Date(quote.valid_until), 'dd MMMM yyyy', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {quote.description && (
                <>
                  <Separator className="my-6" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{t('quotes.description')}</p>
                    {isEditMode ? (
                      <Textarea
                        className="min-h-[100px]"
                        value={getFieldValue('description', quote.description)}
                        onChange={(e) => updateField('description', e.target.value)}
                        placeholder="Beschrijving..."
                      />
                    ) : (
                      <p className="text-sm leading-relaxed">{quote.description}</p>
                    )}
                  </div>
                </>
              )}

              {(quote.payment_terms || quote.delivery_time) && (
                <>
                  <Separator className="my-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quote.payment_terms && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          {t('quotes.paymentTerms')}
                        </p>
                        {isEditMode ? (
                          <Textarea
                            className="min-h-[100px]"
                            value={getFieldValue('payment_terms', quote.payment_terms)}
                            onChange={(e) => updateField('payment_terms', e.target.value)}
                            placeholder="Betalingsvoorwaarden...\n\nTip: gebruik • voor bullet points"
                          />
                        ) : (
                          <div className="text-sm">
                            {formatDescription(quote.payment_terms)}
                          </div>
                        )}
                      </div>
                    )}
                    {quote.delivery_time && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {t('quotes.deliveryTime')}
                        </p>
                        {isEditMode ? (
                          <Textarea
                            className="min-h-[100px]"
                            value={getFieldValue('delivery_time', quote.delivery_time)}
                            onChange={(e) => updateField('delivery_time', e.target.value)}
                            placeholder="Levertijd...\n\nTip: gebruik • voor bullet points"
                          />
                        ) : (
                          <div className="text-sm">
                            {formatDescription(quote.delivery_time)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">{t('quotes.lineItems')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items && items.length > 0 ? (
                  <>
                    {items.map((item, index) => (
                      <div 
                        key={item.id} 
                        className="p-4 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                                {index + 1}
                              </span>
                              <h4 className="font-semibold text-base">{item.title}</h4>
                              {item.category && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <div className="mt-3">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 text-xs -ml-2 mb-2"
                                  onClick={() => toggleItemExpanded(item.id)}
                                >
                                  {expandedItems.has(item.id) ? (
                                    <>
                                      <ChevronUp className="h-3 w-3 mr-1" />
                                      Inklappen
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-3 w-3 mr-1" />
                                      Toon details
                                    </>
                                  )}
                                </Button>
                                {expandedItems.has(item.id) && (
                                  <div className="pl-3 border-l-2 border-gray-200 mt-2">
                                    {formatDescription(item.description)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-6 flex-shrink-0">
                            <p className="font-bold text-lg">
                              {formatCurrency(item.total_price)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-6 text-sm text-muted-foreground bg-gray-50 rounded p-2 mt-3">
                          <span className="flex items-center gap-1">
                            Aantal: <span className="font-semibold text-gray-900">{item.quantity}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            Prijs: <span className="font-semibold text-gray-900">{formatCurrency(item.unit_price)}</span>
                          </span>
                        </div>
                      </div>
                    ))}

                    <Separator className="my-6" />

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-lg p-5 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('quotes.subtotal')}</span>
                        <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('quotes.tax')} ({quote.tax_rate}%)</span>
                        <span className="font-medium">{formatCurrency(quote.tax_amount)}</span>
                      </div>
                      <Separator className="my-3" />
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-lg font-bold">{t('quotes.total')}</span>
                        <span className="text-2xl font-bold">
                          {formatCurrency(quote.total_amount)}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{t('quotes.noLineItems')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Internal Notes */}
          {(quote.notes || isEditMode) && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">{t('quotes.internalNotes')}</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <Textarea
                    className="min-h-[120px]"
                    value={getFieldValue('notes', quote.notes || '')}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Interne notities...\n\nTip: gebruik • voor bullet points"
                  />
                ) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {formatDescription(quote.notes)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Client Notes */}
          {(quote.client_notes || isEditMode) && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Bericht aan klant
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <Textarea
                    className="min-h-[120px]"
                    value={getFieldValue('client_notes', quote.client_notes || '')}
                    onChange={(e) => updateField('client_notes', e.target.value)}
                    placeholder="Bericht aan klant...\n\nTip: gebruik • voor bullet points"
                  />
                ) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {formatDescription(quote.client_notes)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interactions/Activities */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                {t('navigation.activities')}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddInteractionDialogOpen(true);
                    setInteractionDefaultType('call');
                  }}
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {t('interactions.call')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddInteractionDialogOpen(true);
                    setInteractionDefaultType('email');
                  }}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  {t('interactions.email')}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setAddInteractionDialogOpen(true);
                    setInteractionDefaultType('note');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('interactions.addActivity')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <InteractionTimeline quoteId={id!} limit={20} />
            </CardContent>
          </Card>

          {/* Customer Signature Information */}
          {quote.sign_status === 'signed' && quote.signature_data && (
            <Card className="border-green-200 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle className="text-green-900">Getekend door Klant</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Signature Image */}
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-muted-foreground mb-2">{t('quotes.signature')}</p>
                  <img 
                    src={quote.signature_data} 
                    alt={t('quotes.signature')} 
                    className="max-w-full h-24 border border-gray-200 rounded"
                  />
                </div>

                {/* Signature Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotes.signedBy')}</span>
                    <span className="font-medium">{quote.signed_by_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotes.dateTime')}</span>
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
                      <span className="text-muted-foreground">{t('quotes.ipAddress')}</span>
                      <span className="font-mono text-xs">{quote.signer_ip_address}</span>
                    </div>
                  )}
                </div>

                <div className="bg-green-100/50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-800">
                    {t('quotes.signatureValid')}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Provider Signature Information */}
          {quote.provider_signature_data && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <CardTitle>{t('quotes.signedByProvider')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Signature Image */}
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-sm font-medium mb-3">Handtekening</p>
                  <div className="bg-white p-3 rounded border">
                    <img 
                      src={quote.provider_signature_data} 
                      alt="Provider signature" 
                      className="max-w-full h-20 mx-auto"
                    />
                  </div>
                </div>

                {/* Signature Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Namens</span>
                    <span className="font-medium">Dirq Solutions</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Datum</span>
                    <span className="font-medium">
                      {quote.provider_signed_at && format(new Date(quote.provider_signed_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                    </span>
                  </div>
                </div>

                {quote.provider_signed_document_url && (
                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-900 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Volledig getekend document beschikbaar
                    </p>
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={downloadSignedDocument}
                      >
                        <Download className="h-3 w-3 mr-2" />
                        Download Getekend PDF
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full"
                        onClick={async () => {
                          await navigator.clipboard.writeText(quote.provider_signed_document_url!);
                          toast.success('Link gekopieerd!');
                        }}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Kopieer Download Link
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Tracker */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Current Status Badge */}
                <div className="flex items-center justify-between p-3 rounded-lg border-2" style={{
                  borderColor: statusConfig[quote.status]?.color || '#94a3b8',
                  backgroundColor: `${statusConfig[quote.status]?.color}10` || '#f1f5f9'
                }}>
                  <span className="font-semibold" style={{ color: statusConfig[quote.status]?.color }}>
                    {statusConfig[quote.status]?.label}
                  </span>
                  {statusConfig[quote.status]?.icon}
                </div>

                {/* Status Progress Indicators */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${quote.status !== 'draft' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                    <span className={quote.status !== 'draft' ? 'text-foreground' : 'text-muted-foreground'}>
                      Verzonden
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${['viewed', 'accepted', 'rejected'].includes(quote.status) ? 'bg-purple-500' : 'bg-gray-300'}`} />
                    <span className={['viewed', 'accepted', 'rejected'].includes(quote.status) ? 'text-foreground' : 'text-muted-foreground'}>
                      Bekeken
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={`w-2 h-2 rounded-full ${quote.status === 'accepted' ? 'bg-green-500' : quote.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'}`} />
                    <span className={['accepted', 'rejected'].includes(quote.status) ? 'text-foreground' : 'text-muted-foreground'}>
                      {quote.status === 'accepted' ? 'Geaccepteerd' : quote.status === 'rejected' ? 'Afgewezen' : 'Beslissing'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>{t('timeline.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{t('timeline.created')}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(quote.created_at), 'dd MMM yyyy HH:mm', { locale: nl })}
                    </p>
                  </div>
                </div>

                {quote.sent_at && (
                  <div className="flex gap-3">
                    <Send className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{t('timeline.sent')}</p>
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
                      <p className="text-sm font-medium">{t('timeline.viewed')}</p>
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
                      <p className="text-sm font-medium">{t('quotes.accepted')}</p>
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
                      <p className="text-sm font-medium">{t('quotes.rejected')}</p>
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
                <CardTitle>{t('quotes.createdBy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {quote.owner?.voornaam} {quote.owner?.achternaam}
                    </p>
                    <p className="text-sm text-muted-foreground">{t('common.createdBy')}</p>
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
            <AlertDialogTitle>{t('quotes.deleteQuote')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('quotes.deleteConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
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
              {t('quotes.sendForSignature')}
            </DialogTitle>
            <DialogDescription>
              {t('quotes.signLinkDescription')}
            </DialogDescription>
          </DialogHeader>

          {!generatedSignLink ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signer-email">{t('quotes.signerEmail')} *</Label>
                <Input
                  id="signer-email"
                  type="email"
                  placeholder="naam@bedrijf.nl"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('quotes.emailWillBeSent')}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSignDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleGenerateSignLink} disabled={!signerEmail}>
                  <Mail className="h-4 w-4 mr-2" />
                  {t('quotes.sendLink')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">{t('quotes.linkSent')}</p>
                    <p className="text-sm text-green-700 mt-1">
                      {t('quotes.emailSentTo')} <strong>{signerEmail}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('quotes.signatureLink')}</Label>
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

      {/* Add Interaction Dialog */}
      <AddInteractionDialog
        open={addInteractionDialogOpen}
        onOpenChange={setAddInteractionDialogOpen}
        companyId={quote?.company_id}
        contactId={quote?.contact_id ?? undefined}
        quoteId={id}
        defaultType={interactionDefaultType}
      />

      {/* Provider Signature Dialog */}
      <Dialog open={providerSignDialogOpen} onOpenChange={setProviderSignDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pen className="h-5 w-5 text-blue-600" />
              {t('quotes.signQuoteAsProvider')}
            </DialogTitle>
            <DialogDescription>
              {t('quotes.signOnBehalfOfDirq')}
            </DialogDescription>
          </DialogHeader>

          {!showProviderSignatureCanvas ? (
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-3">
                <p className="font-medium text-blue-900">{t('quotes.quoteDetails')}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotes.quoteNumber')}:</span>
                    <span className="font-medium">{quote?.quote_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotes.amount')}:</span>
                    <span className="font-medium">{formatCurrency(quote?.total_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('quotes.customer')}:</span>
                    <span className="font-medium">{quote?.company?.name}</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <p className="text-sm text-amber-900">
                  <strong>{t('quotes.providerSignWarningTitle')}</strong> {t('quotes.providerSignWarningText')}
                </p>
                <ul className="text-sm text-amber-800 mt-2 space-y-1 list-disc list-inside">
                  <li>{t('quotes.providerWarning1')}</li>
                  <li>{t('quotes.providerWarning2')}</li>
                  <li>{t('quotes.providerWarning3')}</li>
                </ul>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setProviderSignDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => setShowProviderSignatureCanvas(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Pen className="h-4 w-4 mr-2" />
                  {t('quotes.continueToSign')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {t('quotes.signAs')}
                </p>
                <p className="text-xs text-blue-700">
                  {t('quotes.signBelowOfficial')}
                </p>
              </div>

              <SignatureCanvas
                onSave={handleProviderSignature}
                onCancel={() => setShowProviderSignatureCanvas(false)}
              />

              {providerSigning && (
                <div className="flex items-center justify-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">{t('quotes.documentGenerating')}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </AppLayout>
  );
}
