# Test n8n Chat Webhook
# Diagnose 500 error

$webhookUrl = "https://dirqsolutions.app.n8n.cloud/webhook/chat"

$testPayload = @{
    message = "Test bericht"
    session_id = "test-session-123"
    user_id = "test-user-456"
    user_name = "Test User"
    user_role = "SALES"
    timestamp = (Get-Date).ToString("o")
    context = @{
        current_page = "/test"
    }
} | ConvertTo-Json -Depth 10

Write-Host "🧪 Testing n8n Chat Webhook..." -ForegroundColor Cyan
Write-Host "URL: $webhookUrl" -ForegroundColor Gray
Write-Host ""
Write-Host "Payload:" -ForegroundColor Yellow
Write-Host $testPayload
Write-Host ""

try {
    $response = Invoke-WebRequest `
        -Uri $webhookUrl `
        -Method POST `
        -ContentType "application/json" `
        -Body $testPayload `
        -UseBasicParsing `
        -ErrorAction Stop

    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        $reader.Close()
        
        Write-Host "Error Details:" -ForegroundColor Yellow
        try {
            $errorBody | ConvertFrom-Json | ConvertTo-Json -Depth 10
        } catch {
            Write-Host $errorBody
        }
    } else {
        Write-Host "Error: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "💡 Volgende stappen als test faalt:" -ForegroundColor Cyan
Write-Host "1. Check of workflow ACTIEF is in n8n" -ForegroundColor White
Write-Host "2. Bekijk Executions in n8n voor error details" -ForegroundColor White
Write-Host "3. Verify Gemini API credentials in n8n" -ForegroundColor White
Write-Host "4. Check rate limits (Google Gemini free tier)" -ForegroundColor White
