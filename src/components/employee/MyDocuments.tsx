import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  Calendar,
  CheckCircle2,
  Clock,
  IdCard,
  Shield,
  Briefcase,
  GraduationCap,
  Heart,
  FileCheck,
  AlertTriangle
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

interface Document {
  id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  title: string;
  status: string;
  created_at: string;
  notes: string | null;
}

const EMPLOYEE_DOCUMENT_TYPES = [
  { value: 'id_kaart', label: 'ID Kaart / Paspoort', icon: IdCard },
  { value: 'diploma', label: 'Diploma / Certificaat', icon: GraduationCap },
  { value: 'bewijs_van_goed_gedrag', label: 'Bewijs van Goed Gedrag (VOG)', icon: Shield },
  { value: 'bankgegevens', label: 'Bankgegevens', icon: Briefcase },
  { value: 'medisch_attest', label: 'Medisch Attest', icon: Heart },
  { value: 'overig', label: 'Overig Document', icon: FileText },
];

const getDocumentIcon = (type: string) => {
  const docType = EMPLOYEE_DOCUMENT_TYPES.find(t => t.value === type);
  return docType ? docType.icon : FileText;
};

const getDocumentLabel = (type: string) => {
  const docType = EMPLOYEE_DOCUMENT_TYPES.find(t => t.value === type);
  return docType ? docType.label : type;
};

export function MyDocuments() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('id_kaart');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (user) {
      loadDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadDocuments = async () => {
    if (!user) return;

    try {
      console.log('🔍 Fetching documents for user:', user.id);
      setError(null);
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Documents query error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }
      
      console.log('✅ Documents loaded:', data?.length || 0);
      setDocuments(data || []);
    } catch (error: any) {
      console.error('❌ Exception loading documents:', error);
      setError(error);
      toast.error(`Kon documenten niet laden: ${error.message || 'Onbekende fout'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('Bestand is te groot. Maximum grootte is 50MB.');
        return;
      }
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !user) {
      toast.error('Selecteer een bestand');
      return;
    }

    setUploading(true);

    try {
      // Upload file
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          employee_id: user.id,
          document_type: documentType,
          file_name: selectedFile.name,
          file_path: fileName,
          title: title || selectedFile.name,
          status: 'uploaded',
          uploaded_by: user.id,
          notes: notes || null,
        });

      if (dbError) throw dbError;

      toast.success('Document succesvol geüpload!');
      loadDocuments();

      // Reset form
      setSelectedFile(null);
      setTitle('');
      setNotes('');
      setDocumentType('id_kaart');
      setUploadOpen(false);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload mislukt: ' + (error instanceof Error ? error.message : 'Onbekende fout'));
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600);

      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      toast.error('Kon document niet openen');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Download gestart');
    } catch (error) {
      toast.error('Download mislukt');
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;

      toast.success('Document verwijderd');
      loadDocuments();
    } catch (error) {
      toast.error('Verwijderen mislukt');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Fout bij laden documenten</AlertTitle>
        <AlertDescription>
          {error.message}
          <br />
          <code className="text-xs mt-2 block">{(error as any).code || 'Unknown error'}</code>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => {
              setLoading(true);
              loadDocuments();
            }}
          >
            Opnieuw proberen
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Mijn Documenten
          </CardTitle>
          <CardDescription>
            Upload en beheer je persoonlijke documenten
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger asChild>
              <Button className="w-full" size="lg">
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Document uploaden</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Bestand *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    required
                    disabled={uploading}
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground">
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Type Document *</Label>
                  <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYEE_DOCUMENT_TYPES.map((type) => (
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
                    placeholder="Bijv. Paspoort"
                    required
                    disabled={uploading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notities (optioneel)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Extra informatie..."
                    rows={2}
                    disabled={uploading}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setUploadOpen(false)} disabled={uploading}>
                    Annuleren
                  </Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? 'Uploaden...' : 'Uploaden'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">
              Je hebt nog geen documenten geüpload
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const Icon = getDocumentIcon(doc.document_type);
            return (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{doc.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {getDocumentLabel(doc.document_type)}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(doc.created_at), 'd MMM yyyy', { locale: nl })}
                      </div>
                      {doc.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(doc)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
