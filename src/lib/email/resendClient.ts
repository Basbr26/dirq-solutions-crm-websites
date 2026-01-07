/**
 * Resend Email Service
 * Handles sending notifications via email with templates
 */

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

/**
 * Generate digest email template
 */
interface DigestNotification {
  title: string;
  body: string;
  priority: string;
  deep_link?: string;
}

export const generateDigestEmailTemplate = (
  userName: string,
  notifications: DigestNotification[],
  frequencyLabel: string
): EmailTemplate => {
  const groupedByPriority = {
    critical: notifications.filter(n => n.priority === 'critical'),
    high: notifications.filter(n => n.priority === 'high'),
    normal: notifications.filter(n => n.priority === 'normal'),
    low: notifications.filter(n => n.priority === 'low')
  };

  const notificationRows = Object.entries(groupedByPriority)
    .filter(([_, items]: [string, DigestNotification[]]) => items.length > 0)
    .map(([priority, items]: [string, DigestNotification[]]) => `
      <div style="margin-bottom: 20px;">
        <h3 style="color: ${getPriorityColor(priority)}; margin: 0 0 10px 0;">
          ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${items.length})
        </h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${items.map((n) => `
            <li style="margin-bottom: 8px;">
              <strong>${n.title}</strong>
              <p style="margin: 4px 0; color: #666;">${n.body}</p>
              ${n.deep_link ? `<a href="${n.deep_link}" style="color: #0066cc;">View Details</a>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    `)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${frequencyLabel} Notifications</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #333; font-size: 24px; }
        .header p { margin: 8px 0 0 0; color: #666; }
        .content { background: #fff; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; margin-top: 20px; }
        a { color: #0066cc; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your ${frequencyLabel} Notifications</h1>
          <p>Hello ${userName},</p>
          <p>You have ${notifications.length} notification${notifications.length !== 1 ? 's' : ''} to review.</p>
        </div>
        
        <div class="content">
          ${notificationRows}
        </div>
        
        <div class="footer">
          <p><a href="https://dirq.app/notifications">View all notifications</a></p>
          <p>© Dirq Solutions | CRM voor Website Ontwikkeling</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Your ${frequencyLabel} Notifications\n\nHello ${userName},\n\nYou have ${notifications.length} notification${notifications.length !== 1 ? 's' : ''} to review.\n\n${
    Object.entries(groupedByPriority)
      .filter(([_, items]: [string, DigestNotification[]]) => items.length > 0)
      .map(([priority, items]: [string, DigestNotification[]]) => `${priority.toUpperCase()} (${items.length}):\n${items.map((n) => `- ${n.title}\n  ${n.body}`).join('\n')}`)
      .join('\n\n')
  }`;

  return {
    subject: `Your ${frequencyLabel} Notifications from Dirq`,
    html,
    text
  };
};

/**
 * Generate action-specific email template
 */
export const generateActionEmailTemplate = (
  userName: string,
  title: string,
  body: string,
  actionUrl?: string,
  actionLabel?: string
): EmailTemplate => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #f8f9fa; padding: 40px 20px; border-radius: 0 0 8px 8px; }
        .message { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea; }
        .cta-button { display: inline-block; padding: 12px 32px; background: #667eea; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .cta-button:hover { background: #764ba2; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        a { color: #667eea; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
        </div>
        
        <div class="content">
          <div class="message">
            <p>Hello ${userName},</p>
            <p>${body}</p>
            ${actionUrl ? `<a href="${actionUrl}" class="cta-button">${actionLabel || 'Take Action'}</a>` : ''}
          </div>
        </div>
        
        <div class="footer">
          <p>© Dirq Solutions | CRM voor Website Ontwikkeling</p>
          <p><a href="https://dirq.app">Visit your dashboard</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return {
    subject: title,
    html
  };
};

/**
 * Send email via Resend API
 */
export const sendEmailViaResend = async (params: SendEmailParams): Promise<boolean> => {
  try {
    const apiKey = process.env.REACT_APP_RESEND_API_KEY;
    if (!apiKey) {
      console.error('REACT_APP_RESEND_API_KEY not configured');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: params.from || 'notifications@dirq.app',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending email via Resend:', error);
    return false;
  }
};

/**
 * Send digest email
 */
export const sendDigestEmail = async (
  userEmail: string,
  userName: string,
  notifications: DigestNotification[],
  frequency: 'hourly' | 'daily' | 'weekly' = 'daily'
): Promise<boolean> => {
  const frequencyLabel = frequency.charAt(0).toUpperCase() + frequency.slice(1);
  const template = generateDigestEmailTemplate(userName, notifications, frequencyLabel);

  return sendEmailViaResend({
    to: userEmail,
    subject: template.subject,
    html: template.html,
    text: template.text
  });
};

/**
 * Send action notification email
 */
export const sendActionEmail = async (
  userEmail: string,
  userName: string,
  title: string,
  body: string,
  actionUrl?: string,
  actionLabel?: string
): Promise<boolean> => {
  const template = generateActionEmailTemplate(userName, title, body, actionUrl, actionLabel);

  return sendEmailViaResend({
    to: userEmail,
    subject: template.subject,
    html: template.html
  });
};

/**
 * Helper to get priority color
 */
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    normal: '#2563eb',
    low: '#6b7280'
  };
  return colors[priority] || '#2563eb';
}
