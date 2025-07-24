#!/bin/bash

# Script para sincronizar node_modules desde el contenedor Docker
# Esto permite tener autocompletado sin instalar Node localmente

echo "🔄 Sincronizando node_modules desde el contenedor Docker..."

# Verificar si el contenedor está ejecutándose
if ! docker ps --format "table {{.Names}}" | grep -q "zoolandingpage-dev"; then
    echo "❌ El contenedor zoolandingpage-dev no está ejecutándose."
    echo "Ejecuta 'make dev-detached' primero."
    exit 1
fi

# Crear directorio node_modules si no existe
if [ ! -d "./node_modules" ]; then
    mkdir -p "./node_modules"
fi

# Copiar node_modules del contenedor
echo "📦 Copiando node_modules..."
docker cp zoolandingpage-dev:/app/node_modules ./

# Copiar package-lock.json si existe
if docker exec zoolandingpage-dev test -f /app/package-lock.json; then
    echo "📄 Copiando package-lock.json..."
    docker cp zoolandingpage-dev:/app/package-lock.json ./
fi

echo "✅ Sincronización completa!"
echo "💡 Ahora tienes autocompletado completo en VSCode."
echo ""
echo "Comandos útiles:"
echo "  make dev          - Iniciar servidor de desarrollo"
echo "  make dev-shell    - Acceder al contenedor"
echo "  make install pkg=<nombre> - Instalar paquete"
echo "  ./sync-deps.sh    - Sincronizar dependencias"
