# ============================================================
# DEPLOY INGEST-PROSPECT WITH GEMINI ENRICHMENT
# ============================================================
# Deploys the updated Edge Function with AI capabilities
# Date: 9 januari 2026

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🚀 DEPLOYING INGEST-PROSPECT EDGE FUNCTION" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is available
try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "✅ Supabase CLI: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install via: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Verify Gemini API key is set
Write-Host "🔍 Verifying GEMINI_API_KEY..." -ForegroundColor Yellow

try {
    $secrets = supabase secrets list 2>&1 | Out-String
    
    if ($secrets -match "GEMINI_API_KEY") {
        Write-Host "✅ GEMINI_API_KEY is configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  GEMINI_API_KEY not found in secrets!" -ForegroundColor Yellow
        Write-Host ""
        $setup = Read-Host "Run AI_KEYS_SETUP.ps1 first? (Y/n)"
        if ($setup -ne "n" -and $setup -ne "N") {
            Write-Host "Running setup script..." -ForegroundColor Cyan
            & ".\AI_KEYS_SETUP.ps1"
            Write-Host ""
            Write-Host "Press any key to continue deployment..." -ForegroundColor Yellow
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    }
} catch {
    Write-Host "⚠️  Could not verify secrets: $_" -ForegroundColor Yellow
}

Write-Host ""

# Deploy Edge Function
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📦 Deploying ingest-prospect..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Running: supabase functions deploy ingest-prospect --no-verify-jwt" -ForegroundColor Cyan
    Write-Host ""
    
    supabase functions deploy ingest-prospect --no-verify-jwt
    
    Write-Host ""
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "❌ Deployment failed: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

Write-Host ""

# Test health endpoint
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$FUNCTION_URL = "https://pdqdrdddgbiiktcwdslv.supabase.co/functions/v1/ingest-prospect"

Write-Host "Testing health endpoint..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$FUNCTION_URL/health" -Method GET -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Health check passed!" -ForegroundColor Green
        Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Unexpected status: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 DEPLOYMENT SUMMARY" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Edge Function deployed with features:" -ForegroundColor Green
Write-Host "   • Gemini AI company audits" -ForegroundColor White
Write-Host "   • Tech stack extraction" -ForegroundColor White
Write-Host "   • Lead scoring (0-100)" -ForegroundColor White
Write-Host "   • Async enrichment (non-blocking)" -ForegroundColor White
Write-Host ""

Write-Host "📡 Endpoint:" -ForegroundColor Yellow
Write-Host "   $FUNCTION_URL" -ForegroundColor White
Write-Host ""

Write-Host "🔐 Authentication:" -ForegroundColor Yellow
Write-Host "   Header: x-api-key: [your-key]" -ForegroundColor White
Write-Host "   (Get key from .env.webhook)" -ForegroundColor Gray
Write-Host ""

Write-Host "📚 Test Command:" -ForegroundColor Yellow
Write-Host @"
   `$apiKey = (Get-Content .env.webhook | Select-String "N8N_API_KEY").ToString().Split("=")[1]
   `$body = @{
       company_name = "Test BV"
       kvk_number = "87654321"
       website_url = "https://example.nl"
       email = "info@example.nl"
       city = "Amsterdam"
       source = "n8n_automation"
       industry = "Software"
   } | ConvertTo-Json

   Invoke-WebRequest -Uri "$FUNCTION_URL" ``
       -Method POST ``
       -ContentType "application/json" ``
       -Headers @{"x-api-key"=`$apiKey} ``
       -Body `$body
"@ -ForegroundColor White

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test the endpoint with sample data" -ForegroundColor White
Write-Host "2. Setup n8n workflows (see N8N_DEPLOYMENT_GUIDE.md)" -ForegroundColor White
Write-Host "3. Monitor logs: supabase functions logs ingest-prospect --follow" -ForegroundColor White
Write-Host ""
