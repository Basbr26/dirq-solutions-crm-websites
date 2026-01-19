# 🚀 i18n Quick Reference Card

## Basic Usage

### 1. Import and Setup
```typescript
import { useTranslation } from 'react-i18next';

export function MyComponent() {
  const { t } = useTranslation();
  // ... your code
}
```

### 2. Simple Translation
```typescript
<h1>{t('dashboard.title')}</h1>
<Button>{t('common.save')}</Button>
<p>{t('common.noResults')}</p>
```

### 3. With Variables
```typescript
// Translation key: "{{won}} van {{total}} deals"
{t('dashboard.wonDealsDescription', { won: 47, total: 120 })}
// Output: "47 van 120 deals"
```

### 4. Toast Messages
```typescript
import { toast } from 'sonner';

toast.success(t('success.saved'));
toast.error(t('errors.generic'));
toast.error(t('errors.emailMissing'), {
  description: t('errors.emailMissingDescription')
});
```

## Formatting Utilities

```typescript
import { 
  formatCurrency, 
  formatDate, 
  formatNumber 
} from '@/lib/i18n-utils';

// Currency
formatCurrency(5000)              // € 5.000,00 (NL) or €5,000.00 (EN)

// Dates
formatDate(new Date())             // 18-01-2026 (NL) or 01/18/2026 (EN)
formatDate(new Date(), 'long')     // 18 januari 2026 (NL)

// Numbers
formatNumber(1250000)              // 1.250.000 (NL) or 1,250,000 (EN)
```

## Common Translation Keys

### Navigation
```typescript
t('navigation.dashboard')         // Dashboard
t('navigation.companies')         // Bedrijven / Companies
t('navigation.contacts')          // Contactpersonen / Contacts
t('navigation.projects')          // Projecten / Projects
t('navigation.quotes')            // Offertes / Quotes
```

### Common Actions
```typescript
t('common.save')                  // Opslaan / Save
t('common.delete')                // Verwijderen / Delete
t('common.edit')                  // Bewerken / Edit
t('common.cancel')                // Annuleren / Cancel
t('common.search')                // Zoeken / Search
t('common.export')                // Exporteren / Export
```

### Forms
```typescript
t('forms.required')               // Verplicht veld / Required field
t('forms.invalidEmail')           // Ongeldig e-mailadres / Invalid email
t('forms.minLength', { min: 3 }) // Minimaal 3 karakters / Minimum 3 characters
```

### Errors
```typescript
t('errors.generic')               // Er is iets misgegaan / Something went wrong
t('errors.networkError')          // Netwerkfout / Network error
t('errors.emailMissing')          // Geen email adres gevonden / No email address found
```

### Success
```typescript
t('success.saved')                // Opgeslagen / Saved
t('success.deleted')              // Verwijderd / Deleted
t('success.updated')              // Bijgewerkt / Updated
t('success.sent')                 // Verzonden / Sent
```

## Migration Checklist

- [ ] Import `useTranslation` from 'react-i18next'
- [ ] Add `const { t } = useTranslation();` at component start
- [ ] Replace all hardcoded strings with `t('key')`
- [ ] Update toast messages to use `t()`
- [ ] Update form validation messages
- [ ] Replace date/currency formatting with utilities
- [ ] Test in both Dutch and English
- [ ] Check console for missing key warnings

## Language Switcher

Already added to `AppHeader.tsx` - users can switch languages via the Globe icon (🌐) in the header.

## Testing

1. Open app: http://localhost:8080
2. Click Globe icon in header
3. Select language (Nederlands 🇳🇱 or English 🇬🇧)
4. Verify all text changes
5. Refresh page - preference persists

## File Locations

- **Config**: `src/lib/i18n.ts`
- **Utils**: `src/lib/i18n-utils.ts`
- **Dutch**: `src/lib/locales/nl/translation.json`
- **English**: `src/lib/locales/en/translation.json`
- **Switcher**: `src/components/LanguageSwitcher.tsx`

## Need Help?

See detailed documentation:
- `I18N_SUMMARY.md` - Complete overview
- `I18N_IMPLEMENTATION_PROGRESS.md` - Migration guide with examples
- Translation JSON files - All available keys
