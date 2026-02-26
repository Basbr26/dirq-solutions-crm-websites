# LinkedIn Safety Rules - Anti-Scraping & Compliance

> **ABSOLUUT VERBODEN**: Direct scrapen van LinkedIn. Alleen API-gebaseerde extractie via goedgekeurde providers.

---

## Waarom Deze Regels?

### LinkedIn Detectiesystemen
LinkedIn heeft geavanceerde detectiesystemen voor geautomatiseerd gedrag:
- **Rate limiting** op alle acties
- **Behavioral analysis** voor robotpatronen
- **IP tracking** en fingerprinting
- **Account restricties** bij overtredingen

### Consequenties van Schending
- Account permanent geblokkeerd
- IP-range geblokkeerd
- Juridische actie mogelijk (ToS violation)
- Reputatieschade voor Dirq Solutions

---

## VERBODEN Acties

```
❌ Direct scrapen van LinkedIn profielen
❌ Headless browser automation (Puppeteer, Playwright)
❌ LinkedIn login credentials in automatisering
❌ Massa-connectieverzoeken via scripts
❌ Automated messaging zonder menselijke review
❌ Profile viewing bots
❌ Data extractie buiten officiële APIs
```

---

## TOEGESTAAN - API-Gebaseerde Providers

### Goedgekeurde Data Providers

| Provider | Gebruik | Rate Limits |
|----------|---------|-------------|
| **Apollo.io** | Contact enrichment, email finding | 1000/dag |
| **Dropcontact** | Email verificatie | 500/dag |
| **Clearbit** | Company enrichment | Variabel |
| **Hunter.io** | Email finding | 100/dag (free) |

### Implementatie Pattern
```javascript
// n8n workflow voor lead enrichment
// GOED: Via Apollo API
{
  "method": "POST",
  "url": "https://api.apollo.io/v1/people/match",
  "headers": {
    "x-api-key": "{{ $credentials.apolloApiKey }}"
  },
  "body": {
    "first_name": "{{ $json.firstName }}",
    "last_name": "{{ $json.lastName }}",
    "organization_name": "{{ $json.company }}"
  }
}
```

---

## LinkedIn Outreach Parameters

### Compliance Grenzen (2025/2026)

| Parameter | Limiet | Reden |
|-----------|--------|-------|
| **Connectieverzoeken** | < 100/week | Account vlaggen voorkomen |
| **Berichten-interval** | 2-5 minuten variabel | Menselijk patroon simuleren |
| **Account Warm-up** | 2-4 weken | Geleidelijke activiteitsopbouw |
| **Proxy Gebruik** | Residentiële proxies | Datacenter IPs worden gedetecteerd |

### Verplichte Wachttijden
```javascript
// In n8n workflow
// Wacht tussen LinkedIn acties
{
  "node": "Wait",
  "parameters": {
    "amount": "={{ Math.floor(Math.random() * 180) + 120 }}",
    "unit": "seconds"
  }
}
// Resulteert in 2-5 minuten willekeurige wachttijd
```

---

## Multi-Channel Outreach Sequentie

### Toegestane Flow
```
1. LinkedIn Touchpoint (HANDMATIG)
   ↓ Gepersonaliseerde opmerking bij recente post

2. Connectieverzoek (HANDMATIG)
   ↓ Uitnodiging met verwijzing naar eerdere interactie

3. E-mail Opvolging (GEAUTOMATISEERD - na 3 dagen geen reactie)
   ↓ Via Hunter.io gevonden email

4. CRM Synchronisatie (GEAUTOMATISEERD)
   ↓ Alle stappen worden real-time bijgewerkt in Supabase
```

### n8n Workflow Structuur
```
┌─────────────────┐
│ Apollo Enrichment│ (API - toegestaan)
└────────┬────────┘
         ↓
┌─────────────────┐
│ CRM Update      │ (Supabase RPC)
└────────┬────────┘
         ↓
┌─────────────────┐
│ Email Sequence  │ (Via email provider API)
└────────┬────────┘
         ↓
┌─────────────────┐
│ Slack Notify    │ (Voor handmatige LinkedIn actie)
└─────────────────┘
```

---

## Intent Data Strategie

### Toegestane Data Bronnen
```
✅ Publieke bedrijfsdata (KVK, websites)
✅ API-geleverde contact info (Apollo, Hunter)
✅ Eigen CRM interactiehistorie
✅ Inbound signalen (website visits, form fills)
```

### Intent Signals voor Personalisatie
```javascript
// Data die WEL mag worden gebruikt
const intentSignals = {
  recentJobChange: true,      // Via Apollo API
  companyFunding: true,       // Via Clearbit API
  websiteVisit: true,         // Eigen analytics
  contentEngagement: true,    // Eigen email stats
  linkedInPost: false         // NIET automatisch scrapen
};
```

---

## Monitoring & Compliance

### Audit Log Vereisten
```sql
-- Log alle outreach acties
INSERT INTO outreach_audit (
  lead_id,
  channel,
  action_type,
  performed_by,
  automated,
  provider_used,
  created_at
) VALUES (
  lead_id,
  'linkedin',
  'connection_request',
  user_id,
  false,  -- MOET false zijn voor LinkedIn
  null,   -- Geen provider, handmatige actie
  NOW()
);
```

### Weekly Compliance Check
- [ ] Geen LinkedIn API calls in n8n logs
- [ ] Alle enrichment via goedgekeurde providers
- [ ] Connectieverzoeken < 100/week per account
- [ ] Geen accounts geblokkeerd

---

## Escalatie Procedure

Bij detectie van ongeautoriseerde LinkedIn automatisering:

1. **STOP** - Workflow direct deactiveren
2. **LOG** - Document wat er is gebeurd
3. **ASSESS** - Check account status
4. **REPORT** - Meld aan management
5. **FIX** - Implementeer correctie

---

## Checklist voor Nieuwe Lead Gen Workflows

- [ ] Geen directe LinkedIn calls
- [ ] Enrichment via Apollo/Hunter/Clearbit
- [ ] Menselijke review voor LinkedIn acties
- [ ] Wachttijden geïmplementeerd
- [ ] Audit logging actief
- [ ] Rate limits gerespecteerd

---

*Dit is een COMPLIANCE VEREISTE - overtredingen kunnen leiden tot juridische consequenties.*

*Laatste update: 30 januari 2026*
