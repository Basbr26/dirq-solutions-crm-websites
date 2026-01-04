import { useState } from 'react';
import { User, Mail, Phone, Building2, Briefcase, Linkedin, Star, Crown, Clock, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Contact } from '@/types/crm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ContactForm } from './ContactForm';
import { useContactMutations } from '../hooks/useContactMutations';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { updateContact, deleteContact } = useContactMutations();
  
  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  const canDelete = role === 'ADMIN';
  
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();
  const fullName = `${contact.first_name} ${contact.last_name}`;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    deleteContact.mutate(contact.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
      },
    });
  };

  return (
    <>
      <Link to={`/contacts/${contact.id}`}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer relative">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <Avatar className="h-12 w-12 flex-shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg leading-none truncate">{fullName}</h3>
                  {contact.is_primary && (
                    <Badge variant="default" className="bg-blue-500">
                      <Star className="h-3 w-3 mr-1" />
                      Primair
                    </Badge>
                  )}
                  {contact.is_decision_maker && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">
                      <Crown className="h-3 w-3 mr-1" />
                      Beslisser
                    </Badge>
                  )}
                </div>
                {contact.position && (
                  <p className="text-sm text-muted-foreground">{contact.position}</p>
                )}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && (
                    <DropdownMenuItem onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      Bewerken
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </CardHeader>

        <CardContent className="space-y-3">
          {/* Company */}
          {contact.company && (
            <div className="flex items-center text-sm">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground flex-shrink-0" />
              <Link 
                to={`/companies/${contact.company.id}`}
                className="font-medium hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {contact.company.name}
              </Link>
            </div>
          )}

          {/* Contact Info */}
          <div className="space-y-2 text-sm">
            {contact.email && (
              <div className="flex items-center text-muted-foreground">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <a 
                  href={`mailto:${contact.email}`}
                  className="truncate hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {contact.email}
                </a>
              </div>
            )}
            {(contact.phone || contact.mobile) && (
              <div className="flex items-center text-muted-foreground">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <a 
                  href={`tel:${contact.phone || contact.mobile}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {contact.phone || contact.mobile}
                </a>
              </div>
            )}
            {contact.linkedin_url && (
              <div className="flex items-center text-muted-foreground">
                <Linkedin className="h-4 w-4 mr-2 flex-shrink-0" />
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  LinkedIn Profiel
                </a>
              </div>
            )}
          </div>

          {/* Department */}
          {contact.department && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{contact.department}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center text-xs text-muted-foreground">
              {contact.owner && (
                <span>
                  Eigenaar: {contact.owner.voornaam} {contact.owner.achternaam}
                </span>
              )}
            </div>
            {contact.last_contact_date && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="h-3 w-3 mr-1" />
                <span>
                  {formatDistanceToNow(new Date(contact.last_contact_date), {
                    addSuffix: true,
                    locale: nl
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {contact.tags.slice(0, 3).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {contact.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{contact.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>

    {/* Edit Dialog */}
    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact Bewerken</DialogTitle>
          <DialogDescription>
            Wijzig de gegevens van het contact
          </DialogDescription>
        </DialogHeader>
        <ContactForm
          contact={contact}
          onSubmit={(data) => {
            updateContact.mutate(
              { id: contact.id, data },
              {
                onSuccess: () => setEditDialogOpen(false),
              }
            );
          }}
          onCancel={() => setEditDialogOpen(false)}
          isSubmitting={updateContact.isPending}
        />
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Contact verwijderen?</AlertDialogTitle>
          <AlertDialogDescription>
            Weet je zeker dat je "{fullName}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Verwijderen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}
