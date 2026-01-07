# n8n Workflow Templates voor CRM Webhook

## Template 1: Contact Formulier → CRM Lead

**Use Case:** Automatisch leads aanmaken wanneer iemand het website contact formulier invult.

### Workflow Structuur

```
┌─────────────────┐
│ Webhook Trigger │ ← Contact formulier POST
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Data Transform  │ ← Map formulier velden naar CRM format
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ HTTP Request    │ ← POST naar Supabase Edge Function
└────────┬────────┘
         │
         ├──Success──►┌──────────────────┐
         │            │ Send Thank You   │
         │            │ Email to Client  │
         │            └──────────────────┘
         │
         └──Failed───►┌──────────────────┐
                      │ Send Alert to    │
                      │ Admin            │
                      └──────────────────┘
```

### Node Configuraties

#### 1. Webhook Trigger Node
```json
{
  "name": "Contact Form Webhook",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "contact-form",
    "httpMethod": "POST",
    "responseMode": "responseNode",
    "options": {}
  }
}
```

**Test URL:** `https://[n8n-instance].app.n8n.cloud/webhook/contact-form`

#### 2. Function Node - Data Transform
```javascript
// Map contact form data to CRM lead format
const formData = $input.item.json;

// Parse project type from message keywords
let projectType = 'corporate_website'; // default
if (formData.message?.toLowerCase().includes('webshop') || 
    formData.message?.toLowerCase().includes('e-commerce')) {
  projectType = 'ecommerce';
} else if (formData.message?.toLowerCase().includes('landing')) {
  projectType = 'landing_page';
} else if (formData.message?.toLowerCase().includes('portfolio')) {
  projectType = 'portfolio';
}

// Estimate value based on project type
const valueEstimates = {
  'landing_page': 3000,
  'corporate_website': 7500,
  'ecommerce': 15000,
  'web_app': 25000,
  'portfolio': 2500,
  'blog': 3000,
};

return {
  json: {
    action: "create_lead",
    source: "n8n",
    data: {
      company_name: formData.company || `${formData.name}'s Bedrijf`,
      title: `Website aanvraag van ${formData.name}`,
      description: formData.message || 'Geen beschrijving opgegeven',
      project_type: projectType,
      value: valueEstimates[projectType] || 5000,
      expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 dagen
      contact_email: formData.email,
      contact_name: formData.name,
      contact_phone: formData.phone || null,
      priority: formData.urgent ? 'high' : 'medium',
      tags: ['contact-form', 'website', 'inbound', projectType],
      source: 'Website contact formulier'
    },
    metadata: {
      workflow_id: $workflow.id,
      workflow_name: $workflow.name,
      trigger_timestamp: new Date().toISOString(),
      form_ip: formData.ip_address,
      form_url: formData.page_url,
    }
  }
};
```

#### 3. HTTP Request Node - CRM Webhook
```json
{
  "name": "Create Lead in CRM",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://[project-ref].supabase.co/functions/v1/api-webhook-handler",
    "authentication": "none",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        },
        {
          "name": "X-API-Key",
          "value": "={{$env.CRM_WEBHOOK_API_KEY}}"
        },
        {
          "name": "User-Agent",
          "value": "n8n-workflow/1.0"
        },
        {
          "name": "X-Client-App",
          "value": "n8n-contact-form-handler"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{$json}}",
    "options": {
      "timeout": 10000,
      "redirect": {
        "redirect": {
          "followRedirects": true
        }
      }
    }
  }
}
```

#### 4. IF Node - Check Success
```json
{
  "name": "Check CRM Response",
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "boolean": [
        {
          "value1": "={{$json.success}}",
          "value2": true
        }
      ]
    }
  }
}
```

#### 5a. Send Email Node (Success) - Gmail/SendGrid
```json
{
  "name": "Send Thank You Email",
  "type": "n8n-nodes-base.gmail",
  "parameters": {
    "operation": "send",
    "email": {
      "to": "={{$('Contact Form Webhook').item.json.email}}",
      "subject": "Bedankt voor je aanvraag!",
      "message": "Beste {{$('Contact Form Webhook').item.json.name}},\n\nBedankt voor je interesse in onze diensten. We hebben je aanvraag ontvangen en nemen binnen 24 uur contact met je op.\n\nMet vriendelijke groet,\nHet Dirq Solutions Team"
    }
  }
}
```

#### 5b. Send Alert Node (Failed) - Slack/Email
```json
{
  "name": "Alert Admin on Failure",
  "type": "n8n-nodes-base.slack",
  "parameters": {
    "channel": "#crm-alerts",
    "text": "⚠️ CRM Lead Creation Failed\n\nCompany: {{$('Contact Form Webhook').item.json.company}}\nName: {{$('Contact Form Webhook').item.json.name}}\nEmail: {{$('Contact Form Webhook').item.json.email}}\n\nError: {{$json.error}}"
  }
}
```

---

## Template 2: LinkedIn Inbound → CRM Lead

**Use Case:** Automatisch leads aanmaken van LinkedIn InMail berichten.

### Workflow Nodes

#### 1. Email Trigger (LinkedIn notifications)
```json
{
  "name": "LinkedIn Email Trigger",
  "type": "n8n-nodes-base.emailReadImap",
  "parameters": {
    "mailbox": "INBOX",
    "postProcessAction": "read",
    "options": {
      "customEmailConfig": "imap.gmail.com:993",
      "allowUnauthorizedCerts": false,
      "forceReconnect": 300
    },
    "filters": {
      "from": "messages-noreply@linkedin.com",
      "subject": "New message from"
    }
  }
}
```

#### 2. Function - Parse LinkedIn Message
```javascript
// Extract lead info from LinkedIn notification email
const emailBody = $json.text;
const subject = $json.subject;

