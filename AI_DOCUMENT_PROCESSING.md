# AI Document Processing System

## 📄 Overzicht

Het AI Document Processing systeem biedt automatische document analyse, categorisatie en data extractie met behulp van OCR (Tesseract.js) en AI pattern matching. Het systeem extraheert sleutelinformatie uit verschillende documenttypes en genereert automatisch taken en suggesties.

## ✨ Features

### 1. **Smart Upload met Auto-categorisatie**
- Drag & drop interface
- Real-time upload progress
- Automatische detectie documenttype:
  - 📄 Arbeidscontracten
  - 🏥 Medische documenten
  - 🎓 Training certificaten
  - 👤 Persoonlijke documenten
  - 💰 Facturen
  - 📋 Overig
- Confidence score voor categorisatie (50-95%)

### 2. **OCR & Text Extraction**
- **Tesseract.js** voor client-side OCR
- **pdf.js** voor PDF text extraction
- Support voor:
  - PDF documenten
  - Afbeeldingen (PNG, JPG, JPEG, GIF)
  - Word documenten (.doc, .docx)
- Nederlandse taal OCR (kan uitgebreid worden)
- Real-time progress indicators

### 3. **Smart Data Extraction**

#### Bij Arbeidscontract:
- ✅ Functietitel
- ✅ Startdatum, einddatum
- ✅ FTE percentage
- ✅ Uren per week
- ✅ Proeftijd periode
- ✅ Contract type (vast/tijdelijk)
- ⚠️ Salaris (encrypted - niet geïmplementeerd)

#### Bij Medisch Document:
- ✅ Diagnose code (ICD-10 format)
- ✅ Beperkingen
- ✅ Verwachte hersteldatum
- ✅ Arbeidsongeschiktheid percentage

#### Bij Training Certificaat:
- ✅ Certificaat naam
- ✅ Training provider
- ✅ Datum behaald
- ✅ Geldigheid tot
- ⚠️ Validatie of verlopen

#### Bij Factuur:
- ✅ Factuurnummer
- ✅ Totaalbedrag
- ✅ Factuurdatum
- ✅ Betaaltermijn

### 4. **Document Validation**
- ✅ Completeness check (alle verplichte velden)
- ✅ Handtekening detectie
- ✅ Verloopdatum check
- ⚠️ AVG compliance check (basis implementatie)
- 📝 Validation notes met suggesties

### 5. **Auto-taak Generatie**
Automatische taken op basis van document type:
- Arbeidscontract → "Contract laten tekenen door medewerker"
- Medisch attest → "Medisch attest beoordelen"
- Training certificaat → "Skills matrix updaten"

### 6. **Document Search**
- **Full-text search** (PostgreSQL tsvector)
- Nederlandse taal support
- Filter op categorie
- Ranking op relevantie
- Highlighting van zoektermen
- ⚠️ Semantic search (voorbereid, niet actief)

### 7. **Document Properties Extraction**
- Alle datums in document
- Genoemde bedragen (€)
- Genoemde namen (basis NER)
- Handtekening detectie
- Key dates met context

## 🗄️ Database Schema

### `document_metadata`
```sql
- id: UUID
- document_id: UUID (FK → documents)
- detected_category: TEXT (arbeidscontract|medisch|training|persoonlijk|factuur|overig)
- confidence_score: DECIMAL(3,2)
- extracted_text: TEXT
- extracted_data: JSONB
- is_complete: BOOLEAN
- is_valid: BOOLEAN
- validation_notes: JSONB
- missing_elements: TEXT[]
- has_signature: BOOLEAN
- expiry_date: DATE
- key_dates: JSONB
- mentioned_names: TEXT[]
- mentioned_amounts: DECIMAL[]
- processing_status: TEXT
- processed_at: TIMESTAMP
- processed_by: UUID
```

### `document_embeddings` (Vector Search)
```sql
- id: UUID
- document_id: UUID
- embedding: vector(1536)
- chunk_text: TEXT
- chunk_index: INTEGER
```

