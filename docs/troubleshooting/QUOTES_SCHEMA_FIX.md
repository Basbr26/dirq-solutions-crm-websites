# Quotes Schema Fix - Deployment Guide

## Probleem

Bij het aanmaken van quotes krijgen gebruikers de error:
```
Could not find the 'payment_terms' column of 'quotes' in the schema cache
```

## Oorzaak

De Supabase database heeft niet alle kolommen die de code verwacht:
- ❌ `payment_terms` ontbreekt
- ❌ `delivery_time` mogelijk ontbrekend  
- ❌ `client_notes` mogelijk ontbrekend
- ❌ `created_by` vs `owner_id` inconsistentie

## Oplossing

### Stap 1: Run Migratie in Supabase

1. Log in bij [Supabase Dashboard](https://app.supabase.com)
2. Selecteer je project
3. Ga naar **SQL Editor**
4. Kopieer en plak de inhoud van `supabase/migrations/20260114_fix_quotes_schema_alignment.sql`
5. Klik op **Run**

### Stap 2: Verificatie

De migratie toont automatisch de status:

```
✅ Added payment_terms column to quotes table
✅ Added delivery_time column to quotes table
✅ Added client_notes column to quotes table
✅ Renamed created_by to owner_id in quotes table
✅ All expected quotes columns present
```

Je kunt ook handmatig verifiëren:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quotes' 
ORDER BY ordinal_position;
```

Verwachte kolommen:
- `payment_terms` (TEXT)
- `delivery_time` (TEXT)
- `client_notes` (TEXT)
- `owner_id` (UUID) - niet `created_by`

### Stap 3: Test

Na de migratie:
1. Ga naar de CRM applicatie
2. Navigeer naar Quotes
3. Klik op "Nieuwe Offerte"
4. Vul het formulier in
5. Klik op "Offerte Aanmaken"

De offerte zou nu succesvol aangemaakt moeten worden! ✅

## Wat doet de migratie?

1. ✅ Voegt `payment_terms` kolom toe (indien niet bestaat)
2. ✅ Voegt `delivery_time` kolom toe (indien niet bestaat)
3. ✅ Voegt `client_notes` kolom toe (indien niet bestaat)
4. ✅ Hernoemt `created_by` naar `owner_id` (indien nodig)
5. ✅ Update foreign key constraints en indexes
6. ✅ Voegt `currency` kolom toe (indien niet bestaat)
7. ✅ Verificatie van alle verwachte kolommen
8. ✅ Voegt comments toe voor documentatie

## Idempotent

Deze migratie kan veilig meerdere keren uitgevoerd worden - het checkt of kolommen al bestaan voor het toevoegen.

## Rollback

Niet nodig - deze migratie voegt alleen kolommen toe, verwijdert niets.

## Code Changes

Ook is de code aangepast:
- ❌ Verwijderd: `subtotal`, `tax_amount`, `total_amount` uit `CreateQuoteInput` 
  (deze worden automatisch berekend door de backend)
- ✅ `generateQuoteFromProject.ts` gebruikt nu alleen required velden

## Support

Bij problemen:
1. Check Supabase logs
2. Verificeer kolom bestaan met bovenstaande SQL query
3. Check console errors in browser DevTools

---

**Laatst bijgewerkt:** 14 januari 2026
