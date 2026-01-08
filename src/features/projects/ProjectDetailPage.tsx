/**
 * ProjectDetailPage
 * Full project detail page with management functionality
 */

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUpdateProject, useDeleteProject } from './hooks/useProjectMutations';
import { useConvertLead } from './hooks/useConvertLead';
import { useInteractions } from '@/features/interactions/hooks/useInteractions';
import { InteractionItem } from '@/features/interactions/components/InteractionItem';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentsList } from '@/components/documents/DocumentsList';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Briefcase,
  Building2,
  User,
  Euro,
  Calendar,
  Target,
  TrendingUp,
  FileText,
  MessageSquare,
  Plus,
  Link as LinkIcon,
  Package,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
import { ProjectForm } from './components/ProjectForm';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Project, ProjectStage } from '@/types/projects';
import { projectStageConfig } from '@/types/projects';

const projectTypeLabels = {
  landing_page: 'Landing Page',
  corporate_website: 'Bedrijfswebsite',
  ecommerce: 'Webshop',
  web_app: 'Web Applicatie',
  blog: 'Blog',
  portfolio: 'Portfolio',
  custom: 'Custom',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const updateProject = useUpdateProject(id!);
  const deleteProject = useDeleteProject();
  const convertLead = useConvertLead();

  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  const canDelete = role === 'ADMIN';

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          companies:companies(id, name, email, phone, website),
          contacts:contacts(id, first_name, last_name, email, phone),
          profiles:profiles!projects_owner_id_fkey(id, voornaam, achternaam, email)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 🎯 CONVERSION BUTTON VISIBILITY LOGIC
  // ═══════════════════════════════════════════════════════════════════════════
  // Show "Converteer naar Klant" button ONLY when project is in these stages:
  // - 'negotiation': Deal is being finalized
  // - 'quote_sent': Quote has been sent and awaiting signature
  // 
  // AI AGENT RULE: Button should NOT appear for:
  // - 'lead', 'quote_requested' (too early in funnel)
  // - 'quote_signed', 'in_development', 'review', 'live' (already converted)
  // - 'lost' (deal is dead)
  // ═══════════════════════════════════════════════════════════════════════════
  const canConvert = project && ['negotiation', 'quote_sent'].includes(project.stage);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🚀 LEAD TO CUSTOMER CONVERSION HANDLER
  // ═══════════════════════════════════════════════════════════════════════════
  // This is the critical action that transitions a lead to a paying customer.
  // It triggers the useConvertLead hook which handles:
  // 1. Database updates (company status, project stage, probability)
  // 2. Notification to owner
  // 3. Confetti celebration animation
  // 
  // AI AGENT TRIGGER POINT:
  // Call this function when:
  // - Quote is signed by customer
  // - Deal is officially won
  // - Customer verbally agrees to proceed
  // 
  // WEBHOOK EXAMPLE:
  // POST /api/v1/projects/{id}/convert
  // { "action": "convert_to_customer" }
  // ═══════════════════════════════════════════════════════════════════════════
  const handleConvertToCustomer = () => {
    if (!project) return;

    convertLead.mutate({
      projectId: project.id,
      companyId: project.company_id,
      projectTitle: project.title,
      companyName: project.companies?.name || 'Unknown',
      ownerId: project.owner_id,
      projectValue: project.value || 0,
    });
  };

  // Fetch related quotes
  const { data: quotes } = useQuery({
    queryKey: ['project-quotes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('id, quote_number, title, total_amount, status, created_at')
        .eq('project_id', id!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch interactions using the hook
  const { data: interactionsData, isLoading: isLoadingInteractions } = useInteractions({
    leadId: id, // Projects used to be called "leads" in the database
    pageSize: 20,
  });

  const handleDelete = () => {
    if (!id) return;
    deleteProject.mutate(id, {
      onSuccess: () => navigate('/pipeline'),
    });
  };

  const handleStageChange = (newStage: ProjectStage) => {
    if (!id) return;

    const probabilityMap: Record<ProjectStage, number> = {
      lead: 10,
      quote_requested: 20,
      quote_sent: 40,
      negotiation: 60,
      quote_signed: 90,
      in_development: 95,
      review: 98,
      live: 100,
      maintenance: 100,
      lost: 0,
    };

    updateProject.mutate(
      {
        stage: newStage,
        probability: probabilityMap[newStage],
      },
      {
        onSuccess: () => {
          toast.success(`Fase gewijzigd naar ${projectStageConfig[newStage].label}`);
        },
      }
    );
  };

  const formatCurrency = useMemo(
    () => (amount: number) =>
      new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
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

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Project niet gevonden</h3>
            <p className="text-muted-foreground mb-4">
              Dit project bestaat niet of je hebt geen toegang.
            </p>
            <Link to="/pipeline">
              <Button>Terug naar pipeline</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageConfig = projectStageConfig[project.stage];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link to="/pipeline">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar pipeline
          </Button>
        </Link>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{project.title}</h1>
              <Badge style={{ backgroundColor: stageConfig.color + '20', color: stageConfig.color }}>
                {stageConfig.icon} {stageConfig.label}
              </Badge>
            </div>
            {project.project_type && (
              <p className="text-muted-foreground">
                {projectTypeLabels[project.project_type]}
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {canConvert && canEdit && (
              <Button 
                onClick={handleConvertToCustomer}
                disabled={convertLead.isPending}
                className="relative bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
              >
                {convertLead.isPending ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Converteren...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2 animate-pulse" />
                    🎉 Converteer naar Klant
                  </>
                )}
              </Button>
            )}
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
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Project Gegevens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Bedrijf</p>
                    <Link 
                      to={`/companies/${project.companies?.id}`}
                      className="font-medium hover:underline"
                    >
                      {project.companies?.name}
                    </Link>
                  </div>
                </div>

                {project.contacts && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contactpersoon</p>
                      <Link 
                        to={`/contacts/${project.contacts.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.contacts.first_name} {project.contacts.last_name}
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Euro className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Waarde</p>
                    <p className="font-medium text-lg">{formatCurrency(project.value)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Kans</p>
                    <p className="font-medium">{project.probability}%</p>
                  </div>
                </div>

                {project.expected_close_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Verwachte afsluiting</p>
                      <p className="font-medium">
                        {format(new Date(project.expected_close_date), 'dd MMMM yyyy', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}

                {project.launch_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Launch datum</p>
                      <p className="font-medium">
                        {format(new Date(project.launch_date), 'dd MMMM yyyy', { locale: nl })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {project.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Beschrijving</p>
                    <p className="text-sm whitespace-pre-wrap">{project.description}</p>
                  </div>
                </>
              )}

              {project.website_url && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <LinkIcon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website URL</p>
                      <a 
                        href={project.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline text-primary"
                      >
                        {project.website_url}
                      </a>
                    </div>
                  </div>
                </>
              )}

              {project.features && project.features.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {project.features.map((feature, idx) => (
                        <Badge key={idx} variant="secondary">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4 text-sm">
                {project.number_of_pages && (
                  <div>
                    <p className="text-muted-foreground">Aantal pagina's</p>
                    <p className="font-medium">{project.number_of_pages}</p>
                  </div>
                )}
                {project.hosting_included !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Hosting inbegrepen</p>
                    <p className="font-medium">{project.hosting_included ? 'Ja' : 'Nee'}</p>
                  </div>
                )}
                {project.maintenance_contract !== undefined && (
                  <div>
                    <p className="text-muted-foreground">Onderhoudscontract</p>
                    <p className="font-medium">{project.maintenance_contract ? 'Ja' : 'Nee'}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="quotes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quotes">Offertes ({quotes?.length || 0})</TabsTrigger>
              <TabsTrigger value="documents">Documenten</TabsTrigger>
              <TabsTrigger value="activity">Activiteiten</TabsTrigger>
            </TabsList>

            <TabsContent value="quotes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gekoppelde Offertes</CardTitle>
                </CardHeader>
                <CardContent>
                  {quotes && quotes.length > 0 ? (
                    <div className="space-y-4">
                      {quotes.map((quote) => (
                        <Link 
                          key={quote.id} 
                          to={`/quotes/${quote.id}`}
                          className="block border rounded-lg p-4 hover:bg-accent transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{quote.title}</p>
                              <p className="text-sm text-muted-foreground">{quote.quote_number}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(quote.total_amount)}</p>
                              <Badge variant="outline" className="mt-1">
                                {quote.status}
                              </Badge>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Geen offertes gekoppeld</p>
                      <Button variant="outline" className="mt-4" asChild>
                        <Link to="/quotes">
                          <Plus className="h-4 w-4 mr-2" />
                          Offerte Aanmaken
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documenten
                  </CardTitle>
                  <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                    <Package className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </CardHeader>
                <CardContent>
                  <DocumentsList projectId={id} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Activiteiten ({interactionsData?.interactions?.length || 0})</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingInteractions ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                      ))}
                    </div>
                  ) : interactionsData?.interactions && interactionsData.interactions.length > 0 ? (
                    <div className="space-y-3">
                      {interactionsData.interactions.map((interaction) => (
                        <InteractionItem key={interaction.id} interaction={interaction} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="font-medium mb-2">Nog geen activiteiten</p>
                      <p className="text-sm">Activiteiten worden automatisch gelogd bij interacties met dit project</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Internal Notes */}
          {project.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Interne Notities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{project.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stage Progress */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle>Fase Wijzigen</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed', 'in_development', 'review', 'live'].map((stage) => {
                    const stageKey = stage as ProjectStage;
                    const config = projectStageConfig[stageKey];
                    const isCurrent = project.stage === stageKey;
                    
                    return (
                      <Button
                        key={stage}
                        variant={isCurrent ? 'default' : 'outline'}
                        className="w-full justify-start"
                        onClick={() => handleStageChange(stageKey)}
                        disabled={updateProject.isPending || isCurrent}
                      >
                        <span className="mr-2">{config.icon}</span>
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Owner */}
          {project.profiles && (
            <Card>
              <CardHeader>
                <CardTitle>Project Eigenaar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {project.profiles.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">Eigenaar</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weighted Value */}
          <Card>
            <CardHeader>
              <CardTitle>Gewogen Waarde</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(project.value * (project.probability / 100))}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {formatCurrency(project.value)} × {project.probability}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Tijdlijn</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Aangemaakt</p>
                    <p className="text-muted-foreground">
                      {format(new Date(project.created_at), 'dd MMM yyyy', { locale: nl })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Laatst bijgewerkt</p>
                    <p className="text-muted-foreground">
                      {format(new Date(project.updated_at), 'dd MMM yyyy', { locale: nl })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <ProjectForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onSubmit={(data) => {
          updateProject.mutate(data as any, {
            onSuccess: () => setEditDialogOpen(false),
          });
        }}
        isLoading={updateProject.isPending}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Project verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Weet je zeker dat je dit project wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
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
        projectId={id}
      />
    </div>
  );
}
