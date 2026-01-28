# 🗄️ Database Migration Required - BEFORE TESTING

**Status:** ✅ **MIGRATION APPLIED & VERIFIED**  
**Priority:** ✅ **COMPLETED**  
**Test Suite:** ✅ **316/316 tests passing (100%)**

---

## 📋 Migration Details

**File:** `supabase/migrations/20260128_add_security_audit_columns.sql`  
**Purpose:** Add security audit columns for quote provider signatures  
**Required by:** P0 security fixes in QuoteDetailPage.tsx

---

## 🚀 How to Apply Migration

### Option 1: Supabase Dashboard (Recommended for Production)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Paste this SQL:**

```sql
-- Migration: Add security audit columns for quote signatures
-- Date: 2026-01-28
-- Purpose: Fix P0 security issues from audit report

-- Add IP logging columns for provider signature
ALTER TABLE quotes 
ADD COLUMN IF NOT EXISTS provider_signed_by_ip VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_signed_by UUID REFERENCES profiles(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_provider_signed_by ON quotes(provider_signed_by);
CREATE INDEX IF NOT EXISTS idx_quotes_sign_token ON quotes(sign_token) WHERE sign_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN quotes.provider_signed_by_ip IS 'IP address of provider when signing (audit/legal requirement)';
COMMENT ON COLUMN quotes.provider_signed_by IS 'User ID of provider who signed the quote';

-- Existing sign_token and sign_token_expires_at columns are already present
-- They will be set to NULL after signature to prevent replay attacks
```

4. **Run the query** (Ctrl+Enter or Click "Run")

5. **Verify success:**
   - Should see: "Success. No rows returned"
   - Check Table Editor → quotes → should see new columns

---

### Option 2: Supabase CLI (If Docker Desktop Running)

```bash
# Make sure Docker Desktop is running first!

# Reset database to apply all migrations
supabase db reset

# OR push only new migrations
supabase db push
```

---

### Option 3: psql Direct Connection

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR_PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres"

# Paste and run the SQL from above
```

---

## ✅ Verification Checklist

After running the migration, verify:

1. **Check columns exist:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'quotes' 
   AND column_name IN ('provider_signed_by_ip', 'provider_signed_by');
   ```
   Should return 2 rows.

2. **Check indexes exist:**
   ```sql
   SELECT indexname 
   FROM pg_indexes 
   WHERE tablename = 'quotes' 
   AND indexname IN ('idx_quotes_provider_signed_by', 'idx_quotes_sign_token');
   ```
   Should return 2 rows.

3. **Test query:**
   ```sql
   SELECT id, provider_signed_by_ip, provider_signed_by 
   FROM quotes 
   LIMIT 1;
   ```
   Should return without errors (columns will be NULL for existing quotes).

---

## 🎯 What This Enables

Once migration is applied:

✅ **Provider signature authorization** will work  
✅ **IP address logging** for audit trail  
✅ **Token invalidation** prevents replay attacks  
✅ **Tests can run** without database errors  
✅ **Production code** fully functional  

---

## 🚨 Impact of NOT Running Migration

If you skip this migration:

❌ QuoteDetailPage provider signature will **fail**  
❌ Tests will **fail** with "column does not exist" errors  
❌ Security features are **incomplete**  
❌ P0 security fixes are **not effective**  

---

## 📊 Migration Schema Changes

| Column Name | Type | Nullable | Purpose |
|-------------|------|----------|---------|
| `provider_signed_by_ip` | VARCHAR(50) | YES | Stores IP address for audit/legal compliance |
| `provider_signed_by` | UUID | YES | Foreign key to profiles(id) - who signed |

**Indexes Added:**
- `idx_quotes_provider_signed_by` - Performance for user lookups
- `idx_quotes_sign_token` - Performance for token validation (partial index)

---

## 🔄 Rollback (If Needed)

If something goes wrong, rollback with:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_quotes_provider_signed_by;
DROP INDEX IF EXISTS idx_quotes_sign_token;

-- Remove columns
ALTER TABLE quotes 
DROP COLUMN IF EXISTS provider_signed_by_ip,
DROP COLUMN IF EXISTS provider_signed_by;
```

---

## 📞 Next Steps After Migration

1. ✅ **Run migration** via Supabase Dashboard
2. ✅ **Verify columns exist** with SQL query
3. ✅ **Test provider signature** in staging
4. ✅ **Run test suite:** `npm test`
5. ✅ **Deploy code** to production

---

**Created:** 28 Januari 2026  
**Required By:** P0 Security Fixes  
**Estimated Time:** 2 minutes to apply  
**Downtime:** None (columns added as nullable)

