import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Loader2, CheckCircle2, Sparkles, Eye, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateProbleemanalyse,
  generatePlanVanAanpak,
  generateEvaluatie,
  generateHerstelmelding,
  generateUWVMelding,
  uploadGeneratedDocument,
} from '@/lib/documentTemplates';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  getRelevantDocumentTypes,
} from '@/types/verzuimDocumentTypes';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface GenerateTemplateDocumentProps {
  caseData: any;
  company: { naam: string; adres?: string };
  userId: string;
  onGenerated?: () => void;
}

type SuggestionType = 'probleemanalyse' | 'doelstellingen' | 'acties' | 'belemmeringen';

export function GenerateTemplateDocument({
  caseData,
  company,
  userId,
  onGenerated,
}: GenerateTemplateDocumentProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentType>('probleemanalyse');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  
  // Dynamic form fields
  const [probleemanalyse, setProbleemanalyse] = useState('');
  const [belemmeringen, setBelemmeringen] = useState('');
  const [doelstellingen, setDoelstellingen] = useState('');
  const [acties, setActies] = useState('');
  
  // AI suggestion state
  const [loadingSuggestion, setLoadingSuggestion] = useState<SuggestionType | null>(null);
  
  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);

  // Get relevant document types based on case duration
  const relevantTypes = getRelevantDocumentTypes(caseData.start_date);

  useEffect(() => {
    // Initialize form with case data
    if (caseData.functional_limitations) {
      setProbleemanalyse(caseData.functional_limitations);
    }
  }, [caseData]);

  const getAISuggestion = async (type: SuggestionType) => {
    setLoadingSuggestion(type);
    try {
      const employeeName = caseData.employee
        ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
        : 'Medewerker';

      const context = {
        documentType: selectedTemplate,
        employeeName,
        startDate: format(new Date(caseData.start_date), 'dd MMMM yyyy', { locale: nl }),
        functionalLimitations: caseData.functional_limitations || 'Niet opgegeven',
        canWorkPartial: caseData.can_work_partial || false,
        partialWorkDescription: caseData.partial_work_description,
        expectedDuration: caseData.expected_duration,
      };

      const { data, error } = await supabase.functions.invoke('document-ai-suggestions', {
        body: { context, suggestionType: type },
      });

      if (error) throw error;

      const suggestion = data.suggestion;

      switch (type) {
        case 'probleemanalyse':
          setProbleemanalyse(suggestion);
          break;
        case 'belemmeringen':
          setBelemmeringen(suggestion);
          break;
        case 'doelstellingen':
          setDoelstellingen(suggestion);
          break;
        case 'acties':
          setActies(suggestion);
          break;
      }

      toast.success('AI suggestie gegenereerd');
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('Fout bij genereren AI suggestie');
    } finally {
      setLoadingSuggestion(null);
    }
  };

  const generatePreview = async () => {
    setGenerating(true);
    try {
      let pdfBlob: Blob;
      const formData = {
        probleemanalyse,
        belemmeringen,
        doelstellingen,
        acties,
      };

      switch (selectedTemplate) {
        case 'probleemanalyse':
          pdfBlob = await generateProbleemanalyse(caseData, company, formData);
          break;
        case 'plan_van_aanpak':
          pdfBlob = await generatePlanVanAanpak(caseData, company, formData);
          break;
        case 'evaluatie_3_maanden':
        case 'evaluatie_6_maanden':
        case 'evaluatie_1_jaar':
          pdfBlob = await generateEvaluatie(caseData, company, selectedTemplate, formData);
          break;
        case 'herstelmelding':
          pdfBlob = await generateHerstelmelding(caseData, company);
          break;
        case 'uwv_melding':
          pdfBlob = await generateUWVMelding(caseData, company);
          break;
        default:
          throw new Error('Onbekend template type');
      }

      setPreviewBlob(pdfBlob);
      const url = URL.createObjectURL(pdfBlob);
      setPreviewUrl(url);
      setActiveTab('preview');
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Fout bij genereren preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (previewBlob) {
      const url = URL.createObjectURL(previewBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${DOCUMENT_TYPE_LABELS[selectedTemplate]}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Document gedownload');
    }
  };

  const handleUpload = async () => {
    if (!previewBlob) {
      toast.error('Genereer eerst een preview');
      return;
    }

    setGenerating(true);
    try {
      await uploadGeneratedDocument(
        caseData.id,
        caseData.employee_id,
        selectedTemplate,
        previewBlob,
        userId,
        caseData.start_date
      );

      setGenerated(true);
      toast.success('Document succesvol geüpload');

      setTimeout(() => {
        setOpen(false);
        resetForm();
        onGenerated?.();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Fout bij uploaden document');
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setGenerated(false);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setActiveTab('edit');
    setProbleemanalyse(caseData.functional_limitations || '');
    setBelemmeringen('');
    setDoelstellingen('');
    setActies('');
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const renderFormFields = () => {
    switch (selectedTemplate) {
      case 'probleemanalyse':
        return (
          <>
            <FormField
              label="Probleemanalyse / Verzuimoorzaak"
              value={probleemanalyse}
              onChange={setProbleemanalyse}
              onAISuggest={() => getAISuggestion('probleemanalyse')}
              loading={loadingSuggestion === 'probleemanalyse'}
              placeholder="Beschrijf de functionele beperkingen en verzuimoorzaak..."
            />
            <FormField
              label="Belemmeringen voor werkhervatting"
              value={belemmeringen}
              onChange={setBelemmeringen}
              onAISuggest={() => getAISuggestion('belemmeringen')}
              loading={loadingSuggestion === 'belemmeringen'}
              placeholder="Welke belemmeringen zijn er voor werkhervatting..."
            />
          </>
        );
      case 'plan_van_aanpak':
        return (
          <>
            <FormField
              label="Probleemstelling"
              value={probleemanalyse}
              onChange={setProbleemanalyse}
              onAISuggest={() => getAISuggestion('probleemanalyse')}
              loading={loadingSuggestion === 'probleemanalyse'}
              placeholder="Samenvatting van de verzuimsituatie..."
            />
            <FormField
              label="Concrete doelstellingen"
              value={doelstellingen}
              onChange={setDoelstellingen}
              onAISuggest={() => getAISuggestion('doelstellingen')}
              loading={loadingSuggestion === 'doelstellingen'}
              placeholder="SMART doelstellingen voor re-integratie..."
            />
            <FormField
              label="Afgesproken acties"
              value={acties}
              onChange={setActies}
              onAISuggest={() => getAISuggestion('acties')}
              loading={loadingSuggestion === 'acties'}
              placeholder="Concrete acties en afspraken..."
            />
          </>
        );
      case 'evaluatie_3_maanden':
      case 'evaluatie_6_maanden':
      case 'evaluatie_1_jaar':
        return (
          <>
            <FormField
              label="Voortgang sinds laatste evaluatie"
              value={probleemanalyse}
              onChange={setProbleemanalyse}
              placeholder="Beschrijf de voortgang van de re-integratie..."
            />
            <FormField
              label="Huidige situatie en belemmeringen"
              value={belemmeringen}
              onChange={setBelemmeringen}
              onAISuggest={() => getAISuggestion('belemmeringen')}
              loading={loadingSuggestion === 'belemmeringen'}
              placeholder="Huidige situatie en eventuele belemmeringen..."
            />
            <FormField
              label="Bijgestelde doelstellingen"
              value={doelstellingen}
              onChange={setDoelstellingen}
              onAISuggest={() => getAISuggestion('doelstellingen')}
              loading={loadingSuggestion === 'doelstellingen'}
              placeholder="Aangepaste doelstellingen indien nodig..."
            />
          </>
        );
      default:
        return (
          <div className="text-center py-8 text-muted-foreground">
            Dit document type heeft geen aanpasbare velden
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Genereer Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Genereer Wet Poortwachter Document</DialogTitle>
          <DialogDescription>
            Genereer automatisch een document met AI-ondersteuning
          </DialogDescription>
        </DialogHeader>

        {generated ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-600" />
            <div className="text-center">
              <p className="text-lg font-semibold">Document Gegenereerd!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Het document is geüpload en uitnodigingen zijn verzonden
              </p>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="edit">Bewerken</TabsTrigger>
              <TabsTrigger value="preview" disabled={!previewUrl}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 overflow-y-auto space-y-4 mt-4">
              <div className="space-y-3">
                <Label htmlFor="template">Document Type</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={(value) => setSelectedTemplate(value as DocumentType)}
                >
                  <SelectTrigger id="template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {relevantTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {DOCUMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {DOCUMENT_TYPE_DESCRIPTIONS[selectedTemplate]}
                </p>
              </div>

              <div className="bg-muted/50 border border-border p-4 rounded-lg space-y-2">
                <p className="font-semibold text-sm">Document gegevens:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Bedrijf: {company.naam}</li>
                  <li>
                    • Medewerker:{' '}
                    {caseData.employee
                      ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
                      : 'Onbekend'}
                  </li>
                  <li>• Eerste ziektedag: {format(new Date(caseData.start_date), 'dd MMMM yyyy', { locale: nl })}</li>
                </ul>
              </div>

              {renderFormFields()}

              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t flex-shrink-0">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
                  Annuleren
                </Button>
                <Button onClick={generatePreview} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Genereren...
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 flex flex-col overflow-hidden mt-4">
              {previewUrl && (
                <>
                  <div className="flex-1 border rounded-lg overflow-hidden bg-muted min-h-[300px]">
                    <iframe
                      src={previewUrl}
                      className="w-full h-full"
                      title="PDF Preview"
                    />
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t flex-shrink-0 mt-4">
                    <Button variant="outline" onClick={() => setActiveTab('edit')}>
                      Terug naar bewerken
                    </Button>
                    <Button variant="outline" onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button onClick={handleUpload} disabled={generating}>
                      {generating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploaden...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload & Verstuur
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Form field component with AI suggestion button
function FormField({
  label,
  value,
  onChange,
  onAISuggest,
  loading,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onAISuggest?: () => void;
  loading?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {onAISuggest && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onAISuggest}
            disabled={loading}
            className="h-8 text-xs"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3 mr-1" />
            )}
            AI Suggestie
          </Button>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="resize-none"
      />
    </div>
  );
}