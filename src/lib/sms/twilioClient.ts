/**
 * Twilio SMS Service
 * Handles sending notifications via SMS for critical alerts
 */

interface SendSmsParams {
  to: string;
  body: string;
  from?: string;
}

interface SmsTemplate {
  body: string;
  maxLength: number;
}

/**
 * Format SMS message for critical notification
 */
export const generateCriticalAlertSms = (title: string, priority: string): SmsTemplate => {
  const priorityEmoji = priority === 'critical' ? '🚨' : priority === 'high' ? '⚠️' : 'ℹ️';
  const body = `${priorityEmoji} ${title}\n\nVisit: dirq.app/notifications`;
  
  return {
    body,
    maxLength: body.length
  };
};

/**
 * Format SMS for approval request
 */
export const generateApprovalSms = (requesterName: string, caseType: string): SmsTemplate => {
  const body = `Action needed from ${requesterName}: ${caseType} approval. Visit dirq.app`;
  
  return {
    body,
    maxLength: body.length
  };
};

/**
 * Format SMS for deadline warning
 */
export const generateDeadlineWarningSms = (taskName: string, hoursRemaining: number): SmsTemplate => {
  const body = `Deadline alert: ${taskName} due in ${hoursRemaining}h. dirq.app/tasks`;
  
  return {
    body,
    maxLength: body.length
  };
};

/**
 * Format SMS for escalation notice
 */
export const generateEscalationSms = (taskName: string, escalatedTo: string): SmsTemplate => {
  const body = `Escalation: ${taskName} moved to ${escalatedTo}. Review at dirq.app`;
  
  return {
    body,
    maxLength: body.length
  };
};

/**
 * Send SMS via Twilio API
 */
export const sendSmsViaTwilio = async (params: SendSmsParams): Promise<boolean> => {
  try {
    // For frontend: call backend API that has Twilio credentials
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: params.to,
        body: params.body,
        from: params.from || process.env.REACT_APP_TWILIO_PHONE_NUMBER
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Twilio API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return false;
  }
};

/**
 * Send critical alert SMS
 */
export const sendCriticalAlertSms = async (
  phoneNumber: string,
  title: string
): Promise<boolean> => {
  const template = generateCriticalAlertSms(title, 'critical');
  return sendSmsViaTwilio({
    to: phoneNumber,
    body: template.body
  });
};

/**
 * Send approval request SMS
 */
export const sendApprovalSms = async (
  phoneNumber: string,
  requesterName: string,
  caseType: string
): Promise<boolean> => {
  const template = generateApprovalSms(requesterName, caseType);
  return sendSmsViaTwilio({
    to: phoneNumber,
    body: template.body
  });
};

/**
 * Send deadline warning SMS
 */
export const sendDeadlineWarningSms = async (
  phoneNumber: string,
  taskName: string,
  hoursRemaining: number
): Promise<boolean> => {
  const template = generateDeadlineWarningSms(taskName, hoursRemaining);
  return sendSmsViaTwilio({
    to: phoneNumber,
    body: template.body
  });
};

/**
 * Send escalation notice SMS
 */
export const sendEscalationSms = async (
  phoneNumber: string,
  taskName: string,
  escalatedTo: string
): Promise<boolean> => {
  const template = generateEscalationSms(taskName, escalatedTo);
  return sendSmsViaTwilio({
    to: phoneNumber,
    body: template.body
  });
};

/**
 * Backend handler for Twilio SMS sending
 * Place this in your backend (e.g., pages/api/sms/send.ts)
 */
export const handleTwilioSmsBackend = async (to: string, body: string, from: string): Promise<unknown> => {
  // This would be in your Node.js backend
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = await client.messages.create({
      body: body,
      from: from,
      to: to
    });

    return {
      success: true,
      messageId: message.sid,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Twilio backend error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
