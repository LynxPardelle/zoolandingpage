# Project Architecture 🏗

This document outlines the technical architecture and structure of the Zoolandingpage project.

## 📁 Project Structure

```
zoolandingpage/
├── docs/                          # Documentation
│   ├── README.md                  # Main project documentation
│   ├── 01-getting-started.md      # Setup and installation guide
│   ├── 02-architecture.md         # This file - architecture overview
│   ├── 03-development-guide.md    # Development guidelines and standards
│   ├── 04-ngx-angora-css.md      # NGX-Angora-CSS integration guide
│   ├── 05-analytics-tracking.md   # Analytics and tracking implementation
│   ├── 06-deployment.md           # Deployment strategies and configuration
│   └── ngx-angora-css-usage-guide.md  # Comprehensive NGX-Angora-CSS reference
├── plan/                          # Project planning and specifications
│   ├── project.idea.md           # Enhanced project specification
│   └── phase 1/                  # Phase-specific planning
├── public/                        # Static assets
├── src/
│   ├── app/
│   │   ├── core/                        # App shell, routing hosts, and core runtime services
│   │   │   ├── components/layout/
│   │   │   │   ├── app-shell/
│   │   │   │   │   └── app-shell.component.ts
│   │   │   │   └── debug-workspace/
│   │   │   │       └── debug-workspace.component.ts
│   │   │   └── services/
│   │   │       └── runtime.service.ts
│   │   ├── landing-page/                # Landing/page-specific presentational components
│   │   ├── shared/
│   │   │   ├── components/              # Generic renderable components and hosts
│   │   │   │   ├── wrapper-orchestrator/
│   │   │   │   ├── generic-modal/
│   │   │   │   └── generic-toast/
│   │   │   ├── services/                # Cross-cutting runtime services
│   │   │   │   ├── config-bootstrap.service.ts
│   │   │   │   ├── config-source.service.ts
│   │   │   │   ├── config-store.service.ts
│   │   │   │   ├── draft-runtime.service.ts
│   │   │   │   ├── draft-registry.service.ts
│   │   │   │   ├── seo-metadata.service.ts
│   │   │   │   ├── analytics.service.ts
│   │   │   │   └── angora-combos.service.ts
│   │   │   ├── utility/                 # Config DSL handlers, validation, and event forwarding
│   │   │   └── types/                   # Shared payload and runtime types
│   │   └── environments/                # Environment flags for dev/prod runtime selection
│   ├── assets/                          # Public assets and generated runtime files
│   └── styles/                          # Global styles and SCSS architecture
├── docker-compose.yml           # Multi-environment Docker configuration
├── Dockerfile                   # Multi-stage Docker build
├── Makefile                     # Build automation and development tools
├── nginx.conf                   # Production web server configuration
├── .env                         # Environment variables
└── .example.env                 # Environment template
```

## 🏗 Component Architecture

### Runtime Hierarchy

```
AppShellComponent (Root Host)
├── WrapperOrchestrator (main runtime rootIds)
├── GenericToastHost
├── GenericModalHost
│   └── WrapperOrchestrator (modalRootIds)
└── DebugWorkspaceComponent (development only)
  └── WrapperOrchestrator (debug/dev-only components)

WrapperOrchestrator
├── reads external components from ConfigurationsOrchestratorService
├── resolves valueInstructions / eventInstructions / conditions / loops
└── renders generic component trees defined in payloads
```

### Standalone Components Strategy

The project uses Angular standalone components for:

- **Better Tree Shaking**: Only import what you need
- **Simplified Module Structure**: Reduced boilerplate
- **Improved Testing**: Easier to isolate and test
- **Performance**: Lazy loading at component level

- Components stay in `src/app/core/components`, while shell-specific runtime services live in `src/app/core/services`.
- Generic `TGenericComponent` factory helpers live in `src/app/shared/utility/generic-component-builder.utility.ts`, while debug-workspace-specific panel builders stay beside the feature component.
- Cross-cutting runtime services live under `src/app/shared/services` so draft/API loading, metadata, analytics, i18n, and DSL execution remain reusable.
- Feature sections remain standalone, but the current production path is primarily config-driven rather than hard-wired by the shell.

## 🔧 Service Architecture

### Core Runtime Services

