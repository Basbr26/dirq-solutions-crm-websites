import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardHeader } from '@/components/DashboardHeader';
import { AppLayout } from '@/components/layout/AppLayout';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Briefcase,
  Building2,
  Download,
  Target,
  FileText,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth, formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  href?: string;
}

function KPICard({ title, value, trend, icon: Icon, subtitle, href }: KPICardProps) {
  const { t } = useTranslation();
  
  const content = (
    <Card className={`h-full ${href ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend !== undefined && (
          <div className="flex items-center text-xs mt-2">
            {trend > 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-green-500">+{trend}%</span>
              </>
            ) : trend < 0 ? (
              <>
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                <span className="text-red-500">{trend}%</span>
              </>
            ) : (
              <span className="text-muted-foreground">{t('dashboard.unchanged')}</span>
            )}
            <span className="text-muted-foreground ml-1">{t('dashboard.vsPreviousMonth')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <a href={href} className="block">{content}</a>;
  }

  return content;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface RevenueTrendPoint {
  month: string;
  revenue: number;
  forecast?: number;
}

interface PipelineDataPoint {
  stage: string;
  count: number;
  value: number;
}

interface SourceDataPoint {
  name: string;
  value: number;
  count: number;
}

export default function DashboardExecutive() {
  const { t } = useTranslation();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Loading state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // KPI State
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [activeDeals, setActiveDeals] = useState(0);
  const [avgDealSize, setAvgDealSize] = useState(0);
  const [totalMRR, setTotalMRR] = useState(0); // v2.0 MRR tracking

  // Trend percentages (month-over-month)
  const [revenueTrend, setRevenueTrend] = useState<number | undefined>(undefined);
  const [pipelineTrend, setPipelineTrend] = useState<number | undefined>(undefined);
  const [conversionTrend, setConversionTrend] = useState<number | undefined>(undefined);
  const [dealsTrend, setDealsTrend] = useState<number | undefined>(undefined);
  const [avgDealTrend, setAvgDealTrend] = useState<number | undefined>(undefined);
  const [mrrTrend, setMrrTrend] = useState<number | undefined>(undefined); // v2.0 MRR trend

  // Additional CRM Stats
  const [activeCompanies, setActiveCompanies] = useState(0);
  const [newContacts, setNewContacts] = useState(0);
  const [quotesSent, setQuotesSent] = useState(0);
  const [topDeals, setTopDeals] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Chart Data
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendPoint[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineDataPoint[]>([]);
  const [sourceData, setSourceData] = useState<SourceDataPoint[]>([]);

  useEffect(() => {
    if (user) {
      loadExecutiveData();

      // Set up real-time subscriptions for automatic updates
      const projectsSubscription = supabase
        .channel('projects-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'projects' },
          () => {
            console.log('Projects data changed, reloading dashboard...');
            loadExecutiveData();
          }
        )
        .subscribe();

      const companiesSubscription = supabase
        .channel('companies-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'companies' },
          () => {
            console.log('Companies data changed, reloading dashboard...');
            loadExecutiveData();
          }
        )
        .subscribe();

      const contactsSubscription = supabase
        .channel('contacts-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'contacts' },
          () => {
            console.log('Contacts data changed, reloading dashboard...');
            loadExecutiveData();
          }
        )
        .subscribe();

      const quotesSubscription = supabase
        .channel('quotes-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'quotes' },
          () => {
            console.log('Quotes data changed, reloading dashboard...');
            loadExecutiveData();
          }
        )
        .subscribe();

      // Cleanup subscriptions on unmount
      return () => {
        projectsSubscription.unsubscribe();
        companiesSubscription.unsubscribe();
        contactsSubscription.unsubscribe();
        quotesSubscription.unsubscribe();
      };
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePercentageChange = (current: number, previous: number): number | undefined => {
    if (previous === 0) return current > 0 ? 100 : undefined;
    const change = ((current - previous) / previous) * 100;
    return Math.round(change * 10) / 10; // Round to 1 decimal
  };

  const loadExecutiveData = async () => {
    setLoading(true);
    try {
      // Date ranges for current and previous month
      const now = new Date();
      const firstDayThisMonth = startOfMonth(now);
      const firstDayLastMonth = startOfMonth(subMonths(now, 1));
      const firstDayTwoMonthsAgo = startOfMonth(subMonths(now, 2));

      // Load all projects for revenue calculation
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, value, stage, probability, created_at, source');

      if (projectsError) throw projectsError;

      // Separate current and previous month projects
      const currentMonthProjects = projects?.filter(p => 
        new Date(p.created_at) >= firstDayThisMonth
      ) || [];
      const previousMonthProjects = projects?.filter(p => 
        new Date(p.created_at) >= firstDayLastMonth && new Date(p.created_at) < firstDayThisMonth
      ) || [];

      // Calculate total revenue from closed deals (live projects)
      const revenue = projects
        ?.filter(p => p.stage === 'live')
        .reduce((sum, p) => sum + (p.value || 0), 0) || 0;
      setTotalRevenue(revenue);

      // Previous month revenue
      const prevRevenue = projects
        ?.filter(p => p.stage === 'live' && new Date(p.created_at) < firstDayThisMonth)
        .reduce((sum, p) => sum + (p.value || 0), 0) || 0;
      setRevenueTrend(calculatePercentageChange(revenue, prevRevenue));

      // Calculate pipeline value (weighted)
      const pipelineVal = projects
        ?.filter(p => !['live', 'lost', 'maintenance'].includes(p.stage))
        .reduce((sum, p) => sum + (p.value || 0) * (p.probability || 0) / 100, 0) || 0;
      setPipelineValue(pipelineVal);

      // Calculate previous pipeline value (for deals created before this month)
      const prevPipelineVal = projects
        ?.filter(p => !['live', 'lost', 'maintenance'].includes(p.stage) && new Date(p.created_at) < firstDayThisMonth)
        .reduce((sum, p) => sum + (p.value || 0) * (p.probability || 0) / 100, 0) || 0;
      setPipelineTrend(calculatePercentageChange(pipelineVal, prevPipelineVal));

      // Calculate conversion rate
      const totalDeals = projects?.length || 0;
      const wonDeals = projects?.filter(p => p.stage === 'live').length || 0;
      const convRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
      setConversionRate(Math.round(convRate * 10) / 10);

      // Previous month conversion rate
      const prevTotalDeals = projects?.filter(p => new Date(p.created_at) < firstDayThisMonth).length || 0;
      const prevWonDeals = projects?.filter(p => p.stage === 'live' && new Date(p.created_at) < firstDayThisMonth).length || 0;
      const prevConvRate = prevTotalDeals > 0 ? (prevWonDeals / prevTotalDeals) * 100 : 0;
      setConversionTrend(calculatePercentageChange(convRate, prevConvRate));

      // Active deals in pipeline
      const active = projects?.filter(p => 
        !['live', 'lost', 'maintenance'].includes(p.stage)
      ).length || 0;
      setActiveDeals(active);

      // Previous month active deals
      const prevActive = projects?.filter(p => 
        !['live', 'lost', 'maintenance'].includes(p.stage) && new Date(p.created_at) < firstDayThisMonth
      ).length || 0;
      setDealsTrend(calculatePercentageChange(active, prevActive));

      // Average deal size
      const avgSize = totalDeals > 0 
        ? projects.reduce((sum, p) => sum + (p.value || 0), 0) / totalDeals 
        : 0;
      setAvgDealSize(avgSize);

      // Previous month average deal size
      const prevAvgSize = prevTotalDeals > 0
        ? projects.filter(p => new Date(p.created_at) < firstDayThisMonth).reduce((sum, p) => sum + (p.value || 0), 0) / prevTotalDeals
        : 0;
      setAvgDealTrend(calculatePercentageChange(avgSize, prevAvgSize));

      // Generate revenue trend data (last 6 months)
      const trendData = generateRevenueTrendData(projects || []);
      setRevenueTrendData(trendData);

      // Pipeline by stage
      const pipelineByStage = generatePipelineData(projects || []);
      setPipelineData(pipelineByStage);

      // Lead sources
      const leadSources = generateSourceData(projects || []);
      setSourceData(leadSources);

      // v2.0: Load MRR data from companies.total_mrr
      await loadMRRData();

      // Load additional CRM stats
      await loadCRMStats();

    } catch (error) {
      console.error('Error loading executive data:', error);
      toast.error(t('errors.loadingDashboard'));
    } finally {
      setLoading(false);
    }
  };

  const loadCRMStats = async () => {
    try {
      // Active companies (status = 'active')
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      setActiveCompanies(companiesCount || 0);

      // New contacts this month
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);
      
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString());
      setNewContacts(contactsCount || 0);

      // Quotes sent this month
      const { count: quotesCount } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .in('status', ['sent', 'accepted', 'negotiation'])
        .gte('created_at', firstDayOfMonth.toISOString());
      setQuotesSent(quotesCount || 0);

      // Top 3 deals by value (excluding lost/maintenance)
      const { data: topDealsData } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          value,
          stage,
          companies!projects_company_id_fkey(name)
        `)
        .not('stage', 'in', '("lost","maintenance")')
        .order('value', { ascending: false })
        .limit(3);
      setTopDeals(topDealsData || []);

      // Recent activity: latest created companies, contacts, and projects
      const recentActivities = [];
      
      // Latest company
      const { data: latestCompanyData } = await supabase
        .from('companies')
        .select('name, created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const latestCompany = latestCompanyData?.[0];
      if (latestCompany) {
        recentActivities.push({
          type: 'company',
          text: `${t('dashboard.companyAdded')}: ${latestCompany.name}`,
          timestamp: latestCompany.created_at,
        });
      }

      // Latest quote
      const { data: latestQuoteData } = await supabase
        .from('quotes')
        .select('id, created_at, companies!quotes_company_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const latestQuote = latestQuoteData?.[0];
      if (latestQuote) {
        recentActivities.push({
          type: 'quote',
          text: `${t('dashboard.quoteSentTo')} ${latestQuote.companies?.name || t('common.unknown')}`,
          timestamp: latestQuote.created_at,
        });
      }

      // Latest won project
      const { data: latestWonData } = await supabase
        .from('projects')
        .select('title, created_at, companies!projects_company_id_fkey(name)')
        .eq('stage', 'live')
        .order('created_at', { ascending: false })
        .limit(1);
      
      const latestWon = latestWonData?.[0];
      if (latestWon) {
        recentActivities.push({
          type: 'won',
          text: `${t('dashboard.dealWon')}: ${latestWon.companies?.name || latestWon.title}`,
          timestamp: latestWon.created_at,
        });
      }

      // Sort by timestamp and take top 3
      recentActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRecentActivity(recentActivities.slice(0, 3));

    } catch (error) {
      console.error('Error loading CRM stats:', error);
    }
  };

  const loadMRRData = async () => {
    try {
      const now = new Date();
      const firstDayThisMonth = startOfMonth(now);
      const firstDayLastMonth = startOfMonth(subMonths(now, 1));

      // Get current month MRR from active companies
      const { data: currentMRRData, error: currentError } = await supabase
        .from('companies')
        .select('total_mrr')
        .eq('status', 'active')
        .not('total_mrr', 'is', null);

      if (currentError) throw currentError;

      const currentMRR = currentMRRData?.reduce((sum, company) => 
        sum + (company.total_mrr || 0), 0
      ) || 0;
      setTotalMRR(currentMRR);

      // Get previous month MRR by querying companies that were active last month
      // Note: This is a simplified approach - for more accurate tracking,
      // you'd want to store historical MRR snapshots
      const { data: previousMRRData, error: previousError } = await supabase
        .from('companies')
        .select('total_mrr, created_at')
        .eq('status', 'active')
        .lt('created_at', firstDayThisMonth.toISOString())
        .not('total_mrr', 'is', null);

      if (previousError) throw previousError;

      const previousMRR = previousMRRData?.reduce((sum, company) => 
        sum + (company.total_mrr || 0), 0
      ) || 0;

      // Calculate trend
      if (previousMRR > 0) {
        const trend = calculatePercentageChange(currentMRR, previousMRR);
        setMrrTrend(trend);
      } else if (currentMRR > 0) {
        setMrrTrend(100); // 100% growth if previous was 0
      }

    } catch (error) {
      console.error('Error loading MRR data:', error);
    }
  };

  const generateRevenueTrendData = (projects: any[]): RevenueTrendPoint[] => {
    const months: RevenueTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(startOfMonth(new Date()), i);
      const monthStr = format(date, 'MMM', { locale: nl });
      
      // Calculate revenue for projects closed in this month
      const revenue = projects
        .filter(p => {
          if (p.stage !== 'live') return false;
          const projectDate = new Date(p.created_at);
          return projectDate.getMonth() === date.getMonth() &&
                 projectDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, p) => sum + (p.value || 0), 0);
      
      months.push({ month: monthStr, revenue });
    }
    return months;
  };

  const generatePipelineData = (projects: any[]): PipelineDataPoint[] => {
    const stageLabels: Record<string, string> = {
      lead: 'Lead',
      quote_requested: 'Quote Aangevraagd',
      quote_sent: 'Quote Verzonden',
      negotiation: 'Onderhandeling',
      quote_signed: 'Getekend',
      in_development: 'In Ontwikkeling',
      review: 'Review',
    };

    const stages = ['lead', 'quote_requested', 'quote_sent', 'negotiation', 'quote_signed', 'in_development', 'review'];
    
    return stages.map(stage => {
      const stageProjects = projects.filter(p => p.stage === stage);
      return {
        stage: stageLabels[stage] || stage,
        count: stageProjects.length,
        value: stageProjects.reduce((sum, p) => sum + (p.value || 0), 0),
      };
    }).filter(s => s.count > 0);
  };

  const generateSourceData = (projects: any[]): SourceDataPoint[] => {
    const sources: Record<string, { count: number; value: number }> = {};
    
    projects.forEach(p => {
      const source = p.source || 'Direct';
      if (!sources[source]) {
        sources[source] = { count: 0, value: 0 };
      }
      sources[source].count++;
      sources[source].value += p.value || 0;
    });

    return Object.entries(sources).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value,
    }));
  };


  if (loading) {
    return (
      <AppLayout
        title="Executive Dashboard"
        subtitle="Strategisch CRM-overzicht met business analytics"
      >
        <div className="p-4 md:p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={t('dashboard.executiveTitle')}
      subtitle={t('dashboard.executiveSubtitle')}
      actions={
        <Button className="gap-2" onClick={() => toast.info(t('dashboard.exportComingSoon'))}>
          <Download className="h-4 w-4" />
          {t('dashboard.exportReport')}
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KPICard
            title={t('dashboard.totalRevenue')}
            value={formatCurrency(totalRevenue)}
            trend={revenueTrend}
            icon={DollarSign}
            subtitle={t('dashboard.closedDeals')}
            href="/pipeline"
          />
          <KPICard
            title={t('dashboard.monthlyRecurring')}
            value={formatCurrency(totalMRR)}
            trend={mrrTrend}
            icon={RefreshCw}
            subtitle={t('dashboard.mrrActiveClients')}
            href="/companies"
          />
          <KPICard
            title={t('dashboard.totalValue')}
            value={formatCurrency(pipelineValue)}
            trend={pipelineTrend}
            icon={Target}
            subtitle={t('dashboard.weightedValue')}
            href="/pipeline"
          />
          <KPICard
            title={t('dashboard.conversionRatio')}
            value={`${conversionRate}%`}
            trend={conversionTrend}
            icon={TrendingUp}
            subtitle={t('dashboard.wonDeals')}
            href="/pipeline"
          />
          <KPICard
            title={t('dashboard.activeDeals')}
            value={activeDeals}
            trend={dealsTrend}
            icon={Briefcase}
            subtitle={t('dashboard.active')}
            href="/pipeline"
          />
          <KPICard
            title={t('dashboard.avgDealSize')}
            value={formatCurrency(avgDealSize)}
            trend={avgDealTrend}
            icon={Building2}
            subtitle={t('dashboard.perProject')}
            href="/pipeline"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.revenueTrend')}</CardTitle>
                <CardDescription>
                  {t('dashboard.monthlyRevenue')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={revenueTrendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <YAxis 
                      label={{ value: 'Omzet (€)', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      cursor={{ stroke: '#94a3b8', strokeWidth: 2, strokeDasharray: '5 5' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '16px', fontSize: '14px' }}
                      iconSize={16}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0088FE"
                      strokeWidth={3}
                      dot={{ r: 5, strokeWidth: 2, fill: '#0088FE' }}
                      activeDot={{ r: 8, strokeWidth: 3, fill: '#0088FE' }}
                      name={t('dashboard.revenue')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pipeline by Stage */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.salesByStage')}</CardTitle>
                <CardDescription>
                  {t('dashboard.dealsCountAndValue')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart 
                    data={pipelineData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis 
                      dataKey="stage" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: t('dashboard.count'), angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: t('dashboard.valueEuro'), angle: 90, position: 'insideRight', style: { fontSize: 12 } }}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 12 }}
                      tickMargin={8}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === t('dashboard.value')) return formatCurrency(value);
                        return value;
                      }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      cursor={{ fill: 'rgba(0, 136, 254, 0.1)' }}
                      allowEscapeViewBox={{ x: true, y: true }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '14px' }}
                      iconSize={16}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="count" 
                      fill="#0088FE" 
                      name={t('dashboard.count')}
                      radius={[8, 8, 0, 0]}
                      maxBarSize={40}
                      activeBar={{ fill: '#0066CC' }}
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="value" 
                      fill="#00C49F" 
                      name={t('dashboard.value')}
                      radius={[8, 8, 0, 0]}
                      maxBarSize={40}
                      activeBar={{ fill: '#00A080' }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.leadSources')}</CardTitle>
                <CardDescription>
                  {t('dashboard.dealsByChannel')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={(entry) => `${entry.name}: ${entry.count}`}
                      outerRadius={90}
                      innerRadius={45}
                      fill="#8884d8"
                      dataKey="count"
                      paddingAngle={2}
                      activeShape={{
                        outerRadius: 100,
                        stroke: '#fff',
                        strokeWidth: 2
                      }}
                    >
                      {sourceData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          className="cursor-pointer transition-all duration-200"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => {
                        return [
                          `${value} deals (${formatCurrency(props.payload.value)})`,
                          props.payload.name
                        ];
                      }}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      wrapperStyle={{ zIndex: 1000 }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '14px' }}
                      iconSize={16}
                      layout="horizontal"
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Summary Cards */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.quickStats')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard.activeCompanies')}</span>
                  <Badge variant="secondary" className="text-lg">
                    {activeCompanies}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard.newContactsThisMonth')}</span>
                  <Badge variant="secondary" className="text-lg">
                    {newContacts}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard.quotesSent')}</span>
                  <Badge variant="secondary" className="text-lg">
                    {quotesSent}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('dashboard.wonDeals')}</span>
                  <Badge variant="default" className="text-lg">
                    {conversionRate}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.topDeals')}</CardTitle>
                <CardDescription>{t('dashboard.highestDealValues')}</CardDescription>
              </CardHeader>
              <CardContent>
                {topDeals.length > 0 ? (
                  <div className="space-y-3">
                    {topDeals.map((deal) => (
                      <div key={deal.id} className="flex justify-between items-start border-b pb-2 last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{deal.companies?.name || deal.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {deal.stage.replace('_', ' ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm">{formatCurrency(deal.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('dashboard.noActiveDeals')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <div className="space-y-3 text-sm">
                    {recentActivity.map((activity, idx) => {
                      const Icon = activity.type === 'quote' ? FileText : 
                                   activity.type === 'company' ? Building2 : Target;
                      const timeAgo = formatDistanceToNow(new Date(activity.timestamp), { 
                        addSuffix: true, 
                        locale: nl 
                      });
                      
                      return (
                        <div key={idx} className="flex gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div>
                            <p className="font-medium">{activity.text}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('dashboard.noRecentActivity')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}