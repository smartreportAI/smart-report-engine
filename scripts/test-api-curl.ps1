# Smart Report Engine — API smoke test via curl (mirrors Postman collection).
# Usage:
#   .\scripts\test-api-curl.ps1                    # default: localhost:3000
#   .\scripts\test-api-curl.ps1 -BaseUrl "https://smart-report-engine.onrender.com"
param(
    [string]$BaseUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
if (-not (Test-Path (Join-Path $projectRoot "package.json"))) { $projectRoot = (Get-Location).Path }
$examplesDir = Join-Path $projectRoot "examples"
$indepthJson = Join-Path $examplesDir "indepth-report.json"

Write-Host "Base URL: $BaseUrl" -ForegroundColor Cyan
Write-Host ""

# 1. Health
Write-Host "[1/4] GET /health"
$r = curl.exe -s -w "%{http_code}" "$BaseUrl/health"
$code = $r[-3..-1] -join ''
$body = $r[0..($r.Length-4)] -join ''
if ($code -eq "200") { Write-Host "  OK $code" -ForegroundColor Green } else { Write-Host "  FAIL $code" -ForegroundColor Red; exit 1 }

# 2. Tenant
Write-Host "[2/4] GET /tenants/tenant-beta"
$r = curl.exe -s -w "%{http_code}" "$BaseUrl/tenants/tenant-beta"
$code = $r[-3..-1] -join ''
if ($code -eq "200") { Write-Host "  OK $code" -ForegroundColor Green } else { Write-Host "  FAIL $code" -ForegroundColor Red; exit 1 }

# 3. InDepth PDF (use --data-binary so file path with spaces works)
Write-Host "[3/4] POST /reports/generate (InDepth PDF)"
$outPdf = Join-Path $projectRoot "indepth-test-output.pdf"
$r = curl.exe -s -X POST -H "Content-Type: application/json" --data-binary "@$indepthJson" "$BaseUrl/reports/generate" -o $outPdf -w "%{http_code}"
if ($r -eq "200") {
    $size = (Get-Item $outPdf).Length
    Write-Host "  OK 200 PDF size: $size bytes" -ForegroundColor Green
} else {
    Write-Host "  FAIL $r" -ForegroundColor Red
    if (Test-Path $outPdf) { Get-Content $outPdf -Raw }
    exit 1
}

# 4. 404 route
Write-Host "[4/4] GET /this-does-not-exist (expect 404)"
$r = curl.exe -s -w "%{http_code}" "$BaseUrl/this-does-not-exist"
$code = $r[-3..-1] -join ''
if ($code -eq "404") { Write-Host "  OK 404" -ForegroundColor Green } else { Write-Host "  FAIL $code" -ForegroundColor Red }

Write-Host ""
Write-Host "All checks passed. InDepth PDF saved to: $outPdf" -ForegroundColor Green
