import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { DocumentType } from '@/types/sickLeave';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onUpload: (data: {
    file_name: string;
    document_type: DocumentType;
    file: File;
  }) => void;
}

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<DocumentType>('overig');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Bestand is te groot. Maximum grootte is 10MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Selecteer een bestand');
      return;
    }

    onUpload({
      file_name: selectedFile.name,
      document_type: documentType,
      file: selectedFile,
    });

    setSelectedFile(null);
    setDocumentType('overig');
    setOpen(false);
    toast.success('Document geüpload');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Upload document
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Document uploaden</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1">
          <div>
            <Label htmlFor="file">Bestand *</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              required
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Geselecteerd: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="document_type">Categorie *</Label>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="medisch_attest">Medisch Attest</SelectItem>
                <SelectItem value="probleemanalyse">Probleemanalyse</SelectItem>
                <SelectItem value="plan_van_aanpak">Plan van Aanpak</SelectItem>
                <SelectItem value="evaluatie_3_maanden">Evaluatie 3 maanden</SelectItem>
                <SelectItem value="evaluatie_6_maanden">Evaluatie 6 maanden</SelectItem>
                <SelectItem value="evaluatie_1_jaar">Evaluatie 1 jaar</SelectItem>
                <SelectItem value="herstelmelding">Herstelmelding</SelectItem>
                <SelectItem value="overig">Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuleren
            </Button>
            <Button type="submit">Uploaden</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}