| Service                             | Responsibility                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ConfigSourceService`               | Selects the active payload source. Draft assets are used in development; API payloads are used when drafts are disabled.                                                              |
| `ConfigBootstrapService`            | Loads payloads in sequence, configures i18n, applies structured data, validates versions, and fills `ConfigStoreService`.                                                             |
| `ConfigStoreService`                | Signal-based store for loaded payloads, bootstrap stage, validation issues, and runtime readiness.                                                                                    |
| `RuntimeService`                    | Lives in `src/app/core/services`, owns the shell render roots (`rootComponentsIds`, `modalRootIds`), and applies the loaded component payload to `ConfigurationsOrchestratorService`. |
| `DraftRuntimeService`               | Resolves active draft context from URL/SSR request data and refreshes the development draft registry.                                                                                 |
| `DraftRegistryService`              | Lists available development drafts from `/api/debug/drafts`.                                                                                                                          |
| `SeoMetadataService`                | Applies title, description, Open Graph, Twitter, canonical, and `<html lang>` metadata from payloads.                                                                                 |
| `AnalyticsService`                  | Tracks events, handles consent, publishes debug streams, and manages page engagement observers.                                                                                       |
| `AngoraCombosService`               | Registers base combo classes and applies payload-provided combo definitions.                                                                                                          |
| `ConfigurationsOrchestratorService` | Stores the external component tree, exports draft payloads, and feeds `WrapperOrchestrator`.                                                                                          |

### Service Communication Pattern

```text
AppShellComponent
  -> RuntimeService.initialize()
  -> ConfigBootstrapService.load()
  -> ConfigSourceService (drafts or API)
  -> ConfigStoreService / VariableStoreService / StructuredDataService
  -> RuntimeService applies component payload to ConfigurationsOrchestratorService
  -> WrapperOrchestrator renders rootIds and modalRootIds

Development-only additions:
  -> DraftRuntimeService resolves preview context and polls DraftRegistryService
  -> DebugWorkspaceComponent renders draft/debug controls
```

## 🎨 Styling Architecture

### NGX-Angora-CSS Integration

```typescript
// Service integration pattern
export class AppComponent implements AfterRender {
  public theme: 'dark' | 'light' = 'light';
  public lightTheme = {
  'brand-primary': '#1a73e8',
  'brand-secondary': '#34a853',
  'brand-accent': '#fbbc04',
  'brand-dark': '#202124'
  };
  public darkTheme = {
  'brand-primary': '#e8731a',
  'brand-secondary': '#5334a8',
  'brand-accent': '#202124'
  'brand-dark': '#fbbc04',
  };
  constructor(private _ank: NGXAngoraService) {}

  ngAfterRender(): void {
    // Client-side only styling
    this.initializeAngora();
  }

  private initializeAngora(): void {
    // Custom brand colors
    this._ank.pushColors(lightTheme);

    // Reusable style combinations
    this._ank.pushCombos({
      'heroSection': [
        'ank-minHeight-100vh',
        'ank-display-flex',
        'ank-alignItems-center',
        'ank-justifyContent-center'
      ]
    });

    // Generate CSS
    this._ank.cssCreate();
  }

  public changeTheme(theme: 'dark' | 'light'): void {
    this.theme = theme;
    this._ank.pushColors(theme === 'light' ? this.lightTheme : this.darkTheme):
  }
}
```

## 📊 Data Flow Architecture

### Config Data Flow

```text
Environment Flag
  -> ConfigSourceService chooses draft assets or API
  -> ConfigBootstrapService loads page-config/components/variables/i18n/seo/structured-data/analytics
  -> ConfigStoreService captures validated payloads
  -> RuntimeService applies roots + external component payload
  -> WrapperOrchestrator renders the configured page
```

### Analytics Data Flow

```text
User Interaction
  -> Component or DSL event handler
  -> AppShellComponent.handleAnalyticsEvent()
  -> AnalyticsService.track(...)
  -> optional consent workflow / buffered event queue / server send
  -> debug stream available to DebugWorkspaceComponent
