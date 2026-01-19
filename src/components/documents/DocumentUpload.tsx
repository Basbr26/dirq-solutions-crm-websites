/**
 * DocumentUpload Component
 * Reusable component for uploading documents to Supabase Storage
 * Associates documents with companies, contacts, projects, or quotes
 */

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
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
import { Textarea } from '@/components/ui/textarea';
import { Upload, File, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface DocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Association (at least one required)
  companyId?: string;
  contactId?: string;
  projectId?: string;
  quoteId?: string;
  // Optional
  onSuccess?: () => void;
}

export const DocumentUpload = ({
  open,
  onOpenChange,
  companyId,
  contactId,
  projectId,
  quoteId,
  onSuccess,
}: DocumentUploadProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('other');

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error(t('forms.noFileSelected'));
      if (!user) throw new Error('Niet ingelogd');

      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
        throw new Error('Bestandstype niet toegestaan');
      }

      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        throw new Error('Bestand te groot (max 10MB)');
      }

      // Generate unique file path
      const timestamp = Date.now();
      const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${companyId || contactId || projectId || quoteId}/${timestamp}-${sanitizedFileName}`;

      // Upload to Supabase Storage
      setUploadProgress(10);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadProgress(60);

      // Save metadata to database
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          file_name: selectedFile.name,
          file_size: selectedFile.size,
          file_type: selectedFile.type,
          storage_path: uploadData.path,
          title: title || selectedFile.name,
          description,
          category,
          company_id: companyId || null,
          contact_id: contactId || null,
          project_id: projectId || null,
          quote_id: quoteId || null,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      setUploadProgress(100);
      return docData;
    },
    onSuccess: () => {
      toast.success('Document geüpload');
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      if (companyId) queryClient.invalidateQueries({ queryKey: ['companies', companyId] });
      if (contactId) queryClient.invalidateQueries({ queryKey: ['contacts', contactId] });
      if (projectId) queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      if (quoteId) queryClient.invalidateQueries({ queryKey: ['quotes', quoteId] });

      // Reset form
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setCategory('other');
      setUploadProgress(0);
      
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Upload mislukt: ${error.message}`);
      setUploadProgress(0);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error('Bestandstype niet toegestaan. Ondersteunde types: PDF, Word, Excel, afbeeldingen, tekst.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Bestand te groot. Maximum: 10MB');
      return;
    }

    setSelectedFile(file);
    
    // Auto-fill title with filename (without extension)
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setTitle(nameWithoutExt);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      toast.error(t('forms.selectFileFirst'));
      return;
    }
    uploadMutation.mutate();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Document Uploaden</DialogTitle>
          <DialogDescription>
            Upload een document (max 10MB). Ondersteund: PDF, Word, Excel, afbeeldingen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div>
            <Label htmlFor="file-upload">Bestand</Label>
            <Input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept={ALLOWED_MIME_TYPES.join(',')}
              disabled={uploadMutation.isPending}
              className="cursor-pointer"
            />
          </div>

          {/* Selected File Preview */}
          {selectedFile && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <File className="h-8 w-8 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type}
                </p>
              </div>
              {!uploadMutation.isPending && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploaden...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title">Titel *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Document titel"
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">Categorie</Label>
            <Select
              value={category}
              onValueChange={setCategory}
              disabled={uploadMutation.isPending}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder={t('forms.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="proposal">Voorstel</SelectItem>
                <SelectItem value="invoice">Factuur</SelectItem>
                <SelectItem value="agreement">Overeenkomst</SelectItem>
                <SelectItem value="specification">Specificatie</SelectItem>
                <SelectItem value="other">Anders</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Beschrijving</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optionele beschrijving"
              rows={3}
              disabled={uploadMutation.isPending}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={uploadMutation.isPending}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Uploaden...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Uploaden
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
