$sourceDir = (Resolve-Path "portal-frontend\out").Path
$zipPath = (Resolve-Path "portal-frontend").Path + "\deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem -Path $sourceDir -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($sourceDir.Length).TrimStart('\', '/')
    $entry = $rel.Replace('\', '/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry) | Out-Null
}
$zip.Dispose()

Write-Host "ZIP created successfully: $((Get-Item $zipPath).Length) bytes"
Write-Host "First 15 entries:"
[System.IO.Compression.ZipFile]::OpenRead($zipPath).Entries | Select-Object -First 15 -ExpandProperty FullName
