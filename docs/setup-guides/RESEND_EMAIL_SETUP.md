# Resend Email Setup - E-Sign Functionaliteit

## ✅ Wat is er klaar?

1. **Resend API Key**: `re_VTdLxRyM_GNa63xpkZ8fPWSyTvMhc4UX8`
2. **Edge Function**: `supabase/functions/send-sign-email/index.ts`
3. **Email Template**: Professionele HTML email met gradient design
4. **Database Migratie**: `20260114_create_email_logs_table.sql` voor email tracking
5. **Frontend Update**: DocumentsList verstuurt automatisch email na link generatie

## 🚀 Deployment Stappen

### Stap 1: Supabase Secret Instellen

```bash
# Login bij Supabase
npx supabase login

# Link project (als nog niet gedaan)
npx supabase link --project-ref <jouw-project-ref>

# Set Resend API key als secret
npx supabase secrets set RESEND_API_KEY=re_VTdLxRyM_GNa63xpkZ8fPWSyTvMhc4UX8
```

### Stap 2: Database Migratie Uitvoeren

```bash
# Run de email_logs migratie
npx supabase db push

# Of handmatig in Supabase Dashboard SQL Editor:
# Plak de inhoud van: supabase/migrations/20260114_create_email_logs_table.sql
```

### Stap 3: Edge Function Deployen

```bash
# Deploy de send-sign-email function
npx supabase functions deploy send-sign-email

# Verifieer deployment
npx supabase functions list
```

### Stap 4: Resend Domain Configureren (Aanbevolen)

Voor productie, configureer een eigen domein in Resend:

1. Ga naar [Resend Dashboard](https://resend.com/domains)
2. Voeg domein toe (bijv. `dirqsolutions.nl`)
3. Configureer DNS records:
   - SPF: `v=spf1 include:_spf.resend.com ~all`
   - DKIM: Wordt gegeven door Resend
4. Update Edge Function: Wijzig `from:` email naar `noreply@jouwdomein.nl`

**Zonder eigen domein**: Emails worden verstuurd vanaf `onboarding@resend.dev` (test modus)

## 📧 Hoe het werkt

### Flow:
1. Gebruiker klikt "E-Sign Link Genereren" in DocumentsList
2. Vult email adres van ontvanger in
3. Systeem:
   - Genereert unieke token
   - Slaat token op in database
   - Roept Edge Function aan
   - Edge Function stuurt email via Resend API
   - Logt verzonden email in `email_logs` tabel
4. Ontvanger krijgt professionele email met:
   - Document titel en info
   - Grote CTA button "Document ondertekenen"
   - Instructies hoe te tekenen
   - Security info (IP logging, audit trail)
   - Expiry datum (7 dagen)
   - Fallback link om te kopiëren

### Email Template Features:
- ✅ Responsive design (desktop + mobile)
- ✅ Gradient header met emoji
- ✅ Clear CTA button
- ✅ Document info box
- ✅ Instructie lijst
- ✅ Security badges
- ✅ Expiry warning
- ✅ Fallback plain link
- ✅ Professional footer

## 🧪 Testen

### Test lokaal (met Supabase CLI):

```bash
# Start local Supabase
npx supabase start

# Serve function locally
npx supabase functions serve send-sign-email --env-file .env.local

# Test met curl:
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-sign-email' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"to":"test@example.com","documentTitle":"Test Document","documentId":"123","signToken":"abc-123","expiresAt":"2026-01-21T00:00:00Z"}'
```

### Test in productie:
1. Upload een PDF document in je CRM
2. Klik "E-Sign Link Genereren"
3. Vul je eigen email in
4. Check je inbox voor de email
5. Klik de link en test de signing flow

## 🔒 Security Checklist

- ✅ API key opgeslagen als Supabase secret (niet in code)
- ✅ Edge Function gebruikt service role voor database access
- ✅ CORS headers configured
- ✅ Email logging voor audit trail
- ✅ Token expiry (7 dagen)
- ✅ IP address logging bij document access
- ✅ RLS policies op email_logs tabel

## 📊 Monitoring

### Check verzonden emails:
```sql
-- In Supabase SQL Editor
SELECT 
  created_at,
  recipient,
  subject,
  status,
  provider
FROM email_logs
ORDER BY created_at DESC
LIMIT 20;
```

### Check failed emails:
```sql
SELECT *
FROM email_logs
WHERE status = 'failed'
ORDER BY created_at DESC;
```

## 🎨 Email Customization

Pas de email template aan in:
`supabase/functions/send-sign-email/index.ts`

Wijzigbare elementen:
- `from` email adres (regel ~240)
- Subject line (regel ~242)
- Email HTML template (regel ~60-200)
- Gradient colors
- Button styling
- Footer content

## 💰 Resend Limieten

**Gratis tier**: 100 emails/dag
**Pro plan**: €20/maand = 50.000 emails/maand

Voor grotere volumes, upgrade naar Pro in Resend Dashboard.

## ❓ Troubleshooting

### Email komt niet aan:
1. Check email_logs tabel voor errors
2. Verifieer Resend API key in Supabase secrets
3. Check spam folder
4. Verifieer domein in Resend (voor productie)

### Function error:
```bash
# Check function logs
npx supabase functions logs send-sign-email

# Test function locally
npx supabase functions serve send-sign-email
```

### CORS issues:
- Edge Function heeft CORS headers
- Verifieer origin in request headers

## 🔄 Volgende Stappen

1. ✅ Deploy Edge Function
2. ✅ Run database migratie
3. ✅ Test email sending
4. 🔄 Configureer eigen domein in Resend (optioneel)
5. 🔄 Update email template met eigen branding
6. 🔄 Voeg tracking toe (open rate, click rate) via Resend webhooks

## 📚 Documentatie

- [Resend Docs](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)
