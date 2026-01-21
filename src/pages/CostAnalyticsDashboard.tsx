import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TrendingUp, Users, DollarSign, PieChart, Calendar, TrendingDown } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";

export default function CostAnalyticsDashboard() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Loading and error states
  const costLoading = false;
  const costError = null;

  // Placeholder: This would fetch project profitability data
  // For now, showing basic structure with dummy data
  const projects = [
    { id: 1, name: "Website Redesign", revenue: 25000, costs: 18000, margin: 7000 },
    { id: 2, name: "E-commerce Platform", revenue: 45000, costs: 32000, margin: 13000 },
    { id: 3, name: "Marketing Site", revenue: 15000, costs: 11000, margin: 4000 },
  ];

  // Calculate aggregated metrics
  const totalProjects = projects.length;
  const totalRevenue = projects.reduce((sum, p) => sum + p.revenue, 0);
  const totalCosts = projects.reduce((sum, p) => sum + p.costs, 0);
  const totalProfit = totalRevenue - totalCosts;
  const avgMargin = totalProjects > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Monthly revenue trend (placeholder)
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(selectedYear, i).toLocaleDateString("nl-NL", { month: "short" }),
    revenue: Math.floor(Math.random() * 50000) + 20000,
    costs: Math.floor(Math.random() * 35000) + 15000,
    profit: 0, // calculated below
  })).map(m => ({ ...m, profit: m.revenue - m.costs }));

  // Project breakdown
  const projectBreakdown = projects.map(p => ({
    name: p.name,
    revenue: p.revenue,
    costs: p.costs,
    margin: p.margin,
    marginPercent: ((p.margin / p.revenue) * 100).toFixed(1),
  }));

  // Cost breakdown for pie chart
  const costBreakdown = [
    { name: 'Directe kosten', value: 12000, color: '#3b82f6' },
    { name: 'Indirecte kosten', value: 8000, color: '#8b5cf6' },
    { name: 'Overhead', value: 5000, color: '#f59e0b' },
  ];

  // Department costs
  const departmentCosts = [
    { name: 'Development', totalCost: 45000, avgCostPerEmployee: 7500, employees: 6 },
    { name: 'Design', totalCost: 28000, avgCostPerEmployee: 7000, employees: 4 },
    { name: 'Marketing', totalCost: 21000, avgCostPerEmployee: 7000, employees: 3 },
  ];

  // Top employees
  const topEmployees = [
    { name: 'John Doe', monthlyCost: 8500, department: 'Development' },
    { name: 'Jane Smith', monthlyCost: 8200, department: 'Design' },
    { name: 'Bob Johnson', monthlyCost: 7800, department: 'Development' },
  ];

  const COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#06b6d4", "#ec4899", "#6366f1"];

  if (costLoading) {
    return (
      <AppLayout
        title="Cost Analytics"
        subtitle="Loonkosten analyse en forecasting"
      >
        <div className="p-4 md:p-6">
          <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
        </div>
      </AppLayout>
    );
  }

  // Error state removed - costError is always null (placeholder data)

  return (
    <AppLayout
      title="Project Analytics"
      subtitle="Omzet, winstgevendheid en project performance"
      actions={
        <div className="flex gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Jaar</Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categorie</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle projecten</SelectItem>
                <SelectItem value="website">Websites</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="app">Apps</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-6">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4 text-blue-500" />
              Actieve Projecten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">In uitvoering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Totale Omzet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ {(totalRevenue / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">
              Dit jaar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Winst
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ {(totalProfit / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground mt-1">Netto resultaat</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Gem. Winstmarge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Over alle projecten
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Kostenopbouw</TabsTrigger>
          <TabsTrigger value="departments">Afdelingen</TabsTrigger>
          <TabsTrigger value="employees">Top Medewerkers</TabsTrigger>
        </TabsList>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maandelijkse Omzet & Winst {selectedYear}</CardTitle>
              <CardDescription>Ontwikkeling omzet en winstgevendheid</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `€${(value / 1000).toFixed(1)}K`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Omzet" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="costs" name="Kosten" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" name="Winst" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Project Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Project Winstgevendheid</CardTitle>
              <CardDescription>Vergelijking per project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectBreakdown.map((project, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{project.name}</span>
                      <span className="text-sm text-muted-foreground">{project.marginPercent}% marge</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">Omzet: €{(project.revenue / 1000).toFixed(1)}K</span>
                      <span className="text-orange-600">Kosten: €{(project.costs / 1000).toFixed(1)}K</span>
                      <span className="text-blue-600">Winst: €{(project.margin / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${project.marginPercent}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Breakdown</CardTitle>
                <CardDescription>Omzet per project</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={projectBreakdown.map(p => ({ name: p.name, value: p.revenue }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: €${(entry.value / 1000).toFixed(1)}K`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kostenratio's</CardTitle>
                <CardDescription>Percentuele verdeling van kosten</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {costBreakdown.map((item, index) => {
                    const total = costBreakdown.reduce((sum, i) => sum + i.value, 0);
                    const percentage = (item.value / total) * 100;
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full transition-all"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Kosten per Afdeling</CardTitle>
              <CardDescription>Vergelijking totale loonkosten en gemiddelde kosten per medewerker</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={departmentCosts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "Totale kosten" || name === "Gem. per medewerker") {
                        return `€${(value / 1000).toFixed(1)}K`;
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="totalCost" name="Totale kosten" fill="#3b82f6" />
                  <Bar yAxisId="right" dataKey="avgCostPerEmployee" name="Gem. per medewerker" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Employees Tab */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Hoogste Kosten</CardTitle>
              <CardDescription>Medewerkers met hoogste maandelijkse werkgeverskosten</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topEmployees} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip formatter={(value: number) => `€${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="monthlyCost" name="Maandelijkse kosten" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
