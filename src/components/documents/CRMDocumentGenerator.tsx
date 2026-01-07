/**
 * CRM Document Generator
 * UI for generating professional CRM documents (contracts, invoices, proposals, etc.)
 */

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { format, addDays } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  FileText,
  Receipt,
  Briefcase,
  Shield,
  MessageSquare,
  Download,
  Upload,
  Loader2,
} from 'lucide-react';
import {
  ContractTemplate,
  InvoiceTemplate,
  ProposalTemplate,
  NDATemplate,
  MeetingNotesTemplate,
  type ContractData,
  type InvoiceData,
  type ProposalData,
  type NDAData,
  type MeetingNotesData,
} from '@/lib/crmDocumentTemplates';

type DocumentType = 'contract' | 'invoice' | 'proposal' | 'nda' | 'meeting_notes';

interface CRMDocumentGeneratorProps {
  companyId?: string;
  contactId?: string;
  projectId?: string;
  onGenerated?: (documentUrl: string) => void;
}

const documentTypes = [
  {
    type: 'contract' as DocumentType,
    name: 'Contract',
    description: 'Overeenkomst van opdracht',
    icon: FileText,
  },
  {
    type: 'invoice' as DocumentType,
    name: 'Factuur',
    description: 'Professionele factuur',
    icon: Receipt,
  },
  {
    type: 'proposal' as DocumentType,
    name: 'Projectvoorstel',
    description: 'Uitgebreid projectvoorstel',
    icon: Briefcase,
  },
  {
    type: 'nda' as DocumentType,
    name: 'NDA',
    description: 'Geheimhoudingsovereenkomst',
    icon: Shield,
  },
  {
    type: 'meeting_notes' as DocumentType,
    name: 'Gespreksverslag',
    description: 'Meeting notities',
    icon: MessageSquare,
  },
];

