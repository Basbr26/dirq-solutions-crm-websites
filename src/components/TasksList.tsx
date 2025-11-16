import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Task } from '@/types/sickLeave';
import { format, isToday, isTomorrow, isPast } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface TasksListProps {
  tasks: Task[];
}

export function TasksList({ tasks }: TasksListProps) {
    const isActiveStatus = (status: Task['task_status']) =>
      status === 'open' || status === 'in_progress' || status === 'overdue';
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'deadline' | 'status'>('deadline');

  const getStatusBadge = (task: Task) => {
    if (task.task_status === 'afgerond') {
      return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />Afgerond</Badge>;
    }
    if (task.task_status === 'in_progress') {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Bezig</Badge>;
    }
    if (
      task.deadline &&
      isPast(new Date(task.deadline)) &&
      isActiveStatus(task.task_status)
    ) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Te laat
        </Badge>
      );
    }
    return <Badge variant="outline">Open</Badge>;
  };

  const getDeadlineLabel = (deadline: string | null) => {
    if (!deadline) return 'Geen deadline';
    const date = new Date(deadline);
    if (isPast(date) && !isToday(date)) return format(date, 'd MMM', { locale: nl }) + ' (verlopen)';
    if (isToday(date)) return 'Vandaag';
    if (isTomorrow(date)) return 'Morgen';
    return format(date, 'd MMM', { locale: nl });
  };

  const filteredTasks = tasks
    .filter(task => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'overdue') {
        // Overdue: deadline in past and not completed (only valid status values)
        return task.deadline && isPast(new Date(task.deadline)) && (task.task_status === 'open' || task.task_status === 'in_progress');
      }
      // Only allow valid TaskStatus values for direct comparison
      return (['open', 'in_progress', 'afgerond'].includes(statusFilter) && task.task_status === statusFilter);
    })
    .sort((a, b) => {
      if (sortBy === 'deadline') {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      // Sort by status
      const statusOrder = { 'open': 0, 'in_progress': 1, 'afgerond': 2 };
      return (statusOrder[a.task_status || 'open'] || 0) - (statusOrder[b.task_status || 'open'] || 0);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter op status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle taken</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">Bezig</SelectItem>
            <SelectItem value="afgerond">Afgerond</SelectItem>
            <SelectItem value="overdue">Verlopen</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'deadline' | 'status')}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Sorteer op" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Deadline</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Geen taken gevonden
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow cursor-pointer">
               <CardHeader 
                className="pb-2 sm:pb-3 px-4 sm:px-6"
                onClick={() => {
                  // Navigate to the case detail page where the task belongs
                  navigate(`/case/${task.case_id}`);
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg mb-1 sm:mb-2">{task.title}</CardTitle>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                  <div className="self-start sm:self-auto">
                    {getStatusBadge(task)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{getDeadlineLabel(task.deadline)}</span>
                  </div>

                  {task.assigned_user && (
                    <span className="text-[10px] sm:text-xs">
                      • {task.assigned_user.voornaam} {task.assigned_user.achternaam}
                    </span>
                  )}

                  {task.notes && (
                    <span className="text-[10px] sm:text-xs">• Notities beschikbaar</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