### `document_tasks`
```sql
- id: UUID
- document_id: UUID
- task_id: UUID (FK → tasks)
- task_type: TEXT
- task_description: TEXT
- assigned_to: UUID
- due_date: DATE
- priority: TEXT
- generation_reason: TEXT
```

### `document_access_log` (Audit)
```sql
- id: UUID
- document_id: UUID
- user_id: UUID
- access_type: TEXT (view|download|edit|delete|share)
- ip_address: TEXT
- user_agent: TEXT
- created_at: TIMESTAMP
```

## 🔒 Security & Privacy

### Row Level Security (RLS)
- ✅ Users kunnen alleen eigen documenten zien
- ✅ HR kan alle documenten zien
- ✅ Audit logs alleen voor HR zichtbaar
- ✅ Document tasks zichtbaar voor assigned users + managers

### Data Protection
- ✅ Supabase Storage encryption at rest
- ⚠️ Auto-delete na X jaar (SQL trigger niet actief)
- ✅ Audit logging van alle document toegang
- ⚠️ Watermarking (niet geïmplementeerd)
- ⚠️ Salary encryption (niet geïmplementeerd)

### GDPR Compliance
- ✅ Audit trail
- ✅ Access logging
- ⚠️ Right to be forgotten (manual)
- ⚠️ Data retention policies (manual)

## 🛠️ Technical Implementation

### Dependencies
```json
{
  "tesseract.js": "^5.x",
  "pdfjs-dist": "^4.x",
  "react-dropzone": "^14.x"
}
```

### Key Files
```
src/
  components/
    documents/
      SmartDocumentUpload.tsx       # Upload component with processing
      DocumentAnalysis.tsx           # Review & edit extracted data
      DocumentSearch.tsx             # Full-text & semantic search
  lib/
    ai/
      ocrService.ts                  # Tesseract.js OCR wrapper
      documentProcessor.ts           # AI analysis & extraction
  pages/
    DocumentProcessing.tsx           # Demo page with tabs
supabase/
  migrations/
    20251217_document_processing.sql # Database schema
```

### OCR Processing Flow
```
1. File Upload → Supabase Storage
2. Create document record
3. Extract text:
   - PDF → pdf.js parsing
   - Image → Tesseract.js OCR
4. AI Analysis → categorize + extract data
5. Save metadata to database
6. Generate tasks (if applicable)
7. Show review UI
```

### Pattern Matching Algorithm
Uses keyword matching for categorization:
- **Arbeidscontract**: "arbeidsovereenkomst", "functieomschrijving", "salaris", "fte", "proeftijd"
- **Medisch**: "medisch attest", "diagnose", "arbeidsongeschikt", "bedrijfsarts"
- **Training**: "certificaat", "diploma", "training", "opleiding"
- **Factuur**: "factuur", "invoice", "btw", "factuurnummer"

Score calculation:
- +1 per keyword in document
- +0.5 per keyword in filename
- Confidence = 0.5 + (score × 0.1), max 0.95

## 📊 Usage Examples

### Upload Document
```tsx
import { SmartDocumentUpload } from '@/components/documents/SmartDocumentUpload';

<SmartDocumentUpload
  employeeId={employee.id}
  onUploadComplete={(docId) => console.log('Done:', docId)}
  category="Contract"
/>
```

### Search Documents
```tsx
import { DocumentSearch } from '@/components/documents/DocumentSearch';

<DocumentSearch
  onDocumentSelect={(docId) => navigateToDocument(docId)}
/>
```

### Manual OCR
```typescript
import { performOCR } from '@/lib/ai/ocrService';

const result = await performOCR(file, {
  language: 'nld',
  onProgress: (progress) => console.log(progress),
});
```

### Manual Analysis
```typescript
import { analyzeDocumentContent } from '@/lib/ai/documentProcessor';

const analysis = await analyzeDocumentContent(text, fileName, fileType);
console.log('Category:', analysis.category);
console.log('Extracted:', analysis.extractedData);
```

## 🚀 Performance

### Client-side OCR
- ⚠️ Tesseract.js is CPU-intensief (30-60 seconden per pagina)
- ✅ Werkt offline (geen externe API)
- 💡 Overweeg server-side OCR voor grote volumes

