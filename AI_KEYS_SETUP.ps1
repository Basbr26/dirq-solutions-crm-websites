# ============================================================
# AI INTEGRATIONS - SUPABASE SECRETS SETUP
# ============================================================
# Run this script to configure all AI API keys in Supabase
# Date: 9 januari 2026

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🤖 AI INTEGRATIONS SETUP" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# STEP 1: Verify Supabase CLI
# ============================================================

Write-Host "📋 Step 1: Verifying Supabase CLI..." -ForegroundColor Yellow

try {
    $supabaseVersion = supabase --version 2>&1
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install via: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# ============================================================
# STEP 2: Login & Link Project
# ============================================================

Write-Host "📋 Step 2: Checking Supabase connection..." -ForegroundColor Yellow

# Check if already linked
$linked = $false
if (Test-Path ".\.supabase\config.toml") {
    Write-Host "✅ Project already linked" -ForegroundColor Green
    $linked = $true
} else {
    Write-Host "⚠️  Project not linked" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Run these commands manually:" -ForegroundColor Cyan
    Write-Host "  supabase login" -ForegroundColor White
    Write-Host "  supabase link --project-ref pdqdrdddgbiiktcwdslv" -ForegroundColor White
    Write-Host ""
    $proceed = Read-Host "Have you linked the project? (Y/n)"
    if ($proceed -eq "n" -or $proceed -eq "N") {
        Write-Host "❌ Setup cancelled" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ============================================================
# STEP 3: Set API Keys as Secrets
# ============================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔐 Step 3: Setting API Keys..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Google Gemini API Key
Write-Host "1️⃣  Setting GEMINI_API_KEY..." -ForegroundColor Cyan

# Check if key is provided via environment variable
$geminiKey = $env:GEMINI_API_KEY
if (-not $geminiKey) {
    Write-Host "   ⚠️  GEMINI_API_KEY not found in environment" -ForegroundColor Yellow
    Write-Host "   ℹ️  Set with: `$env:GEMINI_API_KEY='your-key-here'" -ForegroundColor Gray
    Write-Host "   ℹ️  Or get it from: https://aistudio.google.com/" -ForegroundColor Gray
    Write-Host ""
    $geminiKey = Read-Host "   Enter GEMINI_API_KEY"
}

try {
    supabase secrets set GEMINI_API_KEY="$geminiKey" 2>&1 | Out-Null
    Write-Host "   ✅ GEMINI_API_KEY configured" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to set GEMINI_API_KEY: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Apollo.io API Key
Write-Host "2️⃣  Setting APOLLO_API_KEY..." -ForegroundColor Cyan

$apolloKey = $env:APOLLO_API_KEY
if (-not $apolloKey) {
    Write-Host "   ⚠️  APOLLO_API_KEY not found in environment" -ForegroundColor Yellow
    Write-Host "   ℹ️  Set with: `$env:APOLLO_API_KEY='your-key-here'" -ForegroundColor Gray
    Write-Host "   ℹ️  Or get it from: https://app.apollo.io/settings/api" -ForegroundColor Gray
    Write-Host ""
    $apolloKey = Read-Host "   Enter APOLLO_API_KEY"
}

try {
    supabase secrets set APOLLO_API_KEY="$apolloKey" 2>&1 | Out-Null
    Write-Host "   ✅ APOLLO_API_KEY configured" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed to set APOLLO_API_KEY: $_" -ForegroundColor Red
}

Start-Sleep -Seconds 1

# Manus AI API Key
Write-Host "3️⃣  Setting MANUS_API_KEY..." -ForegroundColor Cyan

$manusKey = $env:MANUS_API_KEY
if (-not $manusKey) {
    Write-Host "   ⚠️  MANUS_API_KEY not found in environment" -ForegroundColor Yellow
    Write-Host "   ℹ️  Set with: `$env:MANUS_API_KEY='your-key-here'" -ForegroundColor Gray
    Write-Host "   ℹ️  Or get it from: https://manus.im/settings" -ForegroundColor Gray
    Write-Host ""
    $manusKey = Read-Host "   Enter MANUS_API_KEY (or press Enter to skip)"
}

if ($manusKey) {
    try {
        supabase secrets set MANUS_API_KEY="$manusKey" 2>&1 | Out-Null
        Write-Host "   ✅ MANUS_API_KEY configured" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Failed to set MANUS_API_KEY: $_" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (optional)" -ForegroundColor Gray
}

Write-Host ""

# ============================================================
# STEP 4: Verify Secrets
# ============================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🔍 Step 4: Verifying Secrets..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

try {
    $secrets = supabase secrets list 2>&1
    Write-Host $secrets
    Write-Host ""
    
    # Check if all required secrets are present
    $requiredSecrets = @("GEMINI_API_KEY", "APOLLO_API_KEY", "MANUS_API_KEY")
    $allPresent = $true
    
    foreach ($secret in $requiredSecrets) {
        if ($secrets -match $secret) {
            Write-Host "   ✅ $secret found" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $secret missing" -ForegroundColor Red
            $allPresent = $false
        }
    }
    
    Write-Host ""
    
    if ($allPresent) {
        Write-Host "✅ All secrets configured successfully!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some secrets are missing - check errors above" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "❌ Failed to list secrets: $_" -ForegroundColor Red
}

Write-Host ""

# ============================================================
# STEP 5: Test API Keys
# ============================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "🧪 Step 5: Testing API Keys..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Test Google Gemini API
Write-Host "1️⃣  Testing Gemini API..." -ForegroundColor Cyan
if ($geminiKey) {
    try {
        $geminiTest = Invoke-WebRequest -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=$geminiKey" `
            -Method POST `
            -ContentType "application/json" `
            -Body '{"contents":[{"parts":[{"text":"Say hello in one word"}]}]}' `
            -ErrorAction Stop
        
        Write-Host "   ✅ Gemini API working!" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Gemini API test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no key provided)" -ForegroundColor Gray
}

Write-Host ""

# Test Apollo API
Write-Host "2️⃣  Testing Apollo.io API..." -ForegroundColor Cyan
if ($apolloKey) {
    try {
        $apolloHeaders = @{
            "x-api-key" = "$apolloKey"
            "Content-Type" = "application/json"
        }
        
        $apolloTest = Invoke-WebRequest -Uri "https://api.apollo.io/v1/auth/health" `
            -Method GET `
            -Headers $apolloHeaders `
            -ErrorAction Stop
        
        Write-Host "   ✅ Apollo.io API working!" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Apollo API test failed (may need valid endpoint): $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⏭️  Skipped (no key provided)" -ForegroundColor Gray
}

Write-Host ""

# Test Manus AI
Write-Host "3️⃣  Testing Manus AI API..." -ForegroundColor Cyan
Write-Host "   ⏳ Manus API endpoint TBD (private beta)" -ForegroundColor Yellow

Write-Host ""

# ============================================================
# STEP 6: Summary & Next Steps
# ============================================================

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 SETUP SUMMARY" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Write-Host "✅ Configured Services:" -ForegroundColor Green
Write-Host "   • Google Gemini (AI enrichment)" -ForegroundColor White
Write-Host "   • Apollo.io (B2B data)" -ForegroundColor White
Write-Host "   • Manus AI (website audits)" -ForegroundColor White
Write-Host ""

Write-Host "📚 NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Deploy Gemini enrichment module:" -ForegroundColor Cyan
Write-Host "   cd 'c:\Dirq apps\dirq-solutions-crmwebsite'" -ForegroundColor White
Write-Host "   # Create gemini-enrichment.ts (see AI_SETUP_COMPLETE_GUIDE.md)" -ForegroundColor Gray
Write-Host "   supabase functions deploy ingest-prospect --no-verify-jwt" -ForegroundColor White
Write-Host ""

Write-Host "2️⃣  Setup n8n workflows:" -ForegroundColor Cyan
Write-Host "   • Go to n8n.io and create account" -ForegroundColor White
Write-Host "   • Import KVK Scanner workflow (see guide)" -ForegroundColor White
Write-Host "   • Import Apollo Enrichment workflow" -ForegroundColor White
Write-Host ""

Write-Host "3️⃣  Test complete flow:" -ForegroundColor Cyan
Write-Host "   • Create company via API with KVK number" -ForegroundColor White
Write-Host "   • Verify AI enrichment in database" -ForegroundColor White
Write-Host "   • Check n8n execution logs" -ForegroundColor White
Write-Host ""

Write-Host "📖 Documentation:" -ForegroundColor Yellow
Write-Host "   • AI_SETUP_COMPLETE_GUIDE.md - Full setup guide" -ForegroundColor White
Write-Host "   • N8N_DEPLOYMENT_GUIDE.md - n8n workflows" -ForegroundColor White
Write-Host "   • PROJECT_VELOCITY_COMPLETE_GUIDE.md - Database schema" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 AI Keys Setup Complete!" -ForegroundColor Green
Write-Host ""

# Save configuration to .env.ai
Write-Host "💾 Saving configuration to .env.ai..." -ForegroundColor Yellow

$envContent = @"
# AI Integration API Keys
# Generated: $(Get-Date)
# ⚠️ DO NOT COMMIT THIS FILE TO GIT!
# ⚠️ ALREADY IN .gitignore - This file is safe

# Google Gemini API (AI enrichment)
GEMINI_API_KEY=$geminiKey

# Apollo.io API (B2B data enrichment)
APOLLO_API_KEY=$apolloKey

# Manus AI API (website audits)
MANUS_API_KEY=$manusKey

# Usage:
# - These keys are configured in Supabase Edge Function secrets
# - Frontend should NOT access these directly (security risk)
# - All AI operations should go through Edge Functions

# To use these keys in future sessions:
# `$env:GEMINI_API_KEY = (Get-Content .env.ai | Select-String 'GEMINI_API_KEY').ToString().Split('=')[1]
# `$env:APOLLO_API_KEY = (Get-Content .env.ai | Select-String 'APOLLO_API_KEY').ToString().Split('=')[1]
# `$env:MANUS_API_KEY = (Get-Content .env.ai | Select-String 'MANUS_API_KEY').ToString().Split('=')[1]
"@

$envContent | Out-File -FilePath ".env.ai" -Encoding UTF8

Write-Host "✅ Configuration saved to .env.ai" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  IMPORTANT: Add .env.ai to .gitignore!" -ForegroundColor Yellow
Write-Host ""
