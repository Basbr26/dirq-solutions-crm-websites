#!/usr/bin/env bash

# =============================================
# Supabase Edge Function Deployment Script
# Function: api-webhook-handler
# =============================================

set -e  # Exit on error

echo "🚀 Deploying AI Webhook Handler Edge Function..."
echo ""

# =============================================
# STEP 1: Check Prerequisites
# =============================================

echo "📋 Checking prerequisites..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it with:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase. Run:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Prerequisites OK"
echo ""

# =============================================
# STEP 2: Generate API Key (if needed)
# =============================================

echo "🔑 Generating secure API key..."

API_KEY=$(openssl rand -hex 32)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 YOUR WEBHOOK API KEY (SAVE THIS!):"
echo ""
echo "   $API_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "Press ENTER to continue (make sure you saved the key)..."

# =============================================
# STEP 3: Set Secrets
# =============================================

echo ""
echo "🔒 Setting Edge Function secrets..."

# Set the API key as a secret
supabase secrets set WEBHOOK_API_KEY="$API_KEY"

echo "✅ Secrets configured"
echo ""

# =============================================
# STEP 4: Deploy Edge Function
# =============================================

echo "📦 Deploying Edge Function..."

supabase functions deploy api-webhook-handler \
  --project-ref "${SUPABASE_PROJECT_REF:-$(supabase projects list --output json | jq -r '.[0].id')}"

echo "✅ Edge Function deployed"
echo ""

# =============================================
# STEP 5: Get Function URL
# =============================================

PROJECT_REF="${SUPABASE_PROJECT_REF:-$(supabase projects list --output json | jq -r '.[0].id')}"
FUNCTION_URL="https://${PROJECT_REF}.supabase.co/functions/v1/api-webhook-handler"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT SUCCESSFUL!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📡 Webhook URL:"
echo "   $FUNCTION_URL"
echo ""
echo "🔑 API Key:"
echo "   $API_KEY"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# =============================================
# STEP 6: Test Deployment
# =============================================

echo "🧪 Testing deployment..."
echo ""

TEST_RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "User-Agent: deployment-test/1.0" \
  -d '{
    "action": "create_lead",
    "source": "test",
    "data": {
      "company_name": "Deployment Test Company",
      "title": "Test Lead"
    }
  }')

if echo "$TEST_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
    echo "✅ Test successful! Lead created."
    echo ""
    echo "Response:"
    echo "$TEST_RESPONSE" | jq '.'
else
    echo "⚠️  Test returned unexpected response:"
    echo "$TEST_RESPONSE" | jq '.'
fi

echo ""

# =============================================
# STEP 7: Save Configuration
# =============================================

echo "💾 Saving configuration..."

CONFIG_FILE=".env.webhook"
cat > "$CONFIG_FILE" <<EOF
# AI Webhook Handler Configuration
# Generated: $(date)

WEBHOOK_API_KEY=$API_KEY
WEBHOOK_URL=$FUNCTION_URL
SUPABASE_PROJECT_REF=$PROJECT_REF

# Usage in n8n:
# Header: X-API-Key = $API_KEY
# URL: $FUNCTION_URL
EOF

echo "✅ Configuration saved to: $CONFIG_FILE"
echo ""

# =============================================
# STEP 8: Next Steps
# =============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📚 NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. 📖 Read the documentation:"
echo "   cat supabase/functions/api-webhook-handler/README.md"
echo ""
echo "2. 🔧 Configure n8n:"
echo "   - Add HTTP Request node"
echo "   - URL: $FUNCTION_URL"
echo "   - Header: X-API-Key = $API_KEY"
echo ""
echo "3. 🧠 Configure Manus AI:"
echo "   - Add HTTP action"
echo "   - URL: $FUNCTION_URL"
echo "   - Header: X-API-Key = $API_KEY"
echo ""
echo "4. 📊 Monitor logs:"
echo "   supabase functions logs api-webhook-handler --follow"
echo ""
echo "5. 🔍 View audit trail:"
echo "   Check v_audit_log_with_users in Supabase"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Done! Your webhook is ready for AI integrations."
echo ""
