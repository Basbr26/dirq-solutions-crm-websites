/**
 * Test data factory voor E2E tests.
 * Maakt testrecords aan via Supabase REST API (service_role key).
 * Alle testdata heeft [E2E] prefix voor eenvoudig opruimen.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY!;

export const E2E_PREFIX = '[E2E]';

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

async function supabasePost(table: string, body: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase POST ${table} mislukt: ${err}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function supabaseDelete(table: string, filter: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.text();
    console.warn(`Supabase DELETE ${table} waarschuwing: ${err}`);
  }
}

// ─── Aanmaken ───────────────────────────────────────────────────────────────

export async function createTestCompany(suffix = 'Testbedrijf BV') {
  return supabasePost('companies', {
    name: `${E2E_PREFIX} ${suffix}`,
    status: 'prospect',
    priority: 'medium',
  });
}

export async function createTestContact(companyId?: string, suffix = 'Testpersoon') {
  return supabasePost('contacts', {
    name: `${E2E_PREFIX} ${suffix}`,
    email: `e2e-${Date.now()}@test.dirq.nl`,
    ...(companyId ? { company_id: companyId } : {}),
  });
}

// ─── Opruimen ───────────────────────────────────────────────────────────────

export async function cleanupTestData() {
  // Verwijder in volgorde (FK constraints)
  await supabaseDelete('interactions', `notes=like.%5BE2E%5D%25`);
  await supabaseDelete('contacts', `name=like.%5BE2E%5D%25`);
  await supabaseDelete('projects', `title=like.%5BE2E%5D%25`);
  await supabaseDelete('companies', `name=like.%5BE2E%5D%25`);
}
