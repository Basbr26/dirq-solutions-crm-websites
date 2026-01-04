import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCompany } from './hooks/useCompanies';
import { useUpdateCompany, useDeleteCompany } from './hooks/useCompanyMutations';
import { CompanyForm } from './components/CompanyForm';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  ArrowLeft,
  Users,
  TrendingUp,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/hooks/useAuth';

const statusConfig = {
  prospect: { label: 'Prospect', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  active: { label: 'Actief', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  inactive: { label: 'Inactief', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  churned: { label: 'Verloren', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const priorityConfig = {
  low: { label: 'Laag', color: 'bg-gray-500/10 text-gray-500' },
  medium: { label: 'Normaal', color: 'bg-blue-500/10 text-blue-500' },
  high: { label: 'Hoog', color: 'bg-orange-500/10 text-orange-500' },
};

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: company, isLoading } = useCompany(id!);
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  const canDelete = role === 'ADMIN';

  const handleUpdate = (data: any) => {
    if (!id) return;
    updateCompany.mutate(
      { id, data },
      {
        onSuccess: () => setEditDialogOpen(false),
      }
    );
  };

  const handleDelete = () => {
    if (!id) return;
    deleteCompany.mutate(id, {
      onSuccess: () => navigate('/companies'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Bedrijf niet gevonden</h3>
            <p className="text-muted-foreground mb-4">
              Dit bedrijf bestaat niet of je hebt geen toegang.
            </p>
            <Link to="/companies">
              <Button>Terug naar overzicht</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusStyle = statusConfig[company.status];
  const priorityStyle = priorityConfig[company.priority];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to="/companies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-3xl font-bold">{company.name}</h1>
                <Badge className={statusStyle.color} variant="outline">
                  {statusStyle.label}
                </Badge>
                <Badge className={priorityStyle.color} variant="outline">
                  {priorityStyle.label}
                </Badge>
              </div>
              {company.industry && (
                <p className="text-muted-foreground">{company.industry.name}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
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

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overzicht</TabsTrigger>
          <TabsTrigger value="contacts">Contacten</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="interactions">Activiteiten</TabsTrigger>
          <TabsTrigger value="documents">Documenten</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contactinformatie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <a
                        href={`mailto:${company.email}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {company.email}
                      </a>
                    </div>
                  </div>
                )}
                {company.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefoon</p>
                      <a
                        href={`tel:${company.phone}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {company.phone}
                      </a>
                    </div>
                  </div>
                )}
                {company.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a
                        href={company.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {company.website}
                      </a>
                    </div>
                  </div>
                )}
                {company.address && (company.address.street || company.address.city) && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Adres</p>
                      <p className="text-sm font-medium">
                        {company.address.street && <>{company.address.street}<br /></>}
                        {company.address.postal_code} {company.address.city}
                        {company.address.country && <>, {company.address.country}</>}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Bedrijfsgegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.company_size && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrijfsgrootte</p>
                    <p className="text-sm font-medium">{company.company_size} werknemers</p>
                  </div>
                )}
                {company.annual_revenue && (
                  <div>
                    <p className="text-sm text-muted-foreground">Jaaromzet</p>
                    <p className="text-sm font-medium">
                      € {company.annual_revenue.toLocaleString('nl-NL')}
                    </p>
                  </div>
                )}
                {company.owner && (
                  <div>
                    <p className="text-sm text-muted-foreground">Eigenaar</p>
                    <p className="text-sm font-medium">
                      {company.owner.voornaam} {company.owner.achternaam}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Aangemaakt</p>
                  <p className="text-sm font-medium">
                    {format(new Date(company.created_at), 'dd MMMM yyyy', { locale: nl })}
                  </p>
                </div>
                {company.last_contact_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Laatste contact</p>
                    <p className="text-sm font-medium">
                      {format(new Date(company.last_contact_date), 'dd MMMM yyyy', { locale: nl })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {company.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{company.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Tags */}
          {company.tags && company.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contactpersonen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Contacten module komt binnenkort beschikbaar</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Leads module komt binnenkort beschikbaar</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Activiteiten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Activiteiten module komt binnenkort beschikbaar</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documenten
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Documenten module komt binnenkort beschikbaar</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <CompanyForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        company={company}
        onSubmit={handleUpdate}
        isLoading={updateCompany.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je <strong>{company.name}</strong> wilt verwijderen? Deze actie kan
              niet ongedaan worden gemaakt. Alle gekoppelde contacten, leads en activiteiten worden
              ook verwijderd.
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
