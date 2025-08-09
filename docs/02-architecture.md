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
│   │   ├── components/           # Feature components
│   │   │   ├── header/
│   │   │   ├── hero/
│   │   │   ├── education-section/
│   │   │   ├── interactive-tutorial/
│   │   │   ├── social-proof/
│   │   │   ├── cta/
│   │   │   └── footer/
│   │   ├── shared/              # Shared module
│   │   │   ├── components/      # Reusable UI components
│   │   │   │   ├── generic-button/
│   │   │   │   ├── generic-modal/
│   │   │   │   └── generic-form/
│   │   │   ├── services/        # Utility services
│   │   │   ├── directives/      # Custom directives
│   │   │   └── pipes/           # Custom pipes
│   │   ├── services/            # Core application services
│   │   │   ├── analytics.service.ts
│   │   │   ├── websocket.service.ts
│   │   │   ├── translation.service.ts
│   │   │   ├── seo.service.ts
│   │   │   └── performance.service.ts
│   │   └── types/               # TypeScript type definitions
│   ├── assets/                  # Application assets
│   │   ├── images/
│   │   ├── icons/
│   │   └── data/
│   ├── environments/            # Environment configurations
│   └── styles/                  # Global styles and SCSS architecture
├── docker-compose.yml           # Multi-environment Docker configuration
├── Dockerfile                   # Multi-stage Docker build
├── Makefile                     # Build automation and development tools
├── nginx.conf                   # Production web server configuration
├── .env                         # Environment variables
└── .example.env                 # Environment template
```

## 🏗 Component Architecture

### Component Hierarchy

```
AppComponent (Root)
├── HeaderComponent
│   ├── NavigationComponent
│   └── LanguageSwitcherComponent
├── HeroComponent
│   ├── InteractiveAnimationComponent
│   └── CTAButtonComponent
├── EducationSectionComponent
│   ├── LandingPageInfoComponent
│   ├── DataAnalyticsComponent
│   ├── CloudSecurityComponent
│   └── AIIntegrationComponent
├── InteractiveTutorialComponent
│   ├── SketchAnimationComponent
│   ├── WireframeBuilderComponent
│   └── ProgressTrackerComponent
├── SocialProofComponent
│   ├── TestimonialsComponent
│   ├── CaseStudiesComponent
│   └── ConversionMetricsComponent
├── CTAComponent
│   ├── WhatsAppButtonComponent
│   └── LeadCaptureFormComponent
└── FooterComponent
    ├── ContactInfoComponent
    └── SocialLinksComponent
```

### Standalone Components Strategy

The project uses Angular standalone components for:

- **Better Tree Shaking**: Only import what you need
- **Simplified Module Structure**: Reduced boilerplate
- **Improved Testing**: Easier to isolate and test
- **Performance**: Lazy loading at component level

```typescript
// Example standalone component
@Component({
  selector: 'app-hero',
  imports: [CommonModule, GenericButtonComponent],
  template: `...`,
  styles: [`...`],
})
export class HeroComponent {
  // Component logic
}
```

## 🔧 Service Architecture

### Core Services

```typescript
// Core application services structure
type ServiceArchitecture {
  // User behavior and analytics
  AnalyticsService: {
    trackEvent(event: AnalyticsEvent): void;
    getSessionData(): SessionData;
    generateReport(): AnalyticsReport;
  };

  // Real-time communication
  WebSocketService: {
    connect(url: string): Observable<any>;
    send(channel: string, data: any): void;
    subscribe(channel: string): Observable<any>;
  };

  // Multi-language support
  TranslationService: {
    setLanguage(lang: 'es' | 'en'): void;
    translate(key: string): string;
    getAvailableLanguages(): Language[];
  };

  // SEO and metadata management
  SEOService: {
    updateMetaTags(data: MetaData): void;
    generateStructuredData(): StructuredData;
    updateCanonicalUrl(url: string): void;
  };

  // Performance monitoring
  PerformanceService: {
    measureCoreWebVitals(): WebVitals;
    trackLoadTimes(): LoadMetrics;
    reportPerformanceIssues(): void;
  };
}
```

### Service Communication Pattern

```typescript
// Reactive service communication using RxJS
@Injectable({
  providedIn: 'root',
})
export class StateManagementExample {
  private state$ = new BehaviorSubject(initialState);

  // Observable state for components to subscribe
  public readonly state = this.state$.asObservable();

  // Actions to update state
  updateState(newState: Partial<State>): void {
    this.state$.next({ ...this.state$.value, ...newState });
  }
}
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

### Analytics Data Flow

```typescript
// Analytics event flow
User Interaction
  → Component Event Handler
  → AnalyticsService.trackEvent()
  → WebSocketService.send()
  → Analytics Server
  → Real-time Dashboard
```

### State Management Flow

```typescript
// Reactive state management pattern
Component Action
  → Service Method
  → State Update (BehaviorSubject)
  → Observable Emission
  → Component State Update
  → UI Re-render
```

## 🔄 Application Lifecycle

### Initialization Sequence

1. **Bootstrap**: App module loads with SSR configuration
2. **Services**: Core services initialize (Analytics, WebSocket, Translation)
3. **NGX-Angora**: Client-side styling system initializes
4. **Components**: Standalone components load lazily
5. **Analytics**: User session tracking begins
6. **Real-time**: WebSocket connections establish

### Runtime Operations

- **Route Changes**: SEO service updates meta tags
- **User Interactions**: Analytics service tracks events
- **Language Switch**: Translation service updates content
- **Responsive Changes**: NGX-Angora handles styling updates
- **Performance**: Background monitoring of Core Web Vitals

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
