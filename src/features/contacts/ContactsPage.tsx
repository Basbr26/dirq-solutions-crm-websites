import { useState } from "react";
import { useContacts } from "./hooks/useContacts";
import { useContactMutations } from "./hooks/useContactMutations";
import { ContactCard } from "./components/ContactCard";
import { ContactForm } from "./components/ContactForm";
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
import {
  UserPlus,
  Search,
  Filter,
  Users,
  Star,
  Crown,
  Building2,
  Loader2,
} from "lucide-react";
import { ContactCreateData } from "@/types/crm";

export function ContactsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCompanyId, setFilterCompanyId] = useState<string | undefined>();
  const [filterIsPrimary, setFilterIsPrimary] = useState<boolean | undefined>();
  const [filterIsDecisionMaker, setFilterIsDecisionMaker] = useState<
    boolean | undefined
  >();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 20;

  const { data, isLoading, error } = useContacts({
    page,
    pageSize,
    search: search || undefined,
    companyId: filterCompanyId,
    isPrimary: filterIsPrimary,
    isDecisionMaker: filterIsDecisionMaker,
  });

  const { data: companiesData } = useCompanies();

  const { createContact } = useContactMutations();

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
    });
  };

  const totalPages = data ? Math.ceil(data.count / pageSize) : 0;

  // Calculate stats
  const stats = {
    total: data?.count || 0,
    primary: data?.contacts.filter((c) => c.is_primary).length || 0,
    decisionMakers: data?.contacts.filter((c) => c.is_decision_maker).length || 0,
    withCompany: data?.contacts.filter((c) => c.company_id).length || 0,
  };

  return (
    <AppLayout
      title="Contacten"
      subtitle="Beheer uw contactpersonen en relaties"
      actions={
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nieuw Contact
        </Button>
      }
    >
    <div className="space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Totaal Contacten
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Primair Contact
            </CardTitle>
            <Star className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.primary}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beslissers</CardTitle>
            <Crown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.decisionMakers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Met Bedrijf</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withCompany}</div>
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
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "secondary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
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
                    setPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Alle bedrijven" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle bedrijven</SelectItem>
                    {companiesData?.companies.map((company) => (
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
                    setPage(1);
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
                    setPage(1);
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
                    setPage(1);
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-destructive">
              <p>Er is een fout opgetreden bij het laden van contacten</p>
              <p className="text-sm mt-2">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      ) : data?.contacts.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground py-12">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Geen contacten gevonden</p>
              <p className="text-sm mt-2">
                {search || filterCompanyId || filterIsPrimary !== undefined || filterIsDecisionMaker !== undefined
                  ? "Probeer andere zoek- of filterinstellingen"
                  : "Voeg uw eerste contact toe om te beginnen"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Contacts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Vorige
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {page} van {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Volgende
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Contact Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuw Contact</DialogTitle>
            <DialogDescription>
              Voeg een nieuw contactpersoon toe aan uw CRM
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            onSubmit={handleCreateContact}
            onCancel={() => setShowCreateDialog(false)}
            isSubmitting={createContact.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
    </AppLayout>
  );
}

export default ContactsPage;
