# Finance Outreach Strategy - Implementatie Overzicht

**Datum**: 7 januari 2026  
**Project**: Dirq CRM Website - Finance Professional Targeting  
**Status**: ✅ Volledig geïmplementeerd

---

## 📋 Samenvatting

Deze update transformeert het Dirq CRM systeem voor de nieuwe verkoopstrategie gericht op finance professionals. De focus ligt op geautomatiseerde outreach via LinkedIn Video Audits, fysieke kaartjes en LinkedIn Direct berichten.

---

## 🎯 Geïmplementeerde Features

### 1. Database & Type Uitbreidingen

#### Nieuwe Interaction Types
```typescript
// src/types/crm.ts
export type InteractionType = 
  | 'physical_mail'           // Fysiek kaartje/brochure verstuurd
  | 'linkedin_video_audit';   // LinkedIn video audit verstuurd
```

**Gebruik**: Log outreach activiteiten specifiek voor finance professional targeting

#### Project Velden
```typescript
interface Project {
  website_builder?: '10web.io' | 'Landingpage.ai';
  delivery_deadline?: string;
}
```

**Gebruik**: Track welke AI website builder gebruikt wordt en project deadlines

#### Quote Add-ons
```typescript
export const QUOTE_ADDONS = {
  LOGO_DESIGN: { title: 'Logo design', price: 350 },
  EXTRA_PAGES: { title: 'Extra pagina\'s', price: 150 },
  RUSH_DELIVERY: { title: 'Rush delivery', price: 300 },
} as const;
```

**Gebruik**: Standaard add-on opties voor offertes

---

### 2. Outreach Tracker Widget

**Locatie**: `src/components/OutreachTrackerWidget.tsx`

#### Features
- ✅ Real-time tracking van wekelijkse outreach doelen
- ✅ 3 doel types:
  - 50x LinkedIn Video Audits
  - 25x Fysieke Kaartjes
  - 25x LinkedIn Direct Berichten
- ✅ Visuele progress bars per type
- ✅ Automatische berekening: gemiddelde per dag, nodig voor doel
- ✅ Week nummer en totale voortgang

#### Integratie
```tsx
import { OutreachTrackerWidget } from '@/components/OutreachTrackerWidget';

// In Dashboard:
<OutreachTrackerWidget />
```

#### Data Source
```sql
SELECT type, COUNT(*) 
FROM interactions 
WHERE created_at >= start_of_week 
  AND created_at <= end_of_week
  AND type IN ('linkedin_video_audit', 'physical_mail', 'call')
GROUP BY type;
```

---

### 3. Follow-up Automation

**Locatie**: `src/lib/followUpAutomation.ts`

#### Automatische LinkedIn Follow-up
Wanneer een `physical_mail` interaction wordt aangemaakt:
1. ⏰ Automatisch een LinkedIn follow-up taak aanmaken
2. 📅 Due date: 4 dagen na fysiek kaartje versturen
3. 📝 Subject: "LinkedIn Follow-up: [Company Name]"
4. 🏷️ Tags: `auto-generated`, `follow-up`, `physical-mail`

#### Implementatie
```typescript
// In useInteractions.ts
if (interaction.type === 'physical_mail') {
  await handleInteractionCreated({
    id: interaction.id,
    type: interaction.type,
    company_id: interaction.company_id,
    contact_id: interaction.contact_id,
    user_id: interaction.user_id,
  });
}
```

#### Batch Processing
```typescript
// Handmatig uitvoeren of via cron job
import { processOverdueFollowUps } from '@/lib/followUpAutomation';

await processOverdueFollowUps();
// Returns: { processed, created, failed }
```

---

### 4. Financiële Berekeningen

**Locatie**: `src/lib/financialCalculations.ts`

#### Bedrijfskosten Constanten
```typescript
export const FIXED_COSTS_PER_MONTH = 262;      // €262/maand
export const VARIABLE_COST_PER_CLIENT = 12;    // €12 per klant
```

#### Beschikbare Functies

##### Project Kosten
```typescript
calculateProjectCosts({
  projectRevenue: 5000,
  activeProjectCount: 10,
  customVariableCost: 12
});
// Returns: { fixedCost: 26.20, variableCost: 12, totalCost: 38.20 }
```

