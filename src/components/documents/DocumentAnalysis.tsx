/**
 * Document Analysis Review Component
 * Shows AI-extracted data with approval/edit capabilities
 */

import { useState } from 'react';
import { logger } from '@/lib/logger';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  User,
  DollarSign,
  FileText,
  Sparkles,
  Edit2,
  Save,
  X,
} from 'lucide-react';
import type { DocumentAnalysisResult } from '@/lib/ai/documentProcessor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentAnalysisProps {
  analysis: DocumentAnalysisResult;
  fileName: string;
  documentId: string;
  onClose: () => void;
  onApprove?: (updatedData: Record<string, unknown>) => void;
}

export function DocumentAnalysis({
  analysis,
  fileName,
  documentId,
  onClose,
  onApprove,
}: DocumentAnalysisProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(analysis.extractedData);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const getCategoryInfo = (category: string) => {
    const info: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
      arbeidscontract: {
        label: 'Arbeidscontract',
        color: 'bg-blue-500',
        icon: FileText,
      },
      medisch: {
        label: 'Medisch Document',
        color: 'bg-red-500',
        icon: FileText,
      },
      training: {
        label: 'Training Certificaat',
        color: 'bg-green-500',
        icon: FileText,
      },
      factuur: {
        label: 'Factuur',
        color: 'bg-yellow-500',
        icon: DollarSign,
      },
      persoonlijk: {
        label: 'Persoonlijk Document',
        color: 'bg-purple-500',
        icon: User,
      },
      overig: {
        label: 'Overig',
        color: 'bg-gray-500',
        icon: FileText,
      },
    };
    return info[category] || info.overig;
  };

  const categoryInfo = getCategoryInfo(analysis.category);
  const Icon = categoryInfo.icon;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // @ts-expect-error - document_metadata table not yet in generated types, using type assertion
      const { error } = await (supabase as { from: (table: string) => { update: (data: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: unknown }> } } })
        .from('document_metadata')
        .update({
          extracted_data: editedData,
        })
        .eq('document_id', documentId);

      if (error) throw error;

      toast({
        title: 'Wijzigingen opgeslagen',
        description: 'De geëxtraheerde data is bijgewerkt.',
      });

      setIsEditing(false);
      onApprove?.(editedData);
    } catch (error) {
      logger.error('Failed to save document analysis changes', { documentId, error });
      toast({
        variant: 'destructive',
        title: 'Opslaan mislukt',
        description: 'Kon wijzigingen niet opslaan.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderEditableField = (key: string, value: unknown) => {
    const displayKey = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());

    if (isEditing) {
      return (
        <div key={key} className="space-y-2">
          <Label htmlFor={key}>{displayKey}</Label>
          {typeof value === 'string' && value.length > 50 ? (
            <Textarea
              id={key}
              value={String(editedData[key] || '')}
              onChange={(e) =>
                setEditedData({ ...editedData, [key]: e.target.value })
              }
              rows={3}
            />
          ) : (
            <Input
              id={key}
              value={String(editedData[key] || '')}
              onChange={(e) =>
                setEditedData({ ...editedData, [key]: e.target.value })
              }
            />
          )}
        </div>
      );
    }

    return (
      <div key={key} className="flex justify-between py-2">
        <span className="text-sm text-muted-foreground">{displayKey}:</span>
        <span className="text-sm font-medium">{value?.toString() || '-'}</span>
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <CardTitle>Document Analyse</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-2">
              {fileName}
              <Badge className={categoryInfo.color}>{categoryInfo.label}</Badge>
              <Badge variant="outline">
                {Math.round(analysis.confidence * 100)}% zekerheid
              </Badge>
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Validation Status */}
        <Alert
          className={
            analysis.validation.isComplete
              ? 'border-green-500 bg-green-50'
              : 'border-yellow-500 bg-yellow-50'
          }
        >
          {analysis.validation.isComplete ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Document is compleet</strong> - Alle benodigde informatie is aanwezig.
              </AlertDescription>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Document is incompleet</strong>
                <ul className="mt-2 list-disc list-inside">
                  {analysis.validation.missingElements.map((el) => (
                    <li key={el}>{el}</li>
                  ))}
                </ul>
              </AlertDescription>
            </>
          )}
        </Alert>

        {/* Validation Notes */}
        {analysis.validation.notes.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {analysis.validation.notes.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* Extracted Data */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">Geëxtraheerde Data</h3>
            </div>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Bewerken
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsEditing(false);
                    setEditedData(analysis.extractedData);
                  }}
                  disabled={isSaving}
                >
                  Annuleren
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Opslaan...' : 'Opslaan'}
                </Button>
              </div>
            )}
          </div>

          {Object.keys(editedData).length > 0 ? (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              {Object.entries(editedData).map(([key, value]) =>
                renderEditableField(key, value)
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Geen data geëxtraheerd uit dit document.
            </p>
          )}
        </div>

        <Separator />

        {/* Document Properties */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Document Eigenschappen</h3>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Handtekening:</span>
              <span className="text-sm font-medium flex items-center gap-2">
                {analysis.properties.hasSignature ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Aanwezig
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    Niet gevonden
                  </>
                )}
              </span>
            </div>

            {analysis.properties.keyDates.length > 0 && (
              <div className="py-2">
                <span className="text-sm text-muted-foreground">Belangrijke datums:</span>
                <ul className="mt-2 space-y-1">
                  {analysis.properties.keyDates.map((dateInfo, idx) => (
                    <li key={idx} className="text-sm flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {dateInfo.date} - {dateInfo.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.properties.mentionedNames.length > 0 && (
              <div className="py-2">
                <span className="text-sm text-muted-foreground">Genoemde personen:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.properties.mentionedNames.map((name) => (
                    <Badge key={name} variant="secondary">
                      <User className="h-3 w-3 mr-1" />
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.properties.mentionedAmounts.length > 0 && (
              <div className="py-2">
                <span className="text-sm text-muted-foreground">Bedragen:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.properties.mentionedAmounts.map((amount, idx) => (
                    <Badge key={idx} variant="secondary">
                      <DollarSign className="h-3 w-3 mr-1" />€ {amount.toFixed(2)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Actions */}
        {analysis.suggestedActions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Aanbevolen Acties</h3>
              <div className="space-y-2">
                {analysis.suggestedActions.map((action, idx) => (
                  <Alert key={idx}>
                    <Sparkles className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{action.description}</p>
                          <Badge
                            className="mt-2"
                            variant={
                              action.priority === 'high'
                                ? 'destructive'
                                : action.priority === 'medium'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {action.priority} prioriteit
                          </Badge>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Sluiten
        </Button>
        <Button
          onClick={() => {
            toast({
              title: 'Data goedgekeurd',
              description: 'De geëxtraheerde data is geaccepteerd.',
            });
            onApprove?.(editedData);
            onClose();
          }}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Goedkeuren
        </Button>
      </CardFooter>
    </Card>
  );
}
