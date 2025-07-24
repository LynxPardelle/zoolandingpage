# Desarrollo con Docker - Guía Completa

Esta guía te permitirá desarrollar el proyecto sin instalar Node.js localmente, usando Docker para todo el desarrollo.

## 🚀 Configuración Inicial

### 1. Extensiones de VSCode Recomendadas

Instala estas extensiones para una experiencia completa:

```bash
# Angular
Angular Language Service
Angular Snippets

# TypeScript
TypeScript Importer

# Docker
Docker
Remote - Containers

# Desarrollo Web
Prettier - Code formatter
ESLint
Path Intellisense
Auto Rename Tag

# Productividad
GitLens
Todo Tree
```

### 2. Primera Configuración

```bash
# Iniciar el proyecto por primera vez
make quick-start

# Configurar VSCode para desarrollo con Docker
make vscode-setup
```

## 🛠️ Comandos Principales

### Desarrollo

```bash
# Iniciar servidor de desarrollo (foreground)
make dev

# Iniciar servidor de desarrollo (background)
make dev-detached

# Ver logs del servidor
make dev-logs

# Acceder al shell del contenedor
make dev-shell

# Parar todos los contenedores
make stop
```

### Gestión de Dependencias

```bash
# Instalar un paquete
make install pkg=nombre-paquete

# Instalar un paquete de desarrollo
make install-dev pkg=nombre-paquete

# Sincronizar node_modules para autocompletado
make sync-deps

# Instalador interactivo
make docker-install
```

### Testing y Calidad

```bash
# Ejecutar tests
make test

# Ejecutar tests en modo watch
make test-watch

# Ejecutar linting
make lint

# Verificar calidad del código
make code-quality
```

## 💻 Flujo de Trabajo Recomendado

### 1. Inicio de Sesión de Desarrollo

```bash
# Iniciar el entorno completo
make quick-start

# Sincronizar dependencias para autocompletado
make sync-deps
```

### 2. Desarrollo Diario

1. **Abrir VSCode**: `code .` o abrir el workspace `zoolandingpage.code-workspace`
2. **Iniciar servidor**: Presiona `F5` o usa `Ctrl+Shift+P` → "Tasks: Run Task" → "Docker: Start Development Server"
3. **Desarrollar**: El hot-reload está habilitado, los cambios se reflejan automáticamente
4. **Testing**: Usa `Ctrl+Shift+P` → "Tasks: Run Task" → "Docker: Run Tests"

### 3. Agregar Nuevas Dependencias

```bash
# Opción 1: Comando directo
make install pkg=@angular/material

# Opción 2: Instalador interactivo
make docker-install

# Sincronizar para autocompletado
make sync-deps
```

### 4. Debugging

- **F5**: Inicia debugging con Chrome
- **Ctrl+Shift+F5**: Inicia tests con debugging
- Los breakpoints funcionan normalmente en VSCode

## 🔧 Configuración Avanzada

### Path Mapping

El proyecto está configurado con estos aliases:

```typescript
// En lugar de:
import { Service } from '../../../core/services/service'

// Usa:
import { Service } from '@core/services/service'
```

Aliases disponibles:
- `@core` → `src/app/core`
- `@shared` → `src/app/shared`
- `@components` → `src/app/core/components`
- `@services` → `src/app/core/services`
- `@types` → `src/app/core/types`

### Formateo Automático

- **Guardar archivo**: Formatea automáticamente con Prettier
- **Organizar imports**: Se ejecuta automáticamente al guardar
- **ESLint**: Se ejecuta y corrige automáticamente

### Variables de Entorno

Edita el archivo `.env` para configurar:

```env
APP_NAME=zoolandingpage
DEV_PORT=4200
PROD_PORT=9999
```

## 🚨 Solución de Problemas

### Problema: Autocompletado no funciona

```bash
# Solución: Sincronizar dependencias
make sync-deps

# Reiniciar VSCode
# Ctrl+Shift+P → "Developer: Reload Window"
```

### Problema: Contenedor no inicia

```bash
# Limpiar y reconstruir
make clean
make rebuild
```

### Problema: Cambios no se reflejan

```bash
# Verificar que el contenedor esté ejecutándose
docker ps

# Ver logs para errores
make dev-logs
```

### Problema: Errores de TypeScript

```bash
# Verificar configuración de TypeScript
make dev-shell
# Dentro del contenedor:
ng build --configuration development
```

## 📚 Recursos Adicionales

### Comandos de Docker Directo

```bash
# Ver logs del contenedor
docker logs zoolandingpage-dev -f

# Ejecutar comando en el contenedor
docker exec -it zoolandingpage-dev ng version

# Copiar archivos del contenedor
docker cp zoolandingpage-dev:/app/dist ./dist
```

### Configuración de Puertos

- **Desarrollo**: http://localhost:4200
- **Tests**: http://localhost:9876
- **Producción**: http://localhost:9999

### Comandos Make Completos

```bash
# Ver todos los comandos disponibles
make help

# Comandos esenciales para desarrollo Docker
make quick-start     # Configuración inicial completa
make vscode-setup    # Configurar VSCode
make sync-deps       # Sincronizar dependencias
make docker-install  # Instalador interactivo de paquetes
```

## 🎯 Tips de Productividad

1. **Usa el workspace**: Abre `zoolandingpage.code-workspace` para configuración optimizada
2. **Atajos de teclado**: `F5` para debugging, `Ctrl+Shift+P` para comandos
3. **Sincroniza regularmente**: Ejecuta `make sync-deps` después de instalar paquetes
4. **Mantén limpio**: Usa `make clean` periódicamente para limpiar caché
5. **Monitorea**: Usa `make dev-logs` para ver errores en tiempo real
