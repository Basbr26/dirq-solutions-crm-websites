import { useState, useEffect, useCallback } from 'react';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { DepartmentManagement } from '@/components/DepartmentManagement';
import { UserManagement } from '@/components/UserManagement';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Users, Building2, UserPlus, Shield, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AppLayout } from '@/components/layout/AppLayout';
import { PullToRefresh } from '@/components/PullToRefresh';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Stats {
  totalUsers: number;
  totalDepartments: number;
  totalManagers: number;
  totalEmployees: number;
}

export default function DashboardSuperAdmin() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDepartments: 0,
    totalManagers: 0,
    totalEmployees: 0,
  });
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    loadStats();

    // Listen for tab change events from mobile nav
    const handleTabChange = (e: CustomEvent) => {
      if (e.detail === 'users') setActiveTab('users');
      if (e.detail === 'departments') setActiveTab('departments');
    };

    window.addEventListener('nav-tab-change', handleTabChange as EventListener);
    return () => window.removeEventListener('nav-tab-change', handleTabChange as EventListener);
  }, []);

  const loadStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total departments
      const { count: deptCount } = await supabase
        .from('departments')
        .select('*', { count: 'exact', head: true });

      // Get managers count
      const { count: managerCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'manager');

      // Get employees count
      const { count: employeeCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'medewerker');

      setStats({
        totalUsers: userCount || 0,
        totalDepartments: deptCount || 0,
        totalManagers: managerCount || 0,
        totalEmployees: employeeCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Fout bij laden van statistieken');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadStats();
  }, []);

  return (
    <AppLayout 
      title="Admin Dashboard" 
      subtitle={format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
      actions={
        <Button onClick={() => setCreateUserDialogOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Nieuwe gebruiker</span>
        </Button>
      }
    >
      <PullToRefresh onRefresh={handleRefresh} className="h-[calc(100vh-4rem)] md:h-auto md:overflow-visible">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">
              Organisatiebeheer
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Beheer gebruikers, afdelingen en rollen
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
            <Card 
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setActiveTab('users')}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <Users className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Gebruikers</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setActiveTab('departments')}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-secondary/10 flex-shrink-0">
                    <Building2 className="h-4 w-4 sm:h-6 sm:w-6 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Afdelingen</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalDepartments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-accent/10 flex-shrink-0">
                    <Shield className="h-4 w-4 sm:h-6 sm:w-6 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Managers</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalManagers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-muted flex-shrink-0">
                    <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Medewerkers</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalEmployees}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4 sm:mb-6 w-full sm:w-auto grid grid-cols-2 sm:flex">
              <TabsTrigger value="users" className="text-xs sm:text-sm gap-1 sm:gap-2">
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                Gebruikers
              </TabsTrigger>
              <TabsTrigger value="departments" className="text-xs sm:text-sm gap-1 sm:gap-2">
                <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                Afdelingen
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserManagement onRefresh={loadStats} />
            </TabsContent>

            <TabsContent value="departments">
              <DepartmentManagement onRefresh={loadStats} />
            </TabsContent>
          </Tabs>
        </div>
      </PullToRefresh>

      <CreateUserDialog 
        open={createUserDialogOpen} 
        onOpenChange={setCreateUserDialogOpen}
        onUserCreated={loadStats}
      />
    </AppLayout>
  );
}
