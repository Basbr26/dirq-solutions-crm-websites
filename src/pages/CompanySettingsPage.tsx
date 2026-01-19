import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Building2, CreditCard, Save, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CompanySettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("basic");

  // Fetch company settings
  const { data: settings, isLoading } = useQuery({
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

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (settings?.id) {
        const { error } = await supabase
          .from("company_settings")
          .update(values)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_settings")
          .insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      toast({
        title: "Opgeslagen",
        description: "Bedrijfsinstellingen zijn bijgewerkt",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij opslaan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values = Object.fromEntries(formData.entries());
    
    // Convert numeric fields
    const numericFields = ['fiscal_year_start_month', 'payroll_day_of_month'];
    
    const processedValues: any = {};
    Object.entries(values).forEach(([key, value]) => {
      if (numericFields.includes(key) && value) {
        processedValues[key] = parseFloat(value as string);
      } else {
        processedValues[key] = value || null;
      }
    });
    
    saveMutation.mutate(processedValues);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          Bedrijfsinstellingen
        </h1>
        <p className="text-muted-foreground mt-2">
          Configureer bedrijfsgegevens en financiële instellingen
        </p>
      </div>

      {!settings && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Er zijn nog geen bedrijfsinstellingen geconfigureerd. Vul onderstaande gegevens in om te starten.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Basis
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Financieel
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bedrijfsgegevens</CardTitle>
                <CardDescription>Algemene bedrijfsinformatie en contactgegevens</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Bedrijfsnaam *</Label>
                    <Input
                      id="company_name"
                      name="company_name"
                      defaultValue={settings?.company_name || ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal_name">Juridische naam</Label>
                    <Input
                      id="legal_name"
                      name="legal_name"
                      defaultValue={settings?.legal_name || ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kvk_number">KVK-nummer</Label>
                    <Input
                      id="kvk_number"
                      name="kvk_number"
                      defaultValue={settings?.kvk_number || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="btw_number">BTW-nummer</Label>
                    <Input
                      id="btw_number"
                      name="btw_number"
                      defaultValue={settings?.btw_number || ""}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address_street">Straat + huisnummer</Label>
                    <Input
                      id="address_street"
                      name="address_street"
                      defaultValue={settings?.address_street || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_postal_code">Postcode</Label>
                    <Input
                      id="address_postal_code"
                      name="address_postal_code"
                      defaultValue={settings?.address_postal_code || ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_city">Plaats</Label>
                    <Input
                      id="address_city"
                      name="address_city"
                      defaultValue={settings?.address_city || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address_country">Land</Label>
                    <Input
                      id="address_country"
                      name="address_country"
                      defaultValue={settings?.address_country || "NL"}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefoon</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={settings?.phone || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={settings?.email || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      defaultValue={settings?.website || ""}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Financiële instellingen</CardTitle>
                <CardDescription>Bankgegevens en fiscale configuratie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_iban">IBAN-nummer</Label>
                    <Input
                      id="bank_account_iban"
                      name="bank_account_iban"
                      defaultValue={settings?.bank_account_iban || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Banknaam</Label>
                    <Input
                      id="bank_name"
                      name="bank_name"
                      defaultValue={settings?.bank_name || ""}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fiscal_year_start_month">Fiscaal jaar start maand</Label>
                    <Input
                      id="fiscal_year_start_month"
                      name="fiscal_year_start_month"
                      type="number"
                      min="1"
                      max="12"
                      defaultValue={settings?.fiscal_year_start_month || 1}
                    />
                    <p className="text-xs text-muted-foreground">1 = januari, 12 = december</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_currency">Valuta</Label>
                    <Input
                      id="default_currency"
                      name="default_currency"
                      defaultValue={settings?.default_currency || "EUR"}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Loonkosten & Werkgeverslasten</CardTitle>
                <CardDescription>Configureer percentages voor kostenberekeningen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Deze percentages worden gebruikt voor automatische kostenberekeningen in planning en rapportages.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employer_social_charges_pct">Werkgeverslasten %</Label>
                    <Input
                      id="employer_social_charges_pct"
                      name="employer_social_charges_pct"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.employer_social_charges_pct || 20.00}
                    />
                    <p className="text-xs text-muted-foreground">Gemiddeld 20% (incl. sociale premies)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pension_employer_contribution_pct">Pensioen werkgever %</Label>
                    <Input
                      id="pension_employer_contribution_pct"
                      name="pension_employer_contribution_pct"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.pension_employer_contribution_pct || 5.00}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pension_employee_contribution_pct">Pensioen werknemer %</Label>
                    <Input
                      id="pension_employee_contribution_pct"
                      name="pension_employee_contribution_pct"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.pension_employee_contribution_pct || 3.00}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday_allowance_pct">Vakantiegeld %</Label>
                    <Input
                      id="holiday_allowance_pct"
                      name="holiday_allowance_pct"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.holiday_allowance_pct || 8.00}
                    />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="overtime_threshold_hours_per_week">Overuren vanaf (uur/week)</Label>
                    <Input
                      id="overtime_threshold_hours_per_week"
                      name="overtime_threshold_hours_per_week"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.overtime_threshold_hours_per_week || 40.00}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overtime_rate_multiplier">Overuren tarief</Label>
                    <Input
                      id="overtime_rate_multiplier"
                      name="overtime_rate_multiplier"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.overtime_rate_multiplier || 1.50}
                    />
                    <p className="text-xs text-muted-foreground">1.50 = 150% van normaal tarief</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="payroll_frequency">Salaris frequentie</Label>
                    <select
                      id="payroll_frequency"
                      name="payroll_frequency"
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      defaultValue={settings?.payroll_frequency || "monthly"}
                    >
                      <option value="weekly">Wekelijks</option>
                      <option value="biweekly">Tweewekelijks</option>
                      <option value="four_weekly">Vierwekelijks</option>
                      <option value="monthly">Maandelijks</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payroll_day_of_month">Betaaldag</Label>
                    <Input
                      id="payroll_day_of_month"
                      name="payroll_day_of_month"
                      type="number"
                      min="1"
                      max="31"
                      defaultValue={settings?.payroll_day_of_month || 25}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday_allowance_payment_month">Vakantiegeld maand</Label>
                    <Input
                      id="holiday_allowance_payment_month"
                      name="holiday_allowance_payment_month"
                      type="number"
                      min="1"
                      max="12"
                      defaultValue={settings?.holiday_allowance_payment_month || 5}
                    />
                    <p className="text-xs text-muted-foreground">5 = mei</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CAO Tab */}
          <TabsContent value="cao" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>CAO Informatie</CardTitle>
                <CardDescription>Collectieve Arbeidsovereenkomst instellingen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cao_name">CAO Naam</Label>
                    <Input
                      id="cao_name"
                      name="cao_name"
                      defaultValue={settings?.cao_name || ""}
                      placeholder="Bijv. CAO Ziekenhuizen"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cao_code">CAO Code</Label>
                    <Input
                      id="cao_code"
                      name="cao_code"
                      defaultValue={settings?.cao_code || ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cao_valid_from">Geldig vanaf</Label>
                    <Input
                      id="cao_valid_from"
                      name="cao_valid_from"
                      type="date"
                      defaultValue={settings?.cao_valid_from || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cao_valid_until">Geldig tot</Label>
                    <Input
                      id="cao_valid_until"
                      name="cao_valid_until"
                      type="date"
                      defaultValue={settings?.cao_valid_until || ""}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Standaard Beleid</CardTitle>
                <CardDescription>Standaard waarden voor contracten en arbeidsvoorwaarden</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_fulltime_hours_per_week">Fulltime uren/week</Label>
                    <Input
                      id="default_fulltime_hours_per_week"
                      name="default_fulltime_hours_per_week"
                      type="number"
                      step="0.01"
                      defaultValue={settings?.default_fulltime_hours_per_week || 40.00}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="probation_period_months">Proeftijd (maanden)</Label>
                    <Input
                      id="probation_period_months"
                      name="probation_period_months"
                      type="number"
                      defaultValue={settings?.probation_period_months || 2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notice_period_weeks">Opzegtermijn (weken)</Label>
                    <Input
                      id="notice_period_weeks"
                      name="notice_period_weeks"
                      type="number"
                      defaultValue={settings?.notice_period_weeks || 4}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="submit" disabled={saveMutation.isPending} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
