#!/bin/bash

# Script para sincronizar node_modules desde el contenedor Docker
# Esto permite tener autocompletado sin instalar Node localmente

set -euo pipefail

echo "🔄 Sincronizando node_modules desde el contenedor Docker..."

# Verificar si el contenedor está ejecutándose
if ! docker ps --format "{{.Names}}" | grep -q "^zoolandingpage-dev$"; then
    echo "❌ El contenedor zoolandingpage-dev no está ejecutándose."
    echo "Ejecuta 'make dev-detached' primero."
    exit 1
fi

echo "📦 Sincronizando node_modules (tar stream, sin preservar permisos)..."

# Re-crear node_modules (evita mezclar estado parcial)
rm -rf ./node_modules
mkdir -p ./node_modules

# En mounts Windows/WSL, docker cp suele fallar al aplicar chmod.
# Esto evita ese problema: no preserva owner/perms al extraer.
docker exec zoolandingpage-dev sh -lc 'cd /app && tar -cf - node_modules' \
    | tar -xf - --no-same-owner --no-same-permissions

# Copiar package-lock.json si existe
if docker exec zoolandingpage-dev sh -lc 'test -f /app/package-lock.json'; then
    echo "📄 Copiando package-lock.json..."
    docker cp zoolandingpage-dev:/app/package-lock.json ./
fi

echo "✅ Sincronización completa!"
echo "💡 Ahora VS Code debería resolver @angular/*, tslib, y types de tests."
