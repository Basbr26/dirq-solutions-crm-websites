/**
 * CRM Dashboard - Main Overview
 * Sales pipeline, quotes, and business metrics
 */

import { useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  FileText, 
  FolderKanban,
  Building2,
  Users,
  Target,
  Calendar,
  Activity
} from 'lucide-react';
import { usePipelineStats } from '@/features/projects/hooks/useProjects';
import { useQuoteStats } from '@/features/quotes/hooks/useQuotes';
import { ProjectStage } from '@/types/projects';
import { 
  useMonthlyRevenue,
  useQuoteAcceptanceTrend,
  usePipelineTrend,
  useWeightedPipelineTrend,
  useQuoteAcceptanceRateTrend,
  useDealsThisWeek,
  useEntityCounts,
} from './hooks/useDashboardStats';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Lazy load Recharts to improve initial bundle size
const LineChart = lazy(() => import('recharts').then(m => ({ default: m.LineChart })));
const Line = lazy(() => import('recharts').then(m => ({ default: m.Line })));
const BarChart = lazy(() => import('recharts').then(m => ({ default: m.BarChart })));
const Bar = lazy(() => import('recharts').then(m => ({ default: m.Bar })));
const PieChart = lazy(() => import('recharts').then(m => ({ default: m.PieChart })));
const Pie = lazy(() => import('recharts').then(m => ({ default: m.Pie })));
const Cell = lazy(() => import('recharts').then(m => ({ default: m.Cell })));
const XAxis = lazy(() => import('recharts').then(m => ({ default: m.XAxis })));
const YAxis = lazy(() => import('recharts').then(m => ({ default: m.YAxis })));
const CartesianGrid = lazy(() => import('recharts').then(m => ({ default: m.CartesianGrid })));
const Tooltip = lazy(() => import('recharts').then(m => ({ default: m.Tooltip })));
const Legend = lazy(() => import('recharts').then(m => ({ default: m.Legend })));
const ResponsiveContainer = lazy(() => import('recharts').then(m => ({ default: m.ResponsiveContainer })));

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
  href?: string;
}

