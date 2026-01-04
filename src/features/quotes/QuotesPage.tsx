/**
 * Quotes Page - List View
 * Displays all sales quotes with filtering and stats
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FileText, CheckCircle2, XCircle, Clock, Send } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuotes, useQuoteStats } from './hooks/useQuotes';
import { useCreateQuote } from './hooks/useQuoteMutations';
import { QuoteForm } from './components/QuoteForm';
import type { QuoteStatus } from '@/types/quotes';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

const statusConfig: Record<QuoteStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  draft: { label: 'Concept', variant: 'secondary', icon: FileText },
  sent: { label: 'Verzonden', variant: 'default', icon: Send },
  viewed: { label: 'Bekeken', variant: 'outline', icon: Clock },
  accepted: { label: 'Geaccepteerd', variant: 'default', icon: CheckCircle2 },
  rejected: { label: 'Afgewezen', variant: 'destructive', icon: XCircle },
  expired: { label: 'Verlopen', variant: 'outline', icon: Clock },
};

export default function QuotesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const { data: stats } = useQuoteStats();
  const { data: quotes, isLoading } = useQuotes(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );
  const createQuote = useCreateQuote();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <AppLayout
      title="Offertes"
      subtitle="Beheer en volg al je sales offertes"
      actions={
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Offerte
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Totaal Waarde</div>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_value)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Geaccepteerd</div>
              <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Verzonden</div>
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Gem. Waarde</div>
              <div className="text-2xl font-bold">{formatCurrency(stats.avg_value)}</div>
            </Card>
          </div>
        )}

        {/* Tabs Filter */}
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as QuoteStatus | 'all')}>
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="draft">Concept</TabsTrigger>
            <TabsTrigger value="sent">Verzonden</TabsTrigger>
            <TabsTrigger value="accepted">Geaccepteerd</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-6 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </Card>
                ))}
              </div>
            ) : !quotes || quotes.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Geen offertes gevonden</h3>
                <p className="text-muted-foreground mb-4">
                  {statusFilter === 'all' 
                    ? 'Maak je eerste offerte aan' 
                    : `Geen offertes met status "${statusConfig[statusFilter as QuoteStatus]?.label}"`}
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nieuwe Offerte
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {quotes.map(quote => {
                  const StatusIcon = statusConfig[quote.status].icon;
                  return (
                    <Link key={quote.id} to={`/quotes/${quote.id}`}>
                      <Card className="p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{quote.title}</h3>
                              <Badge variant={statusConfig[quote.status].variant}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusConfig[quote.status].label}
                              </Badge>
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div>{quote.quote_number}</div>
                              <div className="flex items-center gap-4">
                                <span>{quote.companies?.name}</span>
                                {quote.contacts && (
                                  <span>• {quote.contacts.first_name} {quote.contacts.last_name}</span>
                                )}
                                <span>• {format(new Date(quote.created_at), 'dd MMM yyyy', { locale: nl })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold">{formatCurrency(quote.total_amount)}</div>
                            {quote.valid_until && (
                              <div className="text-sm text-muted-foreground">
                                Geldig tot {format(new Date(quote.valid_until), 'dd MMM', { locale: nl })}
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Quote Dialog */}
      <QuoteForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          createQuote.mutate(data, {
            onSuccess: (quote) => {
              setCreateDialogOpen(false);
              navigate(`/quotes/${quote.id}`);
            },
          });
        }}
        isLoading={createQuote.isPending}
      />
    </AppLayout>
  );
}
