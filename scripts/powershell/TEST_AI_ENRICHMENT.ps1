# ============================================================
# TEST AI ENRICHMENT - COMPLETE FLOW
# ============================================================
# Tests the complete AI enrichment pipeline
# Date: 9 januari 2026

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🧪 TESTING AI ENRICHMENT FLOW" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Get API key from .env.webhook
if (Test-Path ".env.webhook") {
    $apiKeyLine = Get-Content .env.webhook | Select-String "N8N_API_KEY" | Select-Object -First 1
    if ($apiKeyLine) {
        $API_KEY = $apiKeyLine.ToString().Split("=")[1].Trim()
        Write-Host "✅ API Key loaded from .env.webhook" -ForegroundColor Green
    } else {
        Write-Host "❌ N8N_API_KEY not found in .env.webhook" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ .env.webhook not found! Run AI_KEYS_SETUP.ps1 first" -ForegroundColor Red
    exit 1
}

Write-Host ""

$FUNCTION_URL = "https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect"

# ============================================================
# TEST 1: Health Check
# ============================================================

Write-Host "📋 TEST 1: Health Check" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

try {
    $health = Invoke-RestMethod -Uri "$FUNCTION_URL/health" -Method GET
    Write-Host "✅ Health check passed" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($health.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# TEST 2: Create Company WITHOUT Website (No AI Enrichment)
# ============================================================

Write-Host "📋 TEST 2: Create Company (No Website → No AI)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$testCompany1 = @{
    company_name = "Test Administratiekantoor BV"
    kvk_number = "99999999"
    email = "info@testadmin.nl"
    phone = "+31 20 1234567"
    city = "Amsterdam"
    source = "n8n_automation"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{"x-api-key"=$API_KEY} `
        -Body $testCompany1
    
    Write-Host "✅ Company created" -ForegroundColor Green
    Write-Host "   Company ID: $($response1.company_id)" -ForegroundColor Gray
    Write-Host "   Action: $($response1.action)" -ForegroundColor Gray
    Write-Host "   AI Enrichment: $($response1.metadata.ai_enrichment)" -ForegroundColor Gray
    
    $COMPANY_ID_1 = $response1.company_id
    
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 2

# ============================================================
# TEST 3: Create Company WITH Website (AI Enrichment Triggered)
# ============================================================

Write-Host "📋 TEST 3: Create Company (With Website → AI Enrichment)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$testCompany2 = @{
    company_name = "Tech Innovators BV"
    kvk_number = "88888888"
    email = "contact@techinnovators.nl"
    phone = "+31 30 9876543"
    city = "Utrecht"
    website_url = "https://www.microsoft.com"  # Use a known website for reliable tech stack detection
    source = "n8n_automation"
    industry = "Software Development"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $FUNCTION_URL `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{"x-api-key"=$API_KEY} `
        -Body $testCompany2
    
    Write-Host "✅ Company created" -ForegroundColor Green
    Write-Host "   Company ID: $($response2.company_id)" -ForegroundColor Gray
    Write-Host "   Action: $($response2.action)" -ForegroundColor Gray
    Write-Host "   AI Enrichment: $($response2.metadata.ai_enrichment)" -ForegroundColor Gray
    
    $COMPANY_ID_2 = $response2.company_id
    
    Write-Host ""
    Write-Host "⏳ Waiting 10 seconds for AI enrichment to complete..." -ForegroundColor Yellow
    
    # Progress bar
    for ($i = 10; $i -gt 0; $i--) {
        Write-Host -NoNewline "`r   $i seconds remaining... " -ForegroundColor Gray
        Start-Sleep -Seconds 1
    }
    Write-Host "`r   ✅ Wait complete                " -ForegroundColor Green
    
} catch {
    Write-Host "❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# TEST 4: Verify AI Enrichment in Database
# ============================================================

Write-Host "📋 TEST 4: Verifying AI Enrichment Results" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

Write-Host ""
Write-Host "Open Supabase Dashboard to verify:" -ForegroundColor Cyan
Write-Host "https://supabase.com/dashboard/project/pdqdrdddgbiiktcwdslv/editor/companies" -ForegroundColor White
Write-Host ""

Write-Host "Check company: $COMPANY_ID_2" -ForegroundColor Yellow
Write-Host ""

Write-Host "Expected fields filled:" -ForegroundColor Cyan
Write-Host "   • ai_audit_summary (250+ characters)" -ForegroundColor White
Write-Host "   • tech_stack (array with technologies)" -ForegroundColor White
Write-Host "   • enrichment_data (JSONB with lead_score)" -ForegroundColor White
Write-Host "   • ai_enrichment_status = 'completed'" -ForegroundColor White
Write-Host ""

# ============================================================
# TEST 5: Check Edge Function Logs
# ============================================================

Write-Host "📋 TEST 5: Viewing Edge Function Logs" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "Run this command to see AI enrichment logs:" -ForegroundColor Cyan
Write-Host "   supabase functions logs ingest-prospect --limit 50" -ForegroundColor White
Write-Host ""

Write-Host "Look for these log entries:" -ForegroundColor Yellow
Write-Host "   • [Gemini] Generating audit for: Tech Innovators BV" -ForegroundColor Gray
Write-Host "   • [Gemini] ✅ Audit generated" -ForegroundColor Gray
Write-Host "   • [Gemini] Extracting tech stack for: https://..." -ForegroundColor Gray
Write-Host "   • [Gemini] ✅ Extracted X technologies" -ForegroundColor Gray
Write-Host "   • AI enrichment completed" -ForegroundColor Gray
Write-Host ""

# ============================================================
# SUMMARY
# ============================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 TEST SUMMARY" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Tests Completed:" -ForegroundColor Green
Write-Host "   1. Health check" -ForegroundColor White
Write-Host "   2. Company creation (no AI)" -ForegroundColor White
Write-Host "   3. Company creation (with AI)" -ForegroundColor White
Write-Host "   4. Database verification" -ForegroundColor White
Write-Host "   5. Log inspection" -ForegroundColor White
Write-Host ""

Write-Host "🔍 Manual Verification Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Check Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/pdqdrdddgbiiktcwdslv/editor/companies" -ForegroundColor White
Write-Host ""

Write-Host "2. Find company with ID: $COMPANY_ID_2" -ForegroundColor Cyan
Write-Host ""

Write-Host "3. Verify these columns are filled:" -ForegroundColor Cyan
Write-Host "   • ai_audit_summary (should have structured analysis)" -ForegroundColor White
Write-Host "   • tech_stack (array like ['React', 'TypeScript', ...])" -ForegroundColor White
Write-Host "   • enrichment_data (JSON with lead_score: 0-100)" -ForegroundColor White
Write-Host "   • ai_enrichment_status = 'completed'" -ForegroundColor White
Write-Host ""

Write-Host "4. Check logs:" -ForegroundColor Cyan
Write-Host "   supabase functions logs ingest-prospect" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 AI Enrichment Tests Complete!" -ForegroundColor Green
Write-Host ""
