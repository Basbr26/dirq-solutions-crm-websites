/**
 * OCR Service using Tesseract.js
 * Client-side OCR for document text extraction
 */

import { createWorker, type Worker } from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  language: string;
  processingTime: number;
}

export interface OCRProgress {
  status: 'initializing' | 'loading' | 'recognizing' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
}

let worker: Worker | null = null;

/**
 * Initialize Tesseract worker
 */
async function initializeWorker(language = 'nld'): Promise<Worker> {
  if (worker) return worker;

  worker = await createWorker(language, undefined, {
    logger: (m) => {
      console.log('Tesseract:', m);
    },
  });

  return worker;
}

/**
 * Perform OCR on image/PDF
 */
export async function performOCR(
  file: File | Blob | string,
  options: {
    language?: string;
    onProgress?: (progress: OCRProgress) => void;
  } = {}
): Promise<OCRResult> {
  const startTime = Date.now();
  const language = options.language || 'nld';

  try {
    // Initialize
    options.onProgress?.({
      status: 'initializing',
      progress: 0,
      message: 'OCR wordt geïnitialiseerd...',
    });

    const ocrWorker = await initializeWorker(language);

    // Load image
    options.onProgress?.({
      status: 'loading',
      progress: 20,
      message: 'Document wordt geladen...',
    });

    // Recognize
    options.onProgress?.({
      status: 'recognizing',
      progress: 40,
      message: 'Tekst wordt herkend...',
    });

    const result = await ocrWorker.recognize(file);

    options.onProgress?.({
      status: 'completed',
      progress: 100,
      message: 'OCR voltooid!',
    });

    const processingTime = Date.now() - startTime;

    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: [], // Word-level data not available in current Tesseract.js API
      language,
      processingTime,
    };
  } catch (error) {
    console.error('OCR error:', error);
    options.onProgress?.({
      status: 'error',
      progress: 0,
      message: 'OCR fout opgetreden',
    });
    throw new Error('OCR processing failed');
  }
}

/**
 * Extract text from PDF using pdf.js
 */
export async function extractTextFromPDF(
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> {
  // Import pdf.js dynamically
  const pdfjsLib = await import('pdfjs-dist');
  
  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const numPages = pdf.numPages;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    const pageText = textContent.items
      .map((item: unknown) => (item as { str: string }).str)
      .join(' ');
    
    fullText += pageText + '\n\n';

    onProgress?.(Math.round((pageNum / numPages) * 100));
  }

  return fullText.trim();
}

/**
 * Check if file is PDF
 */
export function isPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Check if file is image
 */
export function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Convert PDF page to image for OCR
 */
export async function convertPDFPageToImage(
  file: File,
  pageNumber = 1
): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport,
    canvas: canvas,
  }).promise;

  return canvas.toDataURL('image/png');
}

/**
 * Cleanup worker
 */
export async function cleanupOCR(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * Batch OCR for multiple files
 */
export async function batchOCR(
  files: File[],
  onFileProgress?: (fileIndex: number, progress: OCRProgress) => void
): Promise<OCRResult[]> {
  const results: OCRResult[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const result = await performOCR(file, {
      onProgress: (progress) => onFileProgress?.(i, progress),
    });
    results.push(result);
  }

  return results;
}
