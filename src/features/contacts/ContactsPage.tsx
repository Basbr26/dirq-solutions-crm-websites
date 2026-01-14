import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    pagination.resetPage();
  };

  const handleCreateContact = (formData: ContactCreateData) => {
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
        toast.error('Fout bij aanmaken contact: ' + error.message);
      },
    });
  };

  const handleExportCSV = async () => {
    try {
      toast.info('Contacten exporteren...');
      
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
        toast.warning('Geen contacten om te exporteren');
        return;
      }

      // Convert to CSV
      const headers = ['Voornaam', 'Achternaam', 'Email', 'Telefoon', 'Mobiel', 'Functie', 'Afdeling', 'Bedrijf', 'Primair', 'Beslisser', 'Aangemaakt'];
      const rows = contacts.map((c: any) => [
        c.first_name || '',
        c.last_name || '',
        c.email || '',
        c.phone || '',
        c.mobile || '',
        c.position || '',
        c.department || '',
        c.companies?.name || '',
        c.is_primary ? 'Ja' : 'Nee',
        c.is_decision_maker ? 'Ja' : 'Nee',
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

      toast.success(`${contacts.length} contacten geëxporteerd`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Fout bij exporteren: ' + error.message);
    }
  };

  const handleImport = async (data: any[], fieldMapping: Record<string, string>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get all companies for lookup
    const { data: companies } = await supabase
      .from('companies')
      .select('id, name');

    const companyMap = new Map(
      companies?.map(c => [c.name.toLowerCase(), c.id]) || []
    );

    let successCount = 0;
    let errorCount = 0;

    for (const row of data) {
      try {
        // Map CSV fields to database fields
        const contactData: any = {
          first_name: row.first_name || row.Voornaam,
          last_name: row.last_name || row.Achternaam,
          email: row.email || row.Email || undefined,
          phone: row.phone || row.Telefoon || undefined,
          mobile: row.mobile || row.Mobiel || undefined,
          position: row.position || row.Functie || undefined,
          department: row.department || row.Afdeling || undefined,
          is_primary: row.is_primary === 'Ja' || row.is_primary === 'true' || row.is_primary === true,
          is_decision_maker: row.is_decision_maker === 'Ja' || row.is_decision_maker === 'true' || row.is_decision_maker === true,
          notes: row.notes || row.Notities || undefined,
          owner_id: user.id,
        };

        // Try to match company by name
        const companyName = row.company || row.Bedrijf;
        if (companyName) {
          const companyId = companyMap.get(companyName.toLowerCase());
          if (companyId) {
            contactData.company_id = companyId;
          }
        }

        // Insert into database
        const { error } = await supabase
          .from('contacts')
          .insert([contactData]);

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

  // Calculate stats
  const stats = {
    total: totalCount || 0,
    primary: contacts.filter((c) => c.is_primary).length || 0,
    decisionMakers: contacts.filter((c) => c.is_decision_maker).length || 0,
    withCompany: contacts.filter((c) => c.company_id).length || 0,
  };

  return (
    <AppLayout
      title="Contacten"
      subtitle="Beheer uw contactpersonen en relaties"
      onPrimaryAction={() => setShowCreateDialog(true)}
      actions={
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nieuw Contact
        </Button>
      }
    >
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totaal
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">contacten</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Primair
            </CardTitle>
            <Star className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.primary}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">primair contact</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beslissers</CardTitle>
            <Crown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.decisionMakers}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">beslissingsbevoegd</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Met Bedrijf</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withCompany}</div>
            <p className="text-xs text-muted-foreground hidden sm:block">gekoppeld</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Zoek op naam, email of functie..."
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
            Filters
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Bedrijf</label>
                <Select
                  value={filterCompanyId || "all"}
                  onValueChange={(value) => {
                    setFilterCompanyId(value === "all" ? undefined : value);
                    pagination.resetPage();
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle bedrijven" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle bedrijven</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Primair Contact</label>
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
                    <SelectValue placeholder="Alle contacten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Alleen primair</SelectItem>
                    <SelectItem value="false">Niet primair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Beslisser</label>
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
                    <SelectValue placeholder="Alle contacten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Alleen beslissers</SelectItem>
                    <SelectItem value="false">Niet beslisser</SelectItem>
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
                  Wis alle filters
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
              <p>Er is een fout opgetreden bij het laden van contacten</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Geen contacten gevonden"
          description={
            search || filterCompanyId || filterIsPrimary !== undefined || filterIsDecisionMaker !== undefined
              ? "Probeer andere zoek- of filterinstellingen"
              : "Voeg uw eerste contact toe om te beginnen"
          }
          action={{
            label: "Contact Toevoegen",
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
            <DialogTitle>Nieuw Contact</DialogTitle>
            <DialogDescription>
              Voeg een nieuw contactpersoon toe aan uw CRM
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
        title="Contacten Importeren"
        description="Importeer meerdere contactpersonen tegelijk vanuit een CSV bestand"
        requiredFields={['first_name', 'last_name']}
        optionalFields={['email', 'phone', 'mobile', 'position', 'department', 'company', 'is_primary', 'is_decision_maker', 'notes']}
        onImport={handleImport}
      />
    </div>
    </AppLayout>
  );
}

export default ContactsPage;
