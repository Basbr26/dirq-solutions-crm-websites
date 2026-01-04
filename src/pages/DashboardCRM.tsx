/**
 * CRM Dashboard - Main Overview
 * Sales pipeline, quotes, and business metrics
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { usePipelineStats } from '@/features/projects/hooks/useProjects';
import { useQuoteStats } from '@/features/quotes/hooks/useQuotes';
import { format } from 'date-fns';
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
  const content = (
    <>
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
              <span className="text-muted-foreground">Onveranderd</span>
            )}
            <span className="text-muted-foreground ml-1">vs vorige maand</span>
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

const STAGE_COLORS: Record<string, string> = {
  lead: '#64748b',
  quote_requested: '#3b82f6',
  quote_sent: '#8b5cf6',
  negotiation: '#f59e0b',
  quote_signed: '#10b981',
  in_development: '#06b6d4',
  review: '#6366f1',
  live: '#22c55e',
};

export default function DashboardCRM() {
  const { data: pipelineStats } = usePipelineStats();
  const { data: quoteStats } = useQuoteStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Pipeline stage distribution for pie chart
  const pipelineDistribution = pipelineStats?.by_stage
    ? Object.entries(pipelineStats.by_stage)
        .filter(([_, data]) => data.count > 0)
        .map(([stage, data]) => ({
          name: stage.replace(/_/g, ' '),
          value: data.value,
          count: data.count,
        }))
    : [];

  // Monthly revenue trend (mock data - replace with real data)
  const revenueData = [
    { month: 'Aug', revenue: 45000, target: 50000 },
    { month: 'Sep', revenue: 52000, target: 50000 },
    { month: 'Okt', revenue: 48000, target: 50000 },
    { month: 'Nov', revenue: 61000, target: 55000 },
    { month: 'Dec', revenue: 58000, target: 55000 },
    { month: 'Jan', revenue: 67000, target: 60000 },
  ];

  // Quote acceptance rate over time (mock data)
  const quoteAcceptanceData = [
    { month: 'Aug', rate: 42 },
    { month: 'Sep', rate: 45 },
    { month: 'Okt', rate: 48 },
    { month: 'Nov', rate: 52 },
    { month: 'Dec', rate: 50 },
    { month: 'Jan', rate: 55 },
  ];

  const quoteAcceptanceRate = quoteStats 
    ? Math.round((quoteStats.accepted / quoteStats.total) * 100) || 0
    : 0;

  return (
    <AppLayout 
      title="CRM Dashboard" 
      subtitle={format(new Date(), 'EEEE d MMMM yyyy', { locale: nl })}
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Pipeline Waarde"
            value={formatCurrency(pipelineStats?.total_value || 0)}
            subtitle={`${pipelineStats?.total_projects || 0} actieve projecten`}
            icon={FolderKanban}
            trend={12}
            href="/pipeline"
          />
          <KPICard
            title="Gewogen Waarde"
            value={formatCurrency(pipelineStats?.weighted_value || 0)}
            subtitle="Op basis van kans"
            icon={Target}
            trend={8}
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
            trend={5}
            href="/quotes"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Omzet Ontwikkeling</CardTitle>
              <CardDescription>Afgelopen 6 maanden</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    name="Omzet"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#6366f1" 
                    strokeDasharray="5 5"
                    name="Doel"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pipeline Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline per Fase</CardTitle>
              <CardDescription>Verdeling projectwaarde</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pipelineDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => `${entry.count}`}
                  >
                    {pipelineDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STAGE_COLORS[entry.name.replace(/ /g, '_')] || '#94a3b8'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={quoteAcceptanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="rate" fill="#10b981" name="Acceptatie %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Snelle Statistieken</CardTitle>
              <CardDescription>Overzicht van je CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">Bedrijven</span>
                </div>
                <Badge variant="secondary">Bekijk alle</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Contacten</span>
                </div>
                <Badge variant="secondary">Bekijk alle</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Gemiddelde Deal Size</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(pipelineStats?.avg_deal_size || 0)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Deze maand gesloten</span>
                </div>
                <Badge className="bg-green-500">3 deals</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
