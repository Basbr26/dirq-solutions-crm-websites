import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DashboardHeader } from '@/components/DashboardHeader';
import { PredictiveAnalytics } from '@/components/executive/PredictiveAnalytics';
import { SmartAlerts, type SmartAlert } from '@/components/executive/SmartAlerts';
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
  Activity,
  Download,
  Calendar,
  Target
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  predictVerzuimRisk, 
  forecastVerzuim,
  calculateBradfordFactor,
  type VerzuimPrediction 
} from '@/lib/analytics/verzuimPredictor';
import { toast } from 'sonner';

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ComponentType<{ className?: string }>;
  subtitle?: string;
}

function KPICard({ title, value, trend, icon: Icon, subtitle }: KPICardProps) {
  return (
    <Card>
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
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface VerzuimTrendPoint {
  month: string;
  verzuim: number;
  isForecast: boolean;
}

interface DepartmentDataPoint {
  department: string;
  verzuimPct: number;
  benchmark: number;
}

interface CostDataPoint {
  name: string;
  value: number;
}

export default function DashboardExecutive() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<VerzuimPrediction[]>([]);
  const [alerts, setAlerts] = useState<SmartAlert[]>([]);

  // KPI State
  const [totalFTE, setTotalFTE] = useState(0);
  const [verzuimPercentage, setVerzuimPercentage] = useState(0);
  const [avgCostPerCase, setAvgCostPerCase] = useState(0);
  const [openVacancies, setOpenVacancies] = useState(0);
  const [turnoverRate, setTurnoverRate] = useState(0);

  // Chart Data
  const [verzuimTrendData, setVerzuimTrendData] = useState<VerzuimTrendPoint[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentDataPoint[]>([]);
  const [costBreakdownData, setCostBreakdownData] = useState<CostDataPoint[]>([]);

  useEffect(() => {
    if (user && role === 'hr') {
      loadExecutiveData();
    }
  }, [user, role]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadExecutiveData = async () => {
    setLoading(true);
    try {
      // Load all employees for FTE calculation
      const { data: employees, error: empError } = await supabase
        .from('profiles')
        .select('id, voornaam, achternaam, created_at, functie');

      if (empError) throw empError;

      const fte = employees?.length || 0;
      setTotalFTE(fte);

      // Load active sick leave cases
      const { data: activeCases, error: casesError } = await supabase
        .from('sick_leave_cases')
        .select('*')
        .in('case_status', ['actief', 'herstel_gemeld']);

      if (casesError) throw casesError;

      const activeCount = activeCases?.length || 0;
      const verzuimPct = fte > 0 ? (activeCount / fte) * 100 : 0;
      setVerzuimPercentage(Math.round(verzuimPct * 10) / 10);

      // Calculate average cost per case (example: €100 per day)
      const avgCost = 5200; // Example value
      setAvgCostPerCase(avgCost);

      // Mock data for other KPIs
      setOpenVacancies(5);
      setTurnoverRate(12.5);

      // Generate verzuim trend data (last 12 months + forecast)
      const trendData = generateVerzuimTrendData();
      setVerzuimTrendData(trendData);

      // Department comparison data
      const deptData = [
        { department: 'Verkoop', verzuimPct: 4.2, benchmark: 3.5 },
        { department: 'Productie', verzuimPct: 6.8, benchmark: 5.0 },
        { department: 'IT', verzuimPct: 2.1, benchmark: 2.5 },
        { department: 'HR', verzuimPct: 3.5, benchmark: 3.0 },
        { department: 'Finance', verzuimPct: 1.8, benchmark: 2.0 },
      ];
      setDepartmentData(deptData);

      // Cost breakdown
      const costData = [
        { name: 'Directe loonkosten', value: 45000 },
        { name: 'Vervangingskosten', value: 18000 },
        { name: 'Productiviteitsverlies', value: 12000 },
        { name: 'Administratie', value: 5000 },
      ];
      setCostBreakdownData(costData);

      // Generate predictive analytics
      await generatePredictions(employees || [], activeCases || []);

      // Generate smart alerts
      generateAlerts(verzuimPct, activeCount, avgCost);

    } catch (error) {
      console.error('Error loading executive data:', error);
      toast.error('Fout bij laden van dashboard data');
    } finally {
      setLoading(false);
    }
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
      <div className="min-h-screen bg-background">
        <DashboardHeader title="Executive Dashboard" />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Executive Dashboard" />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Executive Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Real-time inzichten en voorspellende analytics
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Laatste 30 dagen
            </Button>
            <Button className="gap-2" onClick={handleExportReport}>
              <Download className="h-4 w-4" />
              Export Rapport
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="Total FTE"
            value={totalFTE}
            trend={2.5}
            icon={Users}
            subtitle="Actieve medewerkers"
          />
          <KPICard
            title="Verzuimpercentage"
            value={`${verzuimPercentage}%`}
            trend={-0.3}
            icon={Activity}
            subtitle="Bradford Factor: 285"
          />
          <KPICard
            title="Gem. Kosten per Geval"
            value={`€${avgCostPerCase.toLocaleString()}`}
            trend={-5.2}
            icon={DollarSign}
            subtitle="Incl. indirecte kosten"
          />
          <KPICard
            title="Open Vacatures"
            value={openVacancies}
            icon={Briefcase}
            subtitle="Gem. 32 dagen TTH"
          />
          <KPICard
            title="Turnover Rate"
            value={`${turnoverRate}%`}
            trend={1.2}
            icon={Target}
            subtitle="Rolling 12 maanden"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Verzuim Trend with Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>Verzuimtrend & Forecast</CardTitle>
                <CardDescription>
                  Historische data en AI-voorspelling voor komende maanden
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={verzuimTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: 'Verzuim %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="verzuim"
                      stroke="#8884d8"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Verzuimpercentage"
                    />
                    <Line
                      type="monotone"
                      dataKey="verzuim"
                      stroke="#8884d8"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      data={verzuimTrendData.filter(d => d.isForecast)}
                      name="Forecast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Departement Vergelijking</CardTitle>
                <CardDescription>
                  Verzuimpercentage vs benchmark per afdeling
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis label={{ value: 'Verzuim %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="verzuimPct" fill="#8884d8" name="Actueel" />
                    <Bar dataKey="benchmark" fill="#82ca9d" name="Benchmark" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Kosten Breakdown</CardTitle>
                <CardDescription>
                  Verdeling van verzuimkosten dit kwartaal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `€${(entry.value / 1000).toFixed(0)}k`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Alerts & Predictions */}
          <div className="space-y-6">
            <SmartAlerts alerts={alerts} onAction={handleAlertAction} />
            <PredictiveAnalytics predictions={predictions} loading={false} />
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Veelgebruikte acties voor executive management</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-start gap-2">
              <Users className="h-4 w-4" />
              Start Re-integratie
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Download className="h-4 w-4" />
              Generate Rapport
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Target className="h-4 w-4" />
              Plan Preventie Actie
            </Button>
            <Button variant="outline" className="justify-start gap-2">
              <Activity className="h-4 w-4" />
              Benchmark Analyse
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
