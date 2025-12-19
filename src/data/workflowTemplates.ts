/**
 * Workflow Templates - Voorgedefinieerde workflows voor veelvoorkomende HR processen
 */

import type { WorkflowTemplate, WorkflowDefinition } from '@/types/workflow';

// ============================================================================
// ONBOARDING TEMPLATES
// ============================================================================

const onboardingTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Nieuwe medewerker aangenomen',
        triggerType: 'event',
        event: 'employee.status_hired',
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 200 },
      data: {
        label: 'Maak gebruikersaccount aan',
        actionType: 'create_user_account',
        config: {
          role: 'medewerker',
          sendWelcomeEmail: true,
        },
      },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 100, y: 300 },
      data: {
        label: 'Verstuur welkomstmail',
        actionType: 'send_email',
        config: {
          to: '{{employee.email}}',
          subject: 'Welkom bij {{company.name}}!',
          template: 'onboarding_welcome',
        },
      },
    },
    {
      id: 'action-3',
      type: 'action',
      position: { x: 100, y: 400 },
      data: {
        label: 'Maak onboarding taken',
        actionType: 'create_tasks',
        config: {
          tasks: [
            { title: 'Contractdocumenten ondertekenen', deadline_days: 3 },
            { title: 'IT apparatuur uitgeven', deadline_days: 1 },
            { title: 'Werkplek voorbereiden', deadline_days: 1 },
            { title: 'HR intakegesprek plannen', deadline_days: 5 },
          ],
          assign_to: 'role:hr',
        },
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 500 },
      data: {
        label: 'Wacht 1 week',
        waitType: 'duration',
        config: {
          duration: 7,
          unit: 'days',
        },
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 600 },
      data: {
        label: 'Check-in notificatie',
        to: ['{{employee.manager_id}}', 'role:hr'],
        subject: 'Check-in met {{employee.name}}',
        message: 'Het is tijd voor een check-in met de nieuwe medewerker.',
        channels: ['email', 'in_app'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
    { id: 'e2-3', source: 'action-1', target: 'action-2' },
    { id: 'e3-4', source: 'action-2', target: 'action-3' },
    { id: 'e4-5', source: 'action-3', target: 'wait-1' },
    { id: 'e5-6', source: 'wait-1', target: 'notification-1' },
  ],
};

const contractRenewalTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Contract verloopt over 60 dagen',
        triggerType: 'schedule',
        cron: '0 9 * * *', // Dagelijks om 9:00
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 100, y: 200 },
      data: {
        label: 'Contract verlengen?',
        condition: '{{contract.days_until_expiry}} <= 60 && {{contract.renewal_decision}} == null',
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
        to: '{{employee.manager_id}}',
        subject: 'Contract verlenging beslissing nodig',
        message: 'Het contract van {{employee.name}} verloopt over {{contract.days_until_expiry}} dagen.',
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
          approver: '{{employee.manager_id}}',
          timeout: 14,
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
        label: 'Maak nieuw contract',
        actionType: 'generate_document',
        config: {
          template: 'contract_renewal',
          output_path: 'contracts/{{employee.id}}/{{date}}.pdf',
        },
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 500, y: 700 },
      data: {
        label: 'Verstuur nieuw contract',
        to: '{{employee.email}}',
        subject: 'Nieuw contract ter ondertekening',
        message: 'Je nieuwe contract staat klaar voor ondertekening.',
        channels: ['email'],
      },
    },
    {
      id: 'notification-3',
      type: 'notification',
      position: { x: 100, y: 600 },
      data: {
        label: 'Notificeer HR - Niet verlengen',
        to: 'role:hr',
        subject: 'Contract niet verlengen',
        message: 'Het contract van {{employee.name}} wordt niet verlengd. Start offboarding proces.',
        channels: ['email', 'in_app'],
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
    { id: 'e5-8', source: 'condition-2', target: 'notification-3', label: 'Nee' },
  ],
};

const sickLeaveFollowUpTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Ziekmelding geregistreerd',
        triggerType: 'event',
        event: 'sick_leave.created',
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 200 },
      data: {
        label: 'Maak verzuim taken',
        actionType: 'create_tasks',
        config: {
          tasks: [
            { title: 'Contact opnemen met medewerker', deadline_days: 1 },
            { title: 'Probleemanalyse opstellen', deadline_days: 3 },
          ],
          assign_to: '{{employee.manager_id}}',
        },
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 300 },
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
      position: { x: 100, y: 400 },
      data: {
        label: 'Nog steeds ziek?',
        condition: '{{sick_leave.status}} == "active"',
        trueLabel: 'Ja',
        falseLabel: 'Nee',
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 300, y: 500 },
      data: {
        label: 'Week 1 check-in',
        to: ['{{employee.manager_id}}', 'role:hr'],
        subject: 'Verzuim check-in: {{employee.name}}',
        message: 'Medewerker is al 1 week ziek. Plan een gesprek in.',
        channels: ['email', 'in_app'],
      },
    },
    {
      id: 'wait-2',
      type: 'wait',
      position: { x: 300, y: 600 },
      data: {
        label: 'Wacht 35 dagen',
        waitType: 'duration',
        config: {
          duration: 35,
          unit: 'days',
        },
      },
    },
    {
      id: 'condition-2',
      type: 'condition',
      position: { x: 300, y: 700 },
      data: {
        label: 'Nog steeds ziek?',
        condition: '{{sick_leave.status}} == "active"',
        trueLabel: 'Ja',
        falseLabel: 'Nee',
      },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 500, y: 800 },
      data: {
        label: 'Meld bij arbodienst',
        actionType: 'create_task',
        config: {
          title: 'Aanmelding arbodienst - {{employee.name}}',
          description: 'Medewerker is 6 weken ziek. Aanmelden bij arbodienst.',
          assign_to: 'role:hr',
          priority: 'high',
        },
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 500, y: 900 },
      data: {
        label: '6-weken melding',
        to: ['role:hr', '{{employee.manager_id}}'],
        subject: 'Arbodienst aanmelding vereist',
        message: '{{employee.name}} is 6 weken ziek. Aanmelding arbodienst is verplicht.',
        channels: ['email', 'in_app'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
    { id: 'e2-3', source: 'action-1', target: 'wait-1' },
    { id: 'e3-4', source: 'wait-1', target: 'condition-1' },
    { id: 'e4-5', source: 'condition-1', target: 'notification-1', label: 'Ja' },
    { id: 'e5-6', source: 'notification-1', target: 'wait-2' },
    { id: 'e6-7', source: 'wait-2', target: 'condition-2' },
    { id: 'e7-8', source: 'condition-2', target: 'action-2', label: 'Ja' },
    { id: 'e8-9', source: 'action-2', target: 'notification-2' },
  ],
};

const offboardingTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Medewerker uit dienst',
        triggerType: 'event',
        event: 'employee.status_terminated',
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 200 },
      data: {
        label: 'Maak offboarding checklist',
        actionType: 'create_tasks',
        config: {
          tasks: [
            { title: 'Exit interview plannen', deadline_days: 5 },
            { title: 'IT toegang intrekken', deadline_days: 1 },
            { title: 'Apparatuur retourneren', deadline_days: 3 },
            { title: 'Eindafrekening voorbereiden', deadline_days: 7 },
            { title: 'Badge inleveren', deadline_days: 1 },
          ],
          assign_to: 'role:hr',
        },
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 300 },
      data: {
        label: 'Notificeer IT afdeling',
        to: 'role:it',
        subject: 'Toegang intrekken: {{employee.name}}',
        message: 'Gelieve alle IT toegang in te trekken voor vertrekkende medewerker.',
        channels: ['email', 'in_app'],
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 100, y: 400 },
      data: {
        label: 'Notificeer salarisadministratie',
        to: 'role:payroll',
        subject: 'Eindafrekening: {{employee.name}}',
        message: 'Laatste werkdag: {{employee.end_date}}. Start eindafrekening.',
        channels: ['email'],
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 500 },
      data: {
        label: 'Wacht tot laatste werkdag',
        waitType: 'until_date',
        config: {
          untilDate: '{{employee.end_date}}',
        },
      },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 100, y: 600 },
      data: {
        label: 'Deactiveer account',
        actionType: 'update_database',
        config: {
          table: 'profiles',
          where: { id: '{{employee.id}}' },
          data: { is_active: false, status: 'inactive' },
        },
      },
    },
    {
      id: 'notification-3',
      type: 'notification',
      position: { x: 100, y: 700 },
      data: {
        label: 'Bevestiging aan employee',
        to: '{{employee.email}}',
        subject: 'Bedankt voor je bijdrage',
        message: 'Bedankt voor je tijd bij {{company.name}}. Veel succes met je verdere carrière!',
        channels: ['email'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'action-1' },
    { id: 'e2-3', source: 'action-1', target: 'notification-1' },
    { id: 'e3-4', source: 'notification-1', target: 'notification-2' },
    { id: 'e4-5', source: 'notification-2', target: 'wait-1' },
    { id: 'e5-6', source: 'wait-1', target: 'action-2' },
    { id: 'e6-7', source: 'action-2', target: 'notification-3' },
  ],
};

const proefperiodeReviewTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Nieuwe medewerker in proeftijd',
        triggerType: 'event',
        event: 'employee.probation_started',
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 200 },
      data: {
        label: 'Wacht 1 maand',
        waitType: 'duration',
        config: {
          duration: 30,
          unit: 'days',
        },
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 300 },
      data: {
        label: 'Eerste evaluatie herinnering',
        to: '{{employee.manager_id}}',
        subject: 'Proeftijd evaluatie 1 maand: {{employee.name}}',
        message: 'Plan een evaluatiegesprek in voor de eerste maand proeftijd.',
        channels: ['email', 'in_app'],
      },
    },
    {
      id: 'action-1',
      type: 'action',
      position: { x: 100, y: 400 },
      data: {
        label: 'Maak evaluatietaak',
        actionType: 'create_review',
        config: {
          type: 'probation_review',
          employee_id: '{{employee.id}}',
          reviewer_id: '{{employee.manager_id}}',
          due_days: 7,
        },
      },
    },
    {
      id: 'wait-2',
      type: 'wait',
      position: { x: 100, y: 500 },
      data: {
        label: 'Wacht 1 maand',
        waitType: 'duration',
        config: {
          duration: 30,
          unit: 'days',
        },
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 100, y: 600 },
      data: {
        label: 'Eindoordeel proeftijd',
        to: ['{{employee.manager_id}}', 'role:hr'],
        subject: 'Proeftijd afronding: {{employee.name}}',
        message: 'De proeftijd loopt bijna af. Maak een eindoordeel en bepaal of het contract wordt voortgezet.',
        channels: ['email', 'in_app'],
      },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: 100, y: 700 },
      data: {
        label: 'Maak eindevaluatie',
        actionType: 'create_task',
        config: {
          title: 'Proeftijd eindevaluatie - {{employee.name}}',
          description: 'Beoordeel of medewerker geschikt is voor vaste aanstelling.',
          assign_to: '{{employee.manager_id}}',
          priority: 'high',
          deadline_days: 7,
        },
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'wait-1' },
    { id: 'e2-3', source: 'wait-1', target: 'notification-1' },
    { id: 'e3-4', source: 'notification-1', target: 'action-1' },
    { id: 'e4-5', source: 'action-1', target: 'wait-2' },
    { id: 'e5-6', source: 'wait-2', target: 'notification-2' },
    { id: 'e6-7', source: 'notification-2', target: 'action-2' },
  ],
};

