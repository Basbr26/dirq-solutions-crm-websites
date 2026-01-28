import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { useContacts } from "./hooks/useContacts";
import { useContactMutations } from "./hooks/useContactMutations";
import { ContactCard } from "./components/ContactCard";
import { ContactForm } from "./components/ContactForm";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCompanies } from "@/features/companies/hooks/useCompanies";
import { AppLayout } from "@/components/layout/AppLayout";
import { toast } from "sonner";
import { logger } from '@/lib/logger';
import {
  UserPlus,
  Search,
  Filter,
  Users,
  Star,
  Crown,
  Building2,
  Loader2,
  Download,
  Upload,
} from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ContactCreateData } from "@/types/crm";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CSVImportDialog } from '@/components/CSVImportDialog';
import { PaginationControls } from '@/components/ui/pagination-controls';

export function ContactsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>();
  const [filterIsPrimary, setFilterIsPrimary] = useState<boolean | undefined>();
  const [filterIsDecisionMaker, setFilterIsDecisionMaker] = useState<
    boolean | undefined
  >();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [preselectedCompanyId, setPreselectedCompanyId] = useState<string | undefined>();
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Check for company_id in URL parameters
  useEffect(() => {
    const companyId = searchParams.get('company_id');
    if (companyId) {
      setPreselectedCompanyId(companyId);
      setShowCreateDialog(true);
    }
  }, [searchParams]);
  
  // Debounce search to prevent excessive API calls
  const debouncedSearch = useDebounce(search, 500);

  const {
    contacts,
    totalCount,
    totalPages,
    isLoading,
    error,
    pagination,
  } = useContacts({
    search: debouncedSearch || undefined,
    companyId: filterCompanyId,
    isPrimary: filterIsPrimary,
    isDecisionMaker: filterIsDecisionMaker,
  });

  const { companies } = useCompanies();

  const { createContact } = useContactMutations();

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    pagination.resetPage();
  }, [pagination]);

  const handleCreateContact = useCallback((formData: ContactCreateData) => {
    // Handle "none" value from company dropdown
    const contactData = {
      ...formData,
      company_id:
        formData.company_id === "none" ? undefined : formData.company_id,
    };

    createContact.mutate(contactData, {
      onSuccess: () => {
        setShowCreateDialog(false);
      },
      onError: (error) => {
        toast.error(t('errors.createFailed') + ': ' + error.message);
      },
    });
  }, [createContact, t, setShowCreateDialog]);

  const handleExportCSV = useCallback(async () => {
    try {
      toast.info(t('contacts.exporting'));
      
      let query = supabase
        .from('contacts')
        .select('first_name, last_name, email, phone, mobile, position, department, companies(name), is_primary, is_decision_maker, created_at');

      // Apply same filters as current view
      if (filterCompanyId) {
        query = query.eq('company_id', filterCompanyId);
      }
      if (filterIsPrimary !== undefined) {
        query = query.eq('is_primary', filterIsPrimary);
      }
      if (filterIsDecisionMaker !== undefined) {
        query = query.eq('is_decision_maker', filterIsDecisionMaker);
      }
      if (debouncedSearch) {
        query = query.or(`first_name.ilike.%${debouncedSearch}%,last_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const { data: contacts, error } = await query;
      
      if (error) throw error;
      if (!contacts || contacts.length === 0) {
        toast.warning(t('contacts.noContactsToExport'));
        return;
      }

      // Convert to CSV
      const headers = [t('contacts.firstName'), t('contacts.lastName'), t('common.email'), t('common.phone'), t('contacts.mobile'), t('contacts.position'), t('contacts.department'), t('companies.title'), t('contacts.primary'), t('contacts.decisionMaker'), t('common.created')];
      const rows = contacts.map((c: any) => [
        c.first_name || '',
        c.last_name || '',
        c.email || '',
        c.phone || '',
        c.mobile || '',
        c.position || '',
        c.department || '',
        c.companies?.name || '',
        c.is_primary ? t('common.yes') : t('common.no'),
        c.is_decision_maker ? t('common.yes') : t('common.no'),
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
      link.download = `contacten-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(t('contacts.contactsExported', { count: contacts.length }));
    } catch (error: any) {
      logger.error(error, { context: 'contacts_export' });
      toast.error(t('errors.exportFailed') + ': ' + error.message);
    }
  }, [filterCompanyId, filterIsPrimary, filterIsDecisionMaker, debouncedSearch, t]);

  const handleImport = useCallback(async (data: any[], fieldMapping: Record<string, string>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Validation schema to prevent SQL injection and XSS
    const contactImportSchema = z.object({
      first_name: z.string().min(1, 'Voornaam is verplicht').max(100).trim(),
      last_name: z.string().min(1, 'Achternaam is verplicht').max(100).trim(),
      email: z.string().email('Ongeldig email formaat').max(255).optional().or(z.literal('')),
      phone: z.string().regex(/^\+?[0-9\s\-()]+$/, 'Ongeldig telefoonnummer').max(50).optional().or(z.literal('')),
      mobile: z.string().regex(/^\+?[0-9\s\-()]+$/, 'Ongeldig mobiel nummer').max(50).optional().or(z.literal('')),
      position: z.string().max(100).optional(),
      department: z.string().max(100).optional(),
      company_name: z.string().max(200).optional(),
      notes: z.string().max(1000).optional(),
      is_primary: z.boolean().optional(),
      is_decision_maker: z.boolean().optional(),
    });

    // Get all companies for lookup
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name');

    const companyMap = new Map(
      companies?.map(c => [c.name.toLowerCase(), c.id]) || []
    );

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Prepare data for validation
        const rawData = {
          first_name: (row.first_name || row.Voornaam || '').toString().trim(),
          last_name: (row.last_name || row.Achternaam || '').toString().trim(),
          email: (row.email || row.Email || '').toString().trim(),
          phone: (row.phone || row.Telefoon || '').toString().trim(),
          mobile: (row.mobile || row.Mobiel || '').toString().trim(),
          position: (row.position || row.Functie || '').toString().trim(),
          department: (row.department || row.Afdeling || '').toString().trim(),
          company_name: (row.company || row.Bedrijf || '').toString().trim(),
          notes: (row.notes || row.Notities || '').toString().trim(),
          is_primary: row.is_primary === 'Ja' || row.is_primary === 'true' || row.is_primary === true,
          is_decision_maker: row.is_decision_maker === 'Ja' || row.is_decision_maker === 'true' || row.is_decision_maker === true,
        };

        // Validate with Zod schema
        const validated = contactImportSchema.safeParse(rawData);
        
        if (!validated.success) {
          const errorMessages = validated.error.errors.map((e: { message: string }) => e.message).join(', ');
          errors.push({ row: i + 1, error: errorMessages });
          errorCount++;
          continue;
        }

        // Map validated fields to database fields
        const contactData: any = {
          first_name: validated.data.first_name,
          last_name: validated.data.last_name,
          email: validated.data.email || undefined,
          phone: validated.data.phone || undefined,
          mobile: validated.data.mobile || undefined,
          position: validated.data.position || undefined,
          department: validated.data.department || undefined,
          is_primary: validated.data.is_primary || false,
          is_decision_maker: validated.data.is_decision_maker || false,
          notes: validated.data.notes || undefined,
          owner_id: user.id,
        };

        // Try to match company by name (safely)
        if (validated.data.company_name) {
          const companyId = companyMap.get(validated.data.company_name.toLowerCase());
          if (companyId) {
            contactData.company_id = companyId;
          }
        }

        // Insert into database
        const { error } = await supabase
          .from('contacts')
          .insert([contactData]);

        if (error) {
          errors.push({ row: i + 1, error: error.message });
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error: any) {
        errors.push({ row: i + 1, error: error?.message || 'Unknown error' });
        errorCount++;
      }
    }

    // Show detailed error messages
    if (successCount > 0) {
      toast.success(`${successCount} contacten succesvol geïmporteerd`);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    }
    if (errorCount > 0) {
      const errorSummary = errors.slice(0, 3).map(e => `Rij ${e.row}: ${e.error}`).join('\n');
      const moreErrors = errors.length > 3 ? `\n... en ${errors.length - 3} meer` : '';
      toast.error(`${errorCount} contacten konden niet worden geïmporteerd:\n${errorSummary}${moreErrors}`, {
        duration: 8000,
      });
      logger.error(new Error('Contact import errors'), { context: 'contacts_import', error_count: errorCount, errors: errors.slice(0, 10) });
    }

    return { success: successCount, errors: errorCount };
  }, [queryClient]);

  // Calculate stats
  const stats = useMemo(() => ({
    total: totalCount || 0,
    primary: contacts.filter((c) => c.is_primary).length || 0,
    decisionMakers: contacts.filter((c) => c.is_decision_maker).length || 0,
    withCompany: contacts.filter((c) => c.company_id).length || 0,
  }), [contacts, totalCount]);

  return (
    <AppLayout
      title={t('contacts.title')}
      subtitle={t('contacts.subtitle')}
      onPrimaryAction={() => setShowCreateDialog(true)}
      actions={
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('contacts.newContact')}
        </Button>
      }
    >
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('common.total')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">{t('contacts.contacts')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('contacts.primary')}
            </CardTitle>
            <Star className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.primary}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">{t('contacts.primaryContact')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('contacts.decisionMaker')}</CardTitle>
            <Crown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.decisionMakers}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">{t('contacts.authorized')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('contacts.withCompany')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withCompany}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">{t('contacts.linked')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('contacts.searchPlaceholder')}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? "secondary" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            {t('common.filter')}
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            {t('common.import')}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('companies.title')}</label>
                <Select
                  value={filterCompanyId || "all"}
                  onValueChange={(value) => {
                    setFilterCompanyId(value === "all" ? undefined : value);
                    pagination.resetPage();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('contacts.allCompanies')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('contacts.allCompanies')}</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('contacts.primaryContact')}</label>
                <Select
                  value={
                    filterIsPrimary === undefined
                      ? "all"
                      : filterIsPrimary
                        ? "true"
                        : "false"
                  }
                  onValueChange={(value) => {
                    setFilterIsPrimary(
                      value === "all"
                        ? undefined
                        : value === "true"
                    );
                    pagination.resetPage();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('contacts.allContacts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="true">{t('contacts.onlyPrimary')}</SelectItem>
                    <SelectItem value="false">{t('contacts.notPrimary')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('contacts.decisionMaker')}</label>
                <Select
                  value={
                    filterIsDecisionMaker === undefined
                      ? "all"
                      : filterIsDecisionMaker
                        ? "true"
                        : "false"
                  }
                  onValueChange={(value) => {
                    setFilterIsDecisionMaker(
                      value === "all"
                        ? undefined
                        : value === "true"
                    );
                    pagination.resetPage();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('contacts.allContacts')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all')}</SelectItem>
                    <SelectItem value="true">{t('contacts.onlyDecisionMakers')}</SelectItem>
                    <SelectItem value="false">{t('contacts.notDecisionMaker')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(filterCompanyId || filterIsPrimary !== undefined || filterIsDecisionMaker !== undefined) && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterCompanyId(undefined);
                    setFilterIsPrimary(undefined);
                    setFilterIsDecisionMaker(undefined);
                    pagination.resetPage();
                  }}
                >
                  {t('contacts.clearAllFilters')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <SkeletonList count={8} />
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>{t('contacts.errorLoading')}</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('contacts.noContactsFound')}
          description={
            search || filterCompanyId || filterIsPrimary !== undefined || filterIsDecisionMaker !== undefined
              ? t('contacts.tryDifferentFilters')
              : t('contacts.addFirstContact')
          }
          action={{
            label: t('contacts.addContact'),
            onClick: () => setShowCreateDialog(true),
            icon: UserPlus,
          }}
        />
      ) : (
        <>
          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
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
      )}

      {/* Create Contact Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] max-w-2xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('contacts.newContact')}</DialogTitle>
            <DialogDescription>
              {t('contacts.addNewContactDescription')}
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            defaultCompanyId={preselectedCompanyId}
            onSubmit={handleCreateContact}
            onCancel={() => {
              setShowCreateDialog(false);
              setPreselectedCompanyId(undefined);
            }}
            isSubmitting={createContact.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        title={t('contacts.importTitle')}
        description={t('contacts.importDescription')}
        requiredFields={['first_name', 'last_name']}
        optionalFields={['email', 'phone', 'mobile', 'position', 'department', 'company', 'is_primary', 'is_decision_maker', 'notes']}
        onImport={handleImport}
      />
    </div>
    </AppLayout>
  );
}

export default ContactsPage;
