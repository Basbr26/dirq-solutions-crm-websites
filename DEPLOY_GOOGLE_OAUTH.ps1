# Deploy Google OAuth Exchange Edge Function
# This script deploys the new authorization code flow Edge Function

Write-Host "🚀 Deploying Google OAuth Exchange Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
try {
    $supabaseVersion = supabase --version
    Write-Host "✅ Supabase CLI found: $supabaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install via: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Check if logged in
Write-Host ""
Write-Host "🔐 Checking Supabase login status..." -ForegroundColor Cyan
$loginStatus = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase" -ForegroundColor Red
    Write-Host "Run: supabase login" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Logged in to Supabase" -ForegroundColor Green

# Deploy function
Write-Host ""
Write-Host "📦 Deploying google-oauth-exchange function..." -ForegroundColor Cyan
supabase functions deploy google-oauth-exchange

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Edge Function deployed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Set Supabase secrets (if not done yet):" -ForegroundColor White
    Write-Host "   supabase secrets set GOOGLE_CLIENT_ID=your-client-id" -ForegroundColor Gray
    Write-Host "   supabase secrets set GOOGLE_CLIENT_SECRET=your-secret" -ForegroundColor Gray
    Write-Host "   supabase secrets set GOOGLE_REDIRECT_URI=https://your-domain.com" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Test the function:" -ForegroundColor White
    Write-Host "   Navigate to Calendar Settings and click 'Verbinden met Google Calendar'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Check debug logs for:" -ForegroundColor White
    Write-Host "   ✅ Refresh token ontvangen - persistente authenticatie actief" -ForegroundColor Gray
    Write-Host ""
    Write-Host "📚 Full setup guide: GOOGLE_OAUTH_CODE_FLOW_SETUP.md" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check error messages above and try again" -ForegroundColor Yellow
}
