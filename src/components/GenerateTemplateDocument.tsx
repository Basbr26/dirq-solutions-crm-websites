import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Loader2, CheckCircle2, Eye, Download, Upload, CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateProbleemanalyse,
  generatePlanVanAanpak,
  generateEvaluatie,
  generateHerstelmelding,
  generateUWVMelding,
  generateGespreksverslag,
  uploadGeneratedDocument,
} from '@/lib/documentTemplates';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  getRelevantDocumentTypes,
} from '@/types/verzuimDocumentTypes';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface GenerateTemplateDocumentProps {
  caseData: any;
  company: { naam: string; adres?: string };
  userId: string;
  onGenerated?: () => void;
}

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
  
  // Gespreksverslag specific fields
  const [aanwezigen, setAanwezigen] = useState('');
  const [gespreksonderwerp, setGespreksonderwerp] = useState('');
  const [afspraken, setAfspraken] = useState('');
  const [gespreksdatum, setGespreksdatum] = useState<Date>(new Date());
  
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
        case 'gespreksverslag':
          pdfBlob = await generateGespreksverslag(caseData, company, {
            probleemanalyse,
            aanwezigen,
            gespreksonderwerp,
            afspraken,
            acties,
            gespreksdatum,
          });
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
    setAanwezigen('');
    setGespreksonderwerp('');
    setAfspraken('');
    setGespreksdatum(new Date());
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
              placeholder="Beschrijf de functionele beperkingen en verzuimoorzaak..."
            />
            <FormField
              label="Belemmeringen voor werkhervatting"
              value={belemmeringen}
              onChange={setBelemmeringen}
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
              placeholder="Samenvatting van de verzuimsituatie..."
            />
            <FormField
              label="Concrete doelstellingen"
              value={doelstellingen}
              onChange={setDoelstellingen}
              placeholder="SMART doelstellingen voor re-integratie..."
            />
            <FormField
              label="Afgesproken acties"
              value={acties}
              onChange={setActies}
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
              placeholder="Huidige situatie en eventuele belemmeringen..."
            />
            <FormField
              label="Bijgestelde doelstellingen"
              value={doelstellingen}
              onChange={setDoelstellingen}
              placeholder="Aangepaste doelstellingen indien nodig..."
            />
          </>
        );
      case 'gespreksverslag':
        return (
          <>
            <div className="space-y-2">
              <Label>Datum van het gesprek</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !gespreksdatum && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {gespreksdatum ? format(gespreksdatum, "d MMMM yyyy", { locale: nl }) : <span>Selecteer datum</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={gespreksdatum}
                    onSelect={(date) => date && setGespreksdatum(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <FormField
              label="Aanwezigen bij het gesprek"
              value={aanwezigen}
              onChange={setAanwezigen}
              placeholder="Bijv: Werknemer, Leidinggevende, HR-adviseur..."
            />
            <FormField
              label="Onderwerp van het gesprek"
              value={gespreksonderwerp}
              onChange={setGespreksonderwerp}
              placeholder="Waar ging het gesprek over..."
            />
            <FormField
              label="Besproken punten"
              value={probleemanalyse}
              onChange={setProbleemanalyse}
              placeholder="Welke onderwerpen zijn besproken..."
            />
            <FormField
              label="Gemaakte afspraken"
              value={afspraken}
              onChange={setAfspraken}
              placeholder="Welke concrete afspraken zijn gemaakt..."
            />
            <FormField
              label="Vervolgafspraken en actiepunten"
              value={acties}
              onChange={setActies}
              placeholder="Volgende contactmoment, wie doet wat..."
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
            Genereer automatisch een document op basis van de case gegevens
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

// Form field component
function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[100px]"
      />
    </div>
  );
}