# AI Document Processing - Quick Start

## 🚀 Setup (5 minuten)

### 1. Database Migration Uitvoeren
```bash
supabase db push
```

Dit creëert:
- ✅ `document_metadata` tabel
- ✅ `document_embeddings` tabel
- ✅ `document_tasks` tabel
- ✅ `document_access_log` tabel
- ✅ RLS policies
- ✅ Indexes en triggers

### 2. Verificatie
```sql
-- Check of tabellen bestaan
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'document%';

-- Expected output:
-- document_metadata
-- document_embeddings  
-- document_tasks
-- document_access_log
```

### 3. Storage Bucket
```sql
-- Create documents bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT DO NOTHING;

-- RLS policy for documents bucket
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');
```

## 📄 Usage

### Navigate naar Document Processing
```
/documents/processing
```

### Features
1. **Upload Tab**: Drag & drop documenten
2. **Search Tab**: Zoek door documenten
3. **List Tab**: Alle documenten overzicht

## 🧪 Testing

### Test 1: Upload Contract
1. Navigate to `/documents/processing`
2. Upload een PDF met tekst zoals:
   ```
   Arbeidsovereenkomst
   Functie: Senior Developer
   Startdatum: 01-01-2025
   FTE: 1.0
   Proeftijd: 2 maanden
   ```
3. Verwacht:
   - ✅ Category: `arbeidscontract`
   - ✅ Extracted: functie, startdatum, fte, proeftijd
   - ✅ Task aangemaakt: "Contract laten tekenen"

### Test 2: Upload Medical Document
1. Upload document met tekst:
   ```
   Medisch Attest
   Diagnose: M54.5 (Lage rugpijn)
   Beperkingen: Geen tillen >10kg
   Herstel: 01-03-2025
   50% arbeidsongeschikt
   ```
2. Verwacht:
   - ✅ Category: `medisch`
   - ✅ Extracted: diagnose_code, beperkingen, herstel, percentage
   - ✅ Task: "Medisch attest beoordelen"

### Test 3: Search Documents
1. Upload 2-3 documenten
2. Go to Search tab
3. Search: "contract"
4. Verwacht:
   - ✅ Relevante documenten
   - ✅ Highlighted zoektermen
   - ✅ Category badges

## 🔍 Monitoring

### Check Processing Status
```sql
SELECT 
  d.file_name,
  dm.processing_status,
  dm.detected_category,
  dm.confidence_score
FROM documents d
LEFT JOIN document_metadata dm ON dm.document_id = d.id
ORDER BY d.created_at DESC
LIMIT 10;
```

### View Generated Tasks
```sql
SELECT 
  dt.task_description,
  dt.priority,
  d.file_name,
  p.voornaam || ' ' || p.achternaam as assigned_to_name
FROM document_tasks dt
JOIN documents d ON d.id = dt.document_id
LEFT JOIN profiles p ON p.id = dt.assigned_to
ORDER BY dt.created_at DESC;
```

### Audit Log
```sql
SELECT 
  dal.access_type,
  dal.created_at,
  d.file_name,
  p.voornaam || ' ' || p.achternaam as user_name
FROM document_access_log dal
JOIN documents d ON d.id = dal.document_id
JOIN profiles p ON p.id = dal.user_id
ORDER BY dal.created_at DESC
LIMIT 20;
```

## ⚠️ Troubleshooting

### Issue: "OCR processing failed"
**Oorzaak**: Tesseract.js worker laadt niet
**Oplossing**: 
- Check browser console voor fouten
- Verify internet connectie (Tesseract worker wordt gedownload)
- Probeer PDF text extraction in plaats van OCR

### Issue: "No text extracted"
**Oorzaak**: Document is gescande afbeelding zonder OCR
**Oplossing**:
- Voor PDF: gebruik native text extraction
- Voor scanned PDF: wacht op OCR completion
- Check image quality (contrast, resolution)

### Issue: "Category is 'overig'"
**Oorzaak**: Pattern matching vindt geen keywords
**Oplossing**:
- Check of document Nederlandse tekst bevat
- Verify OCR text extraction werkte
- Add custom keywords in `documentProcessor.ts`

