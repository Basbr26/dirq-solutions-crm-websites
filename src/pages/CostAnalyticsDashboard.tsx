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
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch cost summary data
  const { data: costSummary, isLoading: costLoading, error: costError } = useQuery({
    queryKey: ["cost-summary", selectedYear, selectedDepartment],
    queryFn: async () => {
      let query = supabase
        .from("employee_cost_summary")
        .select(`
          *,
          employee:profiles!employee_id(
            full_name,
            department_id,
            departments(name)
          )
        `)
        .eq("year", selectedYear);

      if (selectedDepartment !== "all") {
        query = query.eq("employee.department_id", selectedDepartment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch employee total compensation
  const { data: employeeCompensation } = useQuery({
    queryKey: ["employee-compensation", selectedDepartment],
    queryFn: async () => {
      let query = supabase
        .from("v_employee_total_compensation")
        .select("*");

      if (selectedDepartment !== "all") {
        query = query.eq("department_id", selectedDepartment);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calculate aggregated metrics
  const totalEmployees = new Set(costSummary?.map(c => c.employee_id)).size || 0;
  const totalCostYTD = costSummary?.reduce((sum, c) => sum + (c.total_employer_cost || 0), 0) || 0;
  const avgCostPerEmployee = totalEmployees > 0 ? totalCostYTD / totalEmployees : 0;
  const totalGrossSalary = costSummary?.reduce((sum, c) => sum + (c.total_gross_salary || 0), 0) || 0;

  // Monthly cost trend
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthData = costSummary?.filter(c => c.month === month) || [];
    return {
      month: new Date(selectedYear, i).toLocaleDateString("nl-NL", { month: "short" }),
      cost: monthData.reduce((sum, c) => sum + (c.total_employer_cost || 0), 0),
      gross: monthData.reduce((sum, c) => sum + (c.total_gross_salary || 0), 0),
      employees: new Set(monthData.map(c => c.employee_id)).size,
    };
  });

  // Cost breakdown by category
  const avgMonthRecord = costSummary?.[0];
  const costBreakdown = avgMonthRecord ? [
    { name: "Bruto salaris", value: avgMonthRecord.base_salary_gross || 0, color: "#3b82f6" },
    { name: "Toeslagen", value: avgMonthRecord.allowances_total || 0, color: "#8b5cf6" },
    { name: "Overuren", value: avgMonthRecord.overtime_total || 0, color: "#f59e0b" },
    { name: "Werkgeverslasten", value: avgMonthRecord.social_charges || 0, color: "#ef4444" },
    { name: "Pensioen", value: avgMonthRecord.pension_employer_contribution || 0, color: "#10b981" },
    { name: "Benefits", value: avgMonthRecord.benefits_employer_cost || 0, color: "#06b6d4" },
  ].filter(item => item.value > 0) : [];

  // Department comparison
  const departmentCosts = departments?.map(dept => {
    const deptData = costSummary?.filter(c => c.employee?.department_id === dept.id) || [];
    return {
      name: dept.name,
      totalCost: deptData.reduce((sum, c) => sum + (c.total_employer_cost || 0), 0),
      employees: new Set(deptData.map(c => c.employee_id)).size,
      avgCostPerEmployee: deptData.length > 0 
        ? deptData.reduce((sum, c) => sum + (c.total_employer_cost || 0), 0) / new Set(deptData.map(c => c.employee_id)).size 
        : 0,
    };
  }).filter(d => d.employees > 0) || [];

  // Top 10 highest cost employees
  const topEmployees = employeeCompensation
    ?.sort((a, b) => (b.estimated_total_cost_monthly || 0) - (a.estimated_total_cost_monthly || 0))
    .slice(0, 10)
    .map(e => ({
      name: e.full_name,
      monthlyCost: e.estimated_total_cost_monthly || 0,
      annualSalary: e.base_salary_annual || 0,
    })) || [];

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

  if (costError) {
    return (
      <AppLayout
        title="Cost Analytics"
        subtitle="Loonkosten analyse en forecasting"
      >
        <div className="p-4 md:p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Kostenanalyse niet beschikbaar
            </CardTitle>
            <CardDescription>
              De kostenanalyse module vereist database migraties die nog niet zijn uitgevoerd.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Ontbrekende database componenten:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Tabel: <code className="bg-background px-1 rounded">employee_cost_summary</code></li>
                <li>View: <code className="bg-background px-1 rounded">v_employee_total_compensation</code></li>
              </ul>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Technische details:</p>
              <code className="block bg-background p-2 rounded text-xs">
                {costError instanceof Error ? costError.message : 'Unknown error'}
              </code>
            </div>
            <p className="text-sm">
              Neem contact op met de systeembeheerder om de benodigde database migraties uit te voeren.
              Zie <code className="bg-muted px-1 rounded">supabase/migrations/20251218_company_cost_management.sql</code>
            </p>
          </CardContent>
        </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Cost Analytics"
      subtitle="Loonkosten analyse en forecasting"
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
            <Label className="text-xs">Afdeling</Label>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
                {departments?.filter(d => d.id && d.id.trim() !== '').map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                ))}
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
              <Users className="h-4 w-4 text-blue-500" />
              Medewerkers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">Actieve contracten</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              Totale Kosten YTD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ {(totalCostYTD / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">
              Jaar tot nu toe
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Gem. Kosten/Medewerker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ {(avgCostPerEmployee / 1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground mt-1">Per jaar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-purple-500" />
              Bruto Salaris
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€ {(totalGrossSalary / 1000).toFixed(0)}K</div>
            <p className="text-xs text-muted-foreground mt-1">
              {((totalGrossSalary / totalCostYTD) * 100).toFixed(0)}% van totale kosten
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
              <CardTitle>Maandelijkse Kostenoverzicht {selectedYear}</CardTitle>
              <CardDescription>Ontwikkeling loonkosten en aantal medewerkers</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "Totale kosten" || name === "Bruto salaris") {
                        return `€${(value / 1000).toFixed(1)}K`;
                      }
                      return value;
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="cost" name="Totale kosten" stroke="#ef4444" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="gross" name="Bruto salaris" stroke="#3b82f6" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="employees" name="Medewerkers" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Kostenopbouw</CardTitle>
                <CardDescription>Gemiddelde maandelijkse kosten per categorie</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={costBreakdown}
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
