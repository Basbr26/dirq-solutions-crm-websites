import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  DocumentType,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_DESCRIPTIONS,
  DOCUMENT_CATEGORIES,
} from '@/types/verzuimDocumentTypes';
import {
  generateArbeidsovereenkomst,
  generateNDA,
  generateOnboardingChecklist,
  generateBewijsVanIndiensttreding,
} from '@/lib/documents/hrTemplates';
import {
  generateProbleemanalyse,
  generatePlanVanAanpak,
  generateEvaluatie,
  generateHerstelmelding,
} from '@/lib/documentTemplates';

interface UniversalDocumentGeneratorProps {
  employeeId: string;
  caseId?: string;
  onGenerated?: () => void;
  defaultType?: DocumentType;
}

interface Employee {
  id: string;
  voornaam: string;
  achternaam: string;
  email: string;
  telefoon?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  date_of_birth?: string;
  employee_number?: string;
  functie?: string;
  start_date?: string;
  contract_type?: string;
  hours_per_week?: number;
  department?: {
    name: string;
  };
}

const company = {
  naam: 'Dirq Solutions',
  adres: '[Bedrijfsadres]',
  postcode: '[Postcode]',
  plaats: '[Plaats]',
  kvk: '[KvK nummer]',
  email: 'info@dirq.nl',
};

