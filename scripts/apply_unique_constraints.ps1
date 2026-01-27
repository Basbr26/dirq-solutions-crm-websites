# Apply UNIQUE constraints migration to remote database
Write-Host "`n=== Applying UNIQUE Constraints Migration ===" -ForegroundColor Cyan
Write-Host "This will add database-level duplicate prevention for companies" -ForegroundColor Yellow

# Get remote database connection from Supabase
Write-Host "`nRetrieving database connection details..." -ForegroundColor Gray
$projectRef = (Get-Content ".\.env.local" | Select-String "VITE_SUPABASE_URL").ToString() -replace '.*https://(.*?)\.supabase\.co.*', '$1'
$dbPassword = (Get-Content ".\.env.local" | Select-String "DB_PASSWORD").ToString() -replace '.*DB_PASSWORD=(.*)', '$1'

if (-not $dbPassword) {
    Write-Host "`n❌ ERROR: DB_PASSWORD not found in .env.local" -ForegroundColor Red
    Write-Host "Please add the database password to .env.local file" -ForegroundColor Yellow
    exit 1
}

# Build connection string for remote database
$connectionString = "postgresql://postgres.${projectRef}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

Write-Host "Connection configured for project: $projectRef" -ForegroundColor Green

# Read the migration file
$migrationFile = ".\supabase\migrations\20260127_add_unique_constraints_companies.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "`n❌ ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

$migrationSQL = Get-Content $migrationFile -Raw
Write-Host "`n✓ Migration file loaded ($($migrationSQL.Length) bytes)" -ForegroundColor Green

# Confirm before proceeding
Write-Host "`n⚠️  WARNING: This will modify the production database!" -ForegroundColor Yellow
Write-Host "Changes to be applied:" -ForegroundColor Yellow
Write-Host "  1. Add UNIQUE constraint on companies.kvk_number" -ForegroundColor White
Write-Host "  2. Add case-insensitive UNIQUE index on companies.name" -ForegroundColor White
Write-Host "  3. Clean up any existing duplicates (keeps oldest)" -ForegroundColor White
$confirm = Read-Host "`nDo you want to proceed? (Y/N)"

if ($confirm -ne 'Y' -and $confirm -ne 'y') {
    Write-Host "`n❌ Migration cancelled by user" -ForegroundColor Yellow
    exit 0
}

# Apply the migration using psql (if available)
Write-Host "`n=== Applying Migration ===" -ForegroundColor Cyan
$env:PGPASSWORD = $dbPassword -replace '.*:', ''

try {
    # Check if psql is available
    $psqlVersion = psql --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Using psql: $psqlVersion" -ForegroundColor Gray
        $migrationSQL | psql $connectionString -v ON_ERROR_STOP=1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n✅ Migration applied successfully!" -ForegroundColor Green
            Write-Host "`nVerifying constraints..." -ForegroundColor Gray
            
            # Verify the constraints were created
            $verifySQL = @"
SELECT 
    con.conname AS constraint_name,
    con.contype AS constraint_type,
    CASE con.contype
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'c' THEN 'CHECK'
    END AS type_description
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'companies'
  AND con.conname IN ('companies_kvk_number_key', 'companies_name_unique_idx')
ORDER BY con.conname;
"@
            
            $verifySQL | psql $connectionString -t
            
            Write-Host "`n✅ All done! Database now has duplicate prevention at the constraint level." -ForegroundColor Green
        } else {
            Write-Host "`n❌ Migration failed! Exit code: $LASTEXITCODE" -ForegroundColor Red
            Write-Host "Check the error messages above for details" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host "`n❌ ERROR: psql not found in PATH" -ForegroundColor Red
        Write-Host "`nPlease install PostgreSQL client tools or use Supabase Studio:" -ForegroundColor Yellow
        Write-Host "1. Open Supabase Dashboard: https://supabase.com/dashboard/project/$projectRef" -ForegroundColor White
        Write-Host "2. Go to SQL Editor" -ForegroundColor White
        Write-Host "3. Copy and paste the contents of:" -ForegroundColor White
        Write-Host "   $migrationFile" -ForegroundColor Cyan
        Write-Host "4. Run the SQL" -ForegroundColor White
        exit 1
    }
} catch {
    Write-Host "`n❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