const vacationApprovalTemplate: WorkflowDefinition = {
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Verlofaanvraag ingediend',
        triggerType: 'event',
        event: 'leave_request.submitted',
      },
    },
    {
      id: 'notification-1',
      type: 'notification',
      position: { x: 100, y: 200 },
      data: {
        label: 'Notificeer manager',
        to: '{{leave_request.manager_id}}',
        subject: 'Nieuwe verlofaanvraag: {{employee.name}}',
        message: '{{employee.name}} heeft verlof aangevraagd van {{leave_request.start_date}} tot {{leave_request.end_date}}.',
        channels: ['email', 'in_app'],
      },
    },
    {
      id: 'wait-1',
      type: 'wait',
      position: { x: 100, y: 300 },
      data: {
        label: 'Wacht op goedkeuring',
        waitType: 'approval',
        config: {
          approver: '{{leave_request.manager_id}}',
          timeout: 5,
        },
      },
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 100, y: 400 },
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
      position: { x: 300, y: 500 },
      data: {
        label: 'Werk verlof bij',
        actionType: 'update_database',
        config: {
          table: 'leave_requests',
          where: { id: '{{leave_request.id}}' },
          data: { status: 'approved', approved_by: '{{approval.approver_id}}' },
        },
      },
    },
    {
      id: 'notification-2',
      type: 'notification',
      position: { x: 300, y: 600 },
      data: {
        label: 'Bevestig goedkeuring',
        to: '{{employee.email}}',
        subject: 'Verlof goedgekeurd',
        message: 'Je verlofaanvraag is goedgekeurd. Geniet van je vrije tijd!',
        channels: ['email', 'in_app'],
      },
    },
    {
      id: 'action-2',
      type: 'action',
      position: { x: -100, y: 500 },
      data: {
        label: 'Werk verlof bij (afgewezen)',
        actionType: 'update_database',
        config: {
          table: 'leave_requests',
          where: { id: '{{leave_request.id}}' },
          data: { status: 'rejected', rejected_by: '{{approval.approver_id}}' },
        },
      },
    },
    {
      id: 'notification-3',
      type: 'notification',
      position: { x: -100, y: 600 },
      data: {
        label: 'Melding afwijzing',
        to: '{{employee.email}}',
        subject: 'Verlof niet goedgekeurd',
        message: 'Je verlofaanvraag is helaas afgewezen. Neem contact op met je manager voor meer info.',
        channels: ['email', 'in_app'],
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'notification-1' },
    { id: 'e2-3', source: 'notification-1', target: 'wait-1' },
    { id: 'e3-4', source: 'wait-1', target: 'condition-1' },
    { id: 'e4-5', source: 'condition-1', target: 'action-1', label: 'Ja' },
    { id: 'e5-6', source: 'action-1', target: 'notification-2' },
    { id: 'e4-7', source: 'condition-1', target: 'action-2', label: 'Nee' },
    { id: 'e7-8', source: 'action-2', target: 'notification-3' },
  ],
};

// ============================================================================
// TEMPLATE EXPORT
// ============================================================================

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'template-onboarding',
    name: 'Nieuwe Medewerker Onboarding',
    description: 'Volledige onboarding workflow voor nieuwe medewerkers: account aanmaken, welkomstmail, taken genereren en check-ins.',
    category: 'onboarding',
    definition: onboardingTemplate,
    icon: 'UserPlus',
    tags: ['onboarding', 'welkom', 'nieuwe medewerker', 'taken'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-contract-renewal',
    name: 'Contract Verlenging',
    description: 'Automatische herinnering en goedkeuringsproces voor contract verlengingen, inclusief documentgeneratie.',
    category: 'contract',
    definition: contractRenewalTemplate,
    icon: 'FileText',
    tags: ['contract', 'verlenging', 'goedkeuring', 'document'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-sick-leave',
    name: 'Verzuim Follow-up',
    description: 'Geautomatiseerde follow-up voor ziekmeldingen met check-ins op dag 7 en verplichte arbodienst aanmelding op dag 42.',
    category: 'verzuim',
    definition: sickLeaveFollowUpTemplate,
    icon: 'Heart',
    tags: ['verzuim', 'ziekte', 'follow-up', 'arbodienst'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-offboarding',
    name: 'Medewerker Offboarding',
    description: 'Volledige offboarding checklist: exit interview, IT toegang intrekken, apparatuur retour en eindafrekening.',
    category: 'offboarding',
    definition: offboardingTemplate,
    icon: 'UserMinus',
    tags: ['offboarding', 'uitdienst', 'exit', 'checklist'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-probation',
    name: 'Proeftijd Evaluatie',
    description: 'Evaluatiemomenten tijdens proeftijd: check-in na 1 maand en eindevaluatie na 2 maanden.',
    category: 'performance',
    definition: proefperiodeReviewTemplate,
    icon: 'ClipboardCheck',
    tags: ['proeftijd', 'evaluatie', 'beoordeling', 'performance'],
    is_system: true,
    usage_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'template-vacation',
    name: 'Verlof Goedkeuring',
    description: 'Automatisch goedkeuringsproces voor verlofaanvragen met notificaties naar manager en medewerker.',
    category: 'other',
    definition: vacationApprovalTemplate,
    icon: 'Calendar',
    tags: ['verlof', 'vakantie', 'goedkeuring', 'afwezig'],
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
