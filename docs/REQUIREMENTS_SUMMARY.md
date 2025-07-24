# Zoolandingpage Development Requirements Summary 📋

This document provides a quick reference for all mandatory requirements when developing the Zoolandingpage project.

## 🚨 CRITICAL REQUIREMENTS (Non-Negotiable)

### 1. Type System Requirements

**MANDATORY**: Use `type` only - NO interfaces or enums allowed

```typescript
// ✅ REQUIRED
type UserRole = 'admin' | 'user' | 'guest';
type ComponentProps = {
  title: string;
  variant: 'primary' | 'secondary';
};

// ❌ FORBIDDEN
interface UserRole { } // NOT ALLOWED
enum UserRole { } // NOT ALLOWED
```

### 2. Theme Management Requirements

**MANDATORY**: Use ngx-angora-css `pushColor` method for ALL theme changes

```typescript
// ✅ REQUIRED - All components must implement this pattern
@Component({ standalone: true })
export class ThemeAwareComponent implements AfterRender {
  constructor(private _ank: NGXAngoraService) {}
  
  ngAfterRender(): void {
    this._ank.pushColor('component-bg', '#ffffff');
    this._ank.pushColor('component-text', '#333333');
    this._ank.cssCreate();
  }
}

// ❌ FORBIDDEN - Hardcoded colors
.component { 
  background: #ffffff; /* NOT ALLOWED */
}
```

### 3. File Atomicity Requirements

**MANDATORY**: Maximum 50-80 lines per file, split functionality

```text
✅ REQUIRED Structure:
component/
├── component.component.ts (max 80 lines)
├── component.types.ts
├── component.styles.ts
├── component.constants.ts
└── index.ts

❌ FORBIDDEN: Single large files over 80 lines
```

### 4. Angular Latest Features Requirements

**MANDATORY**: Use Angular 17-20 features exclusively

```typescript
// ✅ REQUIRED - New control flow
@Component({
  standalone: true, // MANDATORY
  template: `
    @if (condition) {
      <div>Content</div>
    }
    
    @for (item of items(); track item.id) {
      <div>{{ item.name }}</div>
    } @empty {
      <div>No items</div>
    }
    
    @defer (on viewport) {
      <app-heavy-component />
    } @placeholder {
      <div>Loading...</div>
    } @error {
      <div>Error occurred</div>
    }
  `
})

// ❌ FORBIDDEN - Old patterns
*ngIf, *ngFor, *ngSwitch // NOT ALLOWED
```

## 📐 Component Architecture Standards

### Standalone Components (REQUIRED)

```typescript
@Component({
  selector: 'app-component',
  imports: [CommonModule], // Explicit imports required
  template: `...`,
  changeDetection: ChangeDetectionStrategy.OnPush // Recommended
})
export class Component implements AfterRender {
  // Use signals for state
  state = signal<ComponentState>({});
  
  // Use computed for derived state
  derivedState = computed(() => this.state().someProperty);
  
  // AfterRender for ngx-angora-css
  ngAfterRender(): void {
    this.setupStyles();
  }
}
```

### Signal-Based State Management (REQUIRED)

```typescript
// ✅ REQUIRED - Signal-based reactivity
export class SignalComponent {
  count = signal(0);
  doubled = computed(() => this.count() * 2);
  
  constructor() {
    effect(() => {
      console.log('Count changed:', this.count());
    });
  }
  
  increment(): void {
    this.count.update(c => c + 1);
  }
}

// ❌ FORBIDDEN - Traditional reactive patterns
@Component({})
export class OldComponent {
  count$ = new BehaviorSubject(0); // NOT ALLOWED
}
```

## 🎨 NGX-Angora-CSS Standards

### Theme Service Implementation (REQUIRED)

```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private theme = signal<'light' | 'dark'>('light');
  
  constructor(private _ank: NGXAngoraService) {
    effect(() => this.applyTheme());
  }
  
  setTheme(theme: 'light' | 'dark'): void {
    this.theme.set(theme);
  }
  
  private applyTheme(): void {
    const colors = this.theme() === 'light' 
      ? LIGHT_THEME_COLORS 
      : DARK_THEME_COLORS;
    
    this._ank.pushColors(colors); // REQUIRED method
    this._ank.cssCreate();
  }
}

const LIGHT_THEME_COLORS: Record<string, string> = {
  'global-bg': '#ffffff',
  'global-text': '#333333',
  'global-accent': '#1a73e8'
};
```

### Generic Style Integration (REQUIRED)

