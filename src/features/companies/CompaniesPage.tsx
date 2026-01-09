import { useState } from 'react';
import { Plus, Search, Filter, Download, Upload } from 'lucide-react';
import { useCompanies, useCompanyStats } from './hooks/useCompanies';
import { useCreateCompany } from './hooks/useCompanyMutations';
import { CompanyCard } from './components/CompanyCard';
import { CompanyForm } from './components/CompanyForm';
import { CompanyFilters as CompanyFiltersType, CompanyStatus, CompanyPriority } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Users, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CSVImportDialog } from '@/components/CSVImportDialog';

export default function CompaniesPage() {
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CompanyFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const createCompany = useCreateCompany();

  // Debounce search to prevent excessive API calls
  const debouncedSearch = useDebounce(search, 500);

  // Apply search after debounce
  const activeFilters: CompanyFiltersType = {
    ...filters,
    search: debouncedSearch || undefined,
  };

  const { data, isLoading, page, setPage, pageSize } = useCompanies(activeFilters);
  const { data: stats } = useCompanyStats();

  const canCreateCompany = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);

  const handleExportCSV = async () => {
    try {
      toast.info('Bedrijven exporteren...');
      
      let query = supabase
        .from('companies')
        .select('name, email, phone, website, status, priority, company_size, industries(name), created_at');

      // Apply same filters as current view
      if (activeFilters.status && activeFilters.status.length > 0) {
        query = query.in('status', activeFilters.status);
      }
      if (activeFilters.priority && activeFilters.priority.length > 0) {
        query = query.in('priority', activeFilters.priority);
      }
      if (activeFilters.search) {
        query = query.or(`name.ilike.%${activeFilters.search}%,email.ilike.%${activeFilters.search}%`);
      }

      const { data: companies, error } = await query;
      
      if (error) throw error;
      if (!companies || companies.length === 0) {
        toast.warning('Geen bedrijven om te exporteren');
        return;
      }

      // Convert to CSV
      const headers = ['Naam', 'Email', 'Telefoon', 'Website', 'Status', 'Prioriteit', 'Grootte', 'Industrie', 'Aangemaakt'];
      const rows = companies.map(c => [
        c.name || '',
        c.email || '',
        c.phone || '',
        c.website || '',
        c.status || '',
        c.priority || '',
        c.company_size || '',
        c.industries?.name || '',
        c.created_at ? format(new Date(c.created_at), 'yyyy-MM-dd') : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bedrijven-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`${companies.length} bedrijven geëxporteerd`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Fout bij exporteren: ' + error.message);
    }
  };

  const handleImport = async (data: any[], fieldMapping: Record<string, string>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        // Map CSV fields to database fields
        const companyData: any = {
          name: row.name || row.Naam,
          email: row.email || row.Email || undefined,
          phone: row.phone || row.Telefoon || undefined,
          website: row.website || row.Website || undefined,
          status: (row.status || row.Status || 'prospect').toLowerCase(),
          priority: (row.priority || row.Prioriteit || 'medium').toLowerCase(),
          company_size: row.company_size || row.Grootte || undefined,
          notes: row.notes || row.Notities || undefined,
          owner_id: user.id,
        };

        // Insert into database
        const { error } = await supabase
          .from('companies')
          .insert([companyData]);

        if (error) {
          console.error('Insert error for row:', row, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error('Row processing error:', error);
        errorCount++;
      }
    }

    return { success: successCount, errors: errorCount };
  };

  return (
    <AppLayout
      title="Bedrijven"
      subtitle="Beheer en volg al je zakelijke relaties"
      actions={
        <Button size="lg" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nieuw Bedrijf
        </Button>
      }
    >
    <div className="space-y-6">

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totaal</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">bedrijven in systeem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actief</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.active}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">actieve klanten</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prospects</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.prospects}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">potentiële klanten</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactief</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">niet-actieve bedrijven</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek bedrijven op naam, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {Object.values(filters).filter(Boolean).length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {Object.values(filters).filter(Boolean).length}
              </Badge>
            )}
          </Button>

          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          {canCreateCompany && (
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters (Collapsible) */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select
                  value={filters.status?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value ? [value as CompanyStatus] : [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle statussen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle statussen</SelectItem>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="active">Actief</SelectItem>
                    <SelectItem value="inactive">Inactief</SelectItem>
                    <SelectItem value="churned">Verloren</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Prioriteit</label>
                <Select
                  value={filters.priority?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, priority: value ? [value as CompanyPriority] : [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle prioriteiten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle prioriteiten</SelectItem>
                    <SelectItem value="low">Laag</SelectItem>
                    <SelectItem value="medium">Normaal</SelectItem>
                    <SelectItem value="high">Hoog</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Bron (v2.0)</label>
                <Select
                  value={(filters as any).source || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, source: value || undefined } as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle bronnen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Alle bronnen</SelectItem>
                    <SelectItem value="Manual">Handmatig</SelectItem>
                    <SelectItem value="Apollo">Apollo.io</SelectItem>
                    <SelectItem value="KVK">KVK API</SelectItem>
                    <SelectItem value="Website">Website Form</SelectItem>
                    <SelectItem value="Manus">Manus AI</SelectItem>
                    <SelectItem value="n8n_automation">n8n Automation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end justify-end">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setFilters({});
                    setSearch('');
                  }}
                >
                  Reset filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Grid */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-4 w-3/4 mt-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.companies.length > 0 ? (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {data.companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>

          {/* Pagination */}
          {data.count > pageSize && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Toont {(page - 1) * pageSize + 1} tot {Math.min(page * pageSize, data.count)} van{' '}
                {data.count} bedrijven
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Vorige
                </Button>
                <Button
                  variant="outline"
                  disabled={!data.hasMore}
                  onClick={() => setPage(page + 1)}
                >
                  Volgende
                </Button>
              </div>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Geen bedrijven gevonden</h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || Object.values(filters).filter(Boolean).length > 0
                ? 'Pas je filters aan of probeer een andere zoekopdracht.'
                : 'Begin met het toevoegen van je eerste bedrijf.'}
            </p>
            {canCreateCompany && !search && Object.values(filters).filter(Boolean).length === 0 && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nieuw Bedrijf
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Company Dialog */}
      <CompanyForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          createCompany.mutate(data, {
            onSuccess: () => setCreateDialogOpen(false),
            onError: (error) => {
              toast.error('Fout bij aanmaken bedrijf: ' + error.message);
            },
          });
        }}
        isLoading={createCompany.isPending}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title="Bedrijven Importeren"
        description="Importeer meerdere bedrijven tegelijk vanuit een CSV bestand"
        requiredFields={['name']}
        optionalFields={['email', 'phone', 'website', 'status', 'priority', 'company_size', 'notes']}
        onImport={handleImport}
      />
    </div>
    </AppLayout>
  );
}
