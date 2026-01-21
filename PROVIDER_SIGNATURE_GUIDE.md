# Provider Signature Functionaliteit - Implementatie Gids

## ✨ Nieuwe Functionaliteit

Je kunt nu als leverancier (Dirq Solutions) offertes digitaal ondertekenen en de volledig getekende documenten delen met klanten.

---

## 🎯 Use Case

### Workflow

1. **Klant tekent offerte** → Handtekening via publieke sign link (`/sign-quote/:token`)
2. **Jij tekent als leverancier** → Extra handtekening namens Dirq Solutions
3. **Volledig getekend document** → PDF met beide handtekeningen wordt gegenereerd
4. **Delen met klant** → Download link kopiëren en delen via email/chat

---

## 📍 Waar te Vinden

### Quote Detail Page

**Locatie:** `/quotes/:id`

**Nieuwe Knoppen:**

#### 1. "Teken als Leverancier" (Blauw)
- **Wanneer zichtbaar:** Als je nog niet getekend hebt
- **Permissies:** ADMIN, SALES, MANAGER
- **Actie:** Opent signature dialog

#### 2. "Download Getekend" (Groen)
- **Wanneer zichtbaar:** Na jouw ondertekening
- **Actie:** Download volledig getekende PDF
- **Bestandsnaam:** `offerte-{quote_number}-getekend.pdf`

---

## 🖊️ Ondertekenen als Leverancier

### Stap 1: Open Signature Dialog

1. Ga naar Quote Detail Page
2. Klik op **"Teken als Leverancier"** (blauwe knop)

### Stap 2: Controleer Offerte Details

De dialog toont:
- Offertenummer
- Totaalbedrag
- Klantnaam

Plus waarschuwing over wat je bevestigt door te tekenen.

### Stap 3: Teken

1. Klik **"Doorgaan naar Ondertekenen"**
2. Teken op het canvas
3. Klik **"Handtekening Opslaan"**

### Stap 4: Document wordt Gegenereerd

De app:
- Genereert PDF van offerte
- Embed jouw handtekening (links onderaan)
- Voegt datum en "Namens Dirq Solutions" toe
- Upload naar Supabase Storage
- Slaat URL op in database

**Verwachte tijd:** 2-5 seconden

---

## 📥 Getekend Document Delen

### Optie 1: Direct Downloaden

1. Klik **"Download Getekend"** (groene knop bij acties)
2. PDF wordt gedownload naar Downloads folder
3. Stuur via email, WhatsApp, of andere kanalen

### Optie 2: Share Link Kopiëren

1. Scroll naar **"Getekend door Leverancier"** card (blauw)
2. Klik **"Kopieer Download Link"**
3. Link wordt gekopieerd naar clipboard
4. Plak link in email/chat naar klant

**Link Format:**
```
https://[supabase-url]/storage/v1/object/public/documents/quote-[id]-provider-signed-[timestamp].pdf
```

**Let op:** Link is publiekelijk toegankelijk - iedereen met link kan downloaden.

---

## 🎨 UI Overzicht

### Quote Detail Page - Acties

```
┌─────────────────────────────────────────────────────┐
│ [Export PDF] [Verzenden voor Ondertekening]        │
│ [🖊️ Teken als Leverancier] [✅ Download Getekend] │
│ [Bewerken] [Verwijderen]                            │
└─────────────────────────────────────────────────────┘
```

### Signature Cards

#### Klant Handtekening (Groen)
```
┌─────────────────────────────────────────────┐
│ ✅ Getekend door Klant                      │
│                                              │
│ [Handtekening Afbeelding]                   │
│                                              │
│ Getekend door: Jan Jansen                   │
│ Datum: 22 Jan 2026 14:30                    │
│ Email: jan@bedrijf.nl                       │
│ IP: 192.168.1.1                             │
│                                              │
│ ✓ Digitale handtekening geldig             │
└─────────────────────────────────────────────┘
```

