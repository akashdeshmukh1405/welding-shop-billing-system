# PowerShell Database Restore Script for PostgreSQL
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$DbUser = "welding_admin",
    [string]$DbName = "welding_shop_db"
)

if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Backup file not found: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Restoring database $DbName from $BackupFile..." -ForegroundColor Cyan

try {
    if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        Write-Host "🐳 Restoring via Docker container 'welding_shop_postgres'..." -ForegroundColor Yellow
        Get-Content $BackupFile | docker exec -i welding_shop_postgres psql -U $DbUser -d $DbName
    } else {
        psql -U $DbUser -d $DbName -f $BackupFile
    }

    Write-Host "✅ Database restore completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Restore failed: $_" -ForegroundColor Red
    exit 1
}
