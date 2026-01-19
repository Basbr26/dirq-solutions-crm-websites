import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { SkeletonCard, SkeletonList } from '@/components/ui/skeleton-card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Users, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { AppLayout } from '@/components/layout/AppLayout';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { PaginationControls } from '@/components/ui/pagination-controls';

export default function CompaniesPage() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<CompanyFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const createCompany = useCreateCompany();

  // Debounce search to prevent excessive API calls
  const debouncedSearch = useDebounce(search, 500);

  // Apply search after debounce - reset to page 1 when search changes
  const activeFilters: CompanyFiltersType = {
    ...filters,
    search: debouncedSearch || undefined,
  };

  const {
    companies,
    totalCount,
    totalPages,
    isLoading,
    pagination,
  } = useCompanies(activeFilters);
  const { data: stats } = useCompanyStats();

  // Reset to page 1 when search or filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    pagination.resetPage();
  };

  const canCreateCompany = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);

  const handleExportCSV = async () => {
    try {
      toast.info(t('companies.exporting'));
      
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

      const { data: exportCompanies, error } = await query;
      
      if (error) throw error;
      if (!exportCompanies || exportCompanies.length === 0) {
        toast.warning(t('companies.noCompaniesToExport'));
        return;
      }

      // Convert to CSV
      const headers = [t('companies.name'), t('common.email'), t('common.phone'), t('companies.website'), t('companies.status'), t('companies.priority'), t('companies.size'), t('companies.industry'), t('common.created')];
      const rows = exportCompanies.map(c => [
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

      toast.success(t('companies.companiesExported', { count: exportCompanies.length }));
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(t('errors.exportFailed') + ': ' + error.message);
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
      title={t('companies.title')}
      subtitle={t('companies.subtitle')}
      onPrimaryAction={() => setCreateDialogOpen(true)}
      actions={
        <Button size="lg" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('companies.newCompany')}
        </Button>
      }
    >
    <div className="space-y-6">

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('common.total')}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">bedrijven in systeem</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('companies.active')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{stats.active}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('companies.activeClients')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('companies.prospects')}</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{stats.prospects}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('companies.potentialClients')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('companies.inactive')}</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{stats.inactive}</div>
              <p className="text-xs text-muted-foreground hidden sm:block">{t('companies.inactiveCompanies')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('companies.searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filter')}
            {Object.values(filters).filter(Boolean).length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {Object.values(filters).filter(Boolean).length}
              </Badge>
            )}
          </Button>

          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
          
          {canCreateCompany && (
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              {t('common.import')}
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
                <label className="text-sm font-medium mb-2 block">{t('companies.status')}</label>
                <Select
                  value={filters.status?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, status: value ? [value as CompanyStatus] : [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('companies.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('companies.allStatuses')}</SelectItem>
                    <SelectItem value="prospect">{t('companies.statuses.prospect')}</SelectItem>
                    <SelectItem value="active">{t('companies.statuses.active')}</SelectItem>
                    <SelectItem value="inactive">{t('companies.statuses.inactive')}</SelectItem>
                    <SelectItem value="churned">{t('companies.statuses.churned')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('companies.priority')}</label>
                <Select
                  value={filters.priority?.[0] || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, priority: value ? [value as CompanyPriority] : [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('companies.allPriorities')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('companies.allPriorities')}</SelectItem>
                    <SelectItem value="low">{t('companies.priorities.low')}</SelectItem>
                    <SelectItem value="medium">{t('companies.priorities.medium')}</SelectItem>
                    <SelectItem value="high">{t('companies.priorities.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('companies.source')} (v2.0)</label>
                <Select
                  value={(filters as any).source || ''}
                  onValueChange={(value) =>
                    setFilters({ ...filters, source: value || undefined } as any)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('companies.allSources')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('companies.allSources')}</SelectItem>
                    <SelectItem value="Manual">{t('companies.sources.manual')}</SelectItem>
                    <SelectItem value="Apollo">Apollo.io</SelectItem>
                    <SelectItem value="KVK">KVK API</SelectItem>
                    <SelectItem value="Website">{t('companies.sources.website')}</SelectItem>
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
                  {t('companies.resetFilters')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Grid */}
      {isLoading ? (
        <SkeletonList count={6} />
      ) : companies && companies.length > 0 ? (
        <>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>

          {/* Pagination */}
          <PaginationControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            pageSizeOptions={pagination.pageSizeOptions}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            isLoading={isLoading}
          />
        </>
      ) : (
        <EmptyState
          icon={Building2}
          title={t('companies.noCompaniesFound')}
          description={
            search || Object.values(filters).filter(Boolean).length > 0
              ? t('companies.adjustFilters')
              : t('companies.addFirstCompany')
          }
          action={
            canCreateCompany && !search && Object.values(filters).filter(Boolean).length === 0
              ? {
                  label: t('companies.newCompany'),
                  onClick: () => setCreateDialogOpen(true),
                  icon: Plus,
                }
              : undefined
          }
        />
      )}

      {/* Create Company Dialog */}
      <CompanyForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={(data) => {
          createCompany.mutate(data, {
            onSuccess: () => setCreateDialogOpen(false),
            onError: (error) => {
              toast.error(t('errors.createFailed') + ': ' + error.message);
            },
          });
        }}
        isLoading={createCompany.isPending}
      />

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title={t('companies.importTitle')}
        description={t('companies.importDescription')}
        requiredFields={['name']}
        optionalFields={['email', 'phone', 'website', 'status', 'priority', 'company_size', 'notes']}
        onImport={handleImport}
      />
    </div>
    </AppLayout>
  );
}
