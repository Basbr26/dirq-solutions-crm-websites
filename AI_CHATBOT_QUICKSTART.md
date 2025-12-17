# AI HR Chatbot - Quick Start Guide

## Stap 1: Database Migratie
Voer de database migratie uit om de benodigde tabellen aan te maken:

```bash
# Via Supabase CLI
supabase db push

# Of handmatig via SQL Editor in Supabase Dashboard
# Kopieer inhoud van: supabase/migrations/20251217_chat_messages.sql
```

## Stap 2: Verifieer Tabellen
Check of de volgende tabellen zijn aangemaakt:
- ✅ `chat_messages`
- ✅ `chat_sessions`
- ✅ `chat_feedback`
- ✅ `ai_audit_log`

## Stap 3: Test de Chatbot

### Als Medewerker:
1. Login als medewerker
2. Kijk rechtsonder voor pulserende chat-icon (💬)
3. Klik op icon om chat te openen
4. Probeer quick replies:
   - 📅 Verlofdagen
   - 🤒 Ziekmelding
   - 💼 Functioneren
   - 📞 HR Contact

### Test Queries:
```
"Hoeveel verlofdagen heb ik nog?"
"Wat zijn de stappen bij ziekmelding?"
"Hoe declareer ik onkosten?"
"Wanneer is mijn functioneringsgesprek?"
"Hoe kan ik HR bereiken?"
```

## Stap 4: Bekijk Logs (als HR)
HR gebruikers kunnen AI audit logs bekijken:

```sql
-- In Supabase SQL Editor
SELECT 
  user_role,
  query,
  response,
  tokens_used,
  created_at
FROM ai_audit_log
ORDER BY created_at DESC
LIMIT 20;
```

## Features Checklist

### ✅ Werkend in Demo Mode:
- [x] Knowledge base met 10+ categorieën
- [x] Natural language query matching
- [x] Context-aware responses (rol/department)
- [x] Quick reply buttons
- [x] Chat history (laatste 10 berichten)
- [x] Feedback systeem (👍 👎)
- [x] Copy to clipboard
- [x] Minimize/Maximize panel
- [x] Rate limiting (10 msg/min)
- [x] Audit logging
- [x] RLS policies

### 🔜 Toekomstig (met Claude API):
- [ ] Real-time AI responses
- [ ] Streaming antwoorden
- [ ] Advanced context understanding
- [ ] Multi-turn conversations
- [ ] Proactive suggestions
- [ ] Voice input
- [ ] File upload

## Troubleshooting

### Chatbot button niet zichtbaar
**Oorzaak**: User niet authenticated
**Oplossing**: Login eerst, chatbot is alleen voor ingelogde users

### "Could not create chat session" error
**Oorzaak**: Database tabellen nog niet aangemaakt
**Oplossing**: Run migration (Stap 1)

### Responses altijd "Helaas kan ik geen specifiek antwoord geven"
**Normaal**: Dit is fallback response voor queries die niet in knowledge base staan
**Oplossing**: Voeg meer entries toe in `knowledgeBase.ts`

### Rate limit errors
**Oorzaak**: > 10 messages per minuut
**Oplossing**: Wacht 1 minuut, of verhoog limit in `claudeClient.ts`:
```typescript
const RATE_LIMIT_MAX = 20; // was 10
```

## Knowledge Base Uitbreiden

Voeg nieuwe entries toe in `/src/lib/ai/knowledgeBase.ts`:

```typescript
{
  id: 'unique-id',
  category: 'Categorie',
  question: 'Hoe doe ik X?',
  answer: `Uitgebreid antwoord met:
- Stappen
- Links
- Voorbeelden`,
  keywords: ['keyword1', 'keyword2', 'synoniemen'],
  url: '/optional/link/to/page',
}
```

## Anthropic Claude API Integration (Optioneel)

### Stap 1: API Key
```bash
# .env.local
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Stap 2: Uncomment API Code
In `/src/lib/ai/claudeClient.ts`, uncomment:
```typescript
// Lines ~160-180: Real API call code
const response = await fetch('https://api.anthropic.com/v1/messages', {
  // ... configuration
});
```

### Stap 3: Remove Demo Response
Comment out lines ~185-220 (DEMO response generation)

### Stap 4: Test
Send message → Should use real Claude API

## Monitoring

### Daily Check
```sql
-- Message volume per dag
SELECT 
  DATE(created_at) as date,
  COUNT(*) as messages
FROM chat_messages
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Popular Queries
```sql
-- Top 10 meest gestelde vragen
SELECT 
  query,
  COUNT(*) as frequency
FROM ai_audit_log
GROUP BY query
ORDER BY frequency DESC
LIMIT 10;
```

### Feedback Score
```sql
-- Percentage helpful responses
SELECT 
  ROUND(
    COUNT(CASE WHEN is_helpful THEN 1 END) * 100.0 / COUNT(*), 
    2
  ) as helpful_percentage
FROM chat_feedback;
```

## Support
Bij vragen of problemen:
- Check documentatie: `AI_CHATBOT.md`
- Review code: `/src/components/ai/` en `/src/lib/ai/`
- Contact dev team

## Changelog

### v1.0.0 - December 2025
🎉 Initial release met knowledge base demo mode
