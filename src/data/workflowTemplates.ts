/**
 * Workflow Templates - Voorgedefinieerde workflows voor veelvoorkomende CRM processen
 */

import type { WorkflowTemplate, WorkflowDefinition } from '@/types/workflow';

// ============================================================================
// LEAD NURTURING TEMPLATES
// ============================================================================

const leadNurturingTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Nieuwe lead aangemeld',
        triggerType: 'event',
        event: 'lead.created',
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 200 },
      data: {
        label: 'Verstuur welkomstmail',
        actionType: 'send_email',
        config: {
          to: '{{lead.email}}',
          subject: 'Welkom! Laten we kennismaken',
          template: 'lead_welcome',
        },
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 300 },
      data: {
        label: 'Wacht 2 dagen',
        waitType: 'duration',
        config: {
          duration: 2,
          unit: 'days',
        },
      },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 100, y: 400 },
      data: {
        label: 'Verstuur case studies',
        actionType: 'send_email',
        config: {
          to: '{{lead.email}}',
          subject: 'Bekijk onze website projecten',
          template: 'case_studies',
        },
      },
    },
    {
      id: 'wait-2',
      type: 'wait',
      position: { x: 100, y: 500 },
      data: {
        label: 'Wacht 3 dagen',
        waitType: 'duration',
        config: {
          duration: 3,
          unit: 'days',
        },
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 600 },
      data: {
        label: 'Notificeer sales rep',
        to: ['{{lead.assigned_to}}', 'role:sales'],
        subject: 'Follow-up met {{lead.company}}',
        message: 'Lead is warm - tijd voor persoonlijk contact.',
        channels: ['email', 'in_app'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
    { id: 'e2-3', source: 'action-1', target: 'wait-1' },
    { id: 'e3-4', source: 'wait-1', target: 'action-2' },
    { id: 'e4-5', source: 'action-2', target: 'wait-2' },
    { id: 'e5-6', source: 'wait-2', target: 'notification-1' },
  ],
};

const quoteApprovalTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Nieuwe offerte aangemaakt',
        triggerType: 'event',
        event: 'quote.created',
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 100, y: 200 },
      data: {
        label: 'Prijs > €10.000?',
        condition: '{{quote.total_amount}} > 10000',
        trueLabel: 'Ja',
        falseLabel: 'Nee',
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 300, y: 300 },
      data: {
        label: 'Notificeer manager',
        to: 'role:sales_manager',
        subject: 'Offerte goedkeuring vereist',
        message: 'Offerte van €{{quote.total_amount}} voor {{quote.company}} wacht op goedkeuring.',
        channels: ['email', 'in_app'],
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 300, y: 400 },
      data: {
        label: 'Wacht op goedkeuring',
        waitType: 'approval',
        config: {
          approver: 'role:sales_manager',
          timeout: 3,
        },
      },
    },
    {
      id: 'condition-2',
      type: 'condition',
      position: { x: 300, y: 500 },
      data: {
        label: 'Goedgekeurd?',
        condition: '{{approval.status}} == "approved"',
        trueLabel: 'Ja',
        falseLabel: 'Nee',
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 500, y: 600 },
      data: {
        label: 'Genereer offerte PDF',
        actionType: 'generate_document',
        config: {
          template: 'quote_template',
          output_path: 'quotes/{{quote.id}}/offerte.pdf',
        },
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 500, y: 700 },
      data: {
        label: 'Verstuur offerte',
        to: '{{quote.contact_email}}',
        subject: 'Offerte {{quote.number}}',
        message: 'Bedankt voor je interesse. Hierbij ontvang je onze offerte.',
        channels: ['email'],
      },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 100, y: 600 },
      data: {
        label: 'Auto-goedkeuren',
        actionType: 'approve_quote',
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'condition-1' },
    { id: 'e2-3', source: 'condition-1', target: 'notification-1', label: 'Ja' },
    { id: 'e3-4', source: 'notification-1', target: 'wait-1' },
    { id: 'e4-5', source: 'wait-1', target: 'condition-2' },
    { id: 'e5-6', source: 'condition-2', target: 'action-1', label: 'Ja' },
    { id: 'e6-7', source: 'action-1', target: 'notification-2' },
    { id: 'e2-8', source: 'condition-1', target: 'action-2', label: 'Nee' },
    { id: 'e8-6', source: 'action-2', target: 'action-1' },
  ],
};

// Placeholder templates (keep structure for now, can be enhanced later)
const projectOnboardingTemplate: WorkflowDefinition = leadNurturingTemplate;
const clientFollowUpTemplate: WorkflowDefinition = leadNurturingTemplate;
const contractSigningTemplate: WorkflowDefinition = quoteApprovalTemplate;
const paymentReminderTemplate: WorkflowDefinition = quoteApprovalTemplate;

// ============================================================================
// TEMPLATE EXPORT
// ============================================================================

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'template-lead-nurturing',
    name: 'Lead Nurturing',
    description: 'Automatische lead nurturing workflow: welkomstmail, case studies delen en timely follow-up door sales team.',
    category: 'sales',
    definition: leadNurturingTemplate,
    icon: 'UserPlus',
    tags: ['lead', 'nurturing', 'email', 'automation'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-quote-approval',
    name: 'Offerte Goedkeuring',
    description: 'Automatisch goedkeuringsproces voor offertes boven €10.000, inclusief PDF generatie en verzending.',
    category: 'sales',
    definition: quoteApprovalTemplate,
    icon: 'FileText',
    tags: ['offerte', 'goedkeuring', 'sales', 'document'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-project-onboarding',
    name: 'Project Kickoff',
    description: 'Onboarding workflow voor nieuwe website projecten: kickoff meeting, requirements gathering en projectplan.',
    category: 'project',
    definition: projectOnboardingTemplate,
    icon: 'Rocket',
    tags: ['project', 'kickoff', 'onboarding', 'website'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-client-followup',
    name: 'Klant Follow-up',
    description: 'Geautomatiseerde follow-up na demo of meeting: bedankmail, aanvullende info en check-in.',
    category: 'sales',
    definition: clientFollowUpTemplate,
    icon: 'Mail',
    tags: ['follow-up', 'klant', 'demo', 'meeting'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-contract-signing',
    name: 'Contract Ondertekening',
    description: 'Workflow voor contract signing: document verzenden, herinneringen en notificaties bij voltooiing.',
    category: 'sales',
    definition: contractSigningTemplate,
    icon: 'FileSignature',
    tags: ['contract', 'signing', 'document', 'legal'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-payment-reminder',
    name: 'Betalingsherinnering',
    description: 'Automatische herinneringen voor openstaande facturen met escalatie naar management.',
    category: 'finance',
    definition: paymentReminderTemplate,
    icon: 'DollarSign',
    tags: ['betaling', 'factuur', 'herinnering', 'finance'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Helper functies
export const getTemplateById = (id: string): WorkflowTemplate | undefined => {
  return workflowTemplates.find((t) => t.id === id);
};

export const getTemplatesByCategory = (category: string): WorkflowTemplate[] => {
  return workflowTemplates.filter((t) => t.category === category);
};

export const searchTemplates = (query: string): WorkflowTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description?.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
};
