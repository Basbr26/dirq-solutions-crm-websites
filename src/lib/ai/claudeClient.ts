/**
 * Anthropic Claude API Client voor HR Assistant
 */

import { supabase } from '@/integrations/supabase/client';
import { searchKnowledgeBase } from './knowledgeBase';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UserContext {
  userId: string;
  userName: string;
  role: 'medewerker' | 'manager' | 'hr' | 'super_admin';
  department?: string;
  employeeId?: string;
}

export interface ClaudeResponse {
  content: string;
  stopReason: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// Rate limiting map (user_id -> { count, resetTime })
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_MAX = 10; // messages per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

/**
 * Check if user has exceeded rate limit
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize
    rateLimitMap.set(userId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false; // Rate limit exceeded
  }

  userLimit.count++;
  return true;
}

/**
 * Build system prompt with user context and knowledge base
 */
function buildSystemPrompt(context: UserContext, knowledgeContext: string): string {
  const roleDescriptions = {
    medewerker: 'een medewerker die vragen heeft over verlof, verzuim, ontwikkeling, en arbeidsvoorwaarden',
    manager: 'een manager die verantwoordelijk is voor een team en vragen heeft over teammanagement, verzuimbegeleiding, en HR-beleid',
    hr: 'een HR medewerker die toegang heeft tot alle personeelsinformatie en beleidsdocumenten',
    super_admin: 'een super admin met volledige toegang tot het systeem',
  };

  return `Je bent een behulpzame AI HR Assistant voor Dirq Solutions. Je helpt medewerkers en managers met vragen over HR-beleid, procedures, en arbeidsvoorwaarden.

**Gebruiker Context:**
- Naam: ${context.userName}
- Rol: ${context.role}
- Omschrijving: ${roleDescriptions[context.role]}
${context.department ? `- Afdeling: ${context.department}` : ''}

**Belangrijke Richtlijnen:**
1. Wees vriendelijk, professioneel, en empathisch
2. Geef concrete, actionable antwoorden
3. Verwijs naar specifieke documenten of procedures als relevant
4. Bij persoonlijke/gevoelige zaken: adviseer contact met HR
5. NOOIT gevoelige data delen (BSN, salaris, medische info)
6. Bij twijfel: "Ik kan dit niet beantwoorden, neem contact op met HR"
7. Gebruik de knowledge base info hieronder voor accurate antwoorden
8. Linkt naar relevante pagina's in het systeem waar mogelijk
9. Bij acties zoals "meld me ziek": leg uit hoe en waar in het systeem

**Knowledge Base Context:**
${knowledgeContext || 'Geen specifieke context beschikbaar.'}

**Antwoord Richtlijnen:**
- Gebruik duidelijke, begrijpelijke taal (geen jargon)
- Structureer lange antwoorden met bullets/nummering
- Geef stappen bij procedures
- Verwijs naar contactpersonen waar relevant
- Eindig met vraag of gebruiker meer info nodig heeft`;
}

/**
 * Send message to Claude API (simulated for demo - replace with real API call)
 */
export async function sendMessageToClaude(
  messages: Message[],
  context: UserContext,
  stream = false
): Promise<ClaudeResponse> {
  // Check rate limit
  if (!checkRateLimit(context.userId)) {
    throw new Error('Rate limit exceeded. Please wait a minute before sending more messages.');
  }

  // Extract user query from last message
  const userQuery = messages[messages.length - 1].content;

  // Search knowledge base for relevant context
  const knowledgeResults = searchKnowledgeBase(userQuery, 3);
  const knowledgeContext = knowledgeResults
    .map(
      (kb, idx) =>
        `\n${idx + 1}. ${kb.category} - ${kb.question}\n${kb.answer}${kb.url ? `\nLink: ${kb.url}` : ''}`
    )
    .join('\n---\n');

  // Build system prompt
  const systemPrompt = buildSystemPrompt(context, knowledgeContext);

  // Simulate API response (in production, replace with actual Anthropic API call)
  const startTime = Date.now();

  try {
    // TODO: Replace with actual Anthropic API call
    // const response = await fetch('https://api.anthropic.com/v1/messages', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'x-api-key': process.env.ANTHROPIC_API_KEY,
    //     'anthropic-version': '2023-06-01',
    //   },
    //   body: JSON.stringify({
    //     model: 'claude-sonnet-4.5-20241022',
    //     max_tokens: 1024,
    //     system: systemPrompt,
    //     messages: messages.map(m => ({ role: m.role, content: m.content })),
    //     stream,
    //   }),
    // });

    // DEMO: Simulate response based on knowledge base
    let responseContent = '';

    if (knowledgeResults.length > 0) {
      const topResult = knowledgeResults[0];
      responseContent = `${topResult.answer}\n\n`;

      if (topResult.url) {
        responseContent += `Je kunt meer informatie vinden op: ${topResult.url}\n\n`;
      }

      responseContent += 'Heb je nog andere vragen? Ik help je graag verder! 😊';
    } else {
      // Fallback response
      responseContent = `Bedankt voor je vraag over "${userQuery}". 

Helaas kan ik op dit moment geen specifiek antwoord geven. Voor deze vraag raad ik je aan om:

1. Contact op te nemen met HR via hr@dirq.nl of telefoon 020-1234567
2. Je leidinggevende te raadplegen
3. Het HR portal te checken voor meer informatie

Kan ik je met iets anders helpen?`;
    }

    const responseTime = Date.now() - startTime;

    // Log to audit table
    await logAuditEntry({
      userId: context.userId,
      userRole: context.role,
      query: userQuery,
      response: responseContent,
      tokensUsed: Math.ceil(responseContent.length / 4), // Rough estimate
      responseTimeMs: responseTime,
    });

    return {
      content: responseContent,
      stopReason: 'end_turn',
      usage: {
        inputTokens: Math.ceil(userQuery.length / 4),
        outputTokens: Math.ceil(responseContent.length / 4),
      },
    };
  } catch (error) {
    console.error('Claude API error:', error);
    throw new Error('Er is een fout opgetreden bij het verwerken van je vraag. Probeer het later opnieuw.');
  }
}

/**
 * Log AI interaction to audit table
 */
async function logAuditEntry(entry: {
  userId: string;
  userRole: string;
  query: string;
  response: string;
  tokensUsed: number;
  responseTimeMs: number;
}) {
  try {
    await (supabase.from('ai_audit_log') as any).insert({
      user_id: entry.userId,
      user_role: entry.userRole,
      query: entry.query,
      response: entry.response,
      tokens_used: entry.tokensUsed,
      response_time_ms: entry.responseTimeMs,
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - logging failure shouldn't break the chat
  }
}

/**
 * Save message to chat history
 */
export async function saveMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  metadata?: Record<string, unknown>
) {
  const { error } = await (supabase.from('chat_messages') as any).insert({
    session_id: sessionId,
    user_id: userId,
    role,
    content,
    metadata: metadata || {},
  });

  if (error) {
    console.error('Failed to save message:', error);
    throw error;
  }
}

/**
 * Get or create chat session
 */
export async function getOrCreateSession(userId: string): Promise<string> {
  try {
    // Try to get most recent session
    const { data: sessions, error: fetchError } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Failed to fetch sessions:', fetchError);
    }

    // If recent session exists (< 1 hour old), use it
    if (sessions && sessions.length > 0) {
      return sessions[0].id;
    }

    // Create new session
    const { data: newSession, error: createError } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        title: 'Nieuwe conversatie',
      })
      .select('id')
      .single();

    if (createError || !newSession) {
      console.error('Failed to create session:', createError);
      throw new Error('Could not create chat session');
    }

    return newSession.id;
  } catch (error) {
    console.error('Session error:', error);
    throw new Error('Could not create chat session');
  }
}

/**
 * Get chat history for session
 */
export async function getChatHistory(sessionId: string, limit = 10): Promise<Message[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch chat history:', error);
    return [];
  }

  // Reverse to get chronological order
  return ((data || []) as unknown as Message[]).reverse();
}

/**
 * Submit feedback for a message
 */
export async function submitFeedback(
  messageId: string,
  userId: string,
  isHelpful: boolean,
  feedbackText?: string
) {
  const { error } = await supabase
    .from('chat_feedback')
    .insert({
      message_id: messageId,
      user_id: userId,
      is_helpful: isHelpful,
      feedback_text: feedbackText || null,
    });

  if (error) {
    console.error('Failed to submit feedback:', error);
    throw error;
  }
}
