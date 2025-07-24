# Script para sincronizar node_modules desde el contenedor Docker
# Esto permite tener autocompletado sin instalar Node localmente

Write-Host "🔄 Sincronizando node_modules desde el contenedor Docker..." -ForegroundColor Cyan

# Verificar si el contenedor está ejecutándose
$containerRunning = docker ps --format "table {{.Names}}" | Select-String "zoolandingpage-dev"

if (-not $containerRunning) {
    Write-Host "❌ El contenedor zoolandingpage-dev no está ejecutándose." -ForegroundColor Red
    Write-Host "Ejecuta 'make dev-detached' primero." -ForegroundColor Yellow
    exit 1
}

# Crear directorio node_modules si no existe
if (-not (Test-Path "./node_modules")) {
    New-Item -ItemType Directory -Path "./node_modules" -Force | Out-Null
}

# Copiar node_modules del contenedor
Write-Host "📦 Copiando node_modules..." -ForegroundColor Green
docker cp zoolandingpage-dev:/app/node_modules ./

# Copiar package-lock.json si existe
$lockFileExists = docker exec zoolandingpage-dev test -f /app/package-lock.json
if ($LASTEXITCODE -eq 0) {
    Write-Host "📄 Copiando package-lock.json..." -ForegroundColor Green
    docker cp zoolandingpage-dev:/app/package-lock.json ./
}

Write-Host "✅ Sincronización completa!" -ForegroundColor Green
Write-Host "💡 Ahora tienes autocompletado completo en VSCode." -ForegroundColor Cyan
Write-Host ""
Write-Host "Comandos útiles:" -ForegroundColor Yellow
Write-Host "  make dev          - Iniciar servidor de desarrollo"
Write-Host "  make dev-shell    - Acceder al contenedor"
Write-Host "  make install pkg=<nombre> - Instalar paquete"
Write-Host "  .\sync-deps.ps1   - Sincronizar dependencias"
