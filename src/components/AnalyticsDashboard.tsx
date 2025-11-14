import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { SickLeaveCase } from "@/types/sickLeave";
import { format, differenceInDays, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
import { nl } from "date-fns/locale";

interface AnalyticsDashboardProps {
  cases: SickLeaveCase[];
}

const COLORS = {
  actief: 'hsl(var(--destructive))',
  herstel_gemeld: 'hsl(var(--warning))',
  gesloten: 'hsl(var(--success))',
};

export function AnalyticsDashboard({ cases }: AnalyticsDashboardProps) {
  // Status verdeling
  const statusData = [
    { name: 'Actief', value: cases.filter(c => c.case_status === 'actief').length, fill: COLORS.actief },
    { name: 'Herstel Gemeld', value: cases.filter(c => c.case_status === 'herstel_gemeld').length, fill: COLORS.herstel_gemeld },
    { name: 'Gesloten', value: cases.filter(c => c.case_status === 'gesloten').length, fill: COLORS.gesloten },
  ];

  // Trend per maand (laatste 6 maanden)
  const now = new Date();
  const sixMonthsAgo = subMonths(now, 5);
  const months = eachMonthOfInterval({ start: sixMonthsAgo, end: now });
  
  const trendData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const casesInMonth = cases.filter(c => {
      const startDate = new Date(c.start_date);
      return startDate >= monthStart && startDate <= monthEnd;
    });
    
    return {
      month: format(month, 'MMM', { locale: nl }),
      aantal: casesInMonth.length,
    };
  });

  // Gemiddelde duur per status
  const durationData = ['actief', 'herstel_gemeld', 'gesloten'].map(status => {
    const statusCases = cases.filter(c => c.case_status === status);
    const durations = statusCases.map(c => {
      const start = new Date(c.start_date);
      const end = c.end_date ? new Date(c.end_date) : new Date();
      return differenceInDays(end, start);
    });
    const avgDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    
    return {
      status: status === 'herstel_gemeld' ? 'Herstel Gemeld' : status.charAt(0).toUpperCase() + status.slice(1),
      dagen: avgDuration,
    };
  });

  // Top functionele beperkingen (vervanger voor "redenen")
  const limitationCounts = cases.reduce((acc, c) => {
    const limitation = c.functional_limitations || 'Niet gespecificeerd';
    acc[limitation] = (acc[limitation] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topLimitations = Object.entries(limitationCounts)
    .map(([beperking, aantal]) => ({ beperking, aantal }))
    .sort((a, b) => b.aantal - a.aantal)
    .slice(0, 5);

  // Totale statistieken
  const totalDays = cases.reduce((sum, c) => {
    const start = new Date(c.start_date);
    const end = c.end_date ? new Date(c.end_date) : new Date();
    return sum + differenceInDays(end, start);
  }, 0);
  
  const avgDuration = cases.length > 0 ? Math.round(totalDays / cases.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Totaal Gevallen</CardDescription>
            <CardTitle className="text-3xl">{cases.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gemiddelde Duur</CardDescription>
            <CardTitle className="text-3xl">{avgDuration} dagen</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actieve Gevallen</CardDescription>
            <CardTitle className="text-3xl">{cases.filter(c => c.case_status === 'actief').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Herstel Gemeld</CardDescription>
            <CardTitle className="text-3xl">{cases.filter(c => c.case_status === 'herstel_gemeld').length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Verdeling</CardTitle>
            <CardDescription>Huidige verdeling van ziekmeldingen</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trend Laatste 6 Maanden</CardTitle>
            <CardDescription>Aantal nieuwe ziekmeldingen per maand</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="aantal" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gemiddelde Duur per Status</CardTitle>
            <CardDescription>Gemiddeld aantal dagen per status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={durationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="dagen" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 5 Functionele Beperkingen</CardTitle>
            <CardDescription>Meest voorkomende functionele beperkingen</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topLimitations} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="beperking" type="category" width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="aantal" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}