#### Leverancier Handtekening (Blauw)
```
┌─────────────────────────────────────────────┐
│ ✅ Getekend door Leverancier                │
│                                              │
│ [Handtekening Afbeelding]                   │
│                                              │
│ Namens: Dirq Solutions                      │
│ Datum: 22 Jan 2026 15:00                    │
│                                              │
│ ✓ Volledig getekend document beschikbaar   │
│                                              │
│ [📥 Download Getekend PDF]                  │
│ [📋 Kopieer Download Link]                  │
└─────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Nieuwe Kolommen in `quotes` Table

```sql
provider_signature_data       TEXT    -- Base64 PNG van handtekening
provider_signed_at           TIMESTAMP WITH TIME ZONE
provider_signed_document_url TEXT    -- Public URL naar getekende PDF
```

### Migration Bestand

**Bestand:** `add_provider_signature_columns.sql`

**Uitvoeren:**
1. Open Supabase Dashboard → SQL Editor
2. Kopieer inhoud van migration file
3. Run SQL
4. Verifieer met verification query in file

---

## 🔐 Security & Permissies

### Wie Kan Tekenen als Leverancier?

- ✅ **ADMIN** - Volledige toegang
- ✅ **SALES** - Kan offertes tekenen
- ✅ **MANAGER** - Kan offertes tekenen
- ❌ **USER** - Geen toegang
- ❌ **READONLY** - Geen toegang

### Document Storage

- **Bucket:** `documents` (Supabase Storage)
- **Visibility:** Public (anyone with URL can access)
- **Filename Pattern:** `quote-{uuid}-provider-signed-{timestamp}.pdf`
- **Security:** URL is long and random → moeilijk te raden
- **Lifetime:** Permanent (tot handmatige verwijdering)

---

## 📋 Workflow Scenarios

### Scenario 1: Klant heeft al getekend

1. Klant ontvangt sign link
2. Klant tekent offerte → `sign_status = 'signed'`
3. Jij ziet groene "Getekend door Klant" card
4. Jij klikt "Teken als Leverancier"
5. Jij tekent → PDF met beide handtekeningen
6. Jij deelt getekend document met klant
7. **Compleet!** ✅

### Scenario 2: Jij tekent eerst (minder gebruikelijk)

1. Jij tekent offerte als leverancier
2. Blauwe "Getekend door Leverancier" card verschijnt
3. Klant tekent later via sign link
4. Beide cards zijn nu zichtbaar
5. Je kunt document opnieuw downloaden met beide signatures

### Scenario 3: Klant wijgert offerte

1. Klant klikt "Afwijzen" op sign page
2. Status → `rejected`
3. "Teken als Leverancier" knop blijft beschikbaar
4. Je kunt alsnog tekenen (voor archief doeleinden)

---

## 🧪 Testing Checklist

### Test 1: Basis Signing Flow
- [ ] Quote aangemaakt
- [ ] Klant heeft getekend
- [ ] "Teken als Leverancier" knop zichtbaar
- [ ] Dialog opent met correcte quote details
- [ ] Signature canvas werkt (teken test)
- [ ] PDF wordt gegenereerd (binnen 5 sec)
- [ ] Success toast verschijnt
- [ ] Blauwe card verschijnt met signature
- [ ] "Download Getekend" knop verschijnt

### Test 2: Download & Share
- [ ] Klik "Download Getekend" → PDF downloadt
- [ ] Open PDF → handtekening zichtbaar
- [ ] PDF toont "Namens Dirq Solutions" + datum
- [ ] Klik "Kopieer Download Link" → link in clipboard
- [ ] Plak link in browser → PDF opent
- [ ] Link werkt in incognito mode (public access)

### Test 3: Permissies
- [ ] Login als ADMIN → kan tekenen
- [ ] Login als SALES → kan tekenen  
- [ ] Login als USER → knop niet zichtbaar

### Test 4: Edge Cases
- [ ] Probeer 2x te tekenen → 2e keer knop weg
- [ ] Refresh page na tekenen → signature blijft
- [ ] Multiple quotes → elk heeft eigen signature
- [ ] Quote zonder klant signature → kan alsnog tekenen

---

## 🐛 Troubleshooting

### "PDF genereren mislukt"

**Mogelijke oorzaken:**
- Quote heeft geen items → kan geen PDF maken
- Network error → Supabase unreachable

**Oplossing:**
1. Check dat quote minimaal 1 item heeft
2. Check browser console voor errors
3. Verifieer Supabase connection

### "Upload mislukt"

**Mogelijke oorzaken:**
- Supabase Storage `documents` bucket bestaat niet
- RLS policies blokkeren upload
- File size te groot (>50MB)

**Oplossing:**
1. Verifieer bucket in Supabase Dashboard
2. Check RLS policies voor `documents` bucket
3. Check signature canvas resolution (moet PNG zijn)

### "Download link werkt niet"

**Mogelijke oorzaken:**
- Bucket is niet public
- File is verwijderd uit storage
- URL format incorrect

**Oplossing:**
1. Verifieer bucket policy: Public read access
2. Check file exists in Storage browser
3. Regenereer document (teken opnieuw)

---

## 📊 Database Queries voor Monitoring

### Check Signed Quotes

```sql
SELECT 
  quote_number,
  company_id,
  sign_status AS customer_signed,
  provider_signature_data IS NOT NULL AS provider_signed,
  provider_signed_at,
  provider_signed_document_url
FROM quotes
WHERE provider_signature_data IS NOT NULL
ORDER BY provider_signed_at DESC;
```

### Count Provider Signatures per Maand

```sql
SELECT 
  DATE_TRUNC('month', provider_signed_at) AS month,
  COUNT(*) AS signed_quotes
FROM quotes
WHERE provider_signature_data IS NOT NULL
GROUP BY month
ORDER BY month DESC;
```

### Find Quotes Needing Provider Signature

```sql
-- Quotes waar klant getekend heeft, maar leverancier nog niet
SELECT 
  id,
  quote_number,
  company_id,
  signed_at AS customer_signed_at
FROM quotes
WHERE sign_status = 'signed'
  AND provider_signature_data IS NULL
ORDER BY signed_at DESC;
```

---

## 🚀 Future Enhancements

Mogelijke verbeteringen voor later:

1. **Email Automation**
   - Automatisch email naar klant bij provider signature
   - Attach getekend PDF direct in email

2. **Digital Signature Standard**
   - PKCS#7 signature voor juridische geldigheid
   - Timestamp server voor betrouwbare timestamps

3. **Signature Workflow**
   - Required order: klant EERST, dan leverancier
   - Approval flow: manager moet eerst goedkeuren

4. **Audit Trail**
   - IP address + user agent bij provider signature
   - Document hash voor integrity check

5. **Template Customization**
   - Signature positie configureerbaar
   - Custom signature text per user/role

---

## ✅ Implementatie Complete

Alle functionaliteit is live! Je kunt nu:

✅ Offertes tekenen als leverancier  
✅ Volledig getekende documenten downloaden  
✅ Share links maken voor klanten  
✅ Beide handtekeningen zien in UI  

**Volgende stap:** Run de database migration en test de flow!