```typescript
// component.styles.ts
export const COLORS: Record<string, string> = {
  'primary': '#1a73e8',
  'secondary': '#34a853'
};

export const COMBOS: Record<string, string[]> = {
  'cardStyle': [
    'ank-p-20px',
    'ank-borderRadius-8px',
    'ank-bg-component-primary',
    'ank-color-white'
  ]
};

// component.component.ts
ngAfterRender(): void {
  this._ank.pushColors(COLORS);
  this._ank.pushCombos(COMBOS);
  this._ank.cssCreate();
}
```

## 🧪 Testing Requirements

### Unit Testing Standards (REQUIRED)

```typescript
describe('Component', () => {
  let component: Component;
  let angoraService: jasmine.SpyObj<NGXAngoraService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('NGXAngoraService', ['pushColor', 'cssCreate']);
    
    await TestBed.configureTestingModule({
      imports: [Component],
      providers: [{ provide: NGXAngoraService, useValue: spy }]
    }).compileComponents();

    angoraService = TestBed.inject(NGXAngoraService) as jasmine.SpyObj<NGXAngoraService>;
  });

  it('should apply theme colors on render', () => {
    component.ngAfterRender();
    expect(angoraService.pushColor).toHaveBeenCalled();
    expect(angoraService.cssCreate).toHaveBeenCalled();
  });
});
```

### E2E Testing Requirements

```typescript
// cypress/e2e/theme-switching.cy.ts
describe('Theme Switching', () => {
  it('should switch themes dynamically', () => {
    cy.visit('/');
    cy.get('[data-cy=theme-toggle]').click();
    cy.get('body').should('have.class', 'dark-theme');
  });
});
```

## 📁 Project Structure Standards

### Directory Organization (ENFORCED)

```text
src/app/
├── core/
│   ├── components/
│   ├── services/
│   └── types/
├── shared/
│   ├── components/
│   │   ├── button/
│   │   │   ├── button.component.ts
│   │   │   ├── button.types.ts
│   │   │   ├── button.styles.ts
│   │   │   └── index.ts
│   │   └── ...
│   ├── types/
│   └── services/
├── features/
│   ├── hero/
│   ├── tutorial/
│   └── contact/
└── pages/
    ├── home/
    └── ...
```

## 🔍 Code Quality Standards

### ESLint Configuration (REQUIRED)

```json
{
  "rules": {
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/no-empty-interface": "error",
    "@typescript-eslint/ban-types": "error",
    "@angular-eslint/prefer-standalone-component": "error",
    "max-lines": ["error", { "max": 80 }]
  }
}
```

### Performance Standards (REQUIRED)

- OnPush change detection where possible
- Lazy loading with `@defer` for non-critical content
- Signal-based reactivity for optimal performance
- Bundle size monitoring (components < 50KB each)
- Core Web Vitals compliance (90+ Lighthouse scores)

## 🚫 Forbidden Patterns

### NEVER Use These:

1. **Type System Violations**
   ```typescript
   interface SomeInterface { } // FORBIDDEN
   enum SomeEnum { } // FORBIDDEN
   ```

1. **Hardcoded Styles**
   ```css
   .component {
     background: #ffffff; /* FORBIDDEN */
     color: #333333; /* FORBIDDEN */
   }
   ```

1. **Old Angular Patterns**
   ```html
   <div *ngIf="condition"> <!-- FORBIDDEN -->
   <div *ngFor="let item of items"> <!-- FORBIDDEN -->
   ```

1. **Large Files**
   ```typescript
   // Any file over 80 lines is FORBIDDEN
   ```

## ✅ Quick Validation Checklist

Before submitting any code, verify:

- [ ] All types use `type` keyword (zero interfaces/enums)
- [ ] All components use `pushColor` for themes
- [ ] All files under 80 lines
- [ ] All components standalone
- [ ] Use `@if`, `@for`, `@switch`, `@defer`
- [ ] Signal-based state management
- [ ] 90%+ test coverage
- [ ] No hardcoded colors or styles
- [ ] Lighthouse scores 90+

## 🎯 Success Metrics

- **Type Safety**: 100% type-only definitions
- **Theme Support**: 100% dynamic theming via pushColor
- **File Atomicity**: 100% files under 80 lines
- **Angular Modern**: 100% latest features usage
- **Performance**: 90+ Lighthouse scores
- **Test Coverage**: 90%+ coverage
- **Bundle Size**: <500KB total increase

This summary ensures all team members understand and follow the strict requirements for the Zoolandingpage project development.
