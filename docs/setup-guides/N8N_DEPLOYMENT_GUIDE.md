# 🚀 PROJECT VELOCITY - FASE 3: N8N DEPLOYMENT GUIDE

**Operational Activation: Data Flow Validation & n8n Workflow Deployment**

---

## 📋 Overview

**Status:** Ready for Deployment  
**Prerequisites:** Fase 1 (Database) + Fase 2 (API Gateway) completed  
**Endpoint:** `https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect`  
**Auth Method:** API Key via `x-api-key` header  
**API Key:** `TEVjSUc3RENyTk1TcW1wc092WlJsNEZlZjYwd1ZLdGg=`

---

## 🎯 Objectives

- ✅ Validate API connectivity (smoke tests)
- ✅ Configure n8n HTTP Request node
- ✅ Deploy "KVK Scanner" prototype workflow
- ✅ Implement error handling & logging
- ✅ Monitor execution metrics

---

## STAP 1: SMOKE TESTS (cURL Validatie)

### 1A: Health Check (Geen auth vereist)

```bash
curl -v https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect/health
```

**Expected Output:**
```json
HTTP/1.1 200 OK
{"status":"ok","timestamp":"2026-01-09T..."}
```

---

### 1B: Authentication Test (Moet 401 geven)

```bash
curl -X POST https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Test"}'
```

**Expected Output:**
```json
HTTP/1.1 401 Unauthorized
{"success":false,"error":"Unauthorized"}
```

---

### 1C: Create New Company (201 Created)

```bash
curl -X POST https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect \
  -H "Content-Type: application/json" \
  -H "x-api-key: TEVjSUc3RENyTk1TcW1wc092WlJsNEZlZjYwd1ZLdGg=" \
  -d '{
    "company_name": "Accountantskantoor De Vries & Partners",
    "kvk_number": "12345678",
    "email": "info@devries-partners.nl",
    "phone": "+31 20 1234567",
    "city": "Amsterdam",
    "linkedin_url": "https://linkedin.com/company/devries-partners",
    "website_url": "https://devries-partners.nl",
    "source": "n8n_automation"
  }'
```

**Expected Output (eerste keer):**
```json
HTTP/1.1 201 Created
{
  "success": true,
  "action": "created",
  "company_id": "uuid-here",
  "message": "Company created successfully",
  "metadata": {
    "kvk_number": "12345678",
    "source": "n8n_automation",
    "timestamp": "2026-01-09T..."
  }
}
```

---

### 1D: Idempotency Test (200 OK - Update)

Run exact same command as 1C again.

**Expected Output (tweede keer):**
```json
HTTP/1.1 200 OK
{
  "success": true,
  "action": "updated",
  "company_id": "same-uuid",
  "message": "Company updated successfully"
}
```

---

### 1E: Validation Error Test (400 Bad Request)

```bash
curl -X POST https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect \
  -H "Content-Type: application/json" \
  -H "x-api-key: TEVjSUc3RENyTk1TcW1wc092WlJsNEZlZjYwd1ZLdGg=" \
  -d '{
    "company_name": "Test BV",
    "kvk_number": "1234567",
    "source": "Manual"
  }'
```

**Expected Output:**
```json
HTTP/1.1 400 Bad Request
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": ["kvk_number"],
      "message": "KVK number must be exactly 8 digits"
    }
  ]
}
```

---

### 1F: Test Suite Script

Save as `test-api.sh`:

```bash
#!/bin/bash
API_URL="https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect"
API_KEY="TEVjSUc3RENyTk1TcW1wc092WlJsNEZlZjYwd1ZLdGg="

echo "=== Test 1: Health Check ==="
curl -s "$API_URL/health" | jq

echo -e "\n=== Test 2: Auth Failure ==="
curl -s -X POST "$API_URL" -H "Content-Type: application/json" -d '{}' | jq

echo -e "\n=== Test 3: Create Company ==="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "company_name": "Test Accountant BV",
    "kvk_number": "99999999",
    "source": "Manual"
  }' | jq

echo -e "\n=== Test 4: Idempotency (Same Request) ==="
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "company_name": "Test Accountant BV",
    "kvk_number": "99999999",
    "source": "Manual"
  }' | jq
```

Run: `chmod +x test-api.sh && ./test-api.sh`

---

## STAP 2: n8n HTTP REQUEST NODE CONFIGURATIE