```

## 🔄 Application Lifecycle

### Initialization Sequence

1. **Bootstrap**: Angular starts the standalone shell with SSR-safe providers.
2. **Draft Context**: `DraftRuntimeService` resolves `draftDomain` and `draftPageId` when drafts are enabled.
3. **Config Load**: `RuntimeService` triggers `ConfigBootstrapService` to load the current page payload set.
4. **State Fill**: `ConfigStoreService`, `VariableStoreService`, and i18n caches are populated.
5. **Render Roots**: `RuntimeService` applies root IDs and external components to the orchestrator.
6. **Styling and Tracking**: Angora CSS regenerates, metadata is applied, and page engagement observers start.

### Runtime Operations

- **Route Changes**: `AppShellComponent` tracks `page_view` on `NavigationEnd`.
- **Language Changes**: `SeoMetadataService` reapplies metadata from the active SEO payload.
- **Draft Refreshes**: development draft list refreshes through `DraftRuntimeService` and `DraftRegistryService`.
- **Payload-driven Rendering**: `WrapperOrchestrator` re-evaluates value/event/condition DSL instructions against the active stores.
- **Styling Updates**: NGX-Angora regenerates classes after render and after combo updates.

## 🔧 Build Architecture

### Multi-Stage Docker Build

```dockerfile
# Development stage
FROM node:18-alpine AS development
# Hot-reload development environment

# Build stage
FROM node:18-alpine AS build
# Production build with optimizations

# SSR Production stage
FROM node:18-alpine AS production
# Server-side rendering with Express

# Static Production stage
FROM nginx:alpine AS production-static
# Static files with Nginx
```

### Build Optimization Strategies

- **Tree Shaking**: Remove unused code
- **Code Splitting**: Lazy load route components
- **Bundle Analysis**: Monitor bundle size
- **Image Optimization**: WebP/AVIF format support
- **Caching**: Aggressive caching for static assets

## 🔒 Security Architecture

### Client-Side Security

- **Content Security Policy**: Prevent XSS attacks
- **Input Sanitization**: Clean user inputs
- **HTTPS Enforcement**: Secure data transmission
- **Error Handling**: Prevent information leakage

### Container Security

- **Non-root User**: Container runs as non-privileged user
- **Minimal Image**: Alpine Linux base for smaller attack surface
- **Security Scanning**: Automated vulnerability checking
- **Network Isolation**: Container network segregation

## 📈 Performance Architecture

### Optimization Strategies

- **Server-Side Rendering**: Faster initial page load
- **Progressive Web App**: Offline functionality
- **Lazy Loading**: Load components on demand
- **Image Lazy Loading**: Load images as needed
- **Caching Strategy**: Multi-level caching approach

### Monitoring Points

- **Core Web Vitals**: LCP, FID, CLS tracking
- **Bundle Size**: Monitor JavaScript payload
- **Network Requests**: Track API call performance
- **Memory Usage**: Monitor client-side memory
- **Error Rates**: Track and alert on errors

## 🔮 Scalability Considerations

### Horizontal Scaling

- **Containerized Deployment**: Easy scaling with orchestration
- **Stateless Design**: No server-side session storage
- **CDN Integration**: Global content distribution
- **Microservices Ready**: Modular service architecture

### Vertical Scaling

- **Memory Optimization**: Efficient bundle sizes
- **CPU Optimization**: Minimal computational overhead
- **Storage Optimization**: Compressed assets
- **Network Optimization**: Minimal request overhead

This architecture provides a solid foundation for building a high-performance, scalable, and maintainable landing page application that showcases modern web development practices.

## Application Shell and Routing

The standalone shell is intentionally thin. `AppShellComponent` owns top-level hosts, route analytics wiring, Angora regeneration, and forwarding child analytics events. It does not own draft selection UI, metadata rules, or payload-to-root mapping anymore.

Current ownership boundaries:

- Shell host: `src/app/core/components/layout/app-shell/app-shell.component.ts`
- Shell runtime store: `src/app/core/services/runtime.service.ts`
- Dev-only draft/debug workspace: `src/app/core/components/layout/debug-workspace/debug-workspace.component.ts`
- Draft preview context: `src/app/shared/services/draft-runtime.service.ts`
- Metadata application: `src/app/shared/services/seo-metadata.service.ts`
- Payload orchestration: `src/app/shared/services/config-bootstrap.service.ts`

Routing remains configured with scroll restoration and anchor scrolling. The shell keeps the accessibility contract intact: skip link, `main#main-content`, header/banner, and primary navigation landmarks remain covered by focused tests.
