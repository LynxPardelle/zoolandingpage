# Development Guide 💻

This guide covers development standards, coding practices, and workflows for the Zoolandingpage project.

## 📏 Code Style & Standards

### MANDATORY Development Rules

1. **ABSOLUTE REQUIREMENT: Use HTML Template Files Only**

```typescript
// ✅ REQUIRED - Always use templateUrl
@Component({
  selector: 'app-hero-section',
  templateUrl: './hero-section.component.html', // MANDATORY
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroSectionComponent {
  // Component logic
}

// ❌ FORBIDDEN - Inline templates are not allowed
@Component({
  selector: 'app-hero-section',
  template: `<div>...</div>`, // NEVER USE
})
```

2. **ABSOLUTE REQUIREMENT: Complete Type Safety**

```typescript
// ✅ REQUIRED - Type everything, including function variables
function processUserData(userData: UserData): ProcessedUser {
  const isValid: boolean = validateUser(userData);
  const errors: string[] = [];
  const processedAt: Date = new Date();

  try {
    const result: ProcessedUser = transformUser(userData);
    return result;
  } catch (error: unknown) {
    const errorMessage: string = error instanceof Error ? error.message : 'Unknown error';
    console.error('Processing failed:', errorMessage);
    throw new Error(`User processing failed: ${errorMessage}`);
  }
}

// ✅ REQUIRED - Type all method parameters and variables
private validateFormData(formData: FormData): ValidationResult {
  const errors: Record<string, string> = {};
  const isEmailValid: boolean = /\S+@\S+\.\S+/.test(formData.email);
  const isNameValid: boolean = formData.name.length > 2;

  if (!isEmailValid) {
    errors.email = 'Invalid email format';
  }

  if (!isNameValid) {
    errors.name = 'Name must be at least 3 characters';
  }

  const hasErrors: boolean = Object.keys(errors).length > 0;

  return {
    isValid: !hasErrors,
    errors,
    timestamp: Date.now()
  };
}
```

3. **ABSOLUTE REQUIREMENT: Environment Variables Integration**

```typescript
// ✅ REQUIRED - Use environment for all configuration
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly baseUrl: string = environment.apiUrl;
  private readonly apiVersion: string = environment.apiVersion;

  constructor(private http: HttpClient) {}

  private getStorageKey(key: string): string {
    return environment.localStorage.userPreferencesKey + '_' + key;
  }
}

// ✅ REQUIRED - Environment configuration structure
export const environment = {
  production: boolean,
  apiUrl: string,
  localStorage: {
    themeKey: string,
    languageKey: string,
    userPreferencesKey: string,
  },
  features: {
    analytics: boolean,
    debugMode: boolean,
  },
} as const;
```

4. **ABSOLUTE REQUIREMENT: Correct ngx-angora-css Methods**

```typescript
// ✅ REQUIRED - Use pushColors for adding colors
this._ank.pushColors({
  primary: '#ffffff',
  secondary: '#f8fafc',
  accent: '#2563eb',
});
```

### TypeScript Guidelines

1. **MANDATORY: Use Types Over Interfaces/Enums**

```typescript
// ✅ REQUIRED - Type definitions only
type UserRole = 'admin' | 'user' | 'guest';
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

type ComponentProps = {
  title: string;
  subtitle?: string;
  variant: 'primary' | 'secondary';
};

type FormState = {
  isValid: boolean;
  errors: Record<string, string>;
  isSubmitting: boolean;
};

// ❌ FORBIDDEN - Interfaces and enums are not allowed
interface UserRole {
  /* NEVER USE */
}
enum UserRole /* NEVER USE */ {}
interface ComponentProps {
  /* NEVER USE */
}
```