### 2A: HTTP Request Node - Complete JSON Config

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpHeaderAuth",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        {
          "name": "company_name",
          "value": "={{ $json.company_name }}"
        },
        {
          "name": "kvk_number",
          "value": "={{ $json.kvk_number }}"
        },
        {
          "name": "email",
          "value": "={{ $json.email }}"
        },
        {
          "name": "phone",
          "value": "={{ $json.phone }}"
        },
        {
          "name": "city",
          "value": "={{ $json.city }}"
        },
        {
          "name": "linkedin_url",
          "value": "={{ $json.linkedin_url }}"
        },
        {
          "name": "website_url",
          "value": "={{ $json.website_url }}"
        },
        {
          "name": "source",
          "value": "n8n_automation"
        }
      ]
    },
    "options": {
      "response": {
        "response": {
          "fullResponse": false,
          "neverError": false
        }
      },
      "timeout": 10000
    }
  },
  "name": "Ingest to Supabase",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [1000, 300],
  "credentials": {
    "httpHeaderAuth": {
      "id": "1",
      "name": "Supabase API Key"
    }
  }
}
```

---

### 2B: Credential Setup (Header Auth)

In n8n Dashboard:

1. Go to: **Settings → Credentials → New Credential**
2. Type: **"Header Auth"**
3. Name: **"Supabase API Key"**
4. Settings:
   - **Name:** `x-api-key`
   - **Value:** `TEVjSUc3RENyTk1TcW1wc092WlJsNEZlZjYwd1ZLdGg=`
5. Save

---

### 2C: Error Handling Configuration

Add an **IF node** after the HTTP Request node:

```json
{
  "parameters": {
    "conditions": {
      "options": {
        "caseSensitive": true,
        "leftValue": "",
        "typeValidation": "strict"
      },
      "conditions": [
        {
          "leftValue": "={{ $json.success }}",
          "rightValue": true,
          "operator": {
            "type": "boolean",
            "operation": "equals"
          }
        }
      ],
      "combinator": "and"
    },
    "options": {}
  },
  "name": "Check Success",
  "type": "n8n-nodes-base.if",
  "typeVersion": 2,
  "position": [1200, 300]
}
```

**Routing:**
- TRUE branch → Continue to next step (logging/success handler)
- FALSE branch → Error notification node

---

### 2D: Response Status Handling

Add **Switch node** to differentiate actions:

```json
{
  "parameters": {
    "mode": "expression",
    "output": "={{ $json.action }}",
    "rules": {
      "rules": [
        {
          "outputKey": "created",
          "conditions": {
            "conditions": [
              {
                "leftValue": "={{ $json.action }}",
                "rightValue": "created",
                "operator": {
                  "type": "string",
                  "operation": "equals"
                }
              }
            ]
          }
        },
        {
          "outputKey": "updated",
          "conditions": {
            "conditions": [
              {
                "leftValue": "={{ $json.action }}",
                "rightValue": "updated",
                "operator": {
                  "type": "string",
                  "operation": "equals"
                }
              }
            ]
          }
        }
      ]
    },
    "fallbackOutput": "error"
  },
  "name": "Route by Action",
  "type": "n8n-nodes-base.switch",
  "typeVersion": 3,
  "position": [1400, 300]
}
```

**Outputs:**
- `created` → Log new company + trigger welcome email workflow
- `updated` → Log duplicate skip
- `error` → Alert via Slack/email

---

## STAP 3: KVK SCANNER PROTOTYPE WORKFLOW

### 3A: Workflow Logic

**Node Flow:**

1. **Schedule Trigger** (Cron: `0 8 * * *`)
   - Fires daily at 08:00 AM
   
2. **Generate Mock KVK Data** (Code Node)
   - Returns 3 mock companies as array
   
3. **Ingest to Supabase** (HTTP Request)
   - Loops through each company (batch processing)
   - POST to `/ingest-prospect` endpoint
   
4. **Check Success** (IF Node)
   - TRUE: `success === true`
   - FALSE: API error (4xx/5xx)
   
5. **Route by Action** (Switch Node)
   - Output `created` → New company
   - Output `updated` → Duplicate (idempotent)
   - Output `error` → Validation/DB error
   
6. **Logging Branches:**
   - Log New Company → Console + future webhook
   - Log Duplicate → Console (no action needed)
   - Log Error & Alert → Console + Slack alert
   
7. **Daily Summary** (Merge results)
   - Outputs aggregated stats

---

### 3B: Mock Data Code Node

```javascript
// Mock KVK data - Replace with real API later
const mockCompanies = [
  {
    company_name: "Administratiekantoor Van der Berg",
    kvk_number: "11111111",
    email: "info@vanderberg-admin.nl",
    phone: "+31 30 2345678",
    city: "Utrecht",
    linkedin_url: "https://linkedin.com/company/vanderberg-admin",
    website_url: "https://vanderberg-admin.nl"
  },
  {
    company_name: "Fiscaal Adviesbureau Jansen & Zonen",
    kvk_number: "22222222",
    email: "contact@jansen-fiscaal.nl",
    phone: "+31 20 3456789",
    city: "Amsterdam",
    linkedin_url: "https://linkedin.com/company/jansen-fiscaal",
    website_url: "https://jansen-fiscaal.nl"
  },
  {
    company_name: "Boekhoudbureau De Jong Administraties",
    kvk_number: "33333333",
    email: "info@dejong-admin.nl",
    phone: "+31 10 4567890",
    city: "Rotterdam",
    linkedin_url: "https://linkedin.com/company/dejong-admin",
    website_url: "https://dejong-admin.nl"
  }
];

