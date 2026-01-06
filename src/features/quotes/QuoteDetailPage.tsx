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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Quote, QuoteStatus } from '@/types/quotes';

const statusConfig: Record<QuoteStatus, { 
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
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
          companies:companies(id, name, email, phone),
          contacts:contacts(id, first_name, last_name, email, phone),
          projects:projects(id, title, stage),
          profiles:profiles!quotes_created_by_fkey(id, voornaam, achternaam, email)
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
      onSuccess: () => {
        toast.success(`Status gewijzigd naar ${statusConfig[newStatus].label}`);
      },
    });
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export
    toast.info('PDF export wordt binnenkort toegevoegd');
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

  const StatusIcon = statusConfig[quote.status].icon;

  return (
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
              <Badge className={statusConfig[quote.status].color} variant="outline">
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig[quote.status].label}
              </Badge>
            </div>
            <p className="text-muted-foreground">Offerte {quote.quote_number}</p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              PDF Exporteren
            </Button>
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
                      to={`/companies/${quote.companies?.id}`}
                      className="font-medium hover:underline"
                    >
                      {quote.companies?.name}
                    </Link>
                  </div>
                </div>

                {quote.contacts && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contactpersoon</p>
                      <Link 
                        to={`/contacts/${quote.contacts.id}`}
                        className="font-medium hover:underline"
                      >
                        {quote.contacts.first_name} {quote.contacts.last_name}
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
          {quote.profiles && (
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
                      {quote.profiles.full_name}
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
    </div>
  );
}
