import { useState } from 'react';
import { Building2, Phone, Mail, Globe, MapPin, TrendingUp, Clock, Edit, Trash2, MoreVertical } from 'lucide-react';
import { Company } from '@/types/crm';
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
import { SwipeableCard } from '@/components/ui/swipeable-card';
import { CompanyForm } from './CompanyForm';
import { useUpdateCompany, useDeleteCompany } from '../hooks/useCompanyMutations';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { toast } from 'sonner';

interface CompanyCardProps {
  company: Company;
}

const statusConfig = {
  prospect: { label: 'Prospect', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  active: { label: 'Actief', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  inactive: { label: 'Inactief', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' },
  churned: { label: 'Verloren', color: 'bg-red-500/10 text-red-500 border-red-500/20' }
};

const priorityConfig = {
  low: { label: 'Laag', color: 'bg-gray-500/10 text-gray-500' },
  medium: { label: 'Normaal', color: 'bg-blue-500/10 text-blue-500' },
  high: { label: 'Hoog', color: 'bg-orange-500/10 text-orange-500' }
};

export function CompanyCard({ company }: CompanyCardProps) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();
  
  const user = useAuth().user;
  const canEdit = role && ['ADMIN', 'SALES', 'MANAGER'].includes(role);
  // Allow ADMIN, MANAGER, or owner to delete
  const canDelete = (role === 'ADMIN' || role === 'MANAGER' || (user && company.owner_id === user.id));
  
  const statusStyle = statusConfig[company.status];
  const priorityStyle = priorityConfig[company.priority];

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
    if (company.phone) {
      window.location.href = `tel:${company.phone}`;
      toast.success('Opening dialer...');
    }
  };

  const confirmDelete = () => {
    deleteCompany.mutate(company.id, {
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
            <AvatarFallback className="bg-primary/10 text-primary">
              <Building2 className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1 min-w-0">
            <h3 className="font-semibold text-lg leading-none truncate">{company.name}</h3>
            {company.industry && (
              <p className="text-sm text-muted-foreground truncate">{company.industry.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-2 flex-shrink-0">
          {/* Mobile: Show only status, hide menu in favor of swipe */}
          {isMobile ? (
            <Badge className={statusStyle.color} variant="outline">
              {statusStyle.label}
            </Badge>
          ) : (
            <>
              <div className="flex flex-col items-end space-y-2">
                <Badge className={statusStyle.color} variant="outline">
                  {statusStyle.label}
                </Badge>
                <Badge className={priorityStyle.color} variant="outline">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {priorityStyle.label}
                </Badge>
              </div>
              {(canEdit || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact Info - Show only essential on mobile */}
        <div className="space-y-2 text-sm">
          {company.phone && (
            <div className="flex items-center text-muted-foreground">
              <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{company.phone}</span>
            </div>
          )}
          {!isMobile && company.email && (
            <div className="flex items-center text-muted-foreground">
              <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{company.email}</span>
            </div>
          )}
          {!isMobile && company.website && (
            <div className="flex items-center text-muted-foreground">
              <Globe className="h-4 w-4 mr-2 flex-shrink-0" />
              <span className="truncate">{company.website}</span>
            </div>
          )}
          {company.address?.city && (
            <div className="flex items-center text-muted-foreground">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{company.address.city}, {company.address.country || 'Nederland'}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn(
          "flex items-center pt-2 border-t",
          isMobile ? "justify-between" : "justify-between"
        )}>
          <div className="flex items-center text-xs text-muted-foreground truncate">
            {company.owner && (
              <span className="truncate">
                {company.owner.voornaam} {company.owner.achternaam}
              </span>
            )}
          </div>
          {company.last_contact_date && (
            <div className="flex items-center text-xs text-muted-foreground flex-shrink-0">
              <Clock className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">
                {formatDistanceToNow(new Date(company.last_contact_date), {
                  addSuffix: true,
                  locale: nl
                })}
              </span>
              <span className="sm:hidden">
                {formatDistanceToNow(new Date(company.last_contact_date), {
                  locale: nl
                })}
              </span>
            </div>
          )}
        </div>

        {/* Tags - Hide on mobile to reduce clutter */}
        {!isMobile && company.tags && company.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {company.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {company.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{company.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        {/* Tags - Hide on mobile to reduce clutter */}
        {!isMobile && company.tags && company.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {company.tags.slice(0, 3).map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {company.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{company.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // On mobile, wrap card with swipe actions
  if (isMobile && canEdit && company.phone) {
    return (
      <>
        <Link to={`/companies/${company.id}`}>
          <SwipeableCard
            onSwipeRight={handleCall}
            onSwipeLeft={() => handleEdit()}
            rightAction={{
              label: 'Bel direct',
              icon: <Phone className="h-6 w-6" />,
              color: 'bg-green-500 text-white'
            }}
            leftAction={{
              label: 'Bewerken',
              icon: <Edit className="h-6 w-6" />,
              color: 'bg-blue-500 text-white'
            }}
          >
            {cardContent}
          </SwipeableCard>
        </Link>

        {/* Edit Dialog */}
        <CompanyForm
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          company={company}
          onSubmit={(data) => {
            updateCompany.mutate(
              { id: company.id, data },
              {
                onSuccess: () => setEditDialogOpen(false),
              }
            );
          }}
          isLoading={updateCompany.isPending}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Weet je zeker dat je "{company.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
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

  // Desktop: Standard link with card
  return (
    <>
      <Link to={`/companies/${company.id}`}>
        {cardContent}
      </Link>

    {/* Edit Dialog */}
    <CompanyForm
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      company={company}
      onSubmit={(data) => {
        updateCompany.mutate(
          { id: company.id, data },
          {
            onSuccess: () => setEditDialogOpen(false),
          }
        );
      }}
      isLoading={updateCompany.isPending}
    />

    {/* Delete Confirmation */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bedrijf verwijderen?</AlertDialogTitle>
          <AlertDialogDescription>
            Weet je zeker dat je "{company.name}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
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