// Return as array for loop processing
return mockCompanies.map(company => ({ json: company }));
```

---

### 3C: Import & Activation Steps

1. In n8n: **Workflows → Import from File**
2. Update in "Ingest to Supabase" node:
   - URL already set: `https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect`
3. Set credential: **"Supabase API Key"** (from STAP 2B)
4. **Test manually:**
   - Click "Schedule Trigger" → "Execute Node"
   - Check execution log for 3 API calls
5. **Activate workflow:** Toggle "Active" switch ON
6. Workflow will now run daily at 08:00 AM

---

### 3D: Manual Test Execution

**In n8n UI:**

1. Open workflow
2. Click **"Execute Workflow"** button (top right)
3. Watch execution:
   - 🟢 Green = success
   - 🟠 Orange = warning (duplicate is OK!)
   - 🔴 Red = error
4. Check console output for structured logs
5. **Verify in Supabase:**
   - Go to Table Editor → companies
   - Should see 3 new rows with `source = 'n8n_automation'`
   - `owner_id = '00000000-0000-0000-0000-000000000001'` (system user)

---

## STAP 4: MONITORING & DEBUGGING

### 4A: n8n Execution Logs

**View in n8n:**
- Executions tab → Filter by workflow name
- Look for:
  - ✅ "Success" (green) → All companies processed
  - ⚠️ "Warning" (orange) → Some duplicates (normal!)
  - ❌ "Error" (red) → API/validation failures

**Expected log output (first run):**
```json
{
  "timestamp": "2026-01-09T08:00:15.234Z",
  "total_processed": 3,
  "created": 3,
  "updated": 0,
  "errors": 0
}
```

**Second run (next day):**
```json
{
  "timestamp": "2026-01-10T08:00:12.456Z",
  "total_processed": 3,
  "created": 0,
  "updated": 3,
  "errors": 0
}
```

---

### 4B: Supabase Edge Function Logs

**Check in Supabase Dashboard:**
- Edge Functions → ingest-prospect → Logs

**Look for:**
```json
{
  "timestamp": "2026-01-09T08:00:10.123Z",
  "level": "info",
  "message": "Prospect created",
  "requestId": "a1b2c3",
  "kvk_number": "11111111",
  "source": "n8n_automation",
  "duration_ms": 145
}
```

---

### 4C: Common Issues & Solutions

#### ISSUE: All requests return 401 Unauthorized
**Check:** Is credential "Supabase API Key" configured correctly?  
**Fix:** Settings → Credentials → Edit → Verify `x-api-key` value

#### ISSUE: "KVK number must be exactly 8 digits" validation error
**Check:** Mock data in Code node has 8-digit numbers?  
**Fix:** Update `kvk_number` fields to exact 8 digits (no spaces!)

#### ISSUE: Workflow not triggering at 08:00
**Check:** Is workflow status "Active" (toggle in top right)?  
**Check:** Server timezone matches expected schedule?  
**Fix:** Click "Execute Workflow" manually to test first

#### ISSUE: All companies show action: "updated" even on first run
**This means:** Companies already exist in database  
**Solution:** Normal behavior! Delete test companies if you want to test "created" flow:
```sql
DELETE FROM companies 
WHERE kvk_number IN ('11111111','22222222','33333333');
```

---

## STAP 5: NEXT STEPS (Post-Activation)

### ✅ PHASE 3 COMPLETE CHECKLIST

- [ ] cURL smoke tests passed (all 5 tests)
- [ ] n8n credential configured
- [ ] Workflow imported & activated
- [ ] Manual test execution successful
- [ ] 3 mock companies visible in Supabase
- [ ] Logs showing structured JSON output
- [ ] Idempotency verified (2nd run shows "updated")

---

### 🚀 READY FOR PHASE 4: Real KVK API Integration

**Replace mock data with real KVK API:**
- Update "Generate Mock KVK Data" node
- Connect to KVK API (requires subscription)
- Filter for newly registered companies
- Maintain same data structure for compatibility

---

### 📊 METRICS TO TRACK

**Daily Metrics:**
- Daily ingestion count (target: 10-50 new companies/day)
- Duplicate rate (shows data quality)
- Error rate (should be <1%)
- API response time (should be <200ms average)

**Business Metrics:**
- Companies owned by system user: `SELECT COUNT(*) FROM companies WHERE owner_id = '00000000-0000-0000-0000-000000000001'`
- Total MRR: `SELECT SUM(total_mrr) FROM companies WHERE source = 'n8n_automation'`
- Conversion rate: System-created → Customer

---

**Document Owner:** Development Team  
**Created:** 9 Januari 2026  
**Status:** Ready for Deployment  
**Next Review:** After first production run
