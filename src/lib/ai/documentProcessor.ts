/**
 * AI Document Processor
 * Analyzes documents using Claude API and extracts structured data
 */

import { supabase } from '@/integrations/supabase/client';

export type DocumentCategory =
  | 'arbeidscontract'
  | 'medisch'
  | 'training'
  | 'persoonlijk'
  | 'factuur'
  | 'overig';

export interface DocumentAnalysisResult {
  category: DocumentCategory;
  confidence: number;
  extractedData: Record<string, unknown>;
  validation: {
    isComplete: boolean;
    isValid: boolean;
    missingElements: string[];
    notes: string[];
  };
  properties: {
    hasSignature: boolean;
    expiryDate?: string;
    keyDates: Array<{ date: string; description: string }>;
    mentionedNames: string[];
    mentionedAmounts: number[];
  };
  suggestedActions: Array<{
    type: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Analyze document content using AI
 */
export async function analyzeDocumentContent(
  text: string,
  fileName: string,
  fileType: string
): Promise<DocumentAnalysisResult> {
  // In production, this would call Claude API
  // For demo, we use pattern matching and heuristics

  const lowerText = text.toLowerCase();
  const analysis: DocumentAnalysisResult = {
    category: 'overig',
    confidence: 0,
    extractedData: {},
    validation: {
      isComplete: false,
      isValid: true,
      missingElements: [],
      notes: [],
    },
    properties: {
      hasSignature: false,
      keyDates: [],
      mentionedNames: [],
      mentionedAmounts: [],
    },
    suggestedActions: [],
  };

  // Categorize document
  const categoryResult = categorizeDocument(lowerText, fileName);
  analysis.category = categoryResult.category;
  analysis.confidence = categoryResult.confidence;

  // Extract data based on category
  switch (analysis.category) {
    case 'arbeidscontract':
      analysis.extractedData = extractContractData(text);
      analysis.validation = validateContract(analysis.extractedData, text);
      analysis.suggestedActions.push({
        type: 'create_task',
        description: 'Taak aanmaken: Contract laten tekenen door medewerker',
        priority: 'high',
      });
      break;

    case 'medisch':
      analysis.extractedData = extractMedicalData(text);
      analysis.validation = validateMedicalDocument(analysis.extractedData, text);
      analysis.suggestedActions.push({
        type: 'create_task',
        description: 'Taak aanmaken: Medisch attest beoordelen',
        priority: 'high',
      });
      break;

    case 'training':
      analysis.extractedData = extractTrainingData(text);
      analysis.validation = validateTrainingDocument(analysis.extractedData, text);
      analysis.suggestedActions.push({
        type: 'update_skills',
        description: 'Skills matrix updaten met nieuw certificaat',
        priority: 'medium',
      });
      break;

    case 'factuur':
      analysis.extractedData = extractInvoiceData(text);
      analysis.validation = validateInvoice(analysis.extractedData, text);
      break;
  }

  // Extract common properties
  analysis.properties = extractDocumentProperties(text);

  return analysis;
}

/**
 * Categorize document based on content
 */
function categorizeDocument(
  text: string,
  fileName: string
): { category: DocumentCategory; confidence: number } {
  const patterns = {
    arbeidscontract: [
      'arbeidsovereenkomst',
      'employment contract',
      'functieomschrijving',
      'salaris',
      'fte',
      'proeftijd',
      'opzegtermijn',
    ],
    medisch: [
      'medisch attest',
      'diagnose',
      'behandelplan',
      'arbeidsongeschikt',
      'bedrijfsarts',
      'ziekmelding',
      'herstelprognose',
    ],
    training: [
      'certificaat',
      'diploma',
      'training',
      'opleiding',
      'cursus',
      'examen',
      'accreditatie',
    ],
    factuur: [
      'factuur',
      'invoice',
      'btw',
      'vat',
      'totaalbedrag',
      'factuurnummer',
      'betaaltermijn',
    ],
    persoonlijk: ['identiteitsbewijs', 'paspoort', 'rijbewijs', 'bsn', 'burgerservicenummer'],
  };

  const scores: Record<string, number> = {};

  for (const [category, keywords] of Object.entries(patterns)) {
    let score = 0;
    keywords.forEach((keyword) => {
      if (text.includes(keyword)) {
        score += 1;
      }
      if (fileName.toLowerCase().includes(keyword)) {
        score += 0.5;
      }
    });
    scores[category] = score;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) {
    return { category: 'overig', confidence: 0.5 };
  }

  const category = Object.keys(scores).find((key) => scores[key] === maxScore) as DocumentCategory;
  const confidence = Math.min(0.95, 0.5 + maxScore * 0.1);

  return { category, confidence };
}

/**
 * Extract contract data
 */
function extractContractData(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Extract functie
  const functieMatch = text.match(/functie[:\s]+([^\n]+)/i);
  if (functieMatch) data.functie = functieMatch[1].trim();

  // Extract startdatum
  const startdatumMatch = text.match(
    /start(?:datum)?[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
  );
  if (startdatumMatch) data.startdatum = startdatumMatch[1];

  // Extract FTE
  const fteMatch = text.match(/(\d+[.,]?\d*)\s*fte/i);
  if (fteMatch) data.fte = parseFloat(fteMatch[1].replace(',', '.'));

  // Extract uren
  const urenMatch = text.match(/(\d+)\s*uur/i);
  if (urenMatch) data.uren_per_week = parseInt(urenMatch[1]);

  // Extract proeftijd
  const proeftijdMatch = text.match(/proeftijd[:\s]+(\d+)\s*(maand|week)/i);
  if (proeftijdMatch) {
    data.proeftijd_periode = `${proeftijdMatch[1]} ${proeftijdMatch[2]}`;
  }

  // Check for temporary contract
  const tijdelijkMatch = text.match(/tijdelijke?\s*(?:arbeidsovereenkomst)?/i);
  if (tijdelijkMatch) {
    data.contract_type = 'tijdelijk';
    const einddatumMatch = text.match(/eind(?:datum)?[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
    if (einddatumMatch) data.einddatum = einddatumMatch[1];
  } else {
    data.contract_type = 'vast';
  }

  return data;
}

/**
 * Extract medical data
 */
function extractMedicalData(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Extract diagnose code (ICD-10 format)
  const diagnoseMatch = text.match(/([A-Z]\d{2}\.?\d?)/g);
  if (diagnoseMatch) data.diagnose_codes = diagnoseMatch;

  // Extract beperkingen
  const beperkingenMatch = text.match(/beperkingen?[:\s]+([^\n]+)/i);
  if (beperkingenMatch) data.beperkingen = beperkingenMatch[1].trim();

  // Extract herstel datum
  const herstelMatch = text.match(
    /(?:herstel|verwacht terug|re(?:ï|i)ntegratie)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
  );
  if (herstelMatch) data.verwachte_hersteldatum = herstelMatch[1];

  // Extract arbeidsongeschiktheid percentage
  const percentageMatch = text.match(/(\d+)%\s*arbeidsongeschikt/i);
  if (percentageMatch) data.arbeidsongeschiktheid_percentage = parseInt(percentageMatch[1]);

  return data;
}

/**
 * Extract training data
 */
function extractTrainingData(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Extract certificaat naam
  const certMatch = text.match(/certificaat[:\s]+([^\n]+)/i);
  if (certMatch) data.certificaat_naam = certMatch[1].trim();

  // Extract provider
  const providerMatch = text.match(/(?:uitgegeven door|provider|instituut)[:\s]+([^\n]+)/i);
  if (providerMatch) data.training_provider = providerMatch[1].trim();

  // Extract geldigheid
  const geldigheidMatch = text.match(/geldig tot[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
  if (geldigheidMatch) data.geldig_tot = geldigheidMatch[1];

  // Extract datum behaald
  const datumMatch = text.match(/(?:datum|behaald op)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
  if (datumMatch) data.datum_behaald = datumMatch[1];

  return data;
}

/**
 * Extract invoice data
 */
function extractInvoiceData(text: string): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  // Extract factuurnummer
  const invoiceNumberMatch = text.match(/factuurnummer[:\s]+([^\n]+)/i);
  if (invoiceNumberMatch) data.factuurnummer = invoiceNumberMatch[1].trim();

  // Extract bedragen
  const amountMatches = text.match(/€\s*(\d+[.,]\d{2})/g);
  if (amountMatches) {
    const amounts = amountMatches.map((m) =>
      parseFloat(m.replace('€', '').trim().replace(',', '.'))
    );
    data.totaalbedrag = Math.max(...amounts);
  }

  // Extract datum
  const datumMatch = text.match(/datum[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
  if (datumMatch) data.factuurdatum = datumMatch[1];

  // Extract betaaltermijn
  const betaalMatch = text.match(/betaal(?:termijn)?[:\s]+(\d+)\s*dag/i);
  if (betaalMatch) data.betaaltermijn_dagen = parseInt(betaalMatch[1]);

  return data;
}

/**
 * Validate contract completeness
 */
function validateContract(
  data: Record<string, unknown>,
  text: string
): { isComplete: boolean; isValid: boolean; missingElements: string[]; notes: string[] } {
  const requiredFields = ['functie', 'startdatum', 'fte', 'contract_type'];
  const missing: string[] = [];
  const notes: string[] = [];

  requiredFields.forEach((field) => {
    if (!data[field]) {
      missing.push(field);
    }
  });

  // Check for signature
  if (!text.toLowerCase().includes('handtekening') && !text.toLowerCase().includes('getekend')) {
    notes.push('Geen handtekening gedetecteerd');
  }

  // Check proeftijd for new contracts
  if (!data.proeftijd_periode) {
    notes.push('Proeftijd periode niet gevonden');
  }

  return {
    isComplete: missing.length === 0,
    isValid: true,
    missingElements: missing,
    notes,
  };
}

/**
 * Validate medical document
 */
function validateMedicalDocument(
  data: Record<string, unknown>,
  text: string
): { isComplete: boolean; isValid: boolean; missingElements: string[]; notes: string[] } {
  const missing: string[] = [];
  const notes: string[] = [];

  if (!data.diagnose_codes) {
    missing.push('diagnose_code');
  }

  if (!data.beperkingen) {
    notes.push('Beperkingen niet expliciet vermeld');
  }

  if (!data.verwachte_hersteldatum) {
    notes.push('Verwachte hersteldatum ontbreekt');
  }

  return {
    isComplete: missing.length === 0,
    isValid: true,
    missingElements: missing,
    notes,
  };
}

/**
 * Validate training document
 */
function validateTrainingDocument(
  data: Record<string, unknown>,
  text: string
): { isComplete: boolean; isValid: boolean; missingElements: string[]; notes: string[] } {
  const missing: string[] = [];
  const notes: string[] = [];

  if (!data.certificaat_naam) {
    missing.push('certificaat_naam');
  }

  if (!data.datum_behaald) {
    missing.push('datum_behaald');
  }

  if (data.geldig_tot && typeof data.geldig_tot === 'string') {
    const expiryDate = new Date(data.geldig_tot);
    if (expiryDate < new Date()) {
      notes.push('⚠️ Certificaat is verlopen');
    }
  }

  return {
    isComplete: missing.length === 0,
    isValid: true,
    missingElements: missing,
    notes,
  };
}

/**
 * Validate invoice
 */
function validateInvoice(
  data: Record<string, unknown>,
  text: string
): { isComplete: boolean; isValid: boolean; missingElements: string[]; notes: string[] } {
  const missing: string[] = [];
  const notes: string[] = [];

  if (!data.factuurnummer) {
    missing.push('factuurnummer');
  }

  if (!data.totaalbedrag) {
    missing.push('totaalbedrag');
  }

  if (!data.factuurdatum) {
    missing.push('factuurdatum');
  }

  return {
    isComplete: missing.length === 0,
    isValid: true,
    missingElements: missing,
    notes,
  };
}

/**
 * Extract common document properties
 */
function extractDocumentProperties(text: string): {
  hasSignature: boolean;
  expiryDate?: string;
  keyDates: Array<{ date: string; description: string }>;
  mentionedNames: string[];
  mentionedAmounts: number[];
} {
  // Check for signature
  const hasSignature =
    text.toLowerCase().includes('handtekening') ||
    text.toLowerCase().includes('getekend') ||
    text.toLowerCase().includes('ondertekend');

  // Extract dates
  const dateMatches = text.match(/\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g) || [];
  const keyDates = dateMatches.slice(0, 5).map((date) => ({
    date,
    description: 'Gedetecteerde datum',
  }));

  // Extract amounts
  const amountMatches = text.match(/€\s*(\d+[.,]\d{2})/g) || [];
  const mentionedAmounts = amountMatches
    .map((m) => parseFloat(m.replace('€', '').trim().replace(',', '.')))
    .filter((n) => !isNaN(n));

  // Extract names (simplified - in production use NER)
  const mentionedNames: string[] = [];
  const namePattern = /(?:dhr\.?|mw\.?|de heer|mevrouw)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    mentionedNames.push(match[1]);
  }

  return {
    hasSignature,
    keyDates,
    mentionedNames: [...new Set(mentionedNames)],
    mentionedAmounts: [...new Set(mentionedAmounts)],
  };
}

/**
 * Save analysis results to database
 */
export async function saveDocumentAnalysis(
  documentId: string,
  userId: string,
  analysis: DocumentAnalysisResult,
  extractedText: string
): Promise<void> {
  const { error } = await (supabase.from('document_metadata') as any).insert({
    document_id: documentId,
    detected_category: analysis.category,
    confidence_score: analysis.confidence,
    extracted_text: extractedText,
    extracted_data: analysis.extractedData,
    is_complete: analysis.validation.isComplete,
    is_valid: analysis.validation.isValid,
    validation_notes: analysis.validation.notes,
    missing_elements: analysis.validation.missingElements,
    has_signature: analysis.properties.hasSignature,
    key_dates: analysis.properties.keyDates,
    mentioned_names: analysis.properties.mentionedNames,
    mentioned_amounts: analysis.properties.mentionedAmounts,
    processing_status: 'completed',
    processed_at: new Date().toISOString(),
    processed_by: userId,
  });

  if (error) {
    console.error('Failed to save document analysis:', error);
    throw error;
  }
}

/**
 * Generate tasks based on document analysis
 */
export async function generateDocumentTasks(
  documentId: string,
  analysis: DocumentAnalysisResult,
  employeeId?: string
): Promise<void> {
  for (const action of analysis.suggestedActions) {
    if (action.type === 'create_task') {
      await supabase.from('document_tasks').insert({
        document_id: documentId,
        task_type: action.type,
        task_description: action.description,
        assigned_to: employeeId,
        priority: action.priority,
        generation_reason: `Automatisch gegenereerd op basis van document type: ${analysis.category}`,
      });
    }
  }
}
