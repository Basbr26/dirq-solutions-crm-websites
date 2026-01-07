/**
 * Test Suite for AI Webhook Handler
 * Run locally with: deno test --allow-all
 */

/// <reference path="./types.d.ts" />

import { assertEquals, assertExists } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

const BASE_URL = 'http://localhost:54321/functions/v1/api-webhook-handler';
const TEST_API_KEY = Deno.env.get('WEBHOOK_API_KEY') || 'test-key';

// =============================================
// Helper Functions
// =============================================

async function makeRequest(payload: any, apiKey: string = TEST_API_KEY) {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
      'User-Agent': 'test-suite/1.0',
    },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    data: await response.json(),
  };
}

// =============================================
// Authentication Tests
// =============================================

Deno.test('should reject request without API key', async () => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'create_lead',
      data: { company_name: 'Test', title: 'Test' }
    }),
  });

  assertEquals(response.status, 401);
  const data = await response.json();
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('should reject request with invalid API key', async () => {
  const { status, data } = await makeRequest(
    { action: 'create_lead', data: { company_name: 'Test', title: 'Test' } },
    'invalid-key'
  );

  assertEquals(status, 401);
  assertEquals(data.success, false);
});

// =============================================
// Lead Creation Tests
// =============================================

Deno.test('should create lead with valid payload', async () => {
  const { status, data } = await makeRequest({
    action: 'create_lead',
    source: 'test',
    data: {
      company_name: 'Test Company Ltd',
      title: 'Website Development Project',
      description: 'Modern corporate website with CMS',
      project_type: 'corporate_website',
      value: 8500,
      contact_email: 'john@testcompany.com',
      contact_name: 'John Smith',
      contact_phone: '+31612345678',
      priority: 'high',
      tags: ['test', 'automated'],
    }
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.project_id);
  assertExists(data.data.company_id);
  assertExists(data.data.owner_id);
  assertEquals(data.metadata.action, 'create_lead');
});

Deno.test('should reject lead without company_name', async () => {
  const { status, data } = await makeRequest({
    action: 'create_lead',
    data: {
      title: 'Test Project',
    }
  });

  assertEquals(status, 500);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('should reject lead without title', async () => {
  const { status, data } = await makeRequest({
    action: 'create_lead',
    data: {
      company_name: 'Test Company',
    }
  });

  assertEquals(status, 500);
  assertEquals(data.success, false);
  assertExists(data.error);
});

Deno.test('should create lead with minimal fields', async () => {
  const { status, data } = await makeRequest({
    action: 'create_lead',
    data: {
      company_name: 'Minimal Test Co',
      title: 'Simple Lead',
    }
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.project_id);
});

// =============================================
// Company Creation Tests
// =============================================

Deno.test('should create company with valid payload', async () => {
  const uniqueName = `Test Company ${Date.now()}`;
  
  const { status, data } = await makeRequest({
    action: 'create_company',
    source: 'test',
    data: {
      name: uniqueName,
      email: 'info@testcompany.com',
      phone: '+31201234567',
      website: 'https://testcompany.com',
      status: 'prospect',
      priority: 'medium',
      tags: ['test'],
    }
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.company_id);
  assertExists(data.data.owner_id);
});

Deno.test('should reject company without name', async () => {
  const { status, data } = await makeRequest({
    action: 'create_company',
    data: {
      email: 'test@example.com',
    }
  });

  assertEquals(status, 500);
  assertEquals(data.success, false);
});

// =============================================
// Contact Creation Tests
// =============================================

Deno.test('should create contact with valid payload', async () => {
  // First create a company to link to
  const companyRes = await makeRequest({
    action: 'create_company',
    data: {
      name: `Contact Test Company ${Date.now()}`,
    }
  });

  const companyId = companyRes.data.data.company_id;

  // Now create contact
  const { status, data } = await makeRequest({
    action: 'create_contact',
    source: 'test',
    data: {
      company_id: companyId,
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: '+31612345678',
      position: 'Marketing Manager',
      is_primary: true,
      is_decision_maker: true,
    }
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.contact_id);
  assertEquals(data.data.company_id, companyId);
});

Deno.test('should reject contact without company_id', async () => {
  const { status, data } = await makeRequest({
    action: 'create_contact',
    data: {
      first_name: 'Test',
      last_name: 'User',
    }
  });

  assertEquals(status, 500);
  assertEquals(data.success, false);
});

// =============================================
// Note Creation Tests
// =============================================

Deno.test('should add note to project', async () => {
  // First create a lead
  const leadRes = await makeRequest({
    action: 'create_lead',
    data: {
      company_name: `Note Test Company ${Date.now()}`,
      title: 'Test Project for Notes',
    }
  });

  const projectId = leadRes.data.data.project_id;

  // Add note
  const { status, data } = await makeRequest({
    action: 'add_note',
    source: 'test',
    data: {
      entity_type: 'project',
      entity_id: projectId,
      content: 'This is a test note added via webhook',
      interaction_type: 'note',
    }
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  assertExists(data.data.interaction_id);
  assertEquals(data.data.entity_type, 'project');
});

Deno.test('should reject note without entity_id', async () => {
  const { status, data } = await makeRequest({
    action: 'add_note',
    data: {
      entity_type: 'project',
      content: 'Test note',
    }
  });

  assertEquals(status, 500);
  assertEquals(data.success, false);
});

// =============================================
// Error Handling Tests
// =============================================

Deno.test('should return 400 for unknown action', async () => {
  const { status, data } = await makeRequest({
    action: 'invalid_action',
    data: {}
  });

  assertEquals(status, 400);
  assertEquals(data.success, false);
  assertExists(data.supported_actions);
});

Deno.test('should handle CORS preflight', async () => {
  const response = await fetch(BASE_URL, {
    method: 'OPTIONS',
  });

  assertEquals(response.status, 200);
  assertExists(response.headers.get('access-control-allow-origin'));
});

// =============================================
// Integration Tests
// =============================================

Deno.test('should handle complete lead flow with contact', async () => {
  const timestamp = Date.now();
  
  // Create lead with contact info
  const { status, data } = await makeRequest({
    action: 'create_lead',
    source: 'test',
    data: {
      company_name: `Integration Test ${timestamp}`,
      title: 'Full Flow Test Project',
      description: 'Testing complete integration flow',
      project_type: 'ecommerce',
      value: 15000,
      expected_close_date: '2026-03-01',
      contact_email: `test${timestamp}@example.com`,
      contact_name: 'Integration Test User',
      contact_phone: '+31612345678',
      priority: 'high',
      tags: ['integration-test', 'automated'],
      source: 'test-suite',
    }
  });

  assertEquals(status, 200);
  assertEquals(data.success, true);
  
  const { project_id, company_id, contact_id } = data.data;
  
  assertExists(project_id);
  assertExists(company_id);
  assertExists(contact_id);

  // Add note to the created project
  const noteRes = await makeRequest({
    action: 'add_note',
    data: {
      entity_type: 'project',
      entity_id: project_id,
      content: 'Follow-up note from integration test',
      interaction_type: 'note',
    }
  });

  assertEquals(noteRes.status, 200);
  assertEquals(noteRes.data.success, true);
});

// =============================================
// User Agent Detection Tests
// =============================================

Deno.test('should handle n8n user agent', async () => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': TEST_API_KEY,
      'User-Agent': 'n8n-workflow/1.0',
      'X-Client-App': 'n8n-contact-form-handler',
    },
    body: JSON.stringify({
      action: 'create_lead',
      source: 'n8n',
      data: {
        company_name: 'n8n Test Company',
        title: 'n8n Generated Lead',
      }
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(data.metadata.source, 'n8n-contact-form-handler');
});

Deno.test('should handle Manus AI user agent', async () => {
  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': TEST_API_KEY,
      'User-Agent': 'Manus-AI/2.0',
      'X-Client-App': 'manus-crm-agent',
    },
    body: JSON.stringify({
      action: 'create_lead',
      source: 'manus',
      data: {
        company_name: 'Manus Test Company',
        title: 'Manus AI Generated Lead',
      }
    }),
  });

  assertEquals(response.status, 200);
  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(data.metadata.source, 'manus-crm-agent');
});