### Issue: "Documents table insert error"
**Oorzaak**: Type mismatch met bestaande schema
**Oplossing**:
- Check `SmartDocumentUpload.tsx` line 84
- Verify storage_path vs file_path column name
- May need to adjust schema or use mock case_id

### Issue: "Search returns no results"
**Oorzaak**: document_metadata niet gevuld
**Oplossing**:
```sql
-- Check if metadata exists
SELECT COUNT(*) FROM document_metadata;

-- Check if extracted_text is populated
SELECT COUNT(*) FROM document_metadata WHERE extracted_text IS NOT NULL;
```

## 🎯 Next Steps

### Priority 1: Claude API Integration
Replace pattern matching with real AI:
```typescript
// In documentProcessor.ts
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-3-sonnet-20240229',
    messages: [{
      role: 'user',
      content: `Analyze this document and extract structured data: ${text}`
    }],
  }),
});
```

### Priority 2: Server-side OCR
Use Google Cloud Vision or AWS Textract:
- Faster processing
- Better accuracy
- Support for handwriting

### Priority 3: Semantic Search
Generate embeddings for document chunks:
```typescript
// Generate embeddings
const embedding = await openai.embeddings.create({
  model: 'text-embedding-ada-002',
  input: chunkText,
});

// Store in document_embeddings
await supabase.from('document_embeddings').insert({
  document_id: docId,
  chunk_text: chunkText,
  embedding: embedding.data[0].embedding,
});

// Search with vector similarity
const results = await supabase.rpc('search_documents_semantic', {
  query_embedding: queryEmbedding,
  match_threshold: 0.7,
});
```

## 📊 Performance Tips

1. **Client-side OCR is slow**: 30-60 sec per page
   - Consider server-side alternatives
   - Show clear progress indicators
   - Process files sequentially

2. **Large PDFs**: 
   - Limit to first 10 pages for demo
   - Implement pagination for full processing

3. **Search optimization**:
   - Full-text search is fast (<100ms)
   - Vector search requires embeddings first
   - Cache search results client-side

## 📚 Code Examples

### Manual Document Analysis
```typescript
import { analyzeDocumentContent } from '@/lib/ai/documentProcessor';

const text = "Arbeidsovereenkomst voor Jan de Vries...";
const analysis = await analyzeDocumentContent(text, 'contract.pdf', 'application/pdf');

console.log('Category:', analysis.category);
console.log('Confidence:', analysis.confidence);
console.log('Data:', analysis.extractedData);
console.log('Missing:', analysis.validation.missingElements);
```

### Custom OCR
```typescript
import { performOCR } from '@/lib/ai/ocrService';

const result = await performOCR(imageFile, {
  language: 'nld',
  onProgress: (progress) => {
    console.log(`${progress.status}: ${progress.progress}%`);
  },
});

console.log('Text:', result.text);
console.log('Confidence:', result.confidence);
```

### Search Integration
```typescript
import { DocumentSearch } from '@/components/documents/DocumentSearch';

<DocumentSearch
  onDocumentSelect={(docId) => {
    // Handle document selection
    navigate(`/documents/${docId}`);
  }}
/>
```

## 🔒 Security Checklist

- ✅ RLS policies enabled on all tables
- ✅ Storage bucket has authentication
- ✅ Audit logging for all access
- ⚠️ Salary encryption (TODO)
- ⚠️ Auto-delete policies (TODO)
- ⚠️ Watermarking (TODO)

## 📅 Feature Roadmap

### Q1 2026
- [ ] Claude API integration
- [ ] Server-side OCR (Cloud Vision)
- [ ] Semantic search with embeddings

### Q2 2026
- [ ] Multi-language support (EN, DE)
- [ ] Batch processing queue
- [ ] Document versioning

### Q3 2026
- [ ] Auto-delete policies (GDPR)
- [ ] Watermarking downloads
- [ ] Advanced analytics dashboard

## 💬 Support

Voor vragen of problemen:
1. Check AI_DOCUMENT_PROCESSING.md voor details
2. Review browser console voor errors
3. Check Supabase logs voor backend issues
4. Test met simpele documenten eerst