function KPICard({ title, value, trend, icon: Icon, subtitle, href }: KPICardProps) {
  const content = (
    <>
      {/* Reduced padding on mobile: p-3 vs p-6 on sm+ */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 sm:p-6 sm:pb-2">
        <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        {/* Smaller text on mobile */}
        <div className="text-lg sm:text-2xl font-bold truncate">{value}</div>
        {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
        {trend !== undefined && (
          <div className="flex items-center text-[10px] sm:text-xs mt-2">
            {trend > 0 ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-500 mr-1 flex-shrink-0" />
                <span className="text-green-500">+{trend}%</span>
              </>
            ) : trend < 0 ? (
              <>
                <TrendingDown className="h-3 w-3 text-red-500 mr-1 flex-shrink-0" />
                <span className="text-red-500">{trend}%</span>
              </>
            ) : (
              <span className="text-muted-foreground">Onveranderd</span>
            )}
            {/* Hide "vs vorige maand" on mobile to save space */}
            <span className="text-muted-foreground ml-1 hidden sm:inline">vs vorige maand</span>
          </div>
        )}
      </CardContent>
    </>
  );

  if (href) {
    return (
      <Link to={href}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          {content}
        </Card>
      </Link>
    );
  }

  return <Card>{content}</Card>;
}

const STAGE_COLORS: Record<ProjectStage, string> = {
  lead: '#64748b',
  quote_requested: '#3b82f6',
  quote_sent: '#8b5cf6',
  negotiation: '#f59e0b',
  quote_signed: '#10b981',
  in_development: '#06b6d4',
  review: '#6366f1',
  live: '#22c55e',
  maintenance: '#14b8a6',
  lost: '#ef4444',
};

export default function DashboardCRM() {
  const { data: pipelineStats } = usePipelineStats();
  const { data: quoteStats } = useQuoteStats();
  
  // Real-time trend data
  const { data: pipelineTrend } = usePipelineTrend();
  const { data: weightedTrend } = useWeightedPipelineTrend();
  const { data: acceptanceRateTrend } = useQuoteAcceptanceRateTrend();
  
  // Chart data
  const { data: revenueData, isLoading: revenueLoading } = useMonthlyRevenue();
  const { data: quoteAcceptanceData, isLoading: acceptanceLoading } = useQuoteAcceptanceTrend();
  
  // Quick stats
  const { data: dealsThisWeek } = useDealsThisWeek();
  const { data: entityCounts } = useEntityCounts();

  // Memoize currency formatter
  const formatCurrency = useMemo(
    () => (amount: number) =>
      new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(amount),
    []
  );

  // Pipeline stage distribution for pie chart
  const pipelineDistribution = useMemo(
    () =>
      pipelineStats?.by_stage
        ? Object.entries(pipelineStats.by_stage)
            .filter(([_, data]) => data.count > 0)
            .map(([stage, data]) => ({
              name: stage.replace(/_/g, ' '),
              value: data.value,
              count: data.count,
            }))
        : [],
    [pipelineStats]
  );

  const quoteAcceptanceRate = quoteStats 
    ? Math.round((quoteStats.accepted / quoteStats.total) * 100) || 0
    : 0;

  return (
    <AppLayout 
      title="CRM Dashboard" 
      subtitle={format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
    >
      <div className="space-y-4 sm:space-y-6">
        {/* KPI Cards - 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
          <KPICard
            title="Pipeline Waarde"
            value={formatCurrency(pipelineStats?.total_value || 0)}
            subtitle={`${pipelineStats?.total_projects || 0} actieve projecten`}
            icon={FolderKanban}
            trend={pipelineTrend?.percentage}
            href="/pipeline"
          />
          <KPICard
            title="Gewogen Waarde"
            value={formatCurrency(pipelineStats?.weighted_value || 0)}
            subtitle="Op basis van kans"
            icon={Target}
            trend={weightedTrend?.percentage}
            href="/pipeline"
          />
          <KPICard
            title="Offertes Waarde"
            value={formatCurrency(quoteStats?.total_value || 0)}
            subtitle={`${quoteStats?.total || 0} offertes`}
            icon={FileText}
            href="/quotes"
          />
          <KPICard
            title="Acceptatie Ratio"
            value={`${quoteAcceptanceRate}%`}
            subtitle={`${quoteStats?.accepted || 0} geaccepteerd`}
            icon={TrendingUp}
            trend={acceptanceRateTrend?.percentage}
            href="/quotes"
          />
        </div>

        {/* Charts Row 1 - Stack on mobile */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue Trend */}
          <Card className="overflow-hidden">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-sm sm:text-base">Omzet Ontwikkeling</CardTitle>
              <CardDescription className="text-xs">Afgelopen 6 maanden</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              {revenueLoading ? (
                <div className="h-[200px] sm:h-[300px] space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : revenueData && revenueData.length > 0 ? (
                <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart 
                      data={revenueData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                      />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
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
                        stroke="#10b981" 
                        name="Omzet"
                        strokeWidth={3}
                        dot={{ r: 5, strokeWidth: 2, fill: '#10b981' }}
                        activeDot={{ r: 8, strokeWidth: 3, fill: '#10b981' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="target" 
                        stroke="#6366f1" 
                        strokeDasharray="5 5"
                        name="Doel"
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2, fill: '#6366f1' }}
                        activeDot={{ r: 7, strokeWidth: 3, fill: '#6366f1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Suspense>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Omzetdata wordt binnenkort beschikbaar</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline per Fase</CardTitle>
              <CardDescription>Verdeling projectwaarde</CardDescription>
            </CardHeader>
            <CardContent>
              {pipelineDistribution.length > 0 ? (
                <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pipelineDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={40}
                        label={(entry) => `${entry.count}`}
                        labelLine={true}
                        paddingAngle={2}
                        activeShape={(props: any) => (
                          <g>
                            <Pie
                              {...props}
                              outerRadius={110}
                              stroke="#fff"
                              strokeWidth={2}
                              fill={props.fill}
                            />
                          </g>
                        )}
                      >
                        {pipelineDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={STAGE_COLORS[entry.name.replace(/ /g, '_')] || '#94a3b8'} 
                            className="cursor-pointer transition-all duration-200"
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
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
                </Suspense>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Geen pipelinedata beschikbaar</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Quote Acceptance Rate */}
          <Card>
            <CardHeader>
              <CardTitle>Offerte Acceptatie</CardTitle>
              <CardDescription>Trend over tijd</CardDescription>
            </CardHeader>
            <CardContent>
              {acceptanceLoading ? (
                <div className="h-[300px] space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : quoteAcceptanceData && quoteAcceptanceData.length > 0 ? (
                <Suspense fallback={<Skeleton className="h-[300px] w-full" />}>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={quoteAcceptanceData}
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                      <XAxis 
                        dataKey="month" 
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickMargin={8}
                      />
                      <Tooltip 
                        formatter={(value: number) => `${value}%`}
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '12px',
                          fontSize: '14px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                        cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                        allowEscapeViewBox={{ x: true, y: true }}
                        wrapperStyle={{ zIndex: 1000 }}
                      />
                      <Bar 
                        dataKey="rate" 
                        fill="#10b981" 
                        name="Acceptatie %"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={60}
                        activeBar={{ fill: '#059669' }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Suspense>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Acceptatiedata wordt verzameld</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Snelle Statistieken</CardTitle>
              <CardDescription>Overzicht van je CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/companies">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Bedrijven</span>
                  </div>
                  <Badge variant="secondary">{entityCounts?.companies || 0}</Badge>
                </div>
              </Link>
              
              <Link to="/contacts">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-purple-500" />
                    <span className="font-medium">Contacten</span>
                  </div>
                  <Badge variant="secondary">{entityCounts?.contacts || 0}</Badge>
                </div>
              </Link>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Gemiddelde Deal Size</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(pipelineStats?.avg_deal_size || 0)}
                </span>
              </div>
              
              <Link to="/pipeline">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Deze week gesloten</span>
                  </div>
                  <Badge className="bg-green-500">
                    {dealsThisWeek?.count || 0} deals
                  </Badge>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
