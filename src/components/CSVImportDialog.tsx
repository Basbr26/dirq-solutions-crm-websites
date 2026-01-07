/**
 * CSV Import Dialog
 * Generic component for importing CSV data into any CRM entity
 */

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';
import Papa from 'papaparse';

interface CSVImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiredFields: string[]; // Field names that must be mapped
  optionalFields?: string[]; // Optional field names
  onImport: (data: any[], fieldMapping: Record<string, string>) => Promise<{ success: number; errors: number }>;
  exampleDownloadUrl?: string;
}

interface ParsedData {
  headers: string[];
  rows: any[][];
  preview: any[][];
}

interface ImportResult {
  total: number;
  success: number;
  errors: number;
  errorMessages: string[];
}

export function CSVImportDialog({
  open,
  onOpenChange,
  title,
  description,
  requiredFields,
  optionalFields = [],
  onImport,
  exampleDownloadUrl,
}: CSVImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Alleen CSV bestanden zijn toegestaan');
      return;
    }

    setFile(selectedFile);
    setParseError(null);

    // Parse CSV
    Papa.parse(selectedFile, {
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError(results.errors[0].message);
          return;
        }

        const headers = results.data[0] as string[];
        const rows = results.data.slice(1) as any[][];
        const preview = rows.slice(0, 5); // First 5 rows for preview

        setParsedData({ headers, rows, preview });

        // Auto-map fields based on header names (case-insensitive)
        const autoMapping: Record<string, string> = {};
        [...requiredFields, ...optionalFields].forEach((field) => {
          const matchingHeader = headers.find(
            (h) => h.toLowerCase().trim() === field.toLowerCase().trim()
          );
          if (matchingHeader) {
            autoMapping[field] = matchingHeader;
          }
        });
        setFieldMapping(autoMapping);

        setStep('mapping');
      },
      error: (error) => {
        setParseError(error.message);
      },
    });
  }, [requiredFields, optionalFields]);

  const handleFieldMappingChange = (targetField: string, sourceColumn: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [targetField]: sourceColumn,
    }));
  };

  const validateMapping = useCallback(() => {
    const missingFields = requiredFields.filter((field) => !fieldMapping[field]);
    return missingFields.length === 0;
  }, [requiredFields, fieldMapping]);

  const handlePreview = () => {
    if (!validateMapping()) {
      toast.error('Alle verplichte velden moeten gekoppeld worden');
      return;
    }
    setStep('preview');
  };

  const handleImport = async () => {
    if (!parsedData) return;

    setStep('importing');
    setImportProgress(0);

    try {
      // Convert rows to objects using field mapping
      const mappedData = parsedData.rows
        .filter(row => row.some(cell => cell !== '')) // Filter empty rows
        .map((row) => {
          const obj: any = {};
          Object.entries(fieldMapping).forEach(([targetField, sourceColumn]) => {
            const columnIndex = parsedData.headers.indexOf(sourceColumn);
            if (columnIndex !== -1) {
              obj[targetField] = row[columnIndex];
            }
          });
          return obj;
        });

      // Call import function
      const result = await onImport(mappedData, fieldMapping);

      setImportResult({
        total: mappedData.length,
        success: result.success,
        errors: result.errors,
        errorMessages: [],
      });

      setStep('complete');
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Import mislukt: ' + error.message);
      setStep('mapping');
    }
  };

  const handleClose = () => {
    // Reset state
    setStep('upload');
    setFile(null);
    setParsedData(null);
    setFieldMapping({});
    setImportProgress(0);
    setImportResult(null);
    setParseError(null);
    onOpenChange(false);
  };

  const getMappedValue = (row: any[], field: string) => {
    if (!parsedData || !fieldMapping[field]) return '';
    const sourceColumn = fieldMapping[field];
    const columnIndex = parsedData.headers.indexOf(sourceColumn);
    return columnIndex !== -1 ? row[columnIndex] : '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[95vh] sm:h-auto max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 space-y-4">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <div className="text-sm font-medium mb-1">
                    Klik om CSV bestand te selecteren
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Of sleep bestand hier naartoe
                  </div>
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              {file && (
                <Badge variant="secondary" className="gap-2">
                  <FileText className="h-3 w-3" />
                  {file.name}
                </Badge>
              )}
            </div>

            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{parseError}</AlertDescription>
              </Alert>
            )}

            {exampleDownloadUrl && (
              <Alert>
                <AlertDescription>
                  Download een{' '}
                  <a
                    href={exampleDownloadUrl}
                    className="underline font-medium"
                    download
                  >
                    voorbeeld CSV bestand
                  </a>{' '}
                  om de juiste format te zien.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && parsedData && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden">
            <div className="text-sm text-muted-foreground">
              Koppel de kolommen uit je CSV bestand aan de juiste velden
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {/* Required Fields */}
                <div>
                  <div className="text-sm font-medium mb-2">Verplichte velden</div>
                  <div className="space-y-3">
                    {requiredFields.map((field) => (
                      <div key={field} className="flex items-center gap-3">
                        <Label className="w-40 text-right">{field}</Label>
                        <Select
                          value={fieldMapping[field] || ''}
                          onValueChange={(value) => handleFieldMappingChange(field, value)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecteer kolom..." />
                          </SelectTrigger>
                          <SelectContent>
                            {parsedData.headers.map((header) => (
                              <SelectItem key={header} value={header}>
                                {header}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldMapping[field] ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Fields */}
                {optionalFields.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Optionele velden</div>
                    <div className="space-y-3">
                      {optionalFields.map((field) => (
                        <div key={field} className="flex items-center gap-3">
                          <Label className="w-40 text-right text-muted-foreground">
                            {field}
                          </Label>
                          <Select
                            value={fieldMapping[field] || ''}
                            onValueChange={(value) => handleFieldMappingChange(field, value)}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Selecteer kolom (optioneel)..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Niet koppelen</SelectItem>
                              {parsedData.headers.map((header) => (
                                <SelectItem key={header} value={header}>
                                  {header}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <Alert>
              <AlertDescription>
                {parsedData.rows.length} rijen gevonden (eerste 5 worden weergegeven in preview)
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && parsedData && (
          <div className="space-y-4 py-4 flex-1 overflow-hidden">
            <div className="text-sm text-muted-foreground">
              Preview van de eerste 5 rijen
            </div>

            <ScrollArea className="h-[400px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    {[...requiredFields, ...optionalFields]
                      .filter((field) => fieldMapping[field])
                      .map((field) => (
                        <th key={field} className="text-left p-2 font-medium">
                          {field}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.preview.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b">
                      {[...requiredFields, ...optionalFields]
                        .filter((field) => fieldMapping[field])
                        .map((field) => (
                          <td key={field} className="p-2">
                            {getMappedValue(row, field)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>
        )}

        {/* Importing Step */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <div className="text-sm font-medium mb-4">Importeren...</div>
              <Progress value={importProgress} className="w-full" />
              <div className="text-xs text-muted-foreground mt-2">
                Even geduld, data wordt geïmporteerd
              </div>
            </div>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && importResult && (
          <div className="space-y-4 py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              {importResult.success > 0 && (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              )}
              <div className="text-center">
                <div className="text-lg font-semibold mb-2">Import voltooid!</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Totaal: {importResult.total} rijen</div>
                  <div className="text-green-600">Succesvol: {importResult.success}</div>
                  {importResult.errors > 0 && (
                    <div className="text-red-600">Fouten: {importResult.errors}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose}>
              Annuleren
            </Button>
          )}

          {step === 'mapping' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload');
                  setParsedData(null);
                  setFile(null);
                }}
              >
                Terug
              </Button>
              <Button onClick={handlePreview} disabled={!validateMapping()}>
                Volgende: Preview
              </Button>
            </>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Terug
              </Button>
              <Button onClick={handleImport}>Importeren</Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose}>Sluiten</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
