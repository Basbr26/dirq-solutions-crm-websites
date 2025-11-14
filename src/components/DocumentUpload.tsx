import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { DocumentCategory } from '@/types/sickLeave';
import { toast } from 'sonner';

interface DocumentUploadProps {
  onUpload: (data: {
    naam: string;
    categorie: DocumentCategory;
    file: File;
  }) => void;
}

export function DocumentUpload({ onUpload }: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [categorie, setCategorie] = useState<DocumentCategory>('overig');

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
      naam: selectedFile.name,
      categorie,
      file: selectedFile,
    });

    setSelectedFile(null);
    setCategorie('overig');
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Document uploaden</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="categorie">Categorie *</Label>
            <Select value={categorie} onValueChange={(v) => setCategorie(v as DocumentCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="medisch">Medisch</SelectItem>
                <SelectItem value="correspondentie">Correspondentie</SelectItem>
                <SelectItem value="re-integratie">Re-integratie</SelectItem>
                <SelectItem value="overig">Overig</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
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
