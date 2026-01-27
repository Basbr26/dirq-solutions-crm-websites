# Email Drafts Feature - Setup Guide

## Overzicht
Email Drafts is een feature waarmee AI-gegenereerde emails worden opgeslagen voor review voordat ze worden verstuurd. Gebruikers kunnen de emails bewerken en vervolgens versturen via de Resend API.

## Database Setup

### 1. Run de migratie
```bash
# Voer de migratie uit in Supabase
supabase migration up
```

Of kopieer de SQL uit `supabase/migrations/20260127_create_email_drafts.sql` naar de Supabase SQL Editor.

### 2. Verificeer de tabel
```sql
SELECT * FROM email_drafts LIMIT 5;
```

## Resend API Setup

### 1. Resend Account
1. Ga naar https://resend.com
2. Maak een account aan (gratis: 100 emails/dag)
3. Verifieer je domain (dirqsolutions.nl)
4. Genereer een API key

### 2. Supabase Environment Variables
In Supabase Dashboard → Project Settings → Edge Functions:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Deploy Edge Function
```bash
# Deploy de send-email function
supabase functions deploy send-email
```

## Gebruik

### Email Draft Aanmaken (voor toekomstige AI workflows)
```typescript
const { data, error } = await supabase
  .from('email_drafts')
  .insert({
    to_email: 'klant@example.com',
    subject: 'Follow-up meeting',
    body: '<p>Beste [naam],</p><p>Bedankt voor het gesprek...</p>',
    type: 'follow_up',
    company_id: companyId,
    project_id: projectId,
    status: 'draft'
  });
```

### Email Versturen vanuit UI
Gebruikers kunnen:
1. Navigeren naar Email Concepten pagina
2. Draft selecteren
3. Eventueel bewerken (to, subject, body)
4. Op "Nu versturen" klikken

De status wordt automatisch bijgewerkt naar 'sent' na verzenden.

## Testing

### Test Email Versturen
```typescript
// In browser console op de Email Drafts pagina:
const { data } = await supabase.functions.invoke('send-email', {
  body: {
    to: 'jouw-email@example.com',
    subject: 'Test Email',
    html: '<h1>Test</h1><p>Dit is een test email.</p>'
  }
});
console.log(data);
```

## Troubleshooting

### "RESEND_API_KEY not configured"
- Check of de environment variable is ingesteld in Supabase
- Deploy de function opnieuw na het toevoegen van de env var

### "Failed to send email"
- Check Resend dashboard voor error logs
- Verifieer dat het domain geverifieerd is
- Check of de API key nog geldig is

### RLS Errors
- Zorg dat gebruiker is ingelogd
- Check of gebruiker toegang heeft tot het bedrijf/project

## Toekomstige Uitbreidingen

- [ ] Email templates met variabelen
- [ ] Scheduled sending (cron job)
- [ ] Email tracking (opened, clicked)
- [ ] Bulk send voor meerdere contacten
- [ ] Attachments ondersteuning
