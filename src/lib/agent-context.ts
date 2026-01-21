/**
 * Agent Context API
 * Provides a standardized interface for AI agents (Manus, n8n, Gemini) 
 * to extract and interact with CRM data.
 */

export interface AgentContext {
  // Current page/route
  route: {
    path: string;
    params: Record<string, string>;
    query: Record<string, string>;
  };
  
  // Current user
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  } | null;
  
  // Currently viewed entity
  entity: {
    type: 'company' | 'contact' | 'project' | 'quote' | 'document' | 'interaction' | null;
    id: string | null;
    data: Record<string, unknown> | null;
  };
  
  // Selected tab (if applicable)
  activeTab: string | null;
  
  // Visible data on screen
  visibleData: {
    companies?: AgentCompanyData[];
    contacts?: AgentContactData[];
    projects?: AgentProjectData[];
    documents?: AgentDocumentData[];
    interactions?: AgentInteractionData[];
    stats?: Record<string, number | string>;
  };
  
  // Available actions
  availableActions: string[];
  
  // Timestamp
  timestamp: string;
}

export interface AgentCompanyData {
  id: string;
  name: string;
  status: string;
  email?: string;
  phone?: string;
  industry?: string;
  totalValue?: number;
  lastContact?: string;
}

export interface AgentContactData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  companyId?: string;
  companyName?: string;
}

export interface AgentProjectData {
  id: string;
  title: string;
  stage: string;
  value: number;
  probability: number;
  companyId?: string;
  companyName?: string;
  dueDate?: string;
}

export interface AgentDocumentData {
  id: string;
  title: string;
  fileName: string;
  status: string;
  signStatus: 'unsigned' | 'pending' | 'signed' | 'declined' | 'expired';
  companyId?: string;
  signedAt?: string;
  signedBy?: string;
}

export interface AgentInteractionData {
  id: string;
  type: string;
  subject: string;
  date: string;
  companyId?: string;
  contactId?: string;
  isTask: boolean;
  completed: boolean;
}

/**
 * Extract context from DOM elements with data-agent attributes
 */
export function extractAgentElements(): Record<string, unknown> {
  const elements: Record<string, unknown> = {};
  
  if (typeof document === 'undefined') return elements;
  
  // Find all elements with data-agent attribute
  const agentElements = document.querySelectorAll('[data-agent]');
  
  agentElements.forEach((el) => {
    const key = el.getAttribute('data-agent');
    if (!key) return;
    
    // Get value based on element type
    let value: unknown;
    
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      value = el.value;
    } else if (el instanceof HTMLSelectElement) {
      value = el.value;
    } else if (el.hasAttribute('data-agent-value')) {
      // Explicit value
      const rawValue = el.getAttribute('data-agent-value');
      try {
        value = JSON.parse(rawValue || '');
      } catch {
        value = rawValue;
      }
    } else {
      // Text content
      value = el.textContent?.trim();
    }
    
    // Handle nested keys (e.g., "company.name")
    const keys = key.split('.');
    let current = elements;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]] = value;
  });
  
  return elements;
}

/**
 * Get current route information
 */
export function getRouteContext(): AgentContext['route'] {
  if (typeof window === 'undefined') {
    return { path: '', params: {}, query: {} };
  }
  
  const url = new URL(window.location.href);
  const query: Record<string, string> = {};
  
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  
  // Extract route params from path
  const pathParts = url.pathname.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  
  // Common patterns
  if (pathParts[0] === 'companies' && pathParts[1]) {
    params.companyId = pathParts[1];
  }
  if (pathParts[0] === 'contacts' && pathParts[1]) {
    params.contactId = pathParts[1];
  }
  if (pathParts[0] === 'projects' && pathParts[1]) {
    params.projectId = pathParts[1];
  }
  if (pathParts[0] === 'quotes' && pathParts[1]) {
    params.quoteId = pathParts[1];
  }
  if (pathParts[0] === 'sign' && pathParts[1]) {
    params.signToken = pathParts[1];
  }
  
  return {
    path: url.pathname,
    params,
    query,
  };
}

/**
 * Main function to get complete agent context
 * Call this from any component or expose via window for external agents
 */
export function getAgentContext(options?: {
  user?: AgentContext['user'];
  entity?: AgentContext['entity'];
  visibleData?: AgentContext['visibleData'];
}): AgentContext {
  const route = getRouteContext();
  const domData = extractAgentElements();
  
  // Determine active tab from URL or DOM
  let activeTab = route.query.tab || null;
  if (!activeTab) {
    const activeTabEl = document.querySelector('[data-state="active"][role="tab"]');
    activeTab = activeTabEl?.getAttribute('data-value') || null;
  }
  
  // Determine available actions from DOM
  const actionElements = document.querySelectorAll('[data-agent-action]');
  const availableActions: string[] = [];
  actionElements.forEach((el) => {
    const action = el.getAttribute('data-agent-action');
    if (action && !el.hasAttribute('disabled')) {
      availableActions.push(action);
    }
  });
  
  return {
    route,
    user: options?.user || null,
    entity: options?.entity || {
      type: null,
      id: null,
      data: null,
    },
    activeTab,
    visibleData: {
      ...options?.visibleData,
      ...domData,
    },
    availableActions,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send command to n8n webhook for processing
 */
export async function sendAgentCommand(
  input: string,
  context: AgentContext,
  webhookUrl?: string
): Promise<{
  success: boolean;
  commandId?: string;
  result?: unknown;
  error?: string;
}> {
  const url = webhookUrl || import.meta.env.VITE_N8N_COMMAND_WEBHOOK_URL;
  
  if (!url) {
    return { success: false, error: 'No webhook URL configured' };
  }
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        command: input,
        context,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      commandId: result.id,
      result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register global agent interface for external access
 * Agents can call window.DirqAgent.getContext() from console or scripts
 */
export function registerGlobalAgentInterface(userGetter: () => AgentContext['user']) {
  if (typeof window === 'undefined') return;
  
  (window as any).DirqAgent = {
    getContext: () => getAgentContext({ user: userGetter() }),
    sendCommand: (input: string) => {
      const context = getAgentContext({ user: userGetter() });
      return sendAgentCommand(input, context);
    },
    extractElements: extractAgentElements,
    version: '1.0.0',
  };
  
  console.info('🤖 Dirq Agent Interface registered. Use window.DirqAgent.getContext() to inspect.');
}

/**
 * Hook to use agent context in React components
 */
import { useEffect, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function useAgentContext(entityData?: {
  type: AgentContext['entity']['type'];
  id: string | null;
  data: Record<string, unknown> | null;
}) {
  const location = useLocation();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { user, profile, role } = useAuth();
  const [context, setContext] = useState<AgentContext | null>(null);
  
  useEffect(() => {
    const query: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      query[key] = value;
    });
    
    const ctx: AgentContext = {
      route: {
        path: location.pathname,
        params: params as Record<string, string>,
        query,
      },
      user: user ? {
        id: user.id,
        email: user.email || '',
        role: role || '',
        name: profile ? `${profile.first_name} ${profile.last_name}` : '',
      } : null,
      entity: entityData || { type: null, id: null, data: null },
      activeTab: query.tab || null,
      visibleData: {},
      availableActions: [],
      timestamp: new Date().toISOString(),
    };
    
    setContext(ctx);
  }, [location, params, searchParams, user, profile, role, entityData]);
  
  return context;
}
