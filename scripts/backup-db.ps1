# PowerShell Database Backup Script for PostgreSQL
param(
    [string]$DbUser = "welding_admin",
    [string]$DbName = "welding_shop_db",
    [string]$DbHost = "localhost",
    [string]$DbPort = "5432",
    [string]$BackupDir = ".\backups"
)

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "$BackupDir\${DbName}_backup_${Timestamp}.sql"

Write-Host "📦 Starting PostgreSQL backup for $DbName..." -ForegroundColor Cyan

try {
    # Check if running in Docker or native
    if (Get-Command "docker" -ErrorAction SilentlyContinue) {
        Write-Host "🐳 Running pg_dump via Docker container 'welding_shop_postgres'..." -ForegroundColor Yellow
        docker exec -t welding_shop_postgres pg_dump -U $DbUser $DbName > $BackupFile
    } elseif (Get-Command "pg_dump" -ErrorAction SilentlyContinue) {
        pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -F p -f $BackupFile
    } else {
        throw "Neither Docker nor pg_dump found in system PATH."
    }

    Write-Host "✅ Database backup created successfully: $BackupFile" -ForegroundColor Green
} catch {
    Write-Host "❌ Backup failed: $_" -ForegroundColor Red
    exit 1
}
