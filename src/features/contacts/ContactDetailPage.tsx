import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { useContact } from "./hooks/useContacts";
import {
  useUpdateContact,
  useDeleteContact,
} from "./hooks/useContactMutations";
import { ContactForm } from "./components/ContactForm";
import { useInteractions } from '@/features/interactions/hooks/useInteractions';
import { InteractionCard } from '@/features/interactions/components/InteractionCard';
import { InteractionTimeline } from '@/features/interactions/components/InteractionTimeline';
import { AddInteractionDialog } from '@/features/interactions/components/AddInteractionDialog';
import { DocumentUpload } from '@/components/documents/DocumentUpload';
import { DocumentsList } from '@/components/documents/DocumentsList';
import { AppLayout } from '@/components/layout/AppLayout';
import { ContactFormData } from '@/types/crm';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Calendar,
  Edit,
  Trash2,
  ArrowLeft,
  MessageSquare,
  FileText,
  Linkedin,
  Star,
  Crown,
  Smartphone,
  Upload,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

// Safe initials generation helper
const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.trim()?.[0]?.toUpperCase() || '';
  const last = lastName?.trim()?.[0]?.toUpperCase() || '';
  return first && last ? `${first}${last}` : first || last || '?';
};

export default function ContactDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addInteractionDialogOpen, setAddInteractionDialogOpen] = useState(false);
  const [interactionDefaultType, setInteractionDefaultType] = useState<'call' | 'email' | 'meeting' | 'note' | 'task' | 'demo'>('note');
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  // Handle 'new' route - redirect to contacts page (create happens via dialog there)
  if (id === 'new') {
    navigate('/contacts', { replace: true });
    return null;
  }

  const { data: contact, isLoading } = useContact(id!);
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const { data: interactionsData, isLoading: isLoadingInteractions } = useInteractions({
    contactId: id,
    pageSize: 10,
  });

  const canEdit = role === "ADMIN" || role === "SALES" || role === "MANAGER";
  const canDelete = role === "ADMIN" || role === "SALES";

  const handleUpdate = (formData: ContactFormData) => {
    if (!contact) return;

    // Handle "none" value from company dropdown
    const updateData: Partial<ContactFormData> = {
      ...formData,
      company_id:
        formData.company_id === "none" ? null : formData.company_id,
    };

    updateContact.mutate(
      { id: contact.id, data: updateData },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          toast.success('Contact bijgewerkt');
        },
        onError: (error) => {
          toast.error(`Fout bij bijwerken: ${error.message}`);
        },
      }
    );
  };

  const handleDelete = () => {
    if (!contact) return;
    deleteContact.mutate(contact.id, {
      onSuccess: () => {
        toast.success('Contact verwijderd');
        navigate("/contacts");
      },
      onError: (error) => {
        toast.error(`Fout bij verwijderen: ${error.message}`);
      },
    });
  };

  if (isLoading) {
    return (
      <AppLayout title="Contact" subtitle="Details laden...">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!contact) {
    return (
      <AppLayout title="Contact niet gevonden" subtitle="">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">
              Contact niet gevonden
            </p>
            <Link to="/contacts" className="mt-4 inline-block">
              <Button>Terug naar overzicht</Button>
            </Link>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const initials = getInitials(contact.first_name, contact.last_name);
  const fullName = `${contact.first_name} ${contact.last_name}`;

  return (
    <AppLayout
      title={fullName}
      subtitle={contact.position || 'Contact'}
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
      <div className="flex items-center gap-4">
        <Link to="/contacts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug naar overzicht
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-2xl">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {contact.is_primary && (
                <Badge className="bg-blue-500">
                  <Star className="h-3 w-3 mr-1" />
                  Primair Contact
                </Badge>
              )}
              {contact.is_decision_maker && (
                <Badge className="bg-purple-500">
                  <Crown className="h-3 w-3 mr-1" />
                  Beslisser
                </Badge>
              )}
            </div>
            {contact.position && (
              <p className="text-muted-foreground mt-1">{contact.position}</p>
            )}
          </div>
      </div>

      {/* Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <div className={cn(
          "overflow-x-auto",
          isMobile && "pb-2 -mx-4 px-4"
        )}>
          <TabsList className={isMobile ? "inline-flex w-auto" : ""}>
            <TabsTrigger value="overview" className={isMobile ? "flex-shrink-0" : ""}>
              Overzicht
            </TabsTrigger>
            <TabsTrigger value="interactions" className={isMobile ? "flex-shrink-0" : ""}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Interacties
            </TabsTrigger>
            <TabsTrigger value="documents" className={isMobile ? "flex-shrink-0" : ""}>
              <FileText className="mr-2 h-4 w-4" />
              Documenten
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Contactgegevens
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">E-mail</p>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefoon</p>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {contact.mobile && (
                  <div className="flex items-start gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Mobiel</p>
                      <a
                        href={`tel:${contact.mobile}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {contact.mobile}
                      </a>
                    </div>
                  </div>
                )}

                {contact.linkedin_url && (
                  <div className="flex items-start gap-3">
                    <Linkedin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">LinkedIn</p>
                      <a
                        href={contact.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline text-blue-600"
                      >
                        Bekijk profiel
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Professional Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Professionele Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contact.company && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Bedrijf</p>
                      <Link
                        to={`/companies/${contact.company.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {contact.company.name}
                      </Link>
                    </div>
                  </div>
                )}

                {contact.position && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Functie</p>
                      <p className="text-sm font-medium">{contact.position}</p>
                    </div>
                  </div>
                )}

                {contact.department && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">Afdeling</p>
                      <p className="text-sm font-medium">{contact.department}</p>
                    </div>
                  </div>
                )}

                {contact.last_contact_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Laatste contact
                      </p>
                      <p className="text-sm font-medium">
                        {format(
                          new Date(contact.last_contact_date),
                          "d MMMM yyyy",
                          { locale: nl }
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes Card */}
          {contact.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aangemaakt op:</span>
                <span>
                  {format(new Date(contact.created_at), "d MMMM yyyy HH:mm", {
                    locale: nl,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Laatst bijgewerkt:</span>
                <span>
                  {format(new Date(contact.updated_at), "d MMMM yyyy HH:mm", {
                    locale: nl,
                  })}
                </span>
              </div>
              {contact.owner && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Eigenaar:</span>
                  <span>{contact.owner.full_name || "Onbekend"}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Interacties ({interactionsData?.count || 0})
              </CardTitle>
              {canEdit && (
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setInteractionDefaultType('call');
                      setAddInteractionDialogOpen(true);
                    }}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Gesprek
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setInteractionDefaultType('email');
                      setAddInteractionDialogOpen(true);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    E-mail
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => {
                      setInteractionDefaultType('note');
                      setAddInteractionDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Activiteit
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <InteractionTimeline contactId={id!} limit={20} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
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
              <DocumentsList contactId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Bewerken</DialogTitle>
            <DialogDescription>
              Wijzig de gegevens van dit contact
            </DialogDescription>
          </DialogHeader>
          <ContactForm
            contact={contact}
            onSubmit={handleUpdate}
            onCancel={() => setEditDialogOpen(false)}
            isSubmitting={updateContact.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weet u het zeker?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit contact wordt permanent verwijderd. Deze actie kan niet
              ongedaan worden gemaakt.
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
        contactId={id}
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

      <AddInteractionDialog
        open={addInteractionDialogOpen}
        onOpenChange={setAddInteractionDialogOpen}
        contactId={id!}
        companyId={contact?.company_id || undefined}
        defaultType={interactionDefaultType}
      />
      </div>
    </AppLayout>
  );
}
