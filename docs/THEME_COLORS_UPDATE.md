# Actualización del Sistema de Colores de Tema

## Resumen de Cambios

Se ha actualizado el sistema de colores del tema para usar una estructura más semántica y versátil que funciona mejor para landing pages y aplicaciones web.

## Nuevo Tipo ThemeColors

```typescript
export type ThemeColors = {
  bgColor: string; // Color de fondo principal
  textColor: string; // Color de texto principal
  titleColor: string; // Color para títulos y encabezados
  linkColor: string; // Color para enlaces
  accentColor: string; // Color de acento para elementos destacados
  secondaryBgColor: string; // Color de fondo secundario
  secondaryTextColor: string; // Color de texto secundario
  secondaryTitleColor: string; // Color para títulos secundarios
  secondaryLinkColor: string; // Color para enlaces secundarios
  secondaryAccentColor: string; // Color de acento secundario
};
```

## Configuraciones de Tema Actualizadas

### Tema Claro (Light Theme)

- **bgColor**: `#ffffff` - Fondo blanco limpio
- **textColor**: `#1a1a1a` - Texto oscuro legible
- **titleColor**: `#000000` - Títulos en negro para mayor contraste
- **linkColor**: `#0066cc` - Enlaces azules clásicos
- **accentColor**: `#0d6efd` - Azul Bootstrap para elementos destacados
- **secondaryBgColor**: `#f8f9fa` - Gris muy claro para fondos secundarios
- **secondaryTextColor**: `#6c757d` - Gris medio para texto secundario
- **secondaryTitleColor**: `#495057` - Gris oscuro para títulos secundarios
- **secondaryLinkColor**: `#6f42c1` - Púrpura para enlaces secundarios
- **secondaryAccentColor**: `#198754` - Verde para elementos de éxito

### Tema Oscuro (Dark Theme)

- **bgColor**: `#1a1a1a` - Fondo oscuro principal
- **textColor**: `#ffffff` - Texto blanco para contraste
- **titleColor**: `#f8f9fa` - Títulos en gris muy claro
- **linkColor**: `#66b3ff` - Enlaces azules más claros
- **accentColor**: `#4dabf7` - Azul claro para elementos destacados
- **secondaryBgColor**: `#2d2d2d` - Gris oscuro para fondos secundarios
- **secondaryTextColor**: `#adb5bd` - Gris claro para texto secundario
- **secondaryTitleColor**: `#dee2e6` - Gris muy claro para títulos secundarios
- **secondaryLinkColor**: `#9775fa` - Púrpura claro para enlaces secundarios
- **secondaryAccentColor**: `#51cf66` - Verde claro para elementos de éxito

## Archivos Modificados

### Core Types

- `src/app/core/types/theme.types.ts` - Actualizado tipo ThemeColors

### Services

- `src/app/core/services/theme.service.ts` - Configuraciones de tema y método \_applyTheme()

### Components HTML

- `src/app/app.component.html` - Clases de color actualizadas
- `src/app/core/components/layout/app-header/app-header.component.html` - Colores de header
- `src/app/core/components/layout/app-footer/app-footer.component.html` - Colores de footer

### Constants

- `src/app/core/components/layout/app-section/app-section.constants.ts` - Clases de sección
- `src/app/core/components/layout/app-header/app-header.constants.ts` - Clases de header
- `src/app/core/components/layout/app-footer/app-footer.constants.ts` - Clases de footer

## Mapeo de Clases CSS

Los nuevos colores se mapean a clases CSS de ngx-angora-css de la siguiente manera:

```typescript
const colorKeyMapping: Record<string, string> = {
  bgColor: 'background',
  textColor: 'text',
  titleColor: 'title',
  linkColor: 'link',
  accentColor: 'accent',
  secondaryBgColor: 'secondary-background',
  secondaryTextColor: 'secondary-text',
  secondaryTitleColor: 'secondary-title',
  secondaryLinkColor: 'secondary-link',
  secondaryAccentColor: 'secondary-accent',
};
```

## Uso en HTML

```html
<!-- Texto principal -->
<p class="ank-color-text">Texto principal</p>

<!-- Títulos -->
<h1 class="ank-color-title">Título principal</h1>

<!-- Enlaces -->
<a class="ank-color-link">Enlace principal</a>

<!-- Elementos destacados -->
<div class="ank-bg-accent ank-color-text">Elemento destacado</div>

<!-- Elementos secundarios -->
<div class="ank-bg-secondaryBackground">
  <p class="ank-color-secondaryText">Texto secundario</p>
  <h2 class="ank-color-secondaryTitle">Título secundario</h2>
</div>
```

## Beneficios

1. **Mejor Semántica**: Los nombres de colores reflejan su propósito específico
2. **Flexibilidad**: Sistema dual (primario/secundario) para mayor variedad
3. **Accesibilidad**: Colores optimizados para contraste en ambos temas
4. **Consistencia**: Mapeo claro entre colores TypeScript y clases CSS
5. **Mantenibilidad**: Estructura más intuitiva para desarrolladores

## Próximos Pasos

1. Verificar que todos los componentes usen las nuevas clases de color
2. Testear la funcionalidad del toggle de tema
3. Validar accesibilidad con herramientas de contraste
4. Documentar patrones de uso para futuros desarrolladores
