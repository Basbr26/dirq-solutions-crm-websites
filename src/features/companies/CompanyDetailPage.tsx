import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { useCompany } from './hooks/useCompanies';
import { useUpdateCompany, useDeleteCompany } from './hooks/useCompanyMutations';
import { CompanyForm } from './components/CompanyForm';
import { useContacts } from '@/features/contacts/hooks/useContacts';
import { useContactMutations } from '@/features/contacts/hooks/useContactMutations';
import { ContactCard } from '@/features/contacts/components/ContactCard';
import { ContactForm } from '@/features/contacts/components/ContactForm';
import { useProjects } from '@/features/projects/hooks/useProjects';
import { ProjectCard } from '@/features/projects/components/ProjectCard';
import { ProjectForm } from '@/features/projects/components/ProjectForm';
import { useCreateProject } from '@/features/projects/hooks/useProjectMutations';
import { useInteractions } from '@/features/interactions/hooks/useInteractions';
import { InteractionItem } from '@/features/interactions/components/InteractionItem';
import { InteractionTimeline } from '@/features/interactions/components/InteractionTimeline';
import { AddInteractionDialog } from '@/features/interactions/components/AddInteractionDialog';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentsList } from '@/components/documents/DocumentsList';
import { AppLayout } from '@/components/layout/AppLayout';
import { CompanyFormData, ContactCreateData } from '@/types/crm';
import { toast } from 'sonner';
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
  StickyNote,
  Upload,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { ScrollableTabsList, ScrollableTabTrigger } from '@/components/ui/scrollable-tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [addInteractionDialogOpen, setAddInteractionDialogOpen] = useState(false);
  const [createContactDialogOpen, setCreateContactDialogOpen] = useState(false);
  const [createProjectDialogOpen, setCreateProjectDialogOpen] = useState(false);
  const [interactionDefaultType, setInteractionDefaultType] = useState<'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo'>('note');

  const { data: company, isLoading } = useCompany(id!);
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  const { createContact } = useContactMutations();
  const createProject = useCreateProject();
  
  // Fetch contacts for this company
  const { contacts: contactsData, isLoading: isLoadingContacts } = useContacts({
    companyId: id,
  });
  
  // Fetch projects/leads for this company
  const { projects: projectsData, isLoading: isLoadingProjects } = useProjects({
    company_id: id,
  });

  // Fetch interactions for this company
  const { data: interactionsData, isLoading: isLoadingInteractions } = useInteractions({
    companyId: id,
    pageSize: 50,
  });

  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  const canDelete = role === 'ADMIN';

  const handleUpdate = (data: CompanyFormData) => {
    if (!id) return;
    updateCompany.mutate(
      { id, data },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          toast.success('Bedrijf bijgewerkt');
        },
        onError: (error) => {
          toast.error(`Fout bij bijwerken: ${error.message}`);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!id) return;
    deleteCompany.mutate(id, {
      onSuccess: () => {
        toast.success('Bedrijf verwijderd');
        navigate('/companies');
      },
      onError: (error) => {
        toast.error(`Fout bij verwijderen: ${error.message}`);
      },
    });
  };

  const handleCreateContact = (formData: ContactCreateData) => {
    // Auto-link to this company
    const contactData = {
      ...formData,
      company_id: id,
    };

    createContact.mutate(contactData, {
      onSuccess: () => {
        setCreateContactDialogOpen(false);
        toast.success('Contact aangemaakt');
      },
      onError: (error) => {
        toast.error('Fout bij aanmaken contact: ' + error.message);
      },
    });
  };
  const handleCreateProject = (projectData: any) => {
    createProject.mutate(
      {
        ...projectData,
        company_id: id,
      },
      {
        onSuccess: () => {
          setCreateProjectDialogOpen(false);
          toast.success('Project succesvol aangemaakt');
        },
        onError: (error: any) => {
          toast.error(`Fout bij aanmaken project: ${error.message}`);
        },
      }
    );
  };
  if (isLoading) {
    return (
      <AppLayout title="Bedrijf" subtitle="Details laden...">
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!company) {
    return (
      <AppLayout title="Bedrijf niet gevonden" subtitle="">
        <div className="flex items-center justify-center py-12">
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
      </AppLayout>
    );
  }

  const statusStyle = statusConfig[company.status];
  const priorityStyle = priorityConfig[company.priority];

  return (
    <AppLayout
      title={company.name}
      subtitle={company.industry?.name || 'Bedrijf'}
      actions={
        !isMobile ? (
          <div className="flex gap-2">
            {canEdit && (
              <Button onClick={() => setEditDialogOpen(true)} variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Bewerken
              </Button>
            )}
            {canDelete && (
              <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijderen
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to="/companies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Button>
        </Link>

        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
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
        </div>

      {/* Tabs - Now using ScrollableTabs for mobile horizontal scrolling */}
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <ScrollableTabsList>
          <ScrollableTabTrigger value="overview">
            Overzicht
          </ScrollableTabTrigger>
          <ScrollableTabTrigger value="contacts">
            <Users className="h-4 w-4 mr-2 hidden sm:inline-block" />
            Contacten
          </ScrollableTabTrigger>
          <ScrollableTabTrigger value="leads">
            <TrendingUp className="h-4 w-4 mr-2 hidden sm:inline-block" />
            Leads
          </ScrollableTabTrigger>
          <ScrollableTabTrigger value="interactions">
            <MessageSquare className="h-4 w-4 mr-2 hidden sm:inline-block" />
            Activiteiten
          </ScrollableTabTrigger>
          <ScrollableTabTrigger value="documents">
            <FileText className="h-4 w-4 mr-2 hidden sm:inline-block" />
            Documenten
          </ScrollableTabTrigger>
          <ScrollableTabTrigger value="notes">
            <StickyNote className="h-4 w-4 mr-2 hidden sm:inline-block" />
            Notities
          </ScrollableTabTrigger>
        </ScrollableTabsList>

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
                {company.kvk_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">KVK Nummer</p>
                    <p className="text-sm font-medium">{company.kvk_number}</p>
                  </div>
                )}
                {company.linkedin_url && (
                  <div>
                    <p className="text-sm text-muted-foreground">LinkedIn</p>
                    <a
                      href={company.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline text-blue-600"
                    >
                      Bekijk profiel →
                    </a>
                  </div>
                )}
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
                {company.total_mrr && company.total_mrr > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Maandelijks Terugkerend</p>
                    <p className="text-sm font-medium">
                      € {company.total_mrr.toLocaleString('nl-NL')} MRR
                    </p>
                  </div>
                )}
                {company.source && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bron</p>
                    <Badge variant="outline" className="text-xs">
                      {company.source === 'n8n_automation' ? 'n8n Automation' : company.source}
                    </Badge>
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

          {/* AI Audit (Manus) */}
          {(company.ai_audit_summary || company.video_audit_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  AI Audit (Manus)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {company.ai_audit_summary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Audit Samenvatting</p>
                    <p className="text-sm whitespace-pre-wrap">{company.ai_audit_summary}</p>
                  </div>
                )}
                {company.video_audit_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Video Audit</p>
                    <a
                      href={company.video_audit_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline text-blue-600"
                    >
                      Bekijk video →
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tech Stack (Apollo.io) */}
          {company.tech_stack && company.tech_stack.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Tech Stack
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {company.tech_stack.map((tech, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tech}
                    </Badge>
                  ))}
                </div>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contactpersonen ({contactsData?.length || 0})
              </CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setCreateContactDialogOpen(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Nieuw contact
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingContacts ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : contactsData && contactsData.length > 0 ? (
                <div className="space-y-3">
                  {contactsData.map((contact: any) => (
                    <Link key={contact.id} to={`/contacts/${contact.id}`}>
                      <ContactCard contact={contact} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Geen contactpersonen</h3>
                  <p className="text-muted-foreground mb-4">
                    Dit bedrijf heeft nog geen contactpersonen. Gebruik de knop rechtsboven om een contact toe te voegen.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Website Projecten ({projectsData?.length || 0})
              </CardTitle>
              {canEdit && (
                <Button size="sm" onClick={() => setCreateProjectDialogOpen(true)}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Nieuw project
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingProjects ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : projectsData && projectsData.length > 0 ? (
                <div className="space-y-3">
                  {projectsData.map((project: any) => (
                    <Link key={project.id} to={`/projects/${project.id}`}>
                      <ProjectCard project={project} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Geen projecten</h3>
                  <p className="text-muted-foreground mb-4">
                    Dit bedrijf heeft nog geen website projecten of leads.
                  </p>
                  {canEdit && (
                    <Button onClick={() => setCreateProjectDialogOpen(true)}>
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Eerste project aanmaken
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Activiteiten ({interactionsData?.interactions?.length || 0})
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
                    Gesprek
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
                    E-mail
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setAddInteractionDialogOpen(true);
                      setInteractionDefaultType('note');
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Activiteit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <InteractionTimeline companyId={id!} limit={20} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documenten
              </CardTitle>
              <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </CardHeader>
            <CardContent>
              <DocumentsList companyId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5" />
                Notities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.notes ? (
                <div className="prose prose-sm max-w-none">
                  <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap">
                    {company.notes}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <StickyNote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">Geen notities</p>
                  <p className="text-sm">Klik op 'Bewerken' om notities toe te voegen</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

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

      {/* Document Upload Dialog */}
      <DocumentUpload
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        companyId={id}
      />

      {/* Add Interaction Dialog */}
      <AddInteractionDialog
        open={addInteractionDialogOpen}
        onOpenChange={setAddInteractionDialogOpen}
        companyId={id!}
        defaultType={interactionDefaultType}
      />

      {/* Create Contact Dialog */}
      <Dialog open={createContactDialogOpen} onOpenChange={setCreateContactDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nieuw contactpersoon toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een nieuwe contactpersoon toe aan {company.name}
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            defaultCompanyId={id}
            onSubmit={handleCreateContact}
            onCancel={() => setCreateContactDialogOpen(false)}
            isSubmitting={createContact.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <ProjectForm
        open={createProjectDialogOpen}
        onOpenChange={setCreateProjectDialogOpen}
        defaultCompanyId={id}
        onSubmit={handleCreateProject}
        isLoading={createProject.isPending}
      />

      {/* Mobile Sticky Action Bar */}
      {isMobile && (canEdit || canDelete) && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t border-border md:hidden supports-[backdrop-filter]:bg-background/60"
          style={{
            paddingBottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))', // Account for bottom nav
          }}
        >
          <div className="flex gap-2 p-4">
            {canEdit && (
              <Button 
                onClick={() => setEditDialogOpen(true)} 
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Bewerken
              </Button>
            )}
            {canDelete && (
              <Button 
                onClick={() => setDeleteDialogOpen(true)} 
                variant="destructive"
                size="lg"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
