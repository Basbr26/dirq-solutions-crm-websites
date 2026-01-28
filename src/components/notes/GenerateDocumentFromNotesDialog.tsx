import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { HRNote } from '@/hooks/useEmployeeNotes';
import { formatNoteDate, getCategoryLabel } from '@/lib/notes/helpers';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface GenerateDocumentFromNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  notes: HRNote[];
  preSelectedNotes?: string[]; // Note IDs
}

type DocumentTemplate = 
  | 'performance_review'
  | 'feedback_report'
  | 'one_on_one_summary'
  | 'pip'
  | 'general_report';

const TEMPLATE_OPTIONS = [
  { value: 'performance_review', label: '📊 Performance Review', description: 'Uitgebreide beoordeling met prestaties en ontwikkelpunten' },
  { value: 'feedback_report', label: '💭 Feedback Rapport', description: 'Overzicht van gegeven feedback en actiepunten' },
  { value: 'one_on_one_summary', label: '💬 1-on-1 Samenvatting', description: 'Bundeling van 1-on-1 gesprekken en afspraken' },
  { value: 'pip', label: '⚠️ Performance Improvement Plan', description: 'Verbeterplan met doelen en deadlines' },
  { value: 'general_report', label: '📝 Algemeen Rapport', description: 'Vrij rapport met geselecteerde notities' },
] as const;

