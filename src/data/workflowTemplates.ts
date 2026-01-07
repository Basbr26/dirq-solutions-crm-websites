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

// ============================================================================
// PROJECT ONBOARDING TEMPLATE
// ============================================================================

const projectOnboardingTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Project gewonnen',
        triggerType: 'event',
        event: 'project.won',
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 200 },
      data: {
        label: 'Maak projectdossier aan',
        actionType: 'create_record',
        config: {
          table: 'projects',
          fields: {
            name: '{{project.name}}',
            company_id: '{{project.company_id}}',
            status: 'kickoff',
          },
        },
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 300 },
      data: {
        label: 'Notificeer klant',
        to: '{{project.contact_email}}',
        subject: 'Welkom! Laten we beginnen met {{project.name}}',
        message: 'We zijn verheugd om met jullie te werken aan dit project.',
        channels: ['email'],
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 400 },
      data: {
        label: 'Wacht 1 dag',
        waitType: 'duration',
        config: {
          duration: 1,
          unit: 'days',
        },
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 100, y: 500 },
      data: {
        label: 'Plan kickoff meeting',
        to: ['{{project.owner}}', '{{project.contact_email}}'],
        subject: 'Kickoff meeting plannen',
        message: 'Tijd om een kickoff meeting in te plannen voor project {{project.name}}',
        channels: ['email', 'in_app'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
    { id: 'e2-3', source: 'action-1', target: 'notification-1' },
    { id: 'e3-4', source: 'notification-1', target: 'wait-1' },
    { id: 'e4-5', source: 'wait-1', target: 'notification-2' },
  ],
};

// ============================================================================
// CLIENT FOLLOW-UP TEMPLATE
// ============================================================================

const clientFollowUpTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Meeting voltooid',
        triggerType: 'event',
        event: 'interaction.completed',
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 200 },
      data: {
        label: 'Wacht 4 uur',
        waitType: 'duration',
        config: {
          duration: 4,
          unit: 'hours',
        },
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 300 },
      data: {
        label: 'Bedankmail',
        to: '{{interaction.contact_email}}',
        subject: 'Bedankt voor het gesprek',
        message: 'Fijn dat we kennis hebben gemaakt. Hierbij de besproken informatie.',
        channels: ['email'],
      },
    },
    {
      id: 'wait-2',
      type: 'wait',
      position: { x: 100, y: 400 },
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
      id: 'notification-2',
      type: 'notification',
      position: { x: 100, y: 500 },
      data: {
        label: 'Herinnering aan sales',
        to: '{{interaction.owner}}',
        subject: 'Follow-up: {{interaction.company_name}}',
        message: 'Tijd voor een follow-up gesprek met {{interaction.contact_name}}',
        channels: ['in_app', 'email'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'wait-1' },
    { id: 'e2-3', source: 'wait-1', target: 'notification-1' },
    { id: 'e3-4', source: 'notification-1', target: 'wait-2' },
    { id: 'e4-5', source: 'wait-2', target: 'notification-2' },
  ],
};

// ============================================================================
// CONTRACT SIGNING TEMPLATE
// ============================================================================

const contractSigningTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Quote geaccepteerd',
        triggerType: 'event',
        event: 'quote.accepted',
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 200 },
      data: {
        label: 'Genereer contract',
        actionType: 'generate_document',
        config: {
          template: 'contract_template',
          output_path: 'contracts/{{quote.id}}/contract.pdf',
        },
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 300 },
      data: {
        label: 'Verstuur contract',
        to: '{{quote.contact_email}}',
        subject: 'Contract ter ondertekening',
        message: 'Hierbij het contract voor project {{quote.project_name}}. Graag digitaal ondertekenen.',
        channels: ['email'],
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 400 },
      data: {
        label: 'Wacht 7 dagen',
        waitType: 'duration',
        config: {
          duration: 7,
          unit: 'days',
        },
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 100, y: 500 },
      data: {
        label: 'Contract getekend?',
        condition: '{{contract.status}} == "signed"',
        trueLabel: 'Ja',
        falseLabel: 'Nee',
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 300, y: 600 },
      data: {
        label: 'Herinnering',
        to: '{{quote.contact_email}}',
        subject: 'Herinnering: Contract ondertekening',
        message: 'Nog niet het contract ontvangen. Kunnen we je ergens mee helpen?',
        channels: ['email'],
      },
    },
    {
      id: 'notification-3',
      type: 'notification',
      position: { x: -100, y: 600 },
      data: {
        label: 'Feliciteer team',
        to: ['{{quote.owner}}', 'role:sales'],
        subject: 'Contract getekend! 🎉',
        message: 'Contract voor {{quote.company_name}} is getekend. Project kan starten!',
        channels: ['in_app', 'email'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
    { id: 'e2-3', source: 'action-1', target: 'notification-1' },
    { id: 'e3-4', source: 'notification-1', target: 'wait-1' },
    { id: 'e4-5', source: 'wait-1', target: 'condition-1' },
    { id: 'e5-6', source: 'condition-1', target: 'notification-2', label: 'Nee' },
    { id: 'e5-7', source: 'condition-1', target: 'notification-3', label: 'Ja' },
  ],
};

// ============================================================================
// PAYMENT REMINDER TEMPLATE
// ============================================================================

const paymentReminderTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Factuur vervallen',
        triggerType: 'event',
        event: 'invoice.overdue',
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 200 },
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
      position: { x: 100, y: 300 },
      data: {
        label: 'Vriendelijke herinnering',
        to: '{{invoice.client_email}}',
        subject: 'Herinnering: Factuur {{invoice.number}}',
        message: 'De betaaltermijn van factuur {{invoice.number}} is verstreken. Kunnen we je ergens mee helpen?',
        channels: ['email'],
      },
    },
    {
      id: 'wait-2',
      type: 'wait',
      position: { x: 100, y: 400 },
      data: {
        label: 'Wacht 7 dagen',
        waitType: 'duration',
        config: {
          duration: 7,
          unit: 'days',
        },
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 100, y: 500 },
      data: {
        label: 'Betaald?',
        condition: '{{invoice.status}} == "paid"',
        trueLabel: 'Ja',
        falseLabel: 'Nee',
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 300, y: 600 },
      data: {
        label: 'Tweede herinnering',
        to: '{{invoice.client_email}}',
        subject: 'Tweede herinnering: Factuur {{invoice.number}}',
        message: 'We hebben nog geen betaling ontvangen voor factuur {{invoice.number}}.',
        channels: ['email'],
      },
    },
    {
      id: 'wait-3',
      type: 'wait',
      position: { x: 300, y: 700 },
      data: {
        label: 'Wacht 5 dagen',
        waitType: 'duration',
        config: {
          duration: 5,
          unit: 'days',
        },
      },
    },
    {
      id: 'notification-3',
      type: 'notification',
      position: { x: 300, y: 800 },
      data: {
        label: 'Escaleer naar manager',
        to: 'role:finance_manager',
        subject: 'Escalatie: Onbetaalde factuur {{invoice.number}}',
        message: 'Factuur {{invoice.number}} voor {{invoice.company_name}} is >14 dagen onbetaald.',
        channels: ['email', 'in_app'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'wait-1' },
    { id: 'e2-3', source: 'wait-1', target: 'notification-1' },
    { id: 'e3-4', source: 'notification-1', target: 'wait-2' },
    { id: 'e4-5', source: 'wait-2', target: 'condition-1' },
    { id: 'e5-6', source: 'condition-1', target: 'notification-2', label: 'Nee' },
    { id: 'e6-7', source: 'notification-2', target: 'wait-3' },
    { id: 'e7-8', source: 'wait-3', target: 'notification-3' },
  ],
};

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