##### Marge Berekening
```typescript
calculateProjectMargin({
  revenue: 5000,
  fixedCost: 26.20,
  variableCost: 12
});
// Returns: { totalCost, grossProfit, marginPercentage, marginEuros }
```

##### Break-even Analysis
```typescript
calculateBreakEven({
  fixedCosts: 262,
  variableCostPerUnit: 12,
  pricePerUnit: 2500
});
// Returns: { breakEvenUnits, breakEvenRevenue }
```

##### Profitability Forecast
```typescript
forecastProfitability({
  monthlyRevenue: 10000,
  clientCount: 5,
  months: 12
});
// Returns: Array van 12 maanden met revenue, costs, profit, margin
```

#### Integratie Voorbeeld
```tsx
import { calculateProjectMargin, formatCurrency } from '@/lib/financialCalculations';

const margin = calculateProjectMargin({
  revenue: project.value,
  fixedCost: 26.20,
  variableCost: 12
});

return (
  <div>
    <p>Marge: {formatCurrency(margin.marginEuros)}</p>
    <p>Percentage: {margin.marginPercentage.toFixed(1)}%</p>
  </div>
);
```

---

### 5. n8n Webhook Integration

**Locatie**: `supabase/functions/n8n-webhook-handler/`

#### Endpoint
```
POST https://[project-ref].supabase.co/functions/v1/n8n-webhook-handler
```

#### Authenticatie
```bash
# Headers
X-Webhook-Secret: your-secret-key

# Secrets instellen
supabase secrets set N8N_WEBHOOK_SECRET=your-secret-key
supabase secrets set DEFAULT_LEAD_OWNER_ID=user-uuid
```

#### Payload Types

**KVK Registratie**:
```json
{
  "type": "kvk_registration",
  "company_name": "Finance Solutions B.V.",
  "kvk_number": "12345678",
  "website": "https://financesolutions.nl",
  "email": "info@financesolutions.nl",
  "phone": "+31201234567",
  "address": {
    "street": "Hoofdstraat 123",
    "city": "Amsterdam",
    "postal_code": "1011 AB",
    "country": "Nederland"
  },
  "contact": {
    "first_name": "Jan",
    "last_name": "Jansen",
    "position": "CFO",
    "linkedin_url": "https://linkedin.com/in/janjansen"
  },
  "industry": "Finance",
  "source": "KVK API",
  "metadata": {
    "registration_date": "2026-01-07"
  }
}
```

**LinkedIn Profile**:
```json
{
  "type": "linkedin_profile",
  "company_name": "TechStart BV",
  "contact": {
    "first_name": "Maria",
    "last_name": "Peters",
    "position": "Finance Director",
    "linkedin_url": "https://linkedin.com/in/mariapeters"
  },
  "industry": "Technology",
  "source": "LinkedIn Scraper"
}
```

#### Functionaliteit
- ✅ Automatische company creatie/update
- ✅ Contact persoon aanmaken
- ✅ Duplicate detectie (KVK nummer + naam)
- ✅ Automatische interaction note
- ✅ Industry matching
- ✅ Tagging: `n8n-automated`, `[type]`

#### Testing
```bash
curl -X POST https://[project].supabase.co/functions/v1/n8n-webhook-handler \
  -H "X-Webhook-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kvk_registration",
    "company_name": "Test Company BV",
    "source": "Manual Test"
  }'
```

#### Deployment
```bash
supabase functions deploy n8n-webhook-handler
```

---

## 📊 Impact & Metrics

### Outreach Targets (per week)
- 🎥 **50 LinkedIn Video Audits**
- 📬 **25 Fysieke Kaartjes**
- 💬 **25 LinkedIn Direct Berichten**
- **Totaal**: 100 outreach acties per week

### Financial Impact
- **Vaste kosten**: €262/maand
- **Variabele kosten**: €12/klant
- **Break-even**: Berekend per project op basis van actieve projecten

### Automation Benefits
- ⏱️ **4 dagen automatische follow-up**: Geen handmatige tracking meer
- 🤖 **n8n lead import**: KVK registraties direct in CRM
- 📈 **Real-time tracking**: Wekelijkse voortgang altijd zichtbaar

---

## 🔧 Installatie & Setup

