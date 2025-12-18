import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

interface OfferLetterGeneratorProps {
  employeeId?: string;
  contractId?: string;
}

export function OfferLetterGenerator({ employeeId, contractId }: OfferLetterGeneratorProps) {
  const { toast } = useToast();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["offer-letter-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("offer_letter_templates")
        .select("*")
        .eq("is_active", true)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch employees
  const { data: employees } = useQuery({
    queryKey: ["employees-for-offer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "medewerker")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !employeeId,
  });

  // Fetch contracts for selected employee
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(employeeId || "");
  const { data: contracts } = useQuery({
    queryKey: ["employee-contracts", selectedEmployeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_contracts")
        .select("*")
        .eq("employee_id", selectedEmployeeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmployeeId,
  });

  const [selectedContractId, setSelectedContractId] = useState(contractId || "");

  // Generate offer letter mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEmployeeId || !selectedContractId) {
        throw new Error("Selecteer een medewerker en contract");
      }

      const { data, error } = await supabase.rpc("generate_offer_letter", {
        p_employee_id: selectedEmployeeId,
        p_contract_id: selectedContractId,
        p_template_id: selectedTemplateId || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setGeneratedContent(data);
      setShowPreview(true);
      toast({
        title: "Aanbiedingsbrief gegenereerd",
        description: "De brief is klaar voor preview",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout bij genereren",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aanbiedingsbrief-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Gedownload",
      description: "Aanbiedingsbrief is gedownload als Markdown",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aanbiedingsbrief Generator
          </CardTitle>
          <CardDescription>
            Genereer professionele aanbiedingsbrieven met alle salary details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Employee Selection */}
          {!employeeId && (
            <div className="space-y-2">
              <Label>Medewerker</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer medewerker" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.filter(e => e.id && e.id.trim() !== '').map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Contract Selection */}
          {selectedEmployeeId && (
            <div className="space-y-2">
              <Label>Contract</Label>
              <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecteer contract" />
                </SelectTrigger>
                <SelectContent>
                  {contracts?.filter(c => c.id && c.id.trim() !== '').map((contract) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.job_title} - {contract.contract_type} (
                      {new Date(contract.start_date).toLocaleDateString("nl-NL")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Standaard template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Standaard template</SelectItem>
                {templates?.filter(t => t.id && t.id.trim() !== '').map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                    {template.is_default && " (Standaard)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={!selectedEmployeeId || !selectedContractId || generateMutation.isPending}
              className="flex-1"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Genereren...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Genereer Aanbiedingsbrief
                </>
              )}
            </Button>
            {generatedContent && (
              <>
                <Button variant="outline" onClick={() => setShowPreview(true)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {/* Generated Content Preview (inline) */}
          {generatedContent && !showPreview && (
            <div className="mt-4">
              <Label>Gegenereerde brief (preview)</Label>
              <Textarea
                value={generatedContent}
                readOnly
                className="mt-2 min-h-[200px] font-mono text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Preview Aanbiedingsbrief</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>
              Bekijk de aanbiedingsbrief voordat u deze verzendt
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none p-6 bg-white dark:bg-gray-950 rounded-lg border">
            <ReactMarkdown>{generatedContent}</ReactMarkdown>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