export function GenerateDocumentFromNotesDialog({
  open,
  onOpenChange,
  employeeId,
  notes,
  preSelectedNotes = [],
}: GenerateDocumentFromNotesDialogProps) {
  const [generating, setGenerating] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(preSelectedNotes);
  const [template, setTemplate] = useState<DocumentTemplate>('performance_review');
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [employee, setEmployee] = useState<{ voornaam: string; achternaam: string } | null>(null);

  useEffect(() => {
    if (preSelectedNotes.length > 0) {
      setSelectedNoteIds(preSelectedNotes);
    }
  }, [preSelectedNotes]);

  useEffect(() => {
    const loadEmployee = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('voornaam, achternaam')
        .eq('id', employeeId)
        .single();
      
      if (data) {
        setEmployee(data);
        // Auto-generate title based on template
        updateTitle(template, data);
      }
    };

    if (open && employeeId) {
      loadEmployee();
    }
  }, [open, employeeId, template]);

  const updateTitle = (selectedTemplate: DocumentTemplate, emp: { voornaam: string; achternaam: string } | null) => {
    const name = emp ? `${emp.voornaam} ${emp.achternaam}` : '';
    const titles = {
      performance_review: `Performance Review - ${name}`,
      feedback_report: `Feedback Rapport - ${name}`,
      one_on_one_summary: `1-on-1 Gesprekken Samenvatting - ${name}`,
      pip: `Performance Improvement Plan - ${name}`,
      general_report: `HR Rapport - ${name}`,
    };
    setTitle(titles[selectedTemplate]);
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev =>
      prev.includes(noteId)
        ? prev.filter(id => id !== noteId)
        : [...prev, noteId]
    );
  };

  const selectAll = () => {
    setSelectedNoteIds(notes.map(n => n.id));
  };

  const deselectAll = () => {
    setSelectedNoteIds([]);
  };

  const generateDocument = async () => {
    if (selectedNoteIds.length === 0) {
      toast.error('Selecteer minimaal 1 notitie');
      return;
    }

    setGenerating(true);

    try {
      const selectedNotes = notes.filter(n => selectedNoteIds.includes(n.id));
      
      // Generate document content based on template
      const content = generateDocumentContent(template, selectedNotes, employee, period, additionalNotes);

      // Save to documents table
      const { data: doc, error } = await supabase
        .from('documents')
        .insert({
          employee_id: employeeId,
          title: title,
          document_type: 'hr_rapport', // Custom type for note-based documents
          content: content,
          status: 'concept', // Bewerkbaar als concept
          metadata: {
            generated_from_notes: true,
            note_ids: selectedNoteIds,
            template: template,
            period: period,
          },
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Document gegenereerd! Je kunt het nu bewerken en finaliseren.');
      onOpenChange(false);
      
      // Reset form
      setSelectedNoteIds([]);
      setPeriod('');
      setAdditionalNotes('');
    } catch (error) {
      logger.error('Failed to generate document from notes', { employeeId, noteCount: selectedNoteIds.length, error });
      toast.error('Document genereren mislukt');
    } finally {
      setGenerating(false);
    }
  };

  const selectedNotes = notes.filter(n => selectedNoteIds.includes(n.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl h-[95vh] sm:h-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Genereer document uit notities</DialogTitle>
          <DialogDescription>
            Selecteer notities en kies een template. Het document wordt als bewerkbaar concept opgeslagen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template selectie */}
          <div className="space-y-2">
            <Label>Document Template</Label>
            <Select 
              value={template} 
              onValueChange={(value: DocumentTemplate) => {
                setTemplate(value);
                if (employee) updateTitle(value, employee);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex flex-col items-start">
                      <span>{opt.label}</span>
                      <span className="text-xs text-muted-foreground">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titel */}
          <div className="space-y-2">
            <Label>Document Titel</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Performance Review Q4 2025"
            />
          </div>

          {/* Periode */}
          <div className="space-y-2">
            <Label>Periode (optioneel)</Label>
            <Input
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              placeholder="Bijv. Q4 2025, of januari - december 2025"
            />
          </div>

          {/* Notities selectie */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Selecteer notities ({selectedNoteIds.length} van {notes.length})</Label>
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Alles selecteren
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Deselecteren
                </Button>
              </div>
            </div>

            <div className="border rounded-lg max-h-[300px] overflow-y-auto">
              {notes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Geen notities beschikbaar
                </div>
              ) : (
                <div className="divide-y">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer flex items-start gap-3"
                      onClick={() => toggleNoteSelection(note.id)}
                    >
                      <Checkbox
                        checked={selectedNoteIds.includes(note.id)}
                        onCheckedChange={() => toggleNoteSelection(note.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{note.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(note.category)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {note.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatNoteDate(note.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Extra opmerkingen */}
          <div className="space-y-2">
            <Label>Extra context (optioneel)</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Voeg eventuele extra context of opmerkingen toe die in het document moeten komen..."
              rows={4}
            />
          </div>

          {/* Preview */}
          {selectedNotes.length > 0 && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Geselecteerde notities:</h4>
              <div className="space-y-1">
                {selectedNotes.map((note) => (
                  <div key={note.id} className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryLabel(note.category)}
                    </Badge>
                    <span className="text-muted-foreground">{note.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={generating}>
            Annuleren
          </Button>
          <Button onClick={generateDocument} disabled={generating || selectedNoteIds.length === 0}>
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Genereren...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Genereer document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function generateDocumentContent(
  template: DocumentTemplate,
  notes: HRNote[],
  employee: { voornaam: string; achternaam: string } | null,
  period: string,
  additionalNotes: string
): string {
  const employeeName = employee ? `${employee.voornaam} ${employee.achternaam}` : '';
  const today = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

  // Group notes by category
  const notesByCategory = notes.reduce((acc, note) => {
    if (!acc[note.category]) acc[note.category] = [];
    acc[note.category].push(note);
    return acc;
  }, {} as Record<string, HRNote[]>);

  let content = '';

  switch (template) {
    case 'performance_review':
      content = `# Performance Review - ${employeeName}

**Datum:** ${today}
${period ? `**Periode:** ${period}` : ''}

---

## 1. Algemeen Overzicht

Dit performance review is opgesteld op basis van ${notes.length} geregistreerde observaties en gesprekken.

${additionalNotes ? `\n### Extra Context\n\n${additionalNotes}\n` : ''}

## 2. Prestaties en Achievements

${notesByCategory['performance']?.map((note, i) => `
### ${i + 1}. ${note.title}
*${formatNoteDate(note.created_at)}*

${note.content}
`).join('\n') || '_Geen performance notities beschikbaar_'}

${notesByCategory['achievement']?.length > 0 ? `
## 3. Behaalde Successen

${notesByCategory['achievement'].map((note, i) => `
### ${i + 1}. ${note.title}
*${formatNoteDate(note.created_at)}*

${note.content}
`).join('\n')}` : ''}

## 4. Feedback en Ontwikkelpunten

${notesByCategory['feedback']?.map((note, i) => `
### ${i + 1}. ${note.title}
*${formatNoteDate(note.created_at)}*

${note.content}
`).join('\n') || '_Geen feedback notities beschikbaar_'}

${notesByCategory['concern']?.length > 0 ? `
## 5. Aandachtspunten

${notesByCategory['concern'].map((note, i) => `
### ${i + 1}. ${note.title}
*${formatNoteDate(note.created_at)}*

${note.content}
`).join('\n')}` : ''}

## 6. Doelstellingen voor Volgende Periode

_Vul hier de doelstellingen in voor de komende periode_

## 7. Handtekeningen

**Medewerker:** _____________________  Datum: ___________

**Manager:** _____________________  Datum: ___________

**HR:** _____________________  Datum: ___________
`;
      break;

    case 'feedback_report':
      content = `# Feedback Rapport - ${employeeName}

**Datum:** ${today}
${period ? `**Periode:** ${period}` : ''}

---

## Samenvatting

Dit rapport bevat een overzicht van ${notes.length} feedback momenten.

${additionalNotes ? `\n### Context\n\n${additionalNotes}\n` : ''}

## Feedback Overzicht

${notes.map((note, i) => `
### ${i + 1}. ${note.title}
**Datum:** ${formatNoteDate(note.created_at)}  
**Categorie:** ${getCategoryLabel(note.category)}

${note.content}

${note.follow_up_required && !note.follow_up_completed ? `
**⚠️ Actie vereist:** ${note.follow_up_date ? `Deadline: ${note.follow_up_date}` : 'Geen deadline'}
` : ''}
${note.tags && note.tags.length > 0 ? `**Tags:** ${note.tags.map(t => `#${t}`).join(', ')}` : ''}

---
`).join('\n')}

## Actiepunten

${notes.filter(n => n.follow_up_required && !n.follow_up_completed).map((note, i) => `
${i + 1}. ${note.title} ${note.follow_up_date ? `(deadline: ${note.follow_up_date})` : ''}
`).join('\n') || '_Geen openstaande actiepunten_'}
`;
      break;

    case 'one_on_one_summary': {
      const oneOnOnes = notes.filter(n => n.category === '1-on-1');
      content = `# 1-on-1 Gesprekken Samenvatting - ${employeeName}

**Datum:** ${today}
${period ? `**Periode:** ${period}` : ''}

---

## Overzicht

Totaal aantal gesprekken: ${oneOnOnes.length}

${additionalNotes ? `\n### Context\n\n${additionalNotes}\n` : ''}

## Gesprekken Chronologisch

${oneOnOnes.map((note, i) => `
### Gesprek ${i + 1}: ${note.title}
**Datum:** ${formatNoteDate(note.created_at)}

${note.content}

${note.follow_up_required ? `
**Follow-up:** ${note.follow_up_completed ? '✅ Voltooid' : `⏳ ${note.follow_up_date ? `Deadline: ${note.follow_up_date}` : 'In behandeling'}`}
` : ''}

---
`).join('\n')}

## Terugkerende Thema's

_Vul hier terugkerende thema's en patronen in_

## Afspraken en Commitments

${notes.filter(n => n.follow_up_required).map((note, i) => `
${i + 1}. ${note.title} - ${note.follow_up_completed ? '✅ Voltooid' : '⏳ Open'}
`).join('\n') || '_Geen specifieke afspraken_'}
`;
      break;    }
    case 'pip': {
      const concerns = notesByCategory['concern'] || [];
      content = `# Performance Improvement Plan - ${employeeName}

**Datum:** ${today}
${period ? `**Periode:** ${period}` : ''}

---

## 1. Aanleiding

Dit Performance Improvement Plan (PIP) is opgesteld naar aanleiding van ${concerns.length} gesignaleerde aandachtspunten.

${additionalNotes ? `\n### Achtergrond\n\n${additionalNotes}\n` : ''}

## 2. Gesignaleerde Aandachtspunten

${concerns.map((note, i) => `
### ${i + 1}. ${note.title}
*Datum observatie: ${formatNoteDate(note.created_at)}*

${note.content}
`).join('\n') || '_Geen specifieke concerns gedocumenteerd_'}

## 3. Verwachte Verbeteringen

_Beschrijf hier duidelijk en meetbaar welke verbeteringen worden verwacht_

## 4. Actieplan

_Vul hier concrete acties in met deadlines_

| Actie | Verantwoordelijke | Deadline | Status |
|-------|------------------|----------|--------|
|       |                  |          |        |

## 5. Ondersteuning

_Beschrijf welke ondersteuning de medewerker krijgt (training, coaching, etc.)_

## 6. Evaluatiemomenten

_Plan hier de evaluatiemomenten in_

1. **Tussentijdse evaluatie:** _datum_
2. **Eindevaluatie:** _datum_

## 7. Consequenties

_Beschrijf wat de consequenties zijn bij wel/niet behalen van de doelen_

## 8. Handtekeningen

**Medewerker:** _____________________  Datum: ___________

**Manager:** _____________________  Datum: ___________

**HR:** _____________________  Datum: ___________
`;
      break;
    }

    case 'general_report':
    default:
      content = `# HR Rapport - ${employeeName}

**Datum:** ${today}
${period ? `**Periode:** ${period}` : ''}

---

## Inleiding

Dit rapport bevat ${notes.length} HR notities.

${additionalNotes ? `\n### Context\n\n${additionalNotes}\n` : ''}

## Notities

${notes.map((note, i) => `
### ${i + 1}. ${note.title}
**Datum:** ${formatNoteDate(note.created_at)}  
**Categorie:** ${getCategoryLabel(note.category)}

${note.content}

${note.tags && note.tags.length > 0 ? `**Tags:** ${note.tags.map(t => `#${t}`).join(', ')}` : ''}

---
`).join('\n')}
`;
  }

  return content;
}
