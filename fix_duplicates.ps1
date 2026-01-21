# Fix duplicate keys in nl/translation.json
$filePath = "src\lib\locales\nl\translation.json"
$content = Get-Content $filePath -Raw

# Read the file as lines to work with line numbers
$lines = Get-Content $filePath

# Find the line numbers of duplicates
# Old activities section starts around line 604 and goes until line 639
# Old forms section starts around line 655 and goes until line 674
# Old errors section starts around line 675 and goes until line 695

# We need to remove lines 604-639 (activities), 655-674 (forms), 675-695 (errors)
# But we need to be careful with the comma on line 603

$newLines = @()
$skipRanges = @(
    @{Start=604; End=639},  # activities (old)
    @{Start=655; End=674},  # forms (old)
    @{Start=675; End=705}   # errors (old)
)

for ($i = 0; $i -lt $lines.Count; $i++) {
    $lineNum = $i + 1
    $skip = $false
    
    foreach ($range in $skipRanges) {
        if ($lineNum -ge $range.Start -and $lineNum -le $range.End) {
            $skip = $true
            break
        }
    }
    
    if (-not $skip) {
        $newLines += $lines[$i]
    }
}

# Write back
$newLines | Set-Content $filePath -Encoding UTF8
Write-Host "Fixed duplicates in $filePath"