export function UniversalDocumentGenerator({
  employeeId,
  caseId,
  onGenerated,
  defaultType,
}: UniversalDocumentGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [documentType, setDocumentType] = useState<DocumentType>(defaultType || 'arbeidsovereenkomst');
  
  // Form fields for HR documents
  const [salaris, setSalaris] = useState('');
  const [vakantiedagen, setVakantiedagen] = useState('25');
  const [proeftijd, setProeftijd] = useState('2');
  const [bijzondereBepalingen, setBijzondereBepalingen] = useState('');
  
  // Form fields for verzuim documents
  const [probleemanalyse, setProbleemanalyse] = useState('');
  const [belemmeringen, setBelemmeringen] = useState('');
  const [doelstellingen, setDoelstellingen] = useState('');
  const [acties, setActies] = useState('');

  const isHRDocument = DOCUMENT_CATEGORIES.hr.includes(documentType);
  const isVerzuimDocument = DOCUMENT_CATEGORIES.verzuim.includes(documentType);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Fetch employee data
      const { data: employee, error: employeeError } = await supabase
        .from('profiles')
        .select('*, department:departments!profiles_department_id_fkey(name)')
        .eq('id', employeeId)
        .single();

      if (employeeError) throw employeeError;
      if (!employee) throw new Error('Medewerker niet gevonden');

      // 2. Generate PDF based on type
      let pdfBlob: Blob;

      if (isHRDocument) {
        switch (documentType) {
          case 'arbeidsovereenkomst':
            pdfBlob = await generateArbeidsovereenkomst(employee as Employee, company, {
              salaris: salaris ? parseFloat(salaris) : undefined,
              vakantiedagen: parseInt(vakantiedagen),
              proeftijd: parseInt(proeftijd),
              bijzondereBepalingen: bijzondereBepalingen || undefined,
            });
            break;
          case 'nda':
            pdfBlob = await generateNDA(employee as Employee, company);
            break;
          case 'onboarding_checklist':
            pdfBlob = await generateOnboardingChecklist(employee as Employee, company);
            break;
          case 'bewijs_van_indiensttreding':
            pdfBlob = await generateBewijsVanIndiensttreding(employee as Employee, company);
            break;
          default:
            throw new Error('Document type not implemented');
        }
      } else if (isVerzuimDocument && caseId) {
        // Fetch case data for verzuim documents
        const { data: caseData, error: caseError } = await supabase
          .from('sick_leave_cases')
          .select('*')
          .eq('id', caseId)
          .single();

        if (caseError) throw caseError;

        const caseWithEmployee = {
          ...caseData,
          employee: {
            voornaam: employee.voornaam,
            achternaam: employee.achternaam,
            email: employee.email,
          },
        };

        switch (documentType) {
          case 'probleemanalyse':
            pdfBlob = await generateProbleemanalyse(caseWithEmployee, company, {
              probleemanalyse,
              belemmeringen,
            });
            break;
          case 'plan_van_aanpak':
            pdfBlob = await generatePlanVanAanpak(caseWithEmployee, company, {
              doelstellingen,
              acties,
            });
            break;
          case 'evaluatie_3_maanden':
          case 'evaluatie_6_maanden':
          case 'evaluatie_1_jaar':
            pdfBlob = await generateEvaluatie(caseWithEmployee, company, documentType);
            break;
          case 'herstelmelding':
            pdfBlob = await generateHerstelmelding(caseWithEmployee, company);
            break;
          default:
            throw new Error('Verzuim document type not implemented');
        }
      } else {
        throw new Error('Invalid document configuration');
      }

      // 3. Upload to Supabase Storage
      const fileName = `${documentType}_${employee.voornaam}_${employee.achternaam}_${Date.now()}.pdf`;
      const filePath = `${employeeId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBlob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 4. Create document record
      const { error: docError } = await supabase
        .from('documents')
        .insert({
          employee_id: employeeId,
          case_id: caseId || null,
          document_type: documentType,
          title: DOCUMENT_TYPE_LABELS[documentType],
          file_path: filePath,
          file_name: fileName,
          file_url: filePath, // For backwards compatibility
          uploaded_by: (await supabase.auth.getUser()).data.user?.id,
          status: 'completed',
        });

      if (docError) throw docError;

      toast.success('Document succesvol gegenereerd en opgeslagen');
      setOpen(false);
      onGenerated?.();
    } catch (error) {
      console.error('Error generating document:', error);
      toast.error(error instanceof Error ? error.message : 'Fout bij genereren document');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Genereer document
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-2xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Document genereren</DialogTitle>
            <DialogDescription>
              Kies het type document en vul de benodigde gegevens in
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label>Document type</Label>
              <Select value={documentType} onValueChange={(value) => setDocumentType(value as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">HR Documenten</div>
                  {DOCUMENT_CATEGORIES.hr.map((type) => (
                    <SelectItem key={type} value={type}>
                      {DOCUMENT_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                  {caseId && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Verzuim Documenten</div>
                      {DOCUMENT_CATEGORIES.verzuim.map((type) => (
                        <SelectItem key={type} value={type}>
                          {DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {DOCUMENT_TYPE_DESCRIPTIONS[documentType]}
              </p>
            </div>

            {/* Conditional form fields based on document type */}
            {documentType === 'arbeidsovereenkomst' && (
              <>
                <div className="space-y-2">
                  <Label>Bruto maandsalaris (optioneel)</Label>
                  <Input
                    type="number"
                    placeholder="bijv. 3500"
                    value={salaris}
                    onChange={(e) => setSalaris(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vakantiedagen per jaar</Label>
                  <Input
                    type="number"
                    value={vakantiedagen}
                    onChange={(e) => setVakantiedagen(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Proeftijd (maanden)</Label>
                  <Input
                    type="number"
                    value={proeftijd}
                    onChange={(e) => setProeftijd(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bijzondere bepalingen (optioneel)</Label>
                  <Textarea
                    placeholder="Extra afspraken of clausules..."
                    value={bijzondereBepalingen}
                    onChange={(e) => setBijzondereBepalingen(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}

            {documentType === 'probleemanalyse' && (
              <>
                <div className="space-y-2">
                  <Label>Probleemanalyse</Label>
                  <Textarea
                    placeholder="Beschrijf de oorzaak van het verzuim..."
                    value={probleemanalyse}
                    onChange={(e) => setProbleemanalyse(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Belemmeringen</Label>
                  <Textarea
                    placeholder="Beschrijf belemmeringen voor werkhervatting..."
                    value={belemmeringen}
                    onChange={(e) => setBelemmeringen(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}

            {documentType === 'plan_van_aanpak' && (
              <>
                <div className="space-y-2">
                  <Label>Doelstellingen</Label>
                  <Textarea
                    placeholder="Wat zijn de doelen voor re-integratie..."
                    value={doelstellingen}
                    onChange={(e) => setDoelstellingen(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Acties</Label>
                  <Textarea
                    placeholder="Welke stappen worden ondernomen..."
                    value={acties}
                    onChange={(e) => setActies(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
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
                  Genereer PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
