/**
 * Additional TypeScript types for AI Chatbot tables
 * Add these to the main types.ts file when regenerating Supabase types
 */

export interface ChatMessage {
  id: string;
  user_id: string;
  session_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChatFeedback {
  id: string;
  message_id: string;
  user_id: string;
  is_helpful: boolean;
  feedback_text: string | null;
  created_at: string;
}

export interface AIAuditLog {
  id: string;
  user_id: string;
  user_role: string;
  query: string;
  response: string;
  tokens_used: number | null;
  response_time_ms: number | null;
  created_at: string;
}
