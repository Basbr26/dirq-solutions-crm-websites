import { useState } from 'react';
import { logger } from '@/lib/logger';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeDocumentUploadProps {
  employeeId: string;
  onUploaded: () => void;
}

const HR_DOCUMENT_TYPES = [
  { value: 'arbeidsovereenkomst', label: 'Arbeidsovereenkomst' },
  { value: 'nda', label: 'NDA / Geheimhoudingsverklaring' },
  { value: 'bewijs_van_indiensttreding', label: 'Bewijs van Indiensttreding' },
  { value: 'onboarding_checklist', label: 'Onboarding Checklist' },
  { value: 'contract_verlenging', label: 'Contract Verlenging' },
  { value: 'referentie_brief', label: 'Referentie Brief' },
];

const VERZUIM_DOCUMENT_TYPES = [
  { value: 'medisch_attest', label: 'Medisch Attest' },
  { value: 'probleemanalyse', label: 'Probleemanalyse' },
  { value: 'plan_van_aanpak', label: 'Plan van Aanpak' },
  { value: 'evaluatie_3_maanden', label: 'Evaluatie 3 maanden' },
  { value: 'evaluatie_6_maanden', label: 'Evaluatie 6 maanden' },
  { value: 'evaluatie_1_jaar', label: 'Evaluatie 1 jaar' },
  { value: 'herstelmelding', label: 'Herstelmelding' },
];

const ALL_DOCUMENT_TYPES = [...HR_DOCUMENT_TYPES, ...VERZUIM_DOCUMENT_TYPES];

export function EmployeeDocumentUpload({ employeeId, onUploaded }: EmployeeDocumentUploadProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('arbeidsovereenkomst');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Bestand is te groot. Maximum grootte is 50MB.');
        return;
      }
      
      // Auto-fill title from filename if empty
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
      
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Selecteer een bestand');
      return;
    }

    if (!user) {
      toast.error('Je moet ingelogd zijn');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${employeeId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // 2. Create document record in database
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          employee_id: employeeId,
          document_type: documentType,
          file_name: selectedFile.name,
          file_path: fileName,
          title: title || selectedFile.name,
          status: 'uploaded',
          uploaded_by: user.id,
          notes: notes || null,
        });

      if (dbError) throw dbError;

      toast.success('Document succesvol geüpload');
      onUploaded();
      
      // Reset form
      setSelectedFile(null);
      setDocumentType('arbeidsovereenkomst');
      setTitle('');
      setNotes('');
      setOpen(false);
    } catch (error) {
      logger.error('Failed to upload employee document', { employeeId, documentType, error });
      toast.error('Upload mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Document uploaden</DialogTitle>
          <DialogDescription>
            Upload een document voor deze medewerker
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Bestand *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              required
              disabled={loading}
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Geselecteerd: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Document Type *</Label>
            <Select value={documentType} onValueChange={setDocumentType} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  HR Documenten
                </div>
                {HR_DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1">
                  Verzuim Documenten
                </div>
                {VERZUIM_DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bijv. Arbeidsovereenkomst 2025"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notities (optioneel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Extra informatie over dit document..."
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Annuleren
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Uploaden...' : 'Uploaden'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