export function CRMDocumentGenerator({
  companyId,
  contactId,
  projectId,
  onGenerated,
}: CRMDocumentGeneratorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<DocumentType>('contract');
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const generateDocument = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      let documentComponent;
      
      // Generate the appropriate document based on type
      switch (selectedType) {
        case 'contract':
          documentComponent = <ContractTemplate data={formData as ContractData} />;
          break;
        case 'invoice':
          documentComponent = <InvoiceTemplate data={formData as InvoiceData} />;
          break;
        case 'proposal':
          documentComponent = <ProposalTemplate data={formData as ProposalData} />;
          break;
        case 'nda':
          documentComponent = <NDATemplate data={formData as NDAData} />;
          break;
        case 'meeting_notes':
          documentComponent = <MeetingNotesTemplate data={formData as MeetingNotesData} />;
          break;
        default:
          throw new Error('Invalid document type');
      }

      // Generate PDF
      const blob = await pdf(documentComponent).toBlob();
      
      // Create preview URL
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      toast({
        title: 'Document gegenereerd',
        description: 'Je kunt het document nu downloaden of uploaden.',
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Fout bij genereren',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadDocument = () => {
    if (!previewUrl) return;

    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `${selectedType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
    link.click();
  };

  const uploadDocument = async () => {
    if (!previewUrl || !user) return;

    setGenerating(true);
    try {
      // Convert blob URL to blob
      const response = await fetch(previewUrl);
      const blob = await response.blob();

      // Generate filename
      const filename = `${selectedType}_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
      const filePath = `documents/${user.id}/${filename}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, blob, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // Store document record in database
      const { error: dbError } = await supabase.from('documents').insert({
        name: filename,
        file_path: filePath,
        file_type: 'application/pdf',
        file_size: blob.size,
        uploaded_by: user.id,
        company_id: companyId,
        contact_id: contactId,
        project_id: projectId,
        category: selectedType,
      });

      if (dbError) throw dbError;

      toast({
        title: 'Document geüpload',
        description: 'Het document is opgeslagen in je document bibliotheek.',
      });

      if (onGenerated) {
        onGenerated(urlData.publicUrl);
      }

      setOpen(false);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Fout bij uploaden',
        description: error instanceof Error ? error.message : 'Onbekende fout',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'contract':
        return <ContractForm formData={formData} setFormData={setFormData} />;
      case 'invoice':
        return <InvoiceForm formData={formData} setFormData={setFormData} />;
      case 'proposal':
        return <ProposalForm formData={formData} setFormData={setFormData} />;
      case 'nda':
        return <NDAForm formData={formData} setFormData={setFormData} />;
      case 'meeting_notes':
        return <MeetingNotesForm formData={formData} setFormData={setFormData} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Document Genereren
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Genereren</DialogTitle>
          <DialogDescription>
            Kies een document type en vul de gegevens in.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={previewUrl ? 'preview' : 'edit'} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Bewerken</TabsTrigger>
            <TabsTrigger value="preview" disabled={!previewUrl}>
              Voorbeeld
            </TabsTrigger>
          </TabsList>

          <TabsContent value="edit" className="space-y-4">
            {/* Document Type Selection */}
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select
                value={selectedType}
                onValueChange={(value) => {
                  setSelectedType(value as DocumentType);
                  setPreviewUrl(null);
                  setFormData({});
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 mt-4">{renderFormFields()}</div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                onClick={generateDocument}
                disabled={generating}
              >
                {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Genereer Document
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            {previewUrl && (
              <>
                <iframe
                  src={previewUrl}
                  className="w-full h-[500px] border rounded-lg"
                  title="Document Preview"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={downloadDocument}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button onClick={uploadDocument} disabled={generating}>
                    {generating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Upload className="mr-2 h-4 w-4" />
                    Opslaan
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// FORM COMPONENTS
// ============================================================================

function ContractForm({ formData, setFormData }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Contractnummer</Label>
          <Input
            value={formData.contractNumber || ''}
            onChange={(e) =>
              setFormData({ ...formData, contractNumber: e.target.value })
            }
            placeholder="CNT-2026-001"
          />
        </div>
        <div>
          <Label>Bedrijfsnaam</Label>
          <Input
            value={formData.companyName || ''}
            onChange={(e) =>
              setFormData({ ...formData, companyName: e.target.value })
            }
            placeholder="Dirq Solutions"
          />
        </div>
      </div>

      <div>
        <Label>Klant naam</Label>
        <Input
          value={formData.clientName || ''}
          onChange={(e) =>
            setFormData({ ...formData, clientName: e.target.value })
          }
          placeholder="Bedrijf BV"
        />
      </div>

      <div>
        <Label>Klant adres</Label>
        <Input
          value={formData.clientAddress || ''}
          onChange={(e) =>
            setFormData({ ...formData, clientAddress: e.target.value })
          }
          placeholder="Straat 1, 1234 AB Amsterdam"
        />
      </div>

      <div>
        <Label>Project naam</Label>
        <Input
          value={formData.projectName || ''}
          onChange={(e) =>
            setFormData({ ...formData, projectName: e.target.value })
          }
          placeholder="CRM Implementatie"
        />
      </div>

      <div>
        <Label>Project beschrijving</Label>
        <Textarea
          value={formData.projectDescription || ''}
          onChange={(e) =>
            setFormData({ ...formData, projectDescription: e.target.value })
          }
          placeholder="Beschrijving van het project..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Startdatum</Label>
          <Input
            type="date"
            value={
              formData.startDate
                ? format(new Date(formData.startDate), 'yyyy-MM-dd')
                : ''
            }
            onChange={(e) =>
              setFormData({ ...formData, startDate: new Date(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Totaalbedrag (€)</Label>
          <Input
            type="number"
            value={formData.totalAmount || ''}
            onChange={(e) =>
              setFormData({ ...formData, totalAmount: parseFloat(e.target.value) })
            }
            placeholder="10000"
          />
        </div>
      </div>

      <div>
        <Label>Betalingstermijn</Label>
        <Input
          value={formData.paymentTerms || ''}
          onChange={(e) =>
            setFormData({ ...formData, paymentTerms: e.target.value })
          }
          placeholder="30 dagen na factuurdatum"
        />
      </div>

      <div>
        <Label>Leveringen (één per regel)</Label>
        <Textarea
          value={formData.deliverables?.join('\n') || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              deliverables: e.target.value.split('\n').filter((l) => l.trim()),
            })
          }
          placeholder="CRM systeem configuratie&#10;Data migratie&#10;Training medewerkers"
          rows={4}
        />
      </div>
    </div>
  );
}

function InvoiceForm({ formData, setFormData }: any) {
  const addLineItem = () => {
    const items = formData.lineItems || [];
    items.push({
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
    });
    setFormData({ ...formData, lineItems: items });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const items = [...(formData.lineItems || [])];
    items[index] = { ...items[index], [field]: value };
    
    // Calculate amount
    if (field === 'quantity' || field === 'unitPrice') {
      items[index].amount = items[index].quantity * items[index].unitPrice;
    }

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = formData.taxRate || 21;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    setFormData({
      ...formData,
      lineItems: items,
      subtotal,
      taxAmount,
      total,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Factuurnummer</Label>
          <Input
            value={formData.invoiceNumber || ''}
            onChange={(e) =>
              setFormData({ ...formData, invoiceNumber: e.target.value })
            }
            placeholder="INV-2026-001"
          />
        </div>
        <div>
          <Label>Bedrijfsnaam</Label>
          <Input
            value={formData.companyName || ''}
            onChange={(e) =>
              setFormData({ ...formData, companyName: e.target.value })
            }
            placeholder="Dirq Solutions"
          />
        </div>
      </div>

      <div>
        <Label>Klant naam</Label>
        <Input
          value={formData.clientName || ''}
          onChange={(e) =>
            setFormData({ ...formData, clientName: e.target.value })
          }
          placeholder="Bedrijf BV"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Factuurdatum</Label>
          <Input
            type="date"
            value={
              formData.invoiceDate
                ? format(new Date(formData.invoiceDate), 'yyyy-MM-dd')
                : format(new Date(), 'yyyy-MM-dd')
            }
            onChange={(e) =>
              setFormData({ ...formData, invoiceDate: new Date(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Vervaldatum</Label>
          <Input
            type="date"
            value={
              formData.dueDate
                ? format(new Date(formData.dueDate), 'yyyy-MM-dd')
                : format(addDays(new Date(), 30), 'yyyy-MM-dd')
            }
            onChange={(e) =>
              setFormData({ ...formData, dueDate: new Date(e.target.value) })
            }
          />
        </div>
      </div>

      <div>
        <Label>BTW percentage</Label>
        <Input
          type="number"
          value={formData.taxRate || 21}
          onChange={(e) =>
            setFormData({ ...formData, taxRate: parseFloat(e.target.value) })
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Factuurregels</Label>
          <Button type="button" size="sm" onClick={addLineItem}>
            Regel toevoegen
          </Button>
        </div>
        {(formData.lineItems || []).map((item: any, index: number) => (
          <div key={index} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5">
              <Input
                placeholder="Omschrijving"
                value={item.description}
                onChange={(e) =>
                  updateLineItem(index, 'description', e.target.value)
                }
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Aantal"
                value={item.quantity}
                onChange={(e) =>
                  updateLineItem(index, 'quantity', parseFloat(e.target.value))
                }
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                placeholder="Prijs"
                value={item.unitPrice}
                onChange={(e) =>
                  updateLineItem(index, 'unitPrice', parseFloat(e.target.value))
                }
              />
            </div>
            <div className="col-span-3">
              <Input
                value={`€${item.amount.toFixed(2)}`}
                disabled
              />
            </div>
          </div>
        ))}
      </div>

      {formData.subtotal > 0 && (
        <div className="border-t pt-4">
          <div className="flex justify-end space-y-1">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotaal:</span>
                <span>€{formData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>BTW ({formData.taxRate}%):</span>
                <span>€{formData.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Totaal:</span>
                <span>€{formData.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProposalForm({ formData, setFormData }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Voorstelnummer</Label>
          <Input
            value={formData.proposalNumber || ''}
            onChange={(e) =>
              setFormData({ ...formData, proposalNumber: e.target.value })
            }
            placeholder="PROP-2026-001"
          />
        </div>
        <div>
          <Label>Bedrijfsnaam</Label>
          <Input
            value={formData.companyName || ''}
            onChange={(e) =>
              setFormData({ ...formData, companyName: e.target.value })
            }
            placeholder="Dirq Solutions"
          />
        </div>
      </div>

      <div>
        <Label>Klant naam</Label>
        <Input
          value={formData.clientName || ''}
          onChange={(e) =>
            setFormData({ ...formData, clientName: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Project naam</Label>
        <Input
          value={formData.projectName || ''}
          onChange={(e) =>
            setFormData({ ...formData, projectName: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Samenvatting</Label>
        <Textarea
          value={formData.executiveSummary || ''}
          onChange={(e) =>
            setFormData({ ...formData, executiveSummary: e.target.value })
          }
          rows={3}
        />
      </div>

      <div>
        <Label>Doelstellingen (één per regel)</Label>
        <Textarea
          value={formData.objectives?.join('\n') || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              objectives: e.target.value.split('\n').filter((l) => l.trim()),
            })
          }
          rows={3}
        />
      </div>

      <div>
        <Label>Aanpak</Label>
        <Textarea
          value={formData.approach || ''}
          onChange={(e) =>
            setFormData({ ...formData, approach: e.target.value })
          }
          rows={3}
        />
      </div>

      <div>
        <Label>Investering (€)</Label>
        <Input
          type="number"
          value={formData.investment || ''}
          onChange={(e) =>
            setFormData({ ...formData, investment: parseFloat(e.target.value) })
          }
        />
      </div>

      <div>
        <Label>Geldig tot</Label>
        <Input
          type="date"
          value={
            formData.validUntil
              ? format(new Date(formData.validUntil), 'yyyy-MM-dd')
              : format(addDays(new Date(), 30), 'yyyy-MM-dd')
          }
          onChange={(e) =>
            setFormData({ ...formData, validUntil: new Date(e.target.value) })
          }
        />
      </div>
    </div>
  );
}

function NDAForm({ formData, setFormData }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>NDA Nummer</Label>
          <Input
            value={formData.ndaNumber || ''}
            onChange={(e) =>
              setFormData({ ...formData, ndaNumber: e.target.value })
            }
            placeholder="NDA-2026-001"
          />
        </div>
        <div>
          <Label>Bedrijfsnaam</Label>
          <Input
            value={formData.companyName || ''}
            onChange={(e) =>
              setFormData({ ...formData, companyName: e.target.value })
            }
            placeholder="Dirq Solutions"
          />
        </div>
      </div>

      <div>
        <Label>Klant naam</Label>
        <Input
          value={formData.clientName || ''}
          onChange={(e) =>
            setFormData({ ...formData, clientName: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Klant adres</Label>
        <Input
          value={formData.clientAddress || ''}
          onChange={(e) =>
            setFormData({ ...formData, clientAddress: e.target.value })
          }
        />
      </div>

      <div>
        <Label>Doel</Label>
        <Textarea
          value={formData.purpose || ''}
          onChange={(e) =>
            setFormData({ ...formData, purpose: e.target.value })
          }
          placeholder="Het bespreken van mogelijke samenwerking..."
          rows={3}
        />
      </div>

      <div>
        <Label>Looptijd (jaren)</Label>
        <Input
          type="number"
          value={formData.duration || 2}
          onChange={(e) =>
            setFormData({ ...formData, duration: parseInt(e.target.value) })
          }
        />
      </div>

      <div>
        <Label>Datum</Label>
        <Input
          type="date"
          value={
            formData.date
              ? format(new Date(formData.date), 'yyyy-MM-dd')
              : format(new Date(), 'yyyy-MM-dd')
          }
          onChange={(e) =>
            setFormData({ ...formData, date: new Date(e.target.value) })
          }
        />
      </div>
    </div>
  );
}

function MeetingNotesForm({ formData, setFormData }: any) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Meeting titel</Label>
        <Input
          value={formData.meetingTitle || ''}
          onChange={(e) =>
            setFormData({ ...formData, meetingTitle: e.target.value })
          }
          placeholder="Kickoff meeting CRM project"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Datum & tijd</Label>
          <Input
            type="datetime-local"
            value={
              formData.meetingDate
                ? format(new Date(formData.meetingDate), "yyyy-MM-dd'T'HH:mm")
                : format(new Date(), "yyyy-MM-dd'T'HH:mm")
            }
            onChange={(e) =>
              setFormData({ ...formData, meetingDate: new Date(e.target.value) })
            }
          />
        </div>
        <div>
          <Label>Locatie</Label>
          <Input
            value={formData.location || ''}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value })
            }
            placeholder="Kantoor / Online"
          />
        </div>
      </div>

      <div>
        <Label>Aanwezigen (één per regel)</Label>
        <Textarea
          value={formData.attendees?.join('\n') || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              attendees: e.target.value.split('\n').filter((l) => l.trim()),
            })
          }
          rows={3}
          placeholder="Jan Jansen&#10;Marie de Vries"
        />
      </div>

      <div>
        <Label>Agenda (één per regel)</Label>
        <Textarea
          value={formData.agenda?.join('\n') || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              agenda: e.target.value.split('\n').filter((l) => l.trim()),
            })
          }
          rows={3}
        />
      </div>

      <div>
        <Label>Notities</Label>
        <Textarea
          value={formData.notes || ''}
          onChange={(e) =>
            setFormData({ ...formData, notes: e.target.value })
          }
          rows={4}
        />
      </div>

      <div>
        <Label>Besluiten (één per regel)</Label>
        <Textarea
          value={formData.decisions?.join('\n') || ''}
          onChange={(e) =>
            setFormData({
              ...formData,
              decisions: e.target.value.split('\n').filter((l) => l.trim()),
            })
          }
          rows={3}
        />
      </div>

      <div>
        <Label>Opgesteld door</Label>
        <Input
          value={formData.preparedBy || ''}
          onChange={(e) =>
            setFormData({ ...formData, preparedBy: e.target.value })
          }
        />
      </div>
    </div>
  );
}
