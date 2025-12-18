import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { AppLayout } from '@/components/layout/AppLayout';
import { PullToRefresh } from '@/components/PullToRefresh';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Users, 
  HeartPulse, 
  Calendar, 
  Clock, 
  TrendingUp,
  AlertTriangle,
  Gift,
  FileText,
  ChevronRight,
  Cake,
  FileWarning
} from 'lucide-react';
import { format, addDays, isWithinInterval, parseISO, differenceInDays } from 'date-fns';
import { nl } from 'date-fns/locale';

interface DashboardStats {
  totalEmployees: number;
  activeAbsences: number;
  absencePercentage: number;
  pendingLeaveRequests: number;
  upcomingBirthdays: Array<{
    id: string;
    name: string;
    date: string;
    daysUntil: number;
    foto_url?: string | null;
  }>;
  expiringContracts: Array<{
    id: string;
    name: string;
    endDate: string;
    daysUntil: number;
    foto_url?: string | null;
  }>;
  openTasks: number;
  overdueTasks: number;
  recentAbsences: Array<{
    id: string;
    employeeName: string;
    startDate: string;
    status: string;
    foto_url?: string | null;
  }>;
}

export default function HRDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeAbsences: 0,
    absencePercentage: 0,
    pendingLeaveRequests: 0,
    upcomingBirthdays: [],
    expiringContracts: [],
    openTasks: 0,
    overdueTasks: 0,
    recentAbsences: [],
  });
  const [loading, setLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      const today = new Date();
      const in30Days = addDays(today, 30);
      const in90Days = addDays(today, 90);

      // Parallel queries for efficiency
      const [
        employeesResult,
        absencesResult,
        leaveRequestsResult,
        tasksResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, voornaam, achternaam, date_of_birth, end_date, foto_url, employment_status')
          .eq('employment_status', 'actief'),
        supabase
          .from('sick_leave_cases')
          .select('id, employee_id, start_date, case_status, employee:profiles!sick_leave_cases_employee_id_fkey(voornaam, achternaam, foto_url)')
          .eq('case_status', 'actief'),
        supabase
          .from('leave_requests')
          .select('id')
          .eq('status', 'pending'),
        supabase
          .from('tasks')
          .select('id, task_status, deadline'),
      ]);

      const employees = employeesResult.data || [];
      const absences = absencesResult.data || [];
      const leaveRequests = leaveRequestsResult.data || [];
      const tasks = tasksResult.data || [];

      // Calculate upcoming birthdays (next 30 days)
      const upcomingBirthdays = employees
        .filter((emp) => emp.date_of_birth)
        .map((emp) => {
          const birthDate = parseISO(emp.date_of_birth!);
          const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
          let nextBirthday = thisYearBirthday;
          
          if (thisYearBirthday < today) {
            nextBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
          }
          
          const daysUntil = differenceInDays(nextBirthday, today);
          
          return {
            id: emp.id,
            name: `${emp.voornaam} ${emp.achternaam}`,
            date: format(nextBirthday, 'd MMMM', { locale: nl }),
            daysUntil,
            foto_url: emp.foto_url,
          };
        })
        .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 30)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

      // Calculate expiring contracts (next 90 days)
      const expiringContracts = employees
        .filter((emp) => emp.end_date)
        .map((emp) => {
          const endDate = parseISO(emp.end_date!);
          const daysUntil = differenceInDays(endDate, today);
          
          return {
            id: emp.id,
            name: `${emp.voornaam} ${emp.achternaam}`,
            endDate: format(endDate, 'd MMMM yyyy', { locale: nl }),
            daysUntil,
            foto_url: emp.foto_url,
          };
        })
        .filter((c) => c.daysUntil >= 0 && c.daysUntil <= 90)
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, 5);

      // Calculate task stats
      const openTasks = tasks.filter((t) => t.task_status === 'open' || t.task_status === 'in_progress').length;
      const overdueTasks = tasks.filter((t) => {
        if (t.task_status === 'afgerond') return false;
        const deadline = parseISO(t.deadline);
        return deadline < today;
      }).length;

      // Recent absences
      const recentAbsences = absences
        .slice(0, 5)
        .map((absence) => ({
          id: absence.id,
          employeeName: absence.employee 
            ? `${absence.employee.voornaam} ${absence.employee.achternaam}`
            : 'Onbekend',
          startDate: format(parseISO(absence.start_date), 'd MMM yyyy', { locale: nl }),
          status: absence.case_status || 'actief',
          foto_url: absence.employee?.foto_url,
        }));

      // Calculate absence percentage
      const absencePercentage = employees.length > 0 
        ? Math.round((absences.length / employees.length) * 100 * 10) / 10
        : 0;

      setStats({
        totalEmployees: employees.length,
        activeAbsences: absences.length,
        absencePercentage,
        pendingLeaveRequests: leaveRequests.length,
        upcomingBirthdays,
        expiringContracts,
        openTasks,
        overdueTasks,
        recentAbsences,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Fout bij laden van dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const KPICard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend,
    onClick,
    variant = 'default'
  }: { 
    title: string; 
    value: string | number; 
    subtitle?: string;
    icon: React.ElementType;
    trend?: { value: number; positive: boolean };
    onClick?: () => void;
    variant?: 'default' | 'warning' | 'success' | 'danger';
  }) => {
    const variantStyles = {
      default: 'bg-primary/10 text-primary',
      warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      danger: 'bg-destructive/10 text-destructive',
    };

    return (
      <Card 
        className={`transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-primary/20' : ''}`}
        onClick={onClick}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={`p-2 sm:p-3 rounded-lg ${variantStyles[variant]}`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
          {trend && (
            <div className="mt-3 flex items-center gap-1">
              <TrendingUp className={`h-3 w-3 ${trend.positive ? 'text-emerald-500' : 'text-destructive rotate-180'}`} />
              <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-destructive'}`}>
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">vs. vorige maand</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ListItem = ({ 
    name, 
    subtitle, 
    badge,
    badgeVariant,
    foto_url,
    onClick 
  }: { 
    name: string; 
    subtitle: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
    foto_url?: string | null;
    onClick?: () => void;
  }) => (
    <div 
      className={`flex items-center justify-between py-3 ${onClick ? 'cursor-pointer hover:bg-muted/50 -mx-4 px-4 rounded-lg transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={foto_url || undefined} />
          <AvatarFallback className="text-xs">
            {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {badge && (
        <Badge variant={badgeVariant || 'secondary'} className="ml-2 flex-shrink-0">
          {badge}
        </Badge>
      )}
    </div>
  );

  if (loading) {
    return (
      <AppLayout title="HR Dashboard">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 w-20 bg-muted rounded" />
                    <div className="h-8 w-16 bg-muted rounded" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="HR Dashboard"
      subtitle={format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
    >
      <PullToRefresh onRefresh={loadDashboardData} className="h-[calc(100vh-4rem)] md:h-auto md:overflow-visible">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-8 space-y-4 md:space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Medewerkers"
              value={stats.totalEmployees}
              subtitle="Actief in dienst"
              icon={Users}
              onClick={() => navigate('/hr/medewerkers')}
            />
            <KPICard
              title="Verzuimpercentage"
              value={`${stats.absencePercentage}%`}
              subtitle={`${stats.activeAbsences} actieve ziekmeldingen`}
              icon={HeartPulse}
              variant={stats.absencePercentage > 5 ? 'danger' : stats.absencePercentage > 3 ? 'warning' : 'success'}
              onClick={() => navigate('/dashboard/hr')}
            />
            <KPICard
              title="Verlofaanvragen"
              value={stats.pendingLeaveRequests}
              subtitle="Wachten op goedkeuring"
              icon={Calendar}
              variant={stats.pendingLeaveRequests > 0 ? 'warning' : 'default'}
              onClick={() => navigate('/hr/verlof')}
            />
            <KPICard
              title="Openstaande taken"
              value={stats.openTasks}
              subtitle={stats.overdueTasks > 0 ? `${stats.overdueTasks} te laat` : 'Alles op schema'}
              icon={Clock}
              variant={stats.overdueTasks > 0 ? 'danger' : 'default'}
              onClick={() => navigate('/dashboard/hr')}
            />
          </div>

          {/* Secondary content */}
          <div className="grid gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Upcoming Birthdays */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Cake className="h-4 w-4 text-pink-500" />
                    Aankomende verjaardagen
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {stats.upcomingBirthdays.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stats.upcomingBirthdays.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Geen verjaardagen in de komende 30 dagen
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {stats.upcomingBirthdays.map((birthday) => (
                      <ListItem
                        key={birthday.id}
                        name={birthday.name}
                        subtitle={birthday.date}
                        badge={birthday.daysUntil === 0 ? 'Vandaag!' : `${birthday.daysUntil}d`}
                        badgeVariant={birthday.daysUntil === 0 ? 'default' : 'outline'}
                        foto_url={birthday.foto_url}
                        onClick={() => navigate(`/hr/medewerkers/${birthday.id}`)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expiring Contracts */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-amber-500" />
                    Aflopende contracten
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {stats.expiringContracts.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stats.expiringContracts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Geen contracten die aflopen in de komende 90 dagen
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {stats.expiringContracts.map((contract) => (
                      <ListItem
                        key={contract.id}
                        name={contract.name}
                        subtitle={contract.endDate}
                        badge={`${contract.daysUntil}d`}
                        badgeVariant={contract.daysUntil <= 30 ? 'destructive' : 'outline'}
                        foto_url={contract.foto_url}
                        onClick={() => navigate(`/hr/medewerkers/${contract.id}`)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Absences */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <HeartPulse className="h-4 w-4 text-destructive" />
                    Actieve ziekmeldingen
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={() => navigate('/dashboard/hr')}
                  >
                    Bekijk alle
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {stats.recentAbsences.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Geen actieve ziekmeldingen
                  </p>
                ) : (
                  <div className="divide-y divide-border">
                    {stats.recentAbsences.map((absence) => (
                      <ListItem
                        key={absence.id}
                        name={absence.employeeName}
                        subtitle={`Sinds ${absence.startDate}`}
                        badge={absence.status === 'actief' ? 'Actief' : absence.status}
                        badgeVariant="destructive"
                        foto_url={absence.foto_url}
                        onClick={() => navigate(`/case/${absence.id}`)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Workflow Automation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Workflow Automation</CardTitle>
                <Badge variant="secondary" className="text-xs">New</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => navigate('/hr/workflows/builder')}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-xs">Workflows bouwen</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => navigate('/hr/workflows/executions')}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs">Monitoring</span>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Automatiseer HR-processen zoals onboarding, contractverlenging en periodieke taken
              </p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Snelle acties</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => navigate('/hr/medewerkers')}
                >
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Medewerkers</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => navigate('/dashboard/hr')}
                >
                  <HeartPulse className="h-5 w-5" />
                  <span className="text-xs">Verzuim</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => navigate('/hr/verlof')}
                >
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">Verlof</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => navigate('/dashboard/hr')}
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-xs">Rapportages</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PullToRefresh>
    </AppLayout>
  );
}
