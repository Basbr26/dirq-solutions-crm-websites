# AI HR Assistant Chatbot - Documentatie

## Overzicht
De AI HR Assistant is een intelligente chatbot die medewerkers en managers helpt met vragen over HR-beleid, procedures, en arbeidsvoorwaarden. De chatbot gebruikt een knowledge base systeem en kan worden uitgebreid met Anthropic Claude API voor geavanceerdere AI-functies.

## Features

### ✨ **Kern Functionaliteit**

#### 1. **Natural Language Queries**
Medewerkers kunnen vragen stellen in natuurlijke taal:
- "Hoeveel verlofdagen heb ik nog?"
- "Wanneer is mijn functioneringsgesprek?"
- "Wat zijn de stappen bij ziekmelding?"
- "Wie is de manager van afdeling X?"
- "Hoe declareer ik onkosten?"

#### 2. **Contextual Awareness**
De chatbot herkent automatisch:
- **Gebruikersrol**: medewerker, manager, HR, of super admin
- **Permissies**: Antwoorden zijn afgestemd op rol
- **Persoonlijke context**: Naam, afdeling, functie
- **Conversatie geschiedenis**: Laatste 10 berichten voor context

#### 3. **Knowledge Base Integration**
Ingebouwde knowledge base met 10+ categorieën:
- ✅ Verzuim & Ziekmelding
- ✅ Wet Poortwachter uitleg
- ✅ Verlof & Vakantiedagen
- ✅ Functioneringsgesprekken
- ✅ Organisatiestructuur
- ✅ Onkosten declaratie
- ✅ Thuiswerken beleid
- ✅ Arbeidsvoorwaarden
- ✅ HR Contact informatie

#### 4. **Smart Suggestions**
Quick reply buttons voor veelgestelde vragen:
- 📅 Verlofdagen
- 🤒 Ziekmelding
- 💼 Functioneren
- 📞 HR Contact

#### 5. **User Experience**
- **Floating button**: Pulserende chat-icon rechtsonder
- **Slide-in panel**: 400px breed, niet full-screen
- **Typing indicators**: Animated "..." tijdens verwerking
- **Timestamps**: Relatieve tijd (bijv. "2 minuten geleden")
- **Feedback buttons**: 👍 👎 "Was dit nuttig?"
- **Copy to clipboard**: Kopieer antwoorden
- **Minimize/Maximize**: Panel inklapbaar

## Technische Architectuur

### 📁 **File Structure**
```
src/
├── components/
│   └── ai/
│       ├── HRChatbot.tsx          # Main chatbot component
│       └── ChatMessage.tsx        # Message bubble component
└── lib/
    └── ai/
        ├── claudeClient.ts        # API client & chat logic
        └── knowledgeBase.ts       # Knowledge base data & search
```

### 🗄️ **Database Schema**

#### chat_messages
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  session_id UUID REFERENCES chat_sessions(id),
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  title TEXT,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### chat_feedback
```sql
CREATE TABLE chat_feedback (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id),
  user_id UUID REFERENCES profiles(id),
  is_helpful BOOLEAN NOT NULL,
  feedback_text TEXT,
  created_at TIMESTAMP
);
```

#### ai_audit_log
```sql
CREATE TABLE ai_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  user_role TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP
);
```

### 🔒 **Security Implementation**

#### Row Level Security (RLS)
```sql
-- Users can only see their own messages
CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

-- HR can view all audit logs
CREATE POLICY "HR can view audit logs"
  ON ai_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('hr', 'super_admin')
    )
  );
```

#### Rate Limiting
```typescript
const RATE_LIMIT_MAX = 10; // messages per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute
```

#### Data Protection
- ❌ **Geen gevoelige data in responses**: BSN, salaris, medische info
- ✅ **Audit logging**: Alle AI interacties worden gelogd
- ✅ **RLS policies**: Users zien alleen eigen data
- ✅ **Fallback messages**: Bij twijfel → doorverwijzen naar HR

### 🤖 **AI Integration**

#### Knowledge Base Search Algorithm
```typescript
function searchKnowledgeBase(query: string, limit = 3) {
  // 1. Keyword matching (10 points per match)
  // 2. Question similarity (3 points)
  // 3. Answer relevance (1 point)
  // 4. Sort by score, return top results
}
```

#### Response Generation
```typescript
// Current: Knowledge base fallback (demo mode)
// Future: Anthropic Claude API integration

const response = await sendMessageToClaude({
  messages: [...chatHistory, userMessage],
  context: {
    userId, userName, role, department
  }
});
```

#### System Prompt Structure
```
Je bent een behulpzame AI HR Assistant voor Dirq Solutions.

Gebruiker Context:
- Naam: [user.name]
- Rol: [user.role]
- Afdeling: [user.department]

Richtlijnen:
1. Wees vriendelijk en professioneel
2. Geef concrete antwoorden
3. Verwijs naar documenten/procedures
4. NOOIT gevoelige data delen
5. Bij twijfel → HR contact

Knowledge Base Context:
[Relevant KB entries based on query]
```

## API Integration (Toekomstig)

### Anthropic Claude API Setup

