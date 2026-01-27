# Niet-Vertaalde Teksten in Formulieren - Overzicht

**Datum:** 27 januari 2026  
**Status:** 🟡 In progress - Validation toegevoegd, forms labels toegevoegd

## ✅ Wat is al gedaan

### 1. i18n Vertalingen Toegevoegd
**Bestand:** `src/lib/locales/nl/translation.json`

Nieuwe secties toegevoegd:
- **validation** - Validatieberichten voor Zod schemas
- **formLabels** - Labels voor formuliervelden

```json
"validation": {
  "required": "Dit veld is verplicht",
  "invalidEmail": "Ongeldig e-mailadres",
  "invalidUrl": "Ongeldige URL",
  "firstNameRequired": "Voornaam is verplicht",
  "lastNameRequired": "Achternaam is verplicht",
  "companyNameRequired": "Bedrijfsnaam is verplicht",
  "selectCompany": "Selecteer een bedrijf",
  "selectContact": "Selecteer een contactpersoon",
  "titleRequired": "Titel is verplicht",
  "positiveValue": "Waarde moet positief zijn",
  "pricePositive": "Prijs moet positief zijn",
  "minQuantity": "Minimaal 1"
},
"formLabels": {
  "firstName": "Voornaam",
  "lastName": "Achternaam",
  "email": "E-mail",
  "phone": "Telefoon",
  "mobile": "Mobiel",
  "position": "Functie",
  "department": "Afdeling",
  "linkedinUrl": "LinkedIn URL",
  "company": "Bedrijf",
  "isPrimary": "Hoofdcontact",
  "isDecisionMaker": "Beslisser",
  "notes": "Notities",
  "companyName": "Bedrijfsnaam",
  "companySize": "Bedrijfsgrootte",
  "website": "Website",
  "address": "Adres",
  "city": "Stad",
  "postalCode": "Postcode",
  "kvkNumber": "KVK nummer",
  "title": "Titel",
  "description": "Beschrijving",
  "category": "Categorie",
  "quantity": "Aantal",
  "unitPrice": "Prijs per stuk",
  "total": "Totaal",
  "validUntil": "Geldig tot",
  "generalInfo": "Algemene informatie",
  "contactPerson": "Contactpersoon",
  "internalNotes": "Interne notities"
}
```

### 2. ContactForm Gedeeltelijk Bijgewerkt
**Bestand:** `src/features/contacts/components/ContactForm.tsx`

✅ Bijgewerkt:
- Voornaam label → `t('formLabels.firstName')`
- Achternaam label → `t('formLabels.lastName')`  
- Bedrijf label → `t('formLabels.company')`
- "Geen bedrijf" → `t('forms.noCompany')`

⏳ Nog te doen:
- E-mail, Telefoon, Mobiel labels
- Functie, Afdeling, LinkedIn URL labels
- Checkboxes (Hoofdcontact, Beslisser)
- Notities label
- Zod validatieberichten (via custom error map)

---

## 🚧 Te Vertalen Formulieren

### 1. ContactForm (70% done) 
**Bestand:** `src/features/contacts/components/ContactForm.tsx`

**Resterende hardcoded teksten:**
```tsx
// Nog te vervangen:
<FormLabel>E-mail</FormLabel>              → t('formLabels.email')
<FormLabel>Telefoon</FormLabel>            → t('formLabels.phone')
<FormLabel>Mobiel</FormLabel>              → t('formLabels.mobile')
<FormLabel>Functie</FormLabel>             → t('formLabels.position')
<FormLabel>Afdeling</FormLabel>            → t('formLabels.department')
<FormLabel>LinkedIn URL</FormLabel>        → t('formLabels.linkedinUrl')
<FormLabel>Notities</FormLabel>            → t('formLabels.notes')
<Label>Hoofdcontact</Label>                → t('formLabels.isPrimary')
<Label>Beslisser</Label>                   → t('formLabels.isDecisionMaker')

// Placeholders:
placeholder="jan.jansen@bedrijf.nl"        → t('formPlaceholders.email')
placeholder="+31 6 12345678"               → t('formPlaceholders.phone')
placeholder="https://linkedin.com/in/..."  → t('formPlaceholders.linkedinUrl')
```

### 2. CompanyForm (0% done) ⚠️
**Bestand:** `src/features/companies/components/CompanyForm.tsx`