### PDF Parsing
- ✅ Zeer snel (1-2 seconden per document)
- ✅ Hoge accuracy voor native PDF tekst
- ⚠️ Gescande PDFs vereisen OCR

### Search Performance
- ✅ PostgreSQL tsvector is zeer snel (<100ms)
- ✅ Indexed full-text search
- ⚠️ Vector search vereist embeddings generatie

## 🔮 Future Improvements

### High Priority
1. **Claude API Integration**
   - Replace pattern matching met echte AI
   - Betere categorisatie accuracy
   - Context-aware extraction

2. **Server-side OCR**
   - Google Cloud Vision API
   - AWS Textract
   - Sneller en accurater

3. **Semantic Search**
   - Generate embeddings met OpenAI ada-002
   - Store in document_embeddings tabel
   - Natural language queries

### Medium Priority
4. **Salary Encryption**
   - End-to-end encryption voor gevoelige data
   - Key management

5. **Auto-delete Policies**
   - Automatisch verwijderen na X jaar
   - GDPR compliance

6. **Watermarking**
   - Visual watermarks op downloads
   - Traceability

### Low Priority
7. **Multi-language Support**
   - Engels, Duits OCR
   - Language detection

8. **Batch Processing**
   - Upload multiple files at once
   - Queue system

9. **Document Versioning**
   - Track changes over time
   - Version history

## 🐛 Troubleshooting

### OCR Fails
```
Error: OCR processing failed
```
**Oplossing**: 
- Check of Tesseract.js worker correct laadt
- Controleer bestandsgrootte (<10MB)
- Probeer PDF text extraction eerst

### Upload Error
```
Error: Failed to upload to storage
```
**Oplossing**:
- Check Supabase Storage bucket "documents" bestaat
- Verify RLS policies op storage bucket
- Check file size limits

### No Text Extracted
```
Extracted text is empty
```
**Oplossing**:
- Gescande PDF? → Gebruik OCR
- Native PDF zonder tekst? → Re-scan met tekst layer
- Afbeelding te donker/onduidelijk? → Verbeter contrast

### Search Returns No Results
```
Search returns 0 results
```
**Oplossing**:
- Check of document_metadata records bestaan
- Verify extracted_text is niet NULL
- Test met simpele zoekterm eerst

### Tasks Not Generated
```
No tasks created after upload
```
**Oplossing**:
- Check document category detection
- Verify document_tasks tabel bestaat
- Check RLS policies

## 📝 Monitoring Queries

### Check Processing Status
```sql
SELECT 
  d.title,
  dm.processing_status,
  dm.detected_category,
  dm.confidence_score,
  dm.is_complete
FROM documents d
LEFT JOIN document_metadata dm ON dm.document_id = d.id
WHERE dm.processing_status != 'completed'
ORDER BY d.created_at DESC;
```

### Audit Log Review
```sql
SELECT 
  dal.access_type,
  dal.created_at,
  p.voornaam || ' ' || p.achternaam as user_name,
  d.title
FROM document_access_log dal
JOIN profiles p ON p.id = dal.user_id
JOIN documents d ON d.id = dal.document_id
ORDER BY dal.created_at DESC
LIMIT 50;
```

### Failed Processing
```sql
SELECT 
  d.title,
  dm.processing_error,
  dm.created_at
FROM documents d
LEFT JOIN document_metadata dm ON dm.document_id = d.id
WHERE dm.processing_status = 'failed'
ORDER BY dm.created_at DESC;
```

## 📚 Resources

- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [React Dropzone](https://react-dropzone.js.org/)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [Supabase Vector](https://supabase.com/docs/guides/ai/vector-columns)

## 📅 Changelog

### 2025-12-17 - Initial Release
- ✅ Smart document upload component
- ✅ OCR service met Tesseract.js
- ✅ Document processor met pattern matching
- ✅ Document analysis review UI
- ✅ Document search component
- ✅ Database schema met RLS
- ✅ Auto-task generation
- ✅ Audit logging
- ✅ Demo page
