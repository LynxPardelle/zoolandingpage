# Development Guide 💻

This guide covers development standards, coding practices, and workflows for the Zoolandingpage project.

## 📏 Code Style & Standards

### TypeScript Guidelines

1. **Use Types Over Interfaces/Enums**

```typescript
// ✅ Preferred - Type definitions
type UserRole = 'admin' | 'user' | 'guest';
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

// ❌ Avoid - Interfaces and enums
interface UserRole { /* ... */ }
enum UserRole { /* ... */ }
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

1. **Standalone Components**

```typescript
@Component({
  selector: 'app-hero-section',
  imports: [CommonModule, GenericButtonComponent],
  template: `
    <section class="ank-minHeight-100vh ank-display-flex ank-alignItems-center">
      <div class="ank-textAlign-center">
        <h1 class="ank-fontSize-48px ank-fontWeight-bold">{{ title }}</h1>
        <app-generic-button 
          [text]="buttonText" 
          [type]="'primary'"
          (click)="onActionClick()">
        </app-generic-button>
      </div>
    </section>
  `,
  styles: [`
    /* Component-specific styles using SCSS */
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class HeroSectionComponent {
  title = 'Welcome to Zoolandingpage';
  buttonText = 'Get Started';
  
  onActionClick(): void {
    // Handle action
  }
}
```

### Service-Based Architecture

1. **Injectable Services with Proper Scoping**

```typescript
@Injectable({
  providedIn: 'root' // Singleton across app
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
  providedIn: 'root'
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
  "extends": [
    "@angular-eslint/recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
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
      providers: [
        { provide: AnalyticsService, useValue: analyticsSpy }
      ]
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
    expect(analyticsService.trackEvent).toHaveBeenCalledWith(
      jasmine.objectContaining({ type: 'hero_cta_click' })
    );
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
      providers: [AnalyticsService]
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
      data: { page: '/home' }
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

### Client-Side Only Usage

1. **Correct Implementation**

```typescript
@Component({
  selector: 'app-interactive-section',
  template: `...`
})
export class InteractiveSectionComponent implements AfterRender {
  constructor(private _ank: NGXAngoraService) {}
  
  ngAfterRender(): void {
    // ✅ Client-side only
    this.initializeStyles();
  }
  
  private initializeStyles(): void {
    this._ank.pushCombos({
      'interactiveCard': [
        'ank-transformHover-scaleSD1_05ED',
        'ank-transitionDuration-300ms',
        'ank-cursor-pointer'
      ]
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
  template: `...`
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
    loadComponent: () => import('./tutorial/tutorial.component').then(m => m.TutorialComponent)
  }
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