#### 1. Environment Variables
```bash
# .env.local
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

#### 2. API Call (wanneer geactiveerd)
```typescript
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4.5-20241022',
    max_tokens: 1024,
    system: systemPrompt,
    messages: conversationHistory,
    stream: false,
  }),
});
```

#### 3. Streaming Responses (Optional)
```typescript
const stream = await sendMessageToClaude(messages, context, true);

for await (const chunk of stream) {
  // Update UI with partial response
  updateMessage(chunk.content);
}
```

## Usage

### Voor Eindgebruikers

#### Desktop
1. Klik op pulserende chat-icon rechtsonder
2. Chat panel opent (400px breed)
3. Type vraag of klik quick reply button
4. Ontvang antwoord met links/instructies
5. Geef feedback met 👍 👎
6. Minimize met `-` icon
7. Sluit met `×` icon

#### Mobile
- Responsive design
- Full-width panel op kleine schermen
- Touch-friendly buttons
- Swipe down to minimize

### Voor Developers

#### Chatbot Toevoegen aan Pagina
```tsx
import { HRChatbot } from '@/components/ai/HRChatbot';

function MyPage() {
  return (
    <div>
      {/* Page content */}
      <HRChatbot />
    </div>
  );
}
```

#### Knowledge Base Uitbreiden
```typescript
// src/lib/ai/knowledgeBase.ts
export const knowledgeBase: KnowledgeBaseEntry[] = [
  {
    id: 'new-topic',
    category: 'Nieuwe Categorie',
    question: 'Hoe doe ik X?',
    answer: 'Je doet X door...',
    keywords: ['keyword1', 'keyword2'],
    url: '/path/to/page',
  },
  // ... more entries
];
```

#### Custom Actions Triggeren
```typescript
// In claudeClient.ts response handler
if (userQuery.includes('meld me ziek')) {
  // Return response with action
  return {
    content: 'Ik open de ziekmeld wizard voor je...',
    action: 'open-sick-leave-wizard',
    url: '/dashboard/medewerker?action=sick-leave'
  };
}
```

## Monitoring & Analytics

### Audit Logs Bekijken (HR Role)
```sql
SELECT 
  user_id,
  user_role,
  query,
  response,
  tokens_used,
  response_time_ms,
  created_at
FROM ai_audit_log
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Populaire Queries
```sql
SELECT 
  query,
  COUNT(*) as frequency
FROM ai_audit_log
GROUP BY query
ORDER BY frequency DESC
LIMIT 10;
```

### Feedback Analytics
```sql
SELECT 
  is_helpful,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM chat_feedback
GROUP BY is_helpful;
```

## Performance

### Metrics
- **Initial load**: < 500ms
- **Message send**: < 2 seconden (knowledge base)
- **Message send**: < 5 seconden (met Claude API)
- **Chat history load**: < 300ms
- **Feedback submit**: < 200ms

### Optimalisaties
- ✅ Message virtualization (alleen visible messages renderen)
- ✅ Debounced typing indicators
- ✅ Lazy loading van chat history
- ✅ Memoized knowledge base search
- ✅ Compressed audit logs (alleen laatste 1000 entries)

## Toekomstige Features

### Phase 2
- [ ] **Voice Input**: Speech-to-Text (Web Speech API)
- [ ] **File Upload**: Documenten uploaden voor context
- [ ] **Multi-language**: Engels, Duits ondersteuning
- [ ] **Proactive Suggestions**: "Je hebt binnenkort een gesprek..."
- [ ] **Team Chat**: Groepsgesprekken met HR

### Phase 3
- [ ] **Custom AI Training**: Train op bedrijfsspecifieke data
- [ ] **Integration Actions**: Direct acties uitvoeren (verlof aanvragen, etc.)
- [ ] **Analytics Dashboard**: HR inzicht in chat patterns
- [ ] **Smart Notifications**: Push notifications voor belangrijke updates
- [ ] **Escalation**: Automatisch doorschakelen naar menselijke HR bij complexe vragen

## Troubleshooting

### Chatbot opent niet
- Check of user is authenticated (`useAuth()`)
- Verify session initialization in console
- Check browser console voor errors

### Rate limit errors
```typescript
// Verhoog limiet in claudeClient.ts
const RATE_LIMIT_MAX = 20; // was 10
```

### Knowledge base niet accuraat
- Voeg meer keywords toe aan entries
- Verbeter search algorithm weights
- Test met verschillende query variaties

### Database errors
```bash
# Run migration
psql -U postgres -d your_db -f supabase/migrations/20251217_chat_messages.sql
```

## Support
Voor vragen of bugs: neem contact op met het dev team of open een issue in de repository.

## Changelog

### v1.0.0 (December 2025)
- ✨ Initial release
- 💬 Knowledge base met 10+ categorieën
- 🤖 AI-powered responses (knowledge base fallback)
- 🎨 Beautiful UI met animations
- 🔒 Security: RLS policies, rate limiting, audit logging
- 📱 Responsive design
- 👍 Feedback systeem
- 📊 Chat history & sessions
- ⚡ Performance optimalisaties

### Roadmap v1.1.0
- 🌐 Anthropic Claude API integration
- 🎤 Voice input
- 📎 File upload
- 🔔 Proactive suggestions