**Hardcoded teksten:**
```tsx
// Validatie (Zod schema):
'Naam moet minimaal 2 karakters bevatten'
'Voer een geldige URL in'
'Voer een geldig e-mailadres in'
'KVK nummer moet 8 cijfers zijn'
'Voer een geldige LinkedIn URL in'

// Labels:
<FormLabel>Bedrijfsnaam *</FormLabel>      → t('formLabels.companyName') + ' *'
<FormLabel>Branche</FormLabel>             → t('companies.industry')
<FormLabel>Bedrijfsgrootte</FormLabel>     → t('formLabels.companySize')
<FormLabel>Status *</FormLabel>            → t('common.status') + ' *'
<FormLabel>Prioriteit *</FormLabel>        → t('companies.priority') + ' *'
<FormLabel>Lead Bron</FormLabel>           → t('companies.source')
<FormLabel>E-mail</FormLabel>              → t('formLabels.email')
<FormLabel>Telefoon</FormLabel>            → t('formLabels.phone')
<FormLabel>Website</FormLabel>             → t('formLabels.website')
<FormLabel>KVK Nummer</FormLabel>          → t('formLabels.kvkNumber')
<FormLabel>LinkedIn URL</FormLabel>        → t('formLabels.linkedinUrl')
<FormLabel>Straat + Huisnummer</FormLabel> → t('companies.streetAddress')
<FormLabel>Postcode</FormLabel>            → t('formLabels.postalCode')
<FormLabel>Stad</FormLabel>                → t('formLabels.city')
<FormLabel>Land</FormLabel>                → t('companies.country')
<FormLabel>Notities</FormLabel>            → t('formLabels.notes')

// Toast messages:
toast.error('Plak eerst bedrijfsgegevens in het tekstveld')
toast.success('Bedrijfsgegevens ingevuld!')
setKvkError(`Een bedrijf met de naam "${data.name}" bestaat al`)
setKvkError(`Dit KVK nummer is al in gebruik bij bedrijf "${existingKVK.name}"`)

// Andere UI tekst:
"Stap 1: Zoek bedrijf op KVK"
"Plak hier de bedrijfsgegevens van KVK, Drimble, of andere bron..."
"KVK nummer of bedrijfsnaam"
"Zoek het bedrijf op via de KVK knop"
```

### 3. ProjectForm (0% done) ⚠️
**Bestand:** `src/features/projects/components/ProjectForm.tsx`

**Hardcoded teksten:**
```tsx
// Validatie (Zod):
'Selecteer een bedrijf'
'Selecteer een contactpersoon'
'Titel is verplicht'
'Waarde moet positief zijn'

// Labels:
"Algemene Informatie"                      → t('formLabels.generalInfo')
<FormLabel>Bedrijf *</FormLabel>          → t('formLabels.company') + ' *'
<FormLabel>Contactpersoon</FormLabel>     → t('formLabels.contactPerson')
<FormLabel>Titel *</FormLabel>            → t('formLabels.title') + ' *'
<FormLabel>Beschrijving</FormLabel>       → t('formLabels.description')
<FormLabel>Project Type</FormLabel>       → t('projects.type')
<FormLabel>Waarde</FormLabel>             → t('projects.value')
<FormLabel>Verwachte sluitdatum</FormLabel> → t('projects.expectedCloseDate')
<FormLabel>Notities</FormLabel>           → t('formLabels.notes')
```

### 4. QuoteForm (20% done) ⚠️
**Bestand:** `src/features/quotes/components/QuoteForm.tsx`

**Veel hardcoded teksten:**
```tsx
// Validatie (Zod):
'Titel is verplicht'
'Prijs moet positief zijn'
'Minimaal 1'
'Selecteer een bedrijf'
'Selecteer een contactpersoon'

// Labels - Zie bestand voor volledige lijst (60+ strings)
"Bedrijf *"                                → al vertaald via t('quotes.requiredCompany')
"Contactpersoon *"                         → t('quotes.contactPersonLabel')
"Project/Lead (optioneel)"                 → t('projects.title') + ' (' + t('common.optional') + ')'
"Koppel aan project..."                    → t('quotes.linkToProject')
"Geen project"                             → t('forms.noProject')
"Titel *"                                  → al vertaald via t('quotes.requiredTitle')
"Beschrijving"                             → t('formLabels.description')
"Geldig tot"                               → t('formLabels.validUntil')
"Prijs per stuk *"                         → t('formLabels.unitPrice') + ' *'
"Aantal *"                                 → t('formLabels.quantity') + ' *'
"Totaal"                                   → t('formLabels.total')
"Categorie"                                → t('formLabels.category')
"Facturatie frequentie"                    → t('quotes.billingFrequency')
"Interne Notities"                         → t('formLabels.internalNotes')
"Nieuw"                                    → t('common.new')

// Placeholders:
"Website design"
"Gedetailleerde beschrijving"
"Design, Development, etc."
"30 dagen"
"4-6 weken"
"Interne opmerkingen (niet zichtbaar voor klant)"
```

