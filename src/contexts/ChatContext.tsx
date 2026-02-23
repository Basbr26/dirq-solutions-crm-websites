import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ChatPageContext {
  type: 'company' | 'contact' | 'quote' | 'project' | 'pipeline' | 'dashboard' | null;
  id?: string;
  name?: string;
  metadata?: Record<string, string | number | null>;
}

interface ChatContextValue {
  chatContext: ChatPageContext | null;
  setChatContext: (ctx: ChatPageContext) => void;
  clearChatContext: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatContextProvider({ children }: { children: ReactNode }) {
  const [chatContext, setChatContextState] = useState<ChatPageContext | null>(null);

  const setChatContext = useCallback((ctx: ChatPageContext) => {
    setChatContextState(ctx);
  }, []);

  const clearChatContext = useCallback(() => {
    setChatContextState(null);
  }, []);

  return (
    <ChatContext.Provider value={{ chatContext, setChatContext, clearChatContext }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatContext must be used within ChatContextProvider');
  return ctx;
}