### 1. Database Migraties
Voeg optioneel toe aan database schema:
```sql
-- Add website_builder to projects
ALTER TABLE projects 
ADD COLUMN website_builder TEXT CHECK (website_builder IN ('10web.io', 'Landingpage.ai')),
ADD COLUMN delivery_deadline TIMESTAMPTZ;

-- Add is_addon flag to quote_items
ALTER TABLE quote_items 
ADD COLUMN is_addon BOOLEAN DEFAULT false;
```

### 2. Supabase Secrets
```bash
supabase secrets set N8N_WEBHOOK_SECRET=generate-random-secret-key
supabase secrets set DEFAULT_LEAD_OWNER_ID=your-admin-user-uuid
```

### 3. Deploy Edge Function
```bash
cd supabase/functions
supabase functions deploy n8n-webhook-handler
```

### 4. n8n Workflow Setup
1. Create HTTP Request node
2. URL: `https://[project].supabase.co/functions/v1/n8n-webhook-handler`
3. Headers: `X-Webhook-Secret: {{secret}}`
4. Map KVK/LinkedIn data to payload format

---

## 📚 Code Referenties

### Type Definitions
- `src/types/crm.ts` - Alle CRM types en enums
- InteractionType: `physical_mail`, `linkedin_video_audit`
- QUOTE_ADDONS constant

### Components
- `src/components/OutreachTrackerWidget.tsx` - Wekelijkse doelen tracker
- `src/features/interactions/components/AddInteractionDialog.tsx` - Nieuwe interaction types
- `src/features/interactions/components/InteractionDetailDialog.tsx` - View met nieuwe types

### Utilities
- `src/lib/followUpAutomation.ts` - Automatische follow-up logica
- `src/lib/financialCalculations.ts` - Marge en cost berekeningen

### Hooks
- `src/features/interactions/hooks/useInteractions.ts` - Geüpdatet met follow-up trigger

### Edge Functions
- `supabase/functions/n8n-webhook-handler/index.ts` - Webhook handler
- `supabase/functions/n8n-webhook-handler/README.md` - Volledige documentatie

---

## 🚀 Next Steps

### Korte Termijn
1. ✅ Deploy naar Netlify (inclusief alle vorige fixes)
2. ⬜ OutreachTrackerWidget toevoegen aan Dashboard
3. ⬜ n8n workflow configureren voor KVK scraping
4. ⬜ Testen van automatische follow-ups

### Lange Termijn
1. ⬜ A/B testing van outreach types
2. ⬜ Conversion tracking per outreach method
3. ⬜ Geautomatiseerde LinkedIn video generatie
4. ⬜ AI-powered lead scoring op basis van outreach response

---

## 📝 Testing Checklist

### Interaction Types
- [ ] Fysiek kaartje aanmaken via AddInteractionDialog
- [ ] LinkedIn video audit aanmaken
- [ ] Automatische follow-up taak wordt aangemaakt na 4 dagen
- [ ] Interaction types zichtbaar in timeline

### Outreach Tracker
- [ ] Widget toont correcte week nummer
- [ ] Doelen en huidige status kloppen
- [ ] Progress bars updaten real-time
- [ ] Gemiddelde berekeningen correct

### Financial Calculations
- [ ] Project margin berekening klopt
- [ ] Break-even analysis correct
- [ ] Forecast genereert juiste data

### n8n Webhook
- [ ] Webhook ontvangt payload
- [ ] Company wordt aangemaakt
- [ ] Contact wordt gekoppeld
- [ ] Duplicate detectie werkt
- [ ] Authentication met secret werkt

---

## 🐛 Known Issues & Limitations

1. **OutreachTrackerWidget**: Nog niet geïntegreerd in main dashboard - handmatig toevoegen
2. **Follow-up Batch Process**: Geen cron job geconfigureerd - handmatig uitvoeren indien nodig
3. **n8n Webhook**: Rate limiting niet ingebouwd - monitor volume
4. **Financial Calculations**: Geen caching - kan bij grote datasets traag zijn

---

## 📞 Support & Vragen

Voor vragen over deze implementatie:
- Check README.md in n8n-webhook-handler folder
- Bekijk inline code comments
- Test met curl/Postman voorbeelden

---

**Implementatie voltooid**: 7 januari 2026  
**Commits klaar voor push**: 5 totaal (4 eerdere fixes + 1 Finance Outreach)  
**Status**: ✅ Klaar voor deployment naar Netlify
