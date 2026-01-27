/**
 * Workflow Actions - Email
 * Send emails via workflow actions
 */

import { supabase } from '@/integrations/supabase/client';
import { EmailActionConfig, WorkflowContext } from '../types';
import { resolveObject } from '../context';

// ============================================================================
// EMAIL ACTIONS
// ============================================================================

export async function executeSendEmail(
  config: EmailActionConfig,
  context: WorkflowContext
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    // Resolve variables in config
    const resolved = resolveObject(config, context) as EmailActionConfig;

    // Get recipient(s)
    const recipients = Array.isArray(resolved.to) 
      ? resolved.to 
      : [resolved.to];

    // Get template
    const template = await getEmailTemplate(resolved.template);
    
    if (!template) {
      throw new Error(`Email template not found: ${resolved.template}`);
    }

    // Merge variables
    const variables = {
      ...context.variables,
      ...resolved.variables,
    };

    // Render template with variables
    const subject = resolveTemplateString(
      resolved.subject || template.subject,
      variables
    );
    const html = resolveTemplateString(template.html, variables);
    const text = resolveTemplateString(template.text || '', variables);

    // Send email (using Supabase Edge Function or external service)
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: recipients,
        subject,
        html,
        text,
        from: 'DIRQ HR <hr@dirq.nl>',
      },
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      message_id: data?.message_id,
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

interface EmailTemplate {
  id: string;
  subject: string;
  html: string;
  text?: string;
}

async function getEmailTemplate(templateId: string): Promise<EmailTemplate | null> {
  // Built-in templates
  const builtInTemplates: Record<string, EmailTemplate> = {
    welcome_email: {
      id: 'welcome_email',
      subject: 'Welkom bij {{company_name}}!',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #06BDC7;">Welkom {{employee.voornaam}}!</h1>
            <p>We zijn blij dat je bij ons team komt. Je eerste werkdag is op {{employee.start_date}}.</p>
            <p>Je kunt inloggen op ons HR portal met je email adres: <strong>{{employee.email}}</strong></p>
            <p>Je manager is {{manager.voornaam}} {{manager.achternaam}} ({{manager.email}}).</p>
            <hr style="border: 1px solid #eee; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Met vriendelijke groet,<br>
              HR Team DIRQ
            </p>
          </body>
        </html>
      `,
      text: 'Welkom {{employee.voornaam}}! We zijn blij dat je bij ons team komt.',
    },
    
    contract_expiring: {
      id: 'contract_expiring',
      subject: 'Contract verloopt binnenkort - {{contact.voornaam}} {{contact.achternaam}}',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #F59E0B;">⚠️ Contract Verloop Notificatie</h2>
            <p>Het contract van klant <strong>{{contact.voornaam}} {{contact.achternaam}}</strong> loopt af op:</p>
            <p style="font-size: 18px; font-weight: bold; color: #EF4444;">{{contract.end_date}}</p>
            <p>Gelieve tijdig contact op te nemen voor verlenging.</p>
            <a href="{{portal_url}}/contacts/{{contact.id}}" 
               style="display: inline-block; padding: 12px 24px; background: #06BDC7; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Bekijk Klant
            </a>
          </body>
        </html>
      `,
      text: 'Het contract van {{contact.voornaam}} {{contact.achternaam}} loopt af op {{contract.end_date}}.',
    },

    task_assigned: {
      id: 'task_assigned',
      subject: 'Nieuwe taak toegewezen: {{task.title}}',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #06BDC7;">📋 Nieuwe Taak</h2>
            <p>Je hebt een nieuwe taak gekregen:</p>
            <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">{{task.title}}</h3>
              <p style="color: #666;">{{task.description}}</p>
              <p><strong>Deadline:</strong> {{task.due_date}}</p>
              <p><strong>Prioriteit:</strong> {{task.priority}}</p>
            </div>
            <a href="{{portal_url}}/tasks" 
               style="display: inline-block; padding: 12px 24px; background: #06BDC7; color: white; text-decoration: none; border-radius: 6px;">
              Bekijk Taken
            </a>
          </body>
        </html>
      `,
      text: 'Nieuwe taak: {{task.title}}. Deadline: {{task.due_date}}.',
    },

    onboarding_reminder: {
      id: 'onboarding_reminder',
      subject: 'Onboarding taak herinnering voor {{contact.voornaam}}',
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #06BDC7;">👋 Onboarding Herinnering</h2>
            <p>Vergeet niet om de onboarding taken voor klant <strong>{{contact.voornaam}} {{contact.achternaam}}</strong> af te ronden.</p>
            <p>Nog <strong>{{tasks_remaining}}</strong> taken open.</p>
            <a href="{{portal_url}}/projects/{{project_id}}" 
               style="display: inline-block; padding: 12px 24px; background: #06BDC7; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Bekijk Project
            </a>
          </body>
        </html>
      `,
      text: 'Onboarding herinnering voor klant {{contact.voornaam}} {{contact.achternaam}}.',
    },
  };

  // Check built-in templates
  if (builtInTemplates[templateId]) {
    return builtInTemplates[templateId];
  }

  // Check database for custom templates
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

function resolveTemplateString(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(variables, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}
