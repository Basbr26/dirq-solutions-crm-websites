import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Plus, Edit, Trash2, Eye, DollarSign } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalaryCalculator } from "@/components/hr/SalaryCalculator";
import { OfferLetterGenerator } from "@/components/hr/OfferLetterGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function EmployeeContractsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"list" | "create" | "edit" | "view">("list");

  // Fetch all contracts
  const { data: contracts, isLoading } = useQuery({
    queryKey: ["employee-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_contracts")
        .select(`
          *,
          employee:profiles!employee_id(full_name, email, employee_number),
          job_level:job_levels(level_name),
          department:departments(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ["employees-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, employee_number")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch job levels
  const { data: jobLevels } = useQuery({
    queryKey: ["job-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_levels")
        .select("*")
        .eq("is_active", true)
        .order("level_number");
      if (error) throw error;
      return data;
    },
  });

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

  // Create/Update contract mutation
  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (selectedContract?.id) {
        const { error } = await supabase
          .from("employee_contracts")
          .update(values)
          .eq("id", selectedContract.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employee_contracts")
          .insert(values);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-contracts"] });
      toast({
        title: "Contract opgeslagen",
        description: "Het arbeidscontract is succesvol opgeslagen",
      });
      setDialogOpen(false);
      setViewMode("list");
      setSelectedContract(null);
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij opslaan",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete contract mutation
  const deleteMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { error } = await supabase
        .from("employee_contracts")
        .delete()
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-contracts"] });
      toast({
        title: "Contract verwijderd",
        description: "Het contract is succesvol verwijderd",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij verwijderen",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values: any = {};
    
    // Convert form data
    formData.forEach((value, key) => {
      if (value === "") {
        values[key] = null;
      } else if (["fte", "hours_per_week", "base_salary_annual", "base_salary_monthly", "base_salary_hourly", "holiday_days_per_year"].includes(key)) {
        values[key] = parseFloat(value as string);
      } else {
        values[key] = value;
      }
    });

    saveMutation.mutate(values);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      draft: "secondary",
      pending_signature: "warning",
      active: "default",
      suspended: "destructive",
      terminated: "secondary",
      expired: "secondary",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getContractTypeBadge = (type: string) => {
    const labels: any = {
      permanent: "Vast",
      fixed_term: "Tijdelijk",
      temporary: "Uitzend",
      freelance: "ZZP",
      intern: "Stage",
      volunteer: "Vrijwilliger",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Arbeidscontracten
          </h1>
          <p className="text-muted-foreground mt-2">
            Beheer arbeidscontracten en compensatie
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setSelectedContract(null); setViewMode("create"); }}>
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Contract
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedContract ? "Contract Bewerken" : "Nieuw Contract"}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basis</TabsTrigger>
                  <TabsTrigger value="salary">Salaris</TabsTrigger>
                  <TabsTrigger value="terms">Voorwaarden</TabsTrigger>
                  <TabsTrigger value="calculator">Calculator</TabsTrigger>
                </TabsList>

                {/* Basic Info Tab */}
                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee_id">Medewerker *</Label>
                      <Select name="employee_id" defaultValue={selectedContract?.employee_id} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer medewerker" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees?.filter(emp => emp.id && emp.id.trim() !== '').map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name} ({emp.employee_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contract_type">Contract type *</Label>
                      <Select name="contract_type" defaultValue={selectedContract?.contract_type || "permanent"} required>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">Vast dienstverband</SelectItem>
                          <SelectItem value="fixed_term">Tijdelijk contract</SelectItem>
                          <SelectItem value="temporary">Uitzendkracht</SelectItem>
                          <SelectItem value="freelance">ZZP/Freelance</SelectItem>
                          <SelectItem value="intern">Stage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Startdatum *</Label>
                      <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        defaultValue={selectedContract?.start_date}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">Einddatum</Label>
                      <Input
                        id="end_date"
                        name="end_date"
                        type="date"
                        defaultValue={selectedContract?.end_date || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="probation_end_date">Einde proeftijd</Label>
                      <Input
                        id="probation_end_date"
                        name="probation_end_date"
                        type="date"
                        defaultValue={selectedContract?.probation_end_date || ""}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="job_title">Functietitel *</Label>
                      <Input
                        id="job_title"
                        name="job_title"
                        defaultValue={selectedContract?.job_title || ""}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="job_level_id">Functieniveau</Label>
                      <Select name="job_level_id" defaultValue={selectedContract?.job_level_id || undefined}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecteer niveau" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobLevels?.filter(level => level.id && level.id.trim() !== '').map((level) => (
                            <SelectItem key={level.id} value={level.id}>
                              {level.level_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department_id">Afdeling</Label>
                    <Select name="department_id" defaultValue={selectedContract?.department_id || undefined}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecteer afdeling" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.filter(dept => dept.id && dept.id.trim() !== '').map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* Salary Tab */}
                <TabsContent value="salary" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fte">FTE *</Label>
                      <Input
                        id="fte"
                        name="fte"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="1.0"
                        defaultValue={selectedContract?.fte || 1.0}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hours_per_week">Uren per week</Label>
                      <Input
                        id="hours_per_week"
                        name="hours_per_week"
                        type="number"
                        step="0.01"
                        defaultValue={selectedContract?.hours_per_week || 40}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="base_salary_annual">Jaarsalaris bruto</Label>
                      <Input
                        id="base_salary_annual"
                        name="base_salary_annual"
                        type="number"
                        step="0.01"
                        defaultValue={selectedContract?.base_salary_annual || ""}
                        placeholder="€ 42.000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="base_salary_monthly">Maandsalaris bruto</Label>
                      <Input
                        id="base_salary_monthly"
                        name="base_salary_monthly"
                        type="number"
                        step="0.01"
                        defaultValue={selectedContract?.base_salary_monthly || ""}
                        placeholder="€ 3.500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="base_salary_hourly">Uurloon bruto</Label>
                      <Input
                        id="base_salary_hourly"
                        name="base_salary_hourly"
                        type="number"
                        step="0.01"
                        defaultValue={selectedContract?.base_salary_hourly || ""}
                        placeholder="€ 25.00"
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Terms Tab */}
                <TabsContent value="terms" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="holiday_days_per_year">Vakantiedagen per jaar</Label>
                    <Input
                      id="holiday_days_per_year"
                      name="holiday_days_per_year"
                      type="number"
                      defaultValue={selectedContract?.holiday_days_per_year || 25}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue={selectedContract?.status || "draft"}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Concept</SelectItem>
                        <SelectItem value="pending_signature">Wacht op handtekening</SelectItem>
                        <SelectItem value="active">Actief</SelectItem>
                        <SelectItem value="suspended">Opgeschort</SelectItem>
                        <SelectItem value="terminated">Beëindigd</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Opmerkingen</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      defaultValue={selectedContract?.notes || ""}
                    />
                  </div>
                </TabsContent>

                {/* Calculator Tab */}
                <TabsContent value="calculator">
                  <SalaryCalculator
                    baseSalaryMonthly={selectedContract?.base_salary_monthly}
                    baseSalaryAnnual={selectedContract?.base_salary_annual}
                    fte={selectedContract?.fte}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Annuleren
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Alle Contracten</CardTitle>
          <CardDescription>{contracts?.length || 0} contracten in systeem</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medewerker</TableHead>
                <TableHead>Functie</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Startdatum</TableHead>
                <TableHead>FTE</TableHead>
                <TableHead>Salaris</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts?.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell className="font-medium">
                    {contract.employee?.full_name}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {contract.employee?.employee_number}
                    </span>
                  </TableCell>
                  <TableCell>
                    {contract.job_title}
                    {contract.job_level && (
                      <Badge variant="outline" className="ml-2">
                        {contract.job_level.level_name}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{getContractTypeBadge(contract.contract_type)}</TableCell>
                  <TableCell>
                    {new Date(contract.start_date).toLocaleDateString("nl-NL")}
                  </TableCell>
                  <TableCell>{contract.fte}</TableCell>
                  <TableCell>
                    {contract.base_salary_monthly && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        €{contract.base_salary_monthly.toFixed(0)}/mnd
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(contract.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedContract(contract);
                          setDialogOpen(true);
                          setViewMode("edit");
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(contract.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tools Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OfferLetterGenerator />
      </div>
    </div>
  );
}
