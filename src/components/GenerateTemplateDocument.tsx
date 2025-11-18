import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  generateReintegratiePlan,
  generatePlanVanAanpak,
  generateProbleemanalyse,
  uploadGeneratedDocument,
} from '@/lib/documentTemplates';
import { DocumentType, DOCUMENT_TYPE_LABELS } from '@/types/verzuimDocumentTypes';

interface GenerateTemplateDocumentProps {
  caseData: any; // SickLeaveCase type
  company: { naam: string; adres?: string };
  userId: string;
  onGenerated?: () => void;
}

type TemplateType = 'reintegratie_plan' | 'plan_van_aanpak' | 'probleemanalyse';

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  {
    value: 'probleemanalyse',
    label: 'Probleemanalyse',
    description: 'Verplicht binnen 6 weken - Analyse van verzuimoorzaak en belemmeringen',
  },
  {
    value: 'reintegratie_plan',
    label: 'Re-integratieplan',
    description: 'Binnen 6 weken - Plan voor werkhervatting en begeleiding',
  },
  {
    value: 'plan_van_aanpak',
    label: 'Plan van Aanpak',
    description: 'Week 6-8 - Concrete stappen en doelstellingen voor re-integratie',
  },
];

export function GenerateTemplateDocument({
  caseData,
  company,
  userId,
  onGenerated,
}: GenerateTemplateDocumentProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('probleemanalyse');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      let pdfBlob: Blob;

      // Genereer PDF op basis van geselecteerde template
      switch (selectedTemplate) {
        case 'reintegratie_plan':
          pdfBlob = await generateReintegratiePlan(caseData, company);
          break;
        case 'plan_van_aanpak':
          pdfBlob = await generatePlanVanAanpak(caseData, company);
          break;
        case 'probleemanalyse':
          pdfBlob = await generateProbleemanalyse(caseData, company);
          break;
        default:
          throw new Error('Onbekend template type');
      }

      // Upload document en maak invitation
      await uploadGeneratedDocument(
        caseData.id,
        caseData.employee_id,
        selectedTemplate as DocumentType,
        pdfBlob,
        userId,
        caseData.start_date
      );

      setGenerated(true);
      toast.success('Document succesvol gegenereerd en verzonden');

      setTimeout(() => {
        setOpen(false);
        setGenerated(false);
        onGenerated?.();
      }, 2000);
    } catch (error) {
      console.error('Generate error:', error);
      toast.error('Fout bij genereren document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Genereer Document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Genereer Wet Poortwachter Document</DialogTitle>
          <DialogDescription>
            Genereer automatisch een document op basis van de verzuimgegevens
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
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label htmlFor="template">Selecteer Document Type</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(value) => setSelectedTemplate(value as TemplateType)}
              >
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-sm text-blue-900">
                {TEMPLATE_OPTIONS.find((t) => t.value === selectedTemplate)?.label}
              </p>
              <p className="text-sm text-blue-800">
                {TEMPLATE_OPTIONS.find((t) => t.value === selectedTemplate)?.description}
              </p>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-2">Dit document bevat:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Bedrijfsgegevens: {company.naam}</li>
                <li>
                  • Werknemergegevens:{' '}
                  {caseData.employee
                    ? `${caseData.employee.voornaam} ${caseData.employee.achternaam}`
                    : 'Onbekend'}
                </li>
                <li>• Verzuiminformatie en functionele beperkingen</li>
                <li>• Handtekening velden voor werkgever en werknemer</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Let op:</strong> Na het genereren wordt het document automatisch
                geüpload en ontvangt de medewerker een email om het te ondertekenen.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={generating}
              >
                Annuleren
              </Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Genereer Document
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
