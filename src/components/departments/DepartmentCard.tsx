import { Department } from '@/hooks/useDepartments';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreVertical, Users, TrendingUp, Edit, Trash2 } from 'lucide-react';

interface DepartmentCardProps {
  department: Department;
  onEdit: () => void;
  onDelete: () => void;
}

export function DepartmentCard({ department, onEdit, onDelete }: DepartmentCardProps) {
  const getInitials = (voornaam?: string, achternaam?: string) => {
    if (!voornaam && !achternaam) return '?';
    return `${voornaam?.[0] || ''}${achternaam?.[0] || ''}`.toUpperCase();
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{department.name}</h3>
            {department.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {department.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Bewerken
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Verwijderen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Manager info */}
        <div>
          {department.manager ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(department.manager.voornaam, department.manager.achternaam)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">
                  {department.manager.voornaam} {department.manager.achternaam}
                </p>
                <p className="text-xs text-muted-foreground">Manager</p>
              </div>
            </div>
          ) : (
            <Badge variant="outline" className="text-xs">
              Geen manager toegewezen
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="flex gap-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Medewerkers</p>
              <p className="text-lg font-semibold">{department.employee_count || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Verzuim</p>
              <p className="text-lg font-semibold">-</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