// Extract name from subject: "New message from John Smith"
const nameMatch = subject.match(/from (.+)$/);
const name = nameMatch ? nameMatch[1] : 'LinkedIn Lead';

// Extract company from email body (if mentioned)
const companyMatch = emailBody.match(/(?:works at|from) ([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
const company = companyMatch ? companyMatch[1] : `${name}'s Company`;

return {
  json: {
    action: "create_lead",
    source: "n8n",
    data: {
      company_name: company,
      title: `LinkedIn inbound - ${name}`,
      description: `Lead gegenereerd vanuit LinkedIn InMail.\n\nBericht preview: ${emailBody.substring(0, 200)}...`,
      project_type: 'custom',
      value: 7500,
      contact_name: name,
      priority: 'medium',
      tags: ['linkedin', 'inbound', 'social'],
      source: 'LinkedIn InMail'
    }
  }
};
```

---

## Template 3: Calendar Booking → CRM Lead + Task

**Use Case:** Maak lead + taak aan wanneer prospect meeting inboekt via Calendly/Cal.com.

### Workflow Nodes

#### 1. Webhook Trigger (Calendly)
```json
{
  "name": "Calendly Webhook",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "calendly-booking",
    "httpMethod": "POST"
  }
}
```

#### 2. Function - Parse Booking Data
```javascript
const booking = $json.payload;
const invitee = booking.invitee;

return {
  json: {
    action: "create_lead",
    source: "n8n",
    data: {
      company_name: invitee.company || `${invitee.name}'s Bedrijf`,
      title: `Sales call - ${invitee.name}`,
      description: `Sales meeting ingepland via Calendly.\n\nMeeting datum: ${booking.event.start_time}\nType: ${booking.event.name}\n\nOpmerkingen: ${invitee.questions_and_answers || 'Geen'}`,
      project_type: 'custom',
      value: 5000,
      expected_close_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      contact_email: invitee.email,
      contact_name: invitee.name,
      contact_phone: invitee.phone_number,
      priority: 'high',
      tags: ['calendly', 'meeting-booked', 'hot-lead'],
      source: 'Calendly booking'
    }
  }
};
```

#### 3. HTTP Request - Create Lead
*(Zelfde configuratie als Template 1, node 3)*

#### 4. HTTP Request - Create Task
```javascript
// Maak follow-up taak aan voor sales rep
return {
  json: {
    action: "add_note",
    source: "n8n",
    data: {
      entity_type: "project",
      entity_id: $json.data.project_id, // Van vorige CRM response
      content: `📅 Sales call ingepland voor ${$('Calendly Webhook').item.json.payload.event.start_time}\n\nPreparatie:\n- Review bedrijfsprofiel\n- Check LinkedIn\n- Bereid demo voor`,
      interaction_type: "task"
    }
  }
};
```

---

## Template 4: HubSpot → Supabase CRM Sync

**Use Case:** Synchroniseer nieuwe HubSpot deals naar Supabase CRM.

### Workflow Nodes

#### 1. HubSpot Trigger
```json
{
  "name": "HubSpot New Deal",
  "type": "n8n-nodes-base.hubspotTrigger",
  "parameters": {
    "eventsUi": {
      "eventValues": [
        {
          "name": "deal.creation"
        }
      ]
    }
  }
}
```

#### 2. HubSpot Node - Get Deal Details
```json
{
  "name": "Get Deal Info",
  "type": "n8n-nodes-base.hubspot",
  "parameters": {
    "resource": "deal",
    "operation": "get",
    "dealId": "={{$json.objectId}}",
    "additionalFields": {
      "includePropertyVersions": true
    }
  }
}
```

#### 3. Function - Map HubSpot to CRM
```javascript
const deal = $json;

// Map HubSpot deal stages to CRM stages
const stageMapping = {
  'appointmentscheduled': 'lead',
  'qualifiedtobuy': 'quote_requested',
  'presentationscheduled': 'negotiation',
  'decisionmakerboughtin': 'quote_sent',
  'contractsent': 'quote_signed',
  'closedwon': 'live',
  'closedlost': 'lost'
};

return {
  json: {
    action: "create_lead",
    source: "n8n",
    data: {
      company_name: deal.properties.dealname,
      title: deal.properties.dealname,
      description: deal.properties.description || '',
      value: parseInt(deal.properties.amount) || 0,
      expected_close_date: deal.properties.closedate,
      priority: deal.properties.hs_priority === 'HIGH' ? 'high' : 'medium',
      tags: ['hubspot-sync', deal.properties.dealstage],
      source: 'HubSpot import',
      custom_fields: {
        hubspot_deal_id: deal.id,
        hubspot_pipeline: deal.properties.pipeline
      }
    }
  }
};
```

---

## Environment Variables Setup

Zet deze variabelen in n8n Settings → Variables:

```bash
CRM_WEBHOOK_API_KEY=your-webhook-api-key-here
SUPABASE_PROJECT_REF=your-project-ref
CRM_WEBHOOK_URL=https://[project-ref].supabase.co/functions/v1/api-webhook-handler
```

## Rate Limiting & Best Practices

### Error Handling Node Template
```javascript
// Voeg toe na elke HTTP Request node
if ($json.success === false) {
  // Log error
  console.error('CRM webhook failed:', $json.error);
  
  // Retry logic (max 3 attempts)
  const retryCount = $node["Create Lead in CRM"].json?.retryCount || 0;
  
  if (retryCount < 3) {
    // Wait exponential backoff: 2s, 4s, 8s
    await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
    
    // Set retry count
    $json.retryCount = retryCount + 1;
    
    // Retry (loop back to HTTP node)
    return $json;
  } else {
    // Max retries exceeded - alert admin
    throw new Error(`Failed after ${retryCount} retries: ${$json.error}`);
  }
}

return $json;
```

### Rate Limiting Node
```javascript
// Add at start of workflow
const lastRun = $workflow.staticData.lastRunTime || 0;
const now = Date.now();
const minDelay = 100; // 100ms between runs = max 10 req/sec

if (now - lastRun < minDelay) {
  await new Promise(resolve => setTimeout(resolve, minDelay - (now - lastRun)));
}

$workflow.staticData.lastRunTime = Date.now();
return $json;
```

## Testing Workflows

### 1. Test met Manual Trigger
```bash
# Voeg "Manual Trigger" node toe voor testing
# Feed test data:
{
  "name": "Test User",
  "email": "test@example.com",
  "company": "Test BV",
  "phone": "+31612345678",
  "message": "Wij zoeken een nieuwe corporate website",
  "urgent": false
}
```

### 2. Test met Postman
Import deze collection en test je webhooks:
- Test endpoint: Webhook URL van n8n
- Vervang data met real-world examples
- Check CRM voor nieuwe records

### 3. Monitor Logs
```bash
# In n8n: Executions → View details
# Check:
- ✅ All nodes executed successfully
- ✅ HTTP 200 response from CRM
- ✅ project_id returned in response
```

## Support & Debugging

### Common Issues

**Issue:** "Unauthorized" error
**Fix:** Check `CRM_WEBHOOK_API_KEY` environment variable

**Issue:** Lead not appearing in CRM
**Fix:** Check Supabase Edge Function logs: `supabase functions logs api-webhook-handler`

**Issue:** Duplicate leads created
**Fix:** Voeg deduplication check toe in Function node:
```javascript
// Check if lead already exists
const existingLeadCheck = await fetch(`${process.env.CRM_API_URL}/leads?email=${formData.email}`);
if (existingLeadCheck.length > 0) {
  return { json: { skip: true, reason: 'Duplicate email' } };
}
```

## Advanced: Custom Webhooks

Maak custom actions door Edge Function uit te breiden:

```typescript
// In supabase/functions/api-webhook-handler/index.ts
case 'custom_action':
  result = await handleCustomAction(supabase, payload.data, clientApp);
  break;
```

Gebruik in n8n:
```json
{
  "action": "custom_action",
  "data": { /* your custom payload */ }
}
```
