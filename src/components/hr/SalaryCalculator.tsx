import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, TrendingDown, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SalaryCalculatorProps {
  baseSalaryMonthly?: number;
  baseSalaryAnnual?: number;
  fte?: number;
}

export function SalaryCalculator({ 
  baseSalaryMonthly: initialMonthly, 
  baseSalaryAnnual: initialAnnual,
  fte: initialFte = 1.0 
}: SalaryCalculatorProps) {
  const [monthlyGross, setMonthlyGross] = useState(initialMonthly || 0);
  const [annualGross, setAnnualGross] = useState(initialAnnual || 0);
  const [fte, setFte] = useState(initialFte);

  // Fetch company settings for cost calculations
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Sync monthly and annual values
  useEffect(() => {
    if (monthlyGross > 0) {
      setAnnualGross(monthlyGross * 12);
    }
  }, [monthlyGross]);

  useEffect(() => {
    if (annualGross > 0) {
      setMonthlyGross(annualGross / 12);
    }
  }, [annualGross]);

  // Calculate all components
  const socialCharges = companySettings?.employer_social_charges_pct || 20;
  const pensionEmployer = companySettings?.pension_employer_contribution_pct || 5;
  const pensionEmployee = companySettings?.pension_employee_contribution_pct || 3;
  const holidayAllowance = companySettings?.holiday_allowance_pct || 8;

  const grossSalaryMonthly = monthlyGross * fte;
  const grossSalaryAnnual = grossSalaryMonthly * 12;
  
  const holidayAllowanceAmount = grossSalaryAnnual * (holidayAllowance / 100);
  const totalGrossAnnual = grossSalaryAnnual + holidayAllowanceAmount;
  
  const socialChargesAmount = grossSalaryAnnual * (socialCharges / 100);
  const pensionEmployerAmount = grossSalaryAnnual * (pensionEmployer / 100);
  const pensionEmployeeAmount = grossSalaryAnnual * (pensionEmployee / 100);
  
  const totalEmployerCostAnnual = totalGrossAnnual + socialChargesAmount + pensionEmployerAmount;
  const totalEmployerCostMonthly = totalEmployerCostAnnual / 12;

  // Simplified net salary estimation (simplified tax calculation)
  const estimatedTaxRate = 0.37; // Average tax rate
  const estimatedNetAnnual = totalGrossAnnual * (1 - estimatedTaxRate) - pensionEmployeeAmount;
  const estimatedNetMonthly = estimatedNetAnnual / 12;

  const hourlyRateGross = monthlyGross / (companySettings?.default_fulltime_hours_per_week || 40) / 4.33;
  const hourlyRateCost = totalEmployerCostMonthly / (companySettings?.default_fulltime_hours_per_week || 40) / 4.33;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Salaris Calculator
          </CardTitle>
          <CardDescription>
            Bereken werkgeverskosten en netto loon
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly-gross">Bruto maandsalaris</Label>
              <Input
                id="monthly-gross"
                type="number"
                step="0.01"
                value={monthlyGross || ""}
                onChange={(e) => setMonthlyGross(parseFloat(e.target.value) || 0)}
                placeholder="€ 3.500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual-gross">Bruto jaarsalaris</Label>
              <Input
                id="annual-gross"
                type="number"
                step="0.01"
                value={annualGross || ""}
                onChange={(e) => setAnnualGross(parseFloat(e.target.value) || 0)}
                placeholder="€ 42.000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fte">FTE</Label>
              <Input
                id="fte"
                type="number"
                step="0.01"
                min="0.01"
                max="1.0"
                value={fte}
                onChange={(e) => setFte(parseFloat(e.target.value) || 1.0)}
              />
              <p className="text-xs text-muted-foreground">1.0 = fulltime</p>
            </div>
          </div>

          {monthlyGross > 0 && (
            <>
              <Separator />

              {/* Gross Salary Breakdown */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Bruto Salaris</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Maandsalaris (12x)</p>
                    <p className="text-2xl font-bold">€ {grossSalaryMonthly.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Jaarsalaris</p>
                    <p className="text-2xl font-bold">€ {grossSalaryAnnual.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Vakantiegeld ({holidayAllowance}%)</span>
                    <span className="font-semibold">€ {holidayAllowanceAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t">
                    <span className="text-sm font-semibold">Totaal bruto per jaar</span>
                    <span className="font-bold text-lg">€ {totalGrossAnnual.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Employer Costs */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  Werkgeverskosten
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bruto salaris + vakantiegeld</span>
                    <span>€ {totalGrossAnnual.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Werkgeverslasten ({socialCharges}%)</span>
                    <span>€ {socialChargesAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pensioen werkgever ({pensionEmployer}%)</span>
                    <span>€ {pensionEmployerAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Totale werkgeverskosten</p>
                      <p className="text-xs text-muted-foreground">Per jaar</p>
                    </div>
                    <span className="font-bold text-2xl text-orange-700 dark:text-orange-400">
                      € {totalEmployerCostAnnual.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                    <span className="text-sm">Per maand</span>
                    <span className="font-semibold text-lg">€ {totalEmployerCostMonthly.toFixed(2)}</span>
                  </div>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Werkgeverslasten omvatten sociale premies (AOW, WW, WIA, etc.) en pensioenbijdrage werkgever.
                  </AlertDescription>
                </Alert>
              </div>

              <Separator />

              {/* Employee Net Salary Estimation */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  Geschat Netto Salaris (indicatief)
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bruto + vakantiegeld</span>
                    <span>€ {totalGrossAnnual.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Inkomstenbelasting (~{(estimatedTaxRate * 100).toFixed(0)}%)</span>
                    <span className="text-red-600">- € {(totalGrossAnnual * estimatedTaxRate).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Pensioen werknemer ({pensionEmployee}%)</span>
                    <span className="text-red-600">- € {pensionEmployeeAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Geschat netto per jaar</p>
                      <p className="text-xs text-muted-foreground">Exclusief zorgtoeslag/toeslagen</p>
                    </div>
                    <span className="font-bold text-2xl text-green-700 dark:text-green-400">
                      € {estimatedNetAnnual.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <span className="text-sm">Per maand</span>
                    <span className="font-semibold text-lg">€ {estimatedNetMonthly.toFixed(2)}</span>
                  </div>
                </div>

                <Alert className="mt-4">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Netto schatting is indicatief. Werkelijke belasting hangt af van persoonlijke situatie, heffingskortingen en aftrekposten.
                  </AlertDescription>
                </Alert>
              </div>

              <Separator />

              {/* Hourly Rates */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Uurlonen</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">Bruto uurloon</p>
                      <p className="text-xl font-bold">€ {hourlyRateGross.toFixed(2)}</p>
                      <Badge variant="outline" className="mt-2">Voor werknemer</Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground mb-1">Kosten per uur</p>
                      <p className="text-xl font-bold text-orange-700 dark:text-orange-400">
                        € {hourlyRateCost.toFixed(2)}
                      </p>
                      <Badge variant="outline" className="mt-2 border-orange-300">Voor werkgever</Badge>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {monthlyGross === 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Vul een bruto maand- of jaarsalaris in om de berekening te zien
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