2. **Strict Mode Configuration**

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noImplicitOverride": true,
    "noUncheckedIndexedAccess": true
  }
}
```

3. **Error Handling with Try-Catch and Async/Await**

```typescript
// ✅ Comprehensive error handling
async function fetchUserData(userId: string): Promise<User | null> {
  try {
    const response = await this.http.get<ApiResponse<User>>(`/api/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    this.errorService.handleError(error);
    return null;
  }
}

// ✅ Component error handling
@Component({...})
export class UserComponent {
  async loadUser(id: string): Promise<void> {
    try {
      this.loading = true;
      this.user = await this.userService.fetchUserData(id);
    } catch (error) {
      this.errorMessage = 'Failed to load user data';
      console.error('Component error:', error);
    } finally {
      this.loading = false;
    }
  }
}
```

### Component Architecture Standards

1. **MANDATORY: Standalone Components with ngx-angora-css Integration**

```typescript
@Component({
  selector: 'app-hero-section',
  imports: [CommonModule, GenericButtonComponent],
  template: `
    <section class="ank-minHeight-100vh ank-display-flex ank-alignItems-center">
      <div class="ank-textAlign-center">
        <h1 class="ank-fontSize-48px ank-fontWeight-bold">{{ title }}</h1>
        <app-generic-button [text]="buttonText" [type]="'primary'" (click)="onActionClick()"> </app-generic-button>
      </div>
    </section>
  `,
  styles: [
    `
      /* Minimal component-specific styles (only animations and/or something that ngx-angora-css can not do) - Most styling via ngx-angora-css */
    `,
  ],
})
export class HeroSectionComponent implements AfterRender {
  title = 'Welcome to Zoolandingpage';
  buttonText = 'Get Started';

  constructor(private _ank: NGXAngoraService) {}

  ngAfterRender(): void {
    this.setupThemeColors();
    this._ank.cssCreate();
  }

  private setupThemeColors(): void {
    // MANDATORY: Use pushColors for dynamic theme changes
    this._ank.pushColors({
      heroBg: '#ffffff',
      heroText: '#333333',
      heroAccent: '#1a73e8',
    });
  }

  onActionClick(): void {
    // Handle action
  }
}
```

1. **MANDATORY: Atomic File Structure (Keep Files Small)**

Each component should be split into minimal, focused files:

```text
hero-section/
├── hero-section.component.ts (max 50-80 lines)
├── hero-section.types.ts (type definitions only)
├── hero-section.styles.ts (only animations and/or something that ngx-angora-css can not do)
└── index.ts (barrel export)
```

```typescript
// hero-section.types.ts - REQUIRED: Separate type definitions
export type HeroSectionProps = {
  title: string;
  subtitle?: string;
  buttonText: string;
  variant: 'default' | 'minimal' | 'animated';
};

export type HeroTheme = {
  background: string;
  textColor: string;
  accentColor: string;
};

// hero-section.styles.ts - REQUIRED: Separate style configurations
export const HERO_COLORS: Record<string, string> = {
  'hero-bg-light': '#ffffff',
  'hero-bg-dark': '#1a1a1a',
  'hero-text-light': '#333333',
  'hero-text-dark': '#ffffff',
  'hero-accent': '#1a73e8',
};

export const HERO_COMBOS: Record<string, string[]> = {
  heroContainer: [
    'ank-minHeight-100vh',
    'ank-display-flex',
    'ank-alignItems-center',
    'ank-justifyContent-center',
    'ank-p-20px',
  ],
  heroContent: ['ank-textAlign-center', 'ank-maxWidth-800px'],
};
```

### Service-Based Architecture

1. **Injectable Services with Proper Scoping**

```typescript
@Injectable({
  providedIn: 'root', // Singleton across app
})
export class AnalyticsService {
  private events$ = new Subject<AnalyticsEvent>();

  trackEvent(event: AnalyticsEvent): void {
    try {
      this.events$.next(event);
      this.sendToServer(event);
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  private async sendToServer(event: AnalyticsEvent): Promise<void> {
    // Implementation
  }
}
```

2. **Feature-Specific Services**

```typescript
@Injectable({
  providedIn: 'root',
})
export class TutorialService {
  private progress = new BehaviorSubject<TutorialProgress>({ step: 0, completed: false });

  readonly progress$ = this.progress.asObservable();

  nextStep(): void {
    const current = this.progress.value;
    this.progress.next({ ...current, step: current.step + 1 });
  }

  markCompleted(): void {
    this.progress.next({ ...this.progress.value, completed: true });
  }
}
```

## 🔄 Development Workflow

### Git Workflow & Commit Convention

1. **Branch Naming Convention**

```bash
# Feature branches
feature/hero-section-animations
feature/websocket-analytics
feature/spanish-translation

# Bug fixes
fix/header-responsive-layout
fix/analytics-data-validation

# Documentation
docs/api-reference-update
docs/deployment-guide

# Refactoring
refactor/service-architecture
refactor/component-optimization
```

2. **Conventional Commits**

```bash
# Format: type(scope): description
feat(hero): add interactive animations with sketch-style effects
fix(analytics): resolve websocket connection timeout issues
docs(readme): update installation instructions for Docker
style(header): improve responsive navigation layout
refactor(services): optimize analytics service performance
test(components): add unit tests for hero section
chore(deps): update Angular to version 20.1.0

# Breaking changes
feat(api)!: redesign analytics service interface
```

3. **Pull Request Process**

```markdown
## Pull Request Template

### Description

Brief description of changes made

### Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

### Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Responsive design tested

### Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] NGX-Angora-CSS client-side only usage verified
```

### Development Environment Setup

1. **Pre-commit Hooks with Husky**

```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,js}": ["eslint --fix", "prettier --write"],
    "*.{html,scss,css}": ["prettier --write"]
  }
}
```

2. **ESLint Configuration**

```json
// .eslintrc.json
{
  "extends": ["@angular-eslint/recommended", "@typescript-eslint/recommended", "prettier"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/prefer-readonly": "error",
    "@angular-eslint/component-class-suffix": "error",
    "@angular-eslint/directive-class-suffix": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

3. **Prettier Configuration**

```json
// .prettierrc
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

## 🧪 Testing Strategy

### Unit Testing with Jasmine & Karma

1. **Component Testing**

```typescript
// hero-section.component.spec.ts
describe('HeroSectionComponent', () => {
  let component: HeroSectionComponent;
  let fixture: ComponentFixture<HeroSectionComponent>;
  let analyticsService: jasmine.SpyObj<AnalyticsService>;

  beforeEach(async () => {
    const analyticsSpy = jasmine.createSpyObj('AnalyticsService', ['trackEvent']);

    await TestBed.configureTestingModule({
      imports: [HeroSectionComponent],
      providers: [{ provide: AnalyticsService, useValue: analyticsSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroSectionComponent);
    component = fixture.componentInstance;
    analyticsService = TestBed.inject(AnalyticsService) as jasmine.SpyObj<AnalyticsService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should track analytics event on action click', () => {
    component.onActionClick();
    expect(analyticsService.trackEvent).toHaveBeenCalledWith(jasmine.objectContaining({ type: 'hero_cta_click' }));
  });
});
```

2. **Service Testing**

```typescript
// analytics.service.spec.ts
describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AnalyticsService],
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should track events successfully', () => {
    const mockEvent: AnalyticsEvent = {
      type: 'page_view',
      timestamp: Date.now(),
      data: { page: '/home' },
    };

    service.trackEvent(mockEvent);

    const req = httpMock.expectOne('/api/analytics');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockEvent);
    req.flush({ success: true });
  });
});
```

### Integration Testing

1. **E2E Testing Strategy**

```typescript
// cypress/integration/landing-page.spec.ts
describe('Landing Page Flow', () => {
  it('should complete tutorial and submit lead form', () => {
    cy.visit('/');

    // Test hero section
    cy.get('[data-cy=hero-title]').should('be.visible');
    cy.get('[data-cy=hero-cta]').click();

    // Test tutorial interaction
    cy.get('[data-cy=tutorial-section]').scrollIntoView();
    cy.get('[data-cy=tutorial-step-1]').click();
    cy.get('[data-cy=tutorial-progress]').should('contain', '1/4');

    // Test form submission
    cy.get('[data-cy=lead-form]').scrollIntoView();
    cy.get('[data-cy=email-input]').type('test@example.com');
    cy.get('[data-cy=message-input]').type('Test message');
    cy.get('[data-cy=submit-button]').click();

    // Verify success
    cy.get('[data-cy=success-message]').should('be.visible');
  });
});
```

## 🎨 NGX-Angora-CSS Development Guidelines

1. **REQUIRED: Dynamic Theme Support**

All themes must be implemented using the `pushColors` method for dynamic theme switching:

```typescript
@Component({
  selector: 'app-themed-component',
  template: `
    <div class="ank-bg-primary ank-color-text ank-p-20px">
      <h2 class="ank-color-accent">Themed Content</h2>
      <button class="ank-bg-accent ank-color-primary ank-p-12px_24px ank-borderRadius-8px" (click)="toggleTheme()">
        Toggle Theme
      </button>
    </div>
  `,
})
export class ThemedComponent implements AfterRender {
  private currentTheme = signal<'light' | 'dark'>('light');

  constructor(private _ank: NGXAngoraService) {}

  ngAfterRender(): void {
    this.applyTheme();
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.currentTheme.set(newTheme);
    this.applyTheme();
  }

  // MANDATORY: Use pushColors for all theme changes
  private applyTheme(): void {
    const theme = this.currentTheme();

    if (theme === 'light') {
      this._ank.pushColors({
        primary: '#ffffff',
        text: '#333333',
        accent: '#1a73e8',
        secondary: '#f5f5f5',
      });
    } else {
      this._ank.pushColors({
        primary: '#1a1a1a',
        text: '#ffffff',
        accent: '#4285f4',
        secondary: '#2d2d2d',
      });
    }

    this._ank.cssCreate();
  }
}
```

1. **MANDATORY: Global Theme Service**

Create a centralized theme service using pushColors:

```typescript
@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private currentTheme = signal<'light' | 'dark' | 'auto'>('light');
  private prefersDark = signal(false);

  readonly theme$ = computed(() => {
    const theme = this.currentTheme();
    if (theme === 'auto') {
      return this.prefersDark() ? 'dark' : 'light';
    }
    return theme;
  });

  constructor(private _ank: NGXAngoraService) {
    this.detectSystemPreference();

    // Apply theme whenever it changes
    effect(() => {
      this.applyGlobalTheme(this.theme$());
    });
  }

  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.currentTheme.set(theme);
    localStorage.setItem('theme-preference', theme);
  }

  // REQUIRED: All theme changes must use pushColors
  private applyGlobalTheme(theme: 'light' | 'dark'): void {
    const colors = theme === 'light' ? LIGHT_THEME_COLORS : DARK_THEME_COLORS;

    // Push all theme colors at once for better performance
    this._ank.pushColors(colors);
    this._ank.cssCreate();
  }

  private detectSystemPreference(): void {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.prefersDark.set(mediaQuery.matches);

      mediaQuery.addEventListener('change', e => {
        this.prefersDark.set(e.matches);
      });
    }
  }
}

// REQUIRED: Define theme color constants
const LIGHT_THEME_COLORS: Record<string, string> = {
  bg: '#ffffff',
  text: '#333333',
  accent: '#1a73e8',
  secondary: '#f5f5f5',
  border: '#e0e0e0',
  shadow: 'rgba(0, 0, 0, 0.1)',
};

const DARK_THEME_COLORS: Record<string, string> = {
  bg: '#1a1a1a',
  text: '#ffffff',
  accent: '#4285f4',
  secondary: '#2d2d2d',
  border: '#404040',
  shadow: 'rgba(255, 255, 255, 0.1)',
};
```

### Client-Side Only Usage

1. **Correct Implementation**

```typescript
@Component({
  selector: 'app-interactive-section',
  template: `...`,
})
export class InteractiveSectionComponent implements AfterRender {
  constructor(private _ank: NGXAngoraService) {}

  ngAfterRender(): void {
    // ✅ Client-side only
    this.initializeStyles();
  }

  private initializeStyles(): void {
    this._ank.pushCombos({
      interactiveCard: ['ank-transformHover-scaleSD1_05ED', 'ank-transitionDuration-300ms', 'ank-cursor-pointer'],
    });

    this._ank.cssCreate();
  }
}
```

2. **SSR Compatibility**

```typescript
@Component({...})
export class SSRCompatibleComponent implements AfterRender {
  private isClient = false;

  constructor(
    private _ank: NGXAngoraService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isClient = isPlatformBrowser(this.platformId);
  }

  ngAfterRender(): void {
    if (this.isClient) {
      this._ank.cssCreate();
    }
  }
}
```

### Performance Best Practices

1. **Efficient Style Management**

```typescript
// ✅ Batch style operations
ngAfterRender(): void {
  this._ank.pushColors({
    'primary': '#1a73e8',
    'secondary': '#34a853',
    'accent': '#fbbc04'
  });

  this._ank.pushCombos({
    'card': ['ank-p-20px', 'ank-borderRadius-8px'],
    'button': ['ank-p-10px_20px', 'ank-cursor-pointer']
  });

  // Single CSS generation call
  this._ank.cssCreate();
}

// ❌ Avoid multiple CSS generation calls
ngAfterRender(): void {
  this._ank.pushColors({ 'primary': '#1a73e8' });
  this._ank.cssCreate(); // Don't do this

  this._ank.pushCombos({ 'card': ['ank-p-20px'] });
  this._ank.cssCreate(); // Don't do this either
}
```

## 📊 Performance Guidelines

### Component Optimization

1. **OnPush Change Detection**

```typescript
@Component({
  selector: 'app-optimized-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
})
export class OptimizedComponent {
  @Input() data: any;

  constructor(private cdr: ChangeDetectorRef) {}

  updateData(newData: any): void {
    this.data = newData;
    this.cdr.markForCheck(); // Manual change detection
  }
}
```

2. **Lazy Loading**

```typescript
// Route configuration with lazy loading
const routes: Routes = [
  {
    path: 'tutorial',
    loadComponent: () => import('./tutorial/tutorial.component').then(m => m.TutorialComponent),
  },
];
```

### Bundle Optimization

1. **Tree Shaking**

```typescript
// ✅ Import only what you need
import { map, filter } from 'rxjs/operators';

// ❌ Avoid importing entire libraries
import * as rxjs from 'rxjs';
```

2. **Dynamic Imports**

```typescript
// Dynamic feature loading
async loadAdvancedFeature(): Promise<void> {
  const { AdvancedFeatureComponent } = await import('./advanced-feature.component');
  // Use component
}
```

## 🔒 Security Guidelines

### Input Sanitization

```typescript
import { DomSanitizer } from '@angular/platform-browser';

@Component({...})
export class SafeComponent {
  constructor(private sanitizer: DomSanitizer) {}

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
  }
}
```

### XSS Prevention

```typescript
// ✅ Safe property binding
<div [textContent]="userInput"></div>

// ❌ Dangerous innerHTML
<div [innerHTML]="userInput"></div>
```

This development guide ensures consistent, maintainable, and high-quality code across the Zoolandingpage project. Follow these guidelines to maintain code quality and project standards.
