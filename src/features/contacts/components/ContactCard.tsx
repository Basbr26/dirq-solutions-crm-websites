import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Mail, Phone, Building2, Briefcase, Linkedin, Star, Crown, Clock, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Contact } from '@/types/crm';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toast } from 'sonner';
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
import { cn } from '@/lib/utils';

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const { t } = useTranslation();
  const { role } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const { updateContact, deleteContact } = useContactMutations();
  
  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  const canDelete = role === 'ADMIN';
  
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`.toUpperCase();
  const fullName = `${contact.first_name} ${contact.last_name}`;
  const phoneNumber = contact.phone || contact.mobile;

  const handleEdit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditDialogOpen(true);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDeleteDialogOpen(true);
  };

  const handleCall = () => {
    if (phoneNumber) {
      window.location.href = `tel:${phoneNumber}`;
      toast.success('Opening dialer...');
    }
  };

  const confirmDelete = () => {
    deleteContact.mutate(contact.id, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
      },
    });
  };

  const cardContent = (
    <Card className={cn(
      "transition-shadow cursor-pointer relative",
      !isMobile && "hover:shadow-lg"
    )}>
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
                  {/* Show badges on mobile only if primary or decision maker */}
                  {contact.is_primary && (
                    <Badge variant="default" className="bg-blue-500 text-[10px] sm:text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      {!isMobile && t('contacts.primary')}
                    </Badge>
                  )}
                  {contact.is_decision_maker && !isMobile && (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:bg-amber-600/20 dark:text-amber-500">
                      <Crown className="h-3 w-3 mr-1" />
                      {t('contacts.decisionMaker')}
                    </Badge>
                  )}
                </div>
                {contact.position && (
                  <p className="text-sm text-muted-foreground truncate">{contact.position}</p>
                )}
              </div>
            </div>
            {/* Hide dropdown menu on mobile in favor of swipe actions */}
            {!isMobile && (canEdit || canDelete) && (
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
                      {t('common.edit')}
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete')}
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
            {!isMobile && contact.linkedin_url && (
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

          {/* Department - hide on mobile */}
          {!isMobile && contact.department && (
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
                  Eigenaar: {contact.owner?.voornaam} {contact.owner?.achternaam}
                </span>
              )}
            </div>
            {contact.last_contact_date && (
              <div className="flex items-center text-xs text-muted-foreground flex-shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">
                  {formatDistanceToNow(new Date(contact.last_contact_date), {
                    addSuffix: true,
                    locale: nl
                  })}
                </span>
                <span className="sm:hidden">
                  {formatDistanceToNow(new Date(contact.last_contact_date), {
                    locale: nl
                  })}
                </span>
              </div>
            )}
          </div>

          {/* Tags - hide on mobile */}
          {!isMobile && contact.tags && contact.tags.length > 0 && (
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
  );

  // On mobile with swipe actions
  if (isMobile && canEdit && phoneNumber) {
    return (
      <>
        <Link to={`/contacts/${contact.id}`}>
          <SwipeableCard
            onSwipeRight={handleCall}
            onSwipeLeft={() => handleEdit()}
            rightAction={{
              label: t('contacts.callDirect'),
              icon: <Phone className="h-6 w-6" />,
              color: 'bg-green-500 text-white'
            }}
            leftAction={{
              label: t('common.edit'),
              icon: <Edit className="h-6 w-6" />,
              color: 'bg-blue-500 text-white'
            }}
          >
            {cardContent}
          </SwipeableCard>
        </Link>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
      <DialogContent className="w-[95vw] max-w-2xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Contact bewerken</DialogTitle>
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
          <AlertDialogTitle>{t('contacts.deleteContact')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('contacts.deleteContactConfirmation', { name: fullName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
      </>
    );
  }

  // Desktop version without swipe
  return (
    <>
      <Link to={`/contacts/${contact.id}`}>
        {cardContent}
      </Link>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
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
            <AlertDialogTitle>{t('contacts.deleteContact')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contacts.deleteContactConfirmation', { name: fullName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
