# =============================================
# Supabase Edge Function Deployment Script (Windows)
# Function: api-webhook-handler
# =============================================

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying AI Webhook Handler Edge Function..." -ForegroundColor Cyan
Write-Host ""

# =============================================
# STEP 1: Check Prerequisites
# =============================================

Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Install it with:" -ForegroundColor Red
    Write-Host "   npm install -g supabase" -ForegroundColor White
    exit 1
}

# Check if logged in
try {
    $null = supabase projects list 2>&1
} catch {
    Write-Host "❌ Not logged in to Supabase. Run:" -ForegroundColor Red
    Write-Host "   supabase login" -ForegroundColor White
    exit 1
}

Write-Host "✅ Prerequisites OK" -ForegroundColor Green
Write-Host ""

# =============================================
# STEP 2: Generate API Key
# =============================================

Write-Host "🔑 Generating secure API key..." -ForegroundColor Yellow

# Generate random 32-byte hex key
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$API_KEY = [System.BitConverter]::ToString($bytes) -replace '-'

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔐 YOUR WEBHOOK API KEY (SAVE THIS!):" -ForegroundColor Yellow
Write-Host ""
Write-Host "   $API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press ENTER to continue (make sure you saved the key)"

# =============================================
# STEP 3: Set Secrets
# =============================================

Write-Host ""
Write-Host "🔒 Setting Edge Function secrets..." -ForegroundColor Yellow

# Set the API key as a secret
supabase secrets set "WEBHOOK_API_KEY=$API_KEY"

Write-Host "✅ Secrets configured" -ForegroundColor Green
Write-Host ""

# =============================================
# STEP 4: Deploy Edge Function
# =============================================

Write-Host "📦 Deploying Edge Function..." -ForegroundColor Yellow

# Get project ref
$projectsJson = supabase projects list --output json | ConvertFrom-Json
$PROJECT_REF = if ($env:SUPABASE_PROJECT_REF) { $env:SUPABASE_PROJECT_REF } else { $projectsJson[0].id }

supabase functions deploy api-webhook-handler --project-ref $PROJECT_REF

Write-Host "✅ Edge Function deployed" -ForegroundColor Green
Write-Host ""

# =============================================
# STEP 5: Get Function URL
# =============================================

$FUNCTION_URL = "https://$PROJECT_REF.supabase.co/functions/v1/api-webhook-handler"

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Webhook URL:" -ForegroundColor Yellow
Write-Host "   $FUNCTION_URL" -ForegroundColor White
Write-Host ""
Write-Host "🔑 API Key:" -ForegroundColor Yellow
Write-Host "   $API_KEY" -ForegroundColor White
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# =============================================
# STEP 6: Test Deployment
# =============================================

Write-Host "🧪 Testing deployment..." -ForegroundColor Yellow
Write-Host ""

$testPayload = @{
    action = "create_lead"
    source = "test"
    data = @{
        company_name = "Deployment Test Company"
        title = "Test Lead"
    }
} | ConvertTo-Json -Depth 10

try {
    $response = Invoke-RestMethod -Uri $FUNCTION_URL -Method Post `
        -Headers @{
            "Content-Type" = "application/json"
            "X-API-Key" = $API_KEY
            "User-Agent" = "deployment-test/1.0"
        } `
        -Body $testPayload

    if ($response.success -eq $true) {
        Write-Host "✅ Test successful! Lead created." -ForegroundColor Green
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    } else {
        Write-Host "⚠️  Test returned unexpected response:" -ForegroundColor Yellow
        $response | ConvertTo-Json -Depth 10 | Write-Host -ForegroundColor White
    }
} catch {
    Write-Host "⚠️  Test failed: $_" -ForegroundColor Red
}

Write-Host ""

# =============================================
# STEP 7: Save Configuration
# =============================================

Write-Host "💾 Saving configuration..." -ForegroundColor Yellow

$CONFIG_FILE = ".env.webhook"
$configContent = @"
# AI Webhook Handler Configuration
# Generated: $(Get-Date)

WEBHOOK_API_KEY=$API_KEY
WEBHOOK_URL=$FUNCTION_URL
SUPABASE_PROJECT_REF=$PROJECT_REF

# Usage in n8n:
# Header: X-API-Key = $API_KEY
# URL: $FUNCTION_URL
"@

$configContent | Out-File -FilePath $CONFIG_FILE -Encoding UTF8

Write-Host "✅ Configuration saved to: $CONFIG_FILE" -ForegroundColor Green
Write-Host ""

# =============================================
# STEP 8: Next Steps
# =============================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📚 NEXT STEPS" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 📖 Read the documentation:" -ForegroundColor White
Write-Host "   Get-Content supabase\functions\api-webhook-handler\README.md" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 🔧 Configure n8n:" -ForegroundColor White
Write-Host "   - Add HTTP Request node" -ForegroundColor Gray
Write-Host "   - URL: $FUNCTION_URL" -ForegroundColor Gray
Write-Host "   - Header: X-API-Key = $API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 🧠 Configure Manus AI:" -ForegroundColor White
Write-Host "   - Add HTTP action" -ForegroundColor Gray
Write-Host "   - URL: $FUNCTION_URL" -ForegroundColor Gray
Write-Host "   - Header: X-API-Key = $API_KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 📊 Monitor logs:" -ForegroundColor White
Write-Host "   supabase functions logs api-webhook-handler --follow" -ForegroundColor Gray
Write-Host ""
Write-Host "5. 🔍 View audit trail:" -ForegroundColor White
Write-Host "   Check v_audit_log_with_users in Supabase" -ForegroundColor Gray
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Done! Your webhook is ready for AI integrations." -ForegroundColor Green
Write-Host ""

# =============================================
# STEP 9: Copy API Key to Clipboard (optional)
# =============================================

$copyToClipboard = Read-Host "Copy API key to clipboard? (Y/n)"
if ($copyToClipboard -ne "n" -and $copyToClipboard -ne "N") {
    $API_KEY | Set-Clipboard
    Write-Host "✅ API key copied to clipboard!" -ForegroundColor Green
}
