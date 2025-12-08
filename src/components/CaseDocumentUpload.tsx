import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DocumentType,
  SignatureRole,
  DOCUMENT_TYPE_LABELS,
  SIGNATURE_ROLE_LABELS,
  getDocumentDeadline,
} from '@/types/verzuimDocumentTypes';

interface CaseDocumentUploadProps {
  caseId: string;
  caseStartDate: string;
  employeeId: string;
  onUploadComplete?: () => void;
}

export function CaseDocumentUpload({
  caseId,
  caseStartDate,
  employeeId,
  onUploadComplete,
}: CaseDocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('probleemanalyse');
  const [requiredSignatures, setRequiredSignatures] = useState<SignatureRole[]>(['employee']);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Alleen PDF bestanden zijn toegestaan');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('Bestand mag maximaal 10MB groot zijn');
        return;
      }
      setFile(selectedFile);
    }
  };

  const toggleSignature = (role: SignatureRole) => {
    setRequiredSignatures((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Selecteer eerst een bestand');
      return;
    }

    if (requiredSignatures.length === 0) {
      toast.error('Selecteer minimaal één handtekening vereiste');
      return;
    }

    setUploading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) throw new Error('Niet ingelogd');

      // Upload bestand naar storage
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Maak document record aan
      const { data: document, error: documentError } = await supabase
        .from('documents')
        .insert([{
          file_name: file.name,
          file_url: filePath,
          uploaded_by: user.id,
          case_id: caseId,
          document_type: documentType as any,
          requires_signatures: requiredSignatures as any,
          status: 'pending' as any,
        } as any])
        .select()
        .single();

      if (documentError) throw documentError;

      // Als medewerker handtekening vereist is, maak uitnodiging aan
      if (requiredSignatures.includes('employee')) {
        // Haal medewerker email op
        const { data: employee } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', employeeId)
          .single();

        if (employee?.email) {
          // Genereer verificatiecode
          const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

          const { error: inviteError } = await supabase
            .from('document_invitations')
            .insert({
              document_id: document.id,
              email: employee.email,
              verification_code: verificationCode,
            });

          if (inviteError) throw inviteError;

          // TODO: Verstuur email met verificatiecode
          console.log(`Verificatiecode voor ${employee.email}: ${verificationCode}`);
        }
      }

      // Maak automatisch een taak aan voor ondertekening
      const deadline = getDocumentDeadline(documentType, caseStartDate);
      
      await supabase.from('tasks').insert({
        case_id: caseId,
        title: `${DOCUMENT_TYPE_LABELS[documentType]} ondertekenen`,
        description: `Document dient ondertekend te worden door: ${requiredSignatures.map(r => SIGNATURE_ROLE_LABELS[r]).join(', ')}`,
        deadline: deadline.toISOString().split('T')[0],
        task_status: 'open',
        assigned_to: employeeId,
      });

      // Maak timeline event
      await supabase.from('timeline_events').insert({
        case_id: caseId,
        event_type: 'document_toegevoegd',
        description: `Document toegevoegd: ${DOCUMENT_TYPE_LABELS[documentType]} - ${file.name}`,
        created_by: user.id,
      });

      setUploadSuccess(true);
      toast.success('Document succesvol geüpload');
      
      setTimeout(() => {
        setOpen(false);
        setUploadSuccess(false);
        setFile(null);
        setDocumentType('probleemanalyse');
        setRequiredSignatures(['employee']);
        onUploadComplete?.();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload mislukt');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Document Uploaden
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Document Uploaden voor Verzuimcase</DialogTitle>
          <DialogDescription>
            Upload een document dat ondertekend moet worden door de betrokken partijen
          </DialogDescription>
        </DialogHeader>

        {uploadSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
            <p className="text-lg font-semibold">Document Succesvol Geüpload!</p>
            <p className="text-sm text-muted-foreground">
              Uitnodigingen zijn verzonden naar de betrokken partijen
            </p>
          </div>
        ) : (
          <div className="space-y-6 py-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              <Label htmlFor="file">Document (PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {file && <FileText className="h-5 w-5 text-primary" />}
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              <Select
                value={documentType}
                onValueChange={(value) => setDocumentType(value as DocumentType)}
              >
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Deadline: {getDocumentDeadline(documentType, caseStartDate).toLocaleDateString('nl-NL')}
              </p>
            </div>

            <div className="space-y-3">
              <Label>Vereiste Handtekeningen</Label>
              <div className="space-y-2">
                {Object.entries(SIGNATURE_ROLE_LABELS).map(([role, label]) => (
                  <div key={role} className="flex items-center space-x-2">
                    <Checkbox
                      id={role}
                      checked={requiredSignatures.includes(role as SignatureRole)}
                      onCheckedChange={() => toggleSignature(role as SignatureRole)}
                    />
                    <label
                      htmlFor={role}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>Let op:</strong> Geselecteerde partijen ontvangen automatisch een
                email met een verificatiecode om het document te ondertekenen.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={uploading}>
                Annuleren
              </Button>
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? 'Uploaden...' : 'Upload en Verstuur'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
