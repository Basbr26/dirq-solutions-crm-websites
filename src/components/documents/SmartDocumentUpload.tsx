/**
 * Smart Document Upload Component
 * Drag & drop upload with auto-categorization and AI analysis
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  performOCR,
  extractTextFromPDF,
  isPDF,
  isImage,
  type OCRProgress,
} from '@/lib/ai/ocrService';
import { analyzeDocumentContent, saveDocumentAnalysis, generateDocumentTasks } from '@/lib/ai/documentProcessor';
import { DocumentAnalysis } from './DocumentAnalysis';
import type { DocumentAnalysisResult } from '@/lib/ai/documentProcessor';

interface UploadingFile {
  file: File;
  id: string;
  status: 'uploading' | 'ocr' | 'analyzing' | 'completed' | 'error';
  progress: number;
  message: string;
  analysis?: DocumentAnalysisResult;
  extractedText?: string;
  documentId?: string;
}

interface SmartDocumentUploadProps {
  employeeId?: string;
  onUploadComplete?: (documentId: string) => void;
  category?: string;
}

export function SmartDocumentUpload({
  employeeId,
  onUploadComplete,
  category,
}: SmartDocumentUploadProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedFileForReview, setSelectedFileForReview] = useState<UploadingFile | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const processingRef = useRef(false);

  /**
   * Process single file: Upload → OCR → AI Analysis
   */
  const processFile = useCallback(
    async (file: File, uploadId: string) => {
      if (!user) return;

      try {
        // Step 1: Upload to Supabase Storage
        updateFileStatus(uploadId, {
          status: 'uploading',
          progress: 10,
          message: 'Uploaden naar server...',
        });

        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}_${file.name}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Create document record
        // Use type assertion since AI processing extends the documents table structure
        const { data: documentData, error: documentError } = await supabase
          .from('documents')
          .insert({
            case_id: '00000000-0000-0000-0000-000000000000', // Placeholder for standalone documents
            document_type: 'overig',
            file_name: file.name,
            storage_path: filePath,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: user.id,
          } as never)
          .select()
          .single() as unknown as { data: { id: string }; error: unknown };

        if (documentError) throw documentError;

        updateFileStatus(uploadId, {
          documentId: documentData.id,
          progress: 30,
        });

        // Step 2: Extract text (OCR or PDF parsing)
        updateFileStatus(uploadId, {
          status: 'ocr',
          progress: 40,
          message: 'Tekst wordt geëxtraheerd...',
        });

        let extractedText = '';

        if (isPDF(file)) {
          extractedText = await extractTextFromPDF(file, (progress) => {
            updateFileStatus(uploadId, {
              progress: 40 + (progress * 0.2),
            });
          });
        } else if (isImage(file)) {
          const ocrResult = await performOCR(file, {
            onProgress: (ocrProgress: OCRProgress) => {
              updateFileStatus(uploadId, {
                message: ocrProgress.message,
                progress: 40 + (ocrProgress.progress * 0.2),
              });
            },
          });
          extractedText = ocrResult.text;
        } else {
          // For other file types, skip OCR
          extractedText = '';
        }

        updateFileStatus(uploadId, {
          extractedText,
          progress: 60,
        });

        // Step 3: AI Analysis
        updateFileStatus(uploadId, {
          status: 'analyzing',
          progress: 70,
          message: 'AI analyseert document...',
        });

        const analysis = await analyzeDocumentContent(extractedText, file.name, file.type);

        updateFileStatus(uploadId, {
          analysis,
          progress: 85,
          message: 'Analyse voltooid, gegevens worden opgeslagen...',
        });

        // Step 4: Save analysis to database
        await saveDocumentAnalysis(documentData.id, user.id, analysis, extractedText);

        // Step 5: Generate tasks if suggested
        if (analysis.suggestedActions.length > 0) {
          await generateDocumentTasks(documentData.id, analysis, employeeId);
        }

        // Complete
        updateFileStatus(uploadId, {
          status: 'completed',
          progress: 100,
          message: `✓ Verwerkt als ${analysis.category} (${Math.round(analysis.confidence * 100)}% zekerheid)`,
        });

        toast({
          title: 'Document verwerkt',
          description: `${file.name} is succesvol geanalyseerd en opgeslagen.`,
        });

        onUploadComplete?.(documentData.id);
      } catch (error) {
        console.error('File processing error:', error);
        updateFileStatus(uploadId, {
          status: 'error',
          progress: 0,
          message: error instanceof Error ? error.message : 'Onbekende fout',
        });

        toast({
          variant: 'destructive',
          title: 'Upload fout',
          description: `Kon ${file.name} niet verwerken.`,
        });
      }
    },
    [user, employeeId, category, onUploadComplete, toast]
  );

  /**
   * Update file status
   */
  const updateFileStatus = (uploadId: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles((prev) =>
      prev.map((f) => (f.id === uploadId ? { ...f, ...updates } : f))
    );
  };

  /**
   * Handle dropped files
   */
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (processingRef.current) return;
      processingRef.current = true;

      const newFiles: UploadingFile[] = acceptedFiles.map((file) => ({
        file,
        id: `${Date.now()}_${Math.random()}`,
        status: 'uploading',
        progress: 0,
        message: 'Voorbereiden...',
      }));

      setUploadingFiles((prev) => [...prev, ...newFiles]);

      // Process files sequentially to avoid overwhelming the system
      for (const fileInfo of newFiles) {
        await processFile(fileInfo.file, fileInfo.id);
      }

      processingRef.current = false;
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      arbeidscontract: 'bg-blue-500',
      medisch: 'bg-red-500',
      training: 'bg-green-500',
      persoonlijk: 'bg-purple-500',
      factuur: 'bg-yellow-500',
      overig: 'bg-gray-500',
    };
    return colors[category] || colors.overig;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'uploading':
      case 'ocr':
      case 'analyzing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <Card>
        <CardHeader>
          <CardTitle>Document Uploaden</CardTitle>
          <CardDescription>
            Sleep documenten hierheen of klik om te selecteren. Documenten worden automatisch
            geanalyseerd en gecategoriseerd.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
              transition-colors duration-200
              ${
                isDragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-lg font-medium">Drop documenten hier...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Sleep documenten hierheen of klik om te selecteren
                </p>
                <p className="text-sm text-muted-foreground">
                  Ondersteunt PDF, Word, en afbeeldingen (max 10MB)
                </p>
              </>
            )}
          </div>

          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Processing:</strong> Geüploade documenten worden automatisch geanalyseerd
              met OCR en AI. Data wordt geëxtraheerd en gecategoriseerd. Dit kan 30-60 seconden
              duren per document.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verwerking</CardTitle>
            <CardDescription>Status van geüploade documenten</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {uploadingFiles.map((fileInfo) => (
              <div key={fileInfo.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {getStatusIcon(fileInfo.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{fileInfo.file.name}</p>
                      <p className="text-xs text-muted-foreground">{fileInfo.message}</p>
                    </div>
                    {fileInfo.analysis && (
                      <Badge className={getCategoryColor(fileInfo.analysis.category)}>
                        {fileInfo.analysis.category}
                      </Badge>
                    )}
                  </div>
                  {fileInfo.status === 'completed' && fileInfo.analysis && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedFileForReview(fileInfo)}
                    >
                      Review
                    </Button>
                  )}
                </div>
                <Progress value={fileInfo.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Document Analysis Review */}
      {selectedFileForReview && selectedFileForReview.analysis && (
        <DocumentAnalysis
          analysis={selectedFileForReview.analysis}
          fileName={selectedFileForReview.file.name}
          documentId={selectedFileForReview.documentId!}
          onClose={() => setSelectedFileForReview(null)}
        />
      )}
    </div>
  );
}
