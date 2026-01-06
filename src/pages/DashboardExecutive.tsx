import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileText
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth } from 'date-fns';
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
    <Card className={href ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}>
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
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Loading state
  const [loading, setLoading] = useState(true);

  // KPI State
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pipelineValue, setPipelineValue] = useState(0);
  const [conversionRate, setConversionRate] = useState(0);
  const [activeDeals, setActiveDeals] = useState(0);
  const [avgDealSize, setAvgDealSize] = useState(0);

  // Chart Data
  const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendPoint[]>([]);
  const [pipelineData, setPipelineData] = useState<PipelineDataPoint[]>([]);
  const [sourceData, setSourceData] = useState<SourceDataPoint[]>([]);

  useEffect(() => {
    if (user) {
      loadExecutiveData();
    }
  }, [user]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const loadExecutiveData = async () => {
    setLoading(true);
    try {
      // Load all projects for revenue calculation
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id, value, stage, probability, created_at, source');

      if (projectsError) throw projectsError;

      // Calculate total revenue from closed deals (live projects)
      const revenue = projects
        ?.filter(p => p.stage === 'live')
        .reduce((sum, p) => sum + (p.value || 0), 0) || 0;
      setTotalRevenue(revenue);

      // Calculate pipeline value (weighted)
      const pipelineVal = projects
        ?.filter(p => !['live', 'lost', 'maintenance'].includes(p.stage))
        .reduce((sum, p) => sum + (p.value || 0) * (p.probability || 0) / 100, 0) || 0;
      setPipelineValue(pipelineVal);

      // Calculate conversion rate
      const totalDeals = projects?.length || 0;
      const wonDeals = projects?.filter(p => p.stage === 'live').length || 0;
      const convRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;
      setConversionRate(Math.round(convRate * 10) / 10);

      // Active deals in pipeline
      const active = projects?.filter(p => 
        !['live', 'lost', 'maintenance'].includes(p.stage)
      ).length || 0;
      setActiveDeals(active);

      // Average deal size
      const avgSize = totalDeals > 0 
        ? projects.reduce((sum, p) => sum + (p.value || 0), 0) / totalDeals 
        : 0;
      setAvgDealSize(avgSize);

      // Generate revenue trend data (last 6 months)
      const trendData = generateRevenueTrendData(projects || []);
      setRevenueTrendData(trendData);

      // Pipeline by stage
      const pipelineByStage = generatePipelineData(projects || []);
      setPipelineData(pipelineByStage);

      // Lead sources
      const leadSources = generateSourceData(projects || []);
      setSourceData(leadSources);

    } catch (error) {
      console.error('Error loading executive data:', error);
      toast.error('Fout bij laden van dashboard data');
    } finally {
      setLoading(false);
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

  const generateVerzuimTrendData = () => {
    const data = [];
    const now = new Date();

    // Historical data (last 12 months)
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleDateString('nl-NL', { month: 'short' });

      data.push({
        month,
        verzuim: 3 + Math.random() * 3, // Random between 3-6%
        isForecast: false,
      });
    }

    // Forecast (next 3 months)
    const lastValue = data[data.length - 1].verzuim;
    for (let i = 1; i <= 3; i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() + i);
      const month = date.toLocaleDateString('nl-NL', { month: 'short' });

      data.push({
        month,
        verzuim: lastValue + (Math.random() - 0.5) * 0.5,
        isForecast: true,
      });
    }

    return data;
  };

  const generatePredictions = async (employees: unknown[], activeCases: unknown[]) => {
    // Generate mock predictions for demo
    const samplePredictions: VerzuimPrediction[] = [
      {
        employeeId: '1',
        employeeName: 'Jan Jansen',
        riskScore: 85,
        riskLevel: 'high',
        confidence: 87,
        factors: [
          { name: 'Hoge Bradford Factor', impact: 0.8, description: 'Bradford Factor van 450' },
          { name: 'Frequentie', impact: 0.6, description: '5 verzuimgevallen' },
        ],
        recommendations: [
          'Plan preventief verzuimgesprek binnen 2 weken',
          'Check werkdruk en arbeidsomstandigheden',
        ],
      },
      {
        employeeId: '2',
        employeeName: 'Maria de Vries',
        riskScore: 62,
        riskLevel: 'medium',
        confidence: 75,
        factors: [
          { name: 'Seizoen', impact: 0.3, description: 'Wintermaanden hebben hoger verzuim' },
        ],
        recommendations: ['Monitor verzuimpatroon komende maand'],
      },
      {
        employeeId: '3',
        employeeName: 'Piet Bakker',
        riskScore: 78,
        riskLevel: 'high',
        confidence: 82,
        factors: [
          { name: 'Frequentie', impact: 0.7, description: '6 verzuimgevallen' },
          { name: 'Leeftijd', impact: 0.4, description: 'Leeftijdsgroep met verhoogd risico' },
        ],
        recommendations: [
          'Plan preventief verzuimgesprek binnen 2 weken',
          'Analyseer oorzaken van frequent kort verzuim',
        ],
      },
    ];

    setPredictions(samplePredictions);
  };

  const generateAlerts = (verzuimPct: number, activeCount: number, avgCost: number) => {
    const newAlerts: SmartAlert[] = [];

    // Budget warning
    if (avgCost > 5000) {
      newAlerts.push({
        id: '1',
        type: 'budget',
        severity: 'warning',
        title: 'Verzuimkosten boven gemiddelde',
        description: 'Gemiddelde kosten per verzuimgeval zijn hoger dan het benchmark',
        metric: `€${avgCost}`,
        threshold: '€4.500',
        actionLabel: 'Bekijk kostenanalyse',
        actionUrl: '/executive/costs',
      });
    }

    // Critical deadlines
    newAlerts.push({
      id: '2',
      type: 'deadline',
      severity: 'critical',
      title: 'Poortwachter deadline nadert',
      description: '2 medewerkers bereiken de 42-weken grens binnen 5 dagen',
      metric: '5 dagen',
      actionLabel: 'Bekijk dossiers',
      actionUrl: '/cases',
    });

    // Capacity risk
    if (verzuimPct > 5) {
      newAlerts.push({
        id: '3',
        type: 'capacity',
        severity: activeCount > 10 ? 'critical' : 'warning',
        title: 'Verhoogd verzuimpercentage',
        description: 'Team Productie heeft >15% verzuim - capaciteitsprobleem',
        metric: `${verzuimPct}%`,
        threshold: '5%',
        actionLabel: 'Team analyse',
        actionUrl: '/teams/productie',
      });
    }

    // Compliance
    newAlerts.push({
      id: '4',
      type: 'compliance',
      severity: 'warning',
      title: 'Ontbrekende Plan van Aanpak documenten',
      description: '3 dossiers missen verplichte Plan van Aanpak na 8 weken',
      metric: '3 dossiers',
      actionLabel: 'Bekijk dossiers',
      actionUrl: '/compliance',
    });

    setAlerts(newAlerts);
  };

  const handleExportReport = () => {
    toast.success('Rapport wordt gegenereerd...');
    // Implementation for PDF export
  };

  const handleAlertAction = (alert: SmartAlert) => {
    if (alert.actionUrl) {
      navigate(alert.actionUrl);
    }
  };


  if (loading) {
    return (
      <AppLayout
        title="Executive Dashboard"
        subtitle="Strategisch CRM-overzicht met business analytics"
      >
        <div className="p-4 md:p-6">
          <div className="animate-pulse space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
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
      title="Executive Dashboard"
      subtitle="Real-time business inzichten en sales analytics"
      actions={
        <Button className="gap-2" onClick={() => toast.info('Export functionaliteit komt binnenkort')}>
          <Download className="h-4 w-4" />
          Export Rapport
        </Button>
      }
    >
      <div className="p-4 md:p-6 space-y-8">
        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="Totale Omzet"
            value={formatCurrency(totalRevenue)}
            trend={8.5}
            icon={DollarSign}
            subtitle="Afgesloten deals"
            href="/pipeline"
          />
          <KPICard
            title="Pipeline Waarde"
            value={formatCurrency(pipelineValue)}
            trend={12.3}
            icon={Target}
            subtitle="Gewogen waarde"
            href="/pipeline"
          />
          <KPICard
            title="Conversie Ratio"
            value={`${conversionRate}%`}
            trend={-2.1}
            icon={TrendingUp}
            subtitle="Won vs totaal"
          />
          <KPICard
            title="Actieve Deals"
            value={activeDeals}
            icon={Briefcase}
            subtitle="In pipeline"
            href="/pipeline"
          />
          <KPICard
            title="Gem. Deal Grootte"
            value={formatCurrency(avgDealSize)}
            trend={5.7}
            icon={Building2}
            subtitle="Per project"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Omzet Trend</CardTitle>
                <CardDescription>
                  Maandelijkse omzet van afgesloten deals
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis 
                      label={{ value: 'Omzet (€)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#0088FE"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Omzet"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pipeline by Stage */}
            <Card>
              <CardHeader>
                <CardTitle>Pipeline per Fase</CardTitle>
                <CardDescription>
                  Aantal deals en waarde per pipeline fase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="stage" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Aantal', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Waarde (€)', angle: 90, position: 'insideRight' }}
                      tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === 'Waarde') return formatCurrency(value);
                        return value;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="count" fill="#0088FE" name="Aantal" />
                    <Bar yAxisId="right" dataKey="value" fill="#00C49F" name="Waarde" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Lead Sources */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Bronnen</CardTitle>
                <CardDescription>
                  Verdeling van deals per acquisitiekanaal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string, props: any) => {
                        return [
                          `${value} deals (${formatCurrency(props.payload.value)})`,
                          props.payload.name
                        ];
                      }}
                    />
                    <Legend />
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
                <CardTitle>Snelle Statistieken</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Actieve Bedrijven</span>
                  <Badge variant="secondary" className="text-lg">
                    {Math.floor(Math.random() * 50) + 20}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Nieuwe Contacten (deze maand)</span>
                  <Badge variant="secondary" className="text-lg">
                    {Math.floor(Math.random() * 20) + 5}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Offertes Verstuurd</span>
                  <Badge variant="secondary" className="text-lg">
                    {Math.floor(Math.random() * 15) + 5}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <Badge variant="default" className="text-lg">
                    {conversionRate}%
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Deals</CardTitle>
                <CardDescription>Hoogste deal waardes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { company: 'TechCorp B.V.', value: 45000, stage: 'negotiation' },
                    { company: 'MediaGroup NL', value: 38000, stage: 'quote_sent' },
                    { company: 'RetailChain', value: 32000, stage: 'in_development' },
                  ].map((deal, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b pb-2 last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{deal.company}</p>
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
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recente Activiteit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Nieuwe offerte verstuurd</p>
                      <p className="text-xs text-muted-foreground">2 uur geleden</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Bedrijf toegevoegd</p>
                      <p className="text-xs text-muted-foreground">5 uur geleden</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">Deal gewonnen</p>
                      <p className="text-xs text-muted-foreground">1 dag geleden</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}