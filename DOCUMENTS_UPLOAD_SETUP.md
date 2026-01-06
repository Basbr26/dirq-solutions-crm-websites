# Documents Upload Feature - Setup Instructies

## 1. Database Migration Uitvoeren

De documents upload feature vereist een nieuwe Supabase Storage bucket en database tabel.

### Stappen:

1. **Open Supabase Dashboard**: https://supabase.com/dashboard
2. **Ga naar SQL Editor**
3. **Kopieer de SQL uit**: `supabase/migrations/20260108_storage_documents.sql`
4. **Plak en execute de SQL**

Dit creëert:
- ✅ `documents` bucket in Supabase Storage
- ✅ `documents` tabel met metadata
- ✅ RLS policies voor secure uploads
- ✅ File type restrictions (PDF, Word, Excel, images)
- ✅ 10MB file size limit

## 2. Feature Overview

### Nieuwe Components:
- **DocumentUpload.tsx** - Upload dialog met validatie
- **DocumentsList.tsx** - Documenten weergeven met download/delete

### Geïntegreerde Pages:
- ✅ CompanyDetailPage - Documents tab werkend
- ✅ ContactDetailPage - Documents tab werkend  
- ✅ ProjectDetailPage - Documents tab toegevoegd

### Functionaliteit:
- Upload documenten (PDF, DOC, DOCX, XLS, XLSX, images)
- File size validation (max 10MB)
- File type validation
- Category selectie (Contract, Voorstel, Factuur, etc.)
- Metadata opslag (titel, beschrijving, uploader)
- Download functionaliteit
- Delete functionaliteit (ADMIN of uploader)
- Auto-link naar company/contact/project

## 3. RLS Security

### Storage Policies:
- ✅ Authenticated users kunnen uploaden
- ✅ Authenticated users kunnen bekijken
- ✅ Users kunnen eigen documenten updaten
- ✅ ADMIN of uploader kunnen verwijderen

### Database Policies:
- ✅ Authenticated users kunnen documenten zien
- ✅ Authenticated users kunnen uploaden
- ✅ Users kunnen eigen metadata updaten
- ✅ ADMIN of uploader kunnen verwijderen

## 4. Testing Checklist

Na het runnen van de migration:

- [ ] Test upload op CompanyDetailPage
- [ ] Test upload op ContactDetailPage  
- [ ] Test upload op ProjectDetailPage
- [ ] Verify file size limit (probeer >10MB)
- [ ] Verify file type validation (probeer .exe)
- [ ] Test download functionaliteit
- [ ] Test delete als ADMIN
- [ ] Test delete als uploader
- [ ] Test delete als niet-uploader (should fail)
- [ ] Check documenten blijven na page refresh

## 5. Supported File Types

```typescript
- application/pdf (.pdf)
- application/msword (.doc)
- application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)
- application/vnd.ms-excel (.xls)
- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (.xlsx)
- image/jpeg (.jpg, .jpeg)
- image/png (.png)
- image/gif (.gif)
- image/webp (.webp)
- text/plain (.txt)
```

## 6. Migration Status

⚠️ **BELANGRIJK**: De migration moet nog handmatig worden uitgevoerd in Supabase Dashboard.

Eenmaal uitgevoerd, is de feature volledig operationeel.
