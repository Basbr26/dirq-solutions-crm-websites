import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateUserDialog } from '@/components/CreateUserDialog';
import { UserManagement } from '@/components/UserManagement';
import { Card, CardContent } from '@/components/ui/card';
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
  totalCompanies: number;
  totalProjects: number;
  activeDeals: number;
}

export default function DashboardSuperAdmin() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalDepartments: 0,
    totalManagers: 0,
    totalEmployees: 0,
  });
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total users
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Get total companies
      const { count: companyCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true });

      // Get total projects
      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true });

      // Get active deals (negotiation + quote_sent)
      const { count: activeDealsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .in('stage', ['negotiation', 'quote_sent']);

      setStats({
        totalUsers: userCount || 0,
        totalCompanies: companyCount || 0,
        totalProjects: projectCount || 0,
        activeDeals: activeDealsCount || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error(t('errors.errorLoadingStats'));
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
              Systeem Administratie
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Beheer gebruikers, CRM-data en systeeminstellingen
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

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-secondary/10 flex-shrink-0">
                    <Building2 className="h-4 w-4 sm:h-6 sm:w-6 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Bedrijven</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalCompanies}</p>
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
                    <p className="text-xs sm:text-sm text-muted-foreground">Projecten</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.totalProjects}</p>
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
                    <p className="text-xs sm:text-sm text-muted-foreground">Actieve Deals</p>
                    <p className="text-xl sm:text-2xl font-bold">{stats.activeDeals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="w-full">
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gebruikersbeheer
              </h2>
            </div>
            <UserManagement onRefresh={loadStats} />
          </div>
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