### 5. AddInteractionDialog (50% done)
**Bestand:** `src/features/interactions/components/AddInteractionDialog.tsx`

Grotendeels al vertaald, maar check:
- Form validation messages
- Placeholder teksten
- "Geen deal", "Geen quote" dropdown options

---

## 📋 Aanbevolen Aanpak

### Fase 1: Vertalingen Toevoegen (15 min)
Voeg alle ontbrekende vertalingen toe aan `translation.json`:

```json
"formPlaceholders": {
  "email": "jan.jansen@bedrijf.nl",
  "phone": "+31 6 12345678",
  "mobile": "+31 6 87654321",
  "linkedinUrl": "https://linkedin.com/in/janjansen",
  "website": "https://www.bedrijf.nl",
  "kvkSearch": "KVK nummer of bedrijfsnaam",
  "businessDataPaste": "Plak hier de bedrijfsgegevens van KVK, Drimble, of andere bron...",
  "address": "Straatnaam 123",
  "postalCode": "1234 AB",
  "city": "Amsterdam",
  "projectDescription": "Korte beschrijving van het project",
  "itemTitle": "Website design",
  "itemDescription": "Gedetailleerde beschrijving",
  "itemCategory": "Design, Development, etc.",
  "paymentTerms": "30 dagen",
  "deliveryTime": "4-6 weken",
  "internalNotes": "Interne opmerkingen (niet zichtbaar voor klant)"
},
"companies": {
  // ... existing
  "streetAddress": "Straat + Huisnummer",
  "country": "Land",
  "pasteBusinessData": "Bedrijfsgegevens plakken",
  "searchKvkStep": "Stap 1: Zoek bedrijf op KVK",
  "searchViaKvk": "Zoek het bedrijf op via de KVK knop",
  "dataFilled": "Bedrijfsgegevens ingevuld!",
  "pasteDataFirst": "Plak eerst bedrijfsgegevens in het tekstveld",
  "companyExists": "Een bedrijf met de naam \"{{name}}\" bestaat al",
  "kvkInUse": "Dit KVK nummer is al in gebruik bij bedrijf \"{{name}}\""
}
```

### Fase 2: ContactForm Afmaken (10 min)
Update resterende labels en placeholders

### Fase 3: CompanyForm Updaten (20 min)
- Update alle labels
- Update toast messages
- Update validaties

### Fase 4: ProjectForm Updaten (15 min)
- Update labels
- Update section headers

### Fase 5: QuoteForm Updaten (30 min)
- Veel labels en placeholders
- Template-gerelateerde teksten
- Validation messages

---

## 🎯 Totale Tijd: ~1.5 uur

### Prioriteit:
1. ✅ **ContactForm** - 70% done, makkelijk af te maken
2. ⚠️ **CompanyForm** - Meest gebruikt, hoogste prioriteit
3. ⚠️ **ProjectForm** - Belangrijk voor pipeline
4. ⚠️ **QuoteForm** - Groot maar minder kritiek

---

## 💡 Quick Win

Als je nu snel wilt dat de ergste problemen opgelost zijn:

```bash
# Voeg deze vertalingen toe en update alleen de top 5 meest zichtbare labels:
1. "Voornaam" → t('formLabels.firstName')  ✅ done
2. "Achternaam" → t('formLabels.lastName')  ✅ done  
3. "Bedrijfsnaam" → t('formLabels.companyName')
4. "E-mail" → t('formLabels.email')
5. "Telefoon" → t('formLabels.phone')
```

Dan zijn de belangrijkste formuliervelden vertaald en kun je de rest incrementeel doen.
