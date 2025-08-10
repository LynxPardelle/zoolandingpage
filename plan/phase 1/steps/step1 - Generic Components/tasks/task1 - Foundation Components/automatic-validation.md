# Task 1: Foundation Components - Automatic Validation

## Overview

This document defines the automated testing strategies and validation criteria for the Foundation Components task. All tests must pass before the task is considered complete.

## Test Categories

### 1. Unit Tests

#### Component Rendering Tests

```typescript
// AppHeader Component Tests
describe('AppHeaderComponent', () => {
  it('should render with default configuration', () => {
    // Test basic rendering
  });

  it('should toggle mobile menu correctly', () => {
    // Test mobile menu functionality
  });

  it('should integrate language toggle properly', () => {
    // Test language switching
  });

  it('should integrate theme toggle properly', () => {
    // Test theme switching
  });
});

// AppFooter Component Tests
describe('AppFooterComponent', () => {
  it('should render contact information', () => {
    // Test footer content rendering
  });

  it('should display responsive layout', () => {
    // Test responsive behavior
  });
});

// AppContainer Component Tests
describe('AppContainerComponent', () => {
  it('should apply responsive breakpoints', () => {
    // Test responsive container behavior
  });

  it('should render content correctly', () => {
    // Test content projection
  });
});

// AppSection Component Tests
describe('AppSectionComponent', () => {
  it('should apply theme colors correctly', () => {
    // Test theme integration
  });

  it('should handle different content types', () => {
    // Test content flexibility
  });
});

// NavMenu Component Tests
describe('NavMenuComponent', () => {
  it('should render navigation items', () => {
    // Test nav item rendering
  });

  it('should handle active state correctly', () => {
    // Test active navigation state
  });

  it('should support keyboard navigation', () => {
    // Test keyboard accessibility
  });
});

// LanguageToggle Component Tests
describe('LanguageToggleComponent', () => {
  it('should switch languages correctly', () => {
    // Test language switching
  });

  it('should persist language preference', () => {
    // Test localStorage integration
  });
});

// ThemeToggle Component Tests
describe('ThemeToggleComponent', () => {
  it('should switch themes correctly', () => {
    // Test theme switching
  });

  it('should persist theme preference', () => {
    // Test localStorage integration
  });

  it('should detect system preference', () => {
    // Test system theme detection
  });
});
```

#### Service Tests

```typescript
// Theme Service Tests
describe('ThemeService', () => {
  it('should initialize with system theme', () => {
    // Test system theme detection
  });

  it('should apply theme changes correctly', () => {
    // Test pushColors integration
  });

  it('should persist theme changes', () => {
    // Test localStorage persistence
  });
});

// Language Service Tests
describe('LanguageService', () => {
  it('should initialize with default language', () => {
    // Test default language setup
  });

  it('should switch languages correctly', () => {
    // Test language switching
  });

  it('should persist language preference', () => {
    // Test localStorage persistence
  });
});
```

### 2. Integration Tests

#### Component Integration

```typescript
describe('Foundation Components Integration', () => {
  it('should work together in app layout', () => {
    // Test components working together
  });

  it('should share theme state correctly', () => {
    // Test theme sharing between components
  });

  it('should share language state correctly', () => {
    // Test language sharing between components
  });
});
```

### 3. E2E Tests

#### User Journey Tests

```typescript
describe('Foundation Components E2E', () => {
  it('should navigate through header menu', () => {
    // Test header navigation
  });

  it('should switch languages and persist choice', () => {
    // Test language switching workflow
  });

  it('should switch themes and persist choice', () => {
    // Test theme switching workflow
  });

  it('should work on mobile devices', () => {
    // Test mobile responsiveness
  });
});
```

## Automated Quality Checks

### 1. TypeScript Compilation

```bash
# All files must compile without errors
npx tsc --noEmit --strict
```

### 2. ESLint Validation

```bash
# All files must pass linting rules
npx eslint src/app/core/components/**/*.ts
npx eslint src/app/shared/components/**/*.ts
```

### 3. Bundle Size Analysis

```bash
# Bundle size must be under limits
npx webpack-bundle-analyzer dist/
```

### 4. Performance Testing

```bash
# Lighthouse performance testing
npx lighthouse http://localhost:4200 --only-categories=performance
```

## Test Coverage Requirements

### Minimum Coverage Targets

- **Unit Tests**: 80% line coverage minimum
- **Branch Coverage**: 75% minimum
- **Function Coverage**: 85% minimum
- **Statement Coverage**: 80% minimum

### Coverage Commands

```bash
# Run tests with coverage
npm run test:coverage

# Generate coverage report
npm run test:coverage:report
```

## Accessibility Testing

### Automated Accessibility Tests

```typescript
describe('Accessibility Tests', () => {
  it('should pass axe accessibility tests', async () => {
    // Test with axe-core
    const results = await axe(fixture.nativeElement);
    expect(results).toHaveNoViolations();
  });

  it('should support keyboard navigation', () => {
    // Test keyboard accessibility
  });

  it('should have proper ARIA attributes', () => {
    // Test ARIA compliance
  });
});
```

### Accessibility Tools

```bash
# Automated accessibility testing
npx @axe-core/cli http://localhost:4200
```

## Performance Validation

### Bundle Size Limits

```typescript
// webpack.config.js - Bundle size limits
module.exports = {
  performance: {
    maxAssetSize: 250000, // 250KB max per asset
    maxEntrypointSize: 500000, // 500KB max entrypoint
    hints: 'error',
  },
};
```

### Core Web Vitals Targets

- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **First Input Delay (FID)**: < 100 milliseconds
- **Cumulative Layout Shift (CLS)**: < 0.1

### Performance Tests

```typescript
describe('Performance Tests', () => {
  it('should load components within performance budget', () => {
    // Test component loading time
  });

  it('should not cause layout shift', () => {
    // Test CLS score
  });
});
```

## Browser Compatibility Testing

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Automated Browser Testing

```bash
# Cross-browser testing with Playwright
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## CI/CD Pipeline Validation

### GitHub Actions Workflow

```yaml
# .github/workflows/foundation-components-test.yml
name: Foundation Components Tests

on:
  push:
    paths:
      - 'src/app/core/components/**'
      - 'src/app/shared/components/navigation/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:foundation-components
      - run: npm run lint:foundation-components
      - run: npm run build:foundation-components
      - run: npm run e2e:foundation-components
```

### Quality Gates

- All unit tests pass
- ESLint validation passes
- TypeScript compilation succeeds
- Bundle size within limits
- Accessibility tests pass
- E2E tests pass
- Coverage targets met

## Testing Commands

### Development Testing

```bash
# Run all foundation component tests
npm run test:foundation-components

# Run tests in watch mode
npm run test:foundation-components:watch

# Run tests with coverage
npm run test:foundation-components:coverage

# Run specific component tests
npm run test src/app/core/components/layout/app-header
```

### CI/CD Testing

```bash
# Full test suite for CI
npm run test:ci

# Lint only foundation components
npm run lint:foundation-components

# Build and test
npm run build:test
```

## Test Data and Mocks

### Mock Services

```typescript
// test-utils/mocks/theme.service.mock.ts
export const mockThemeService = {
  currentTheme: signal('light'),
  switchTheme: jest.fn(),
  detectSystemTheme: jest.fn(),
};

// test-utils/mocks/language.service.mock.ts
export const mockLanguageService = {
  currentLanguage: signal('es'),
  switchLanguage: jest.fn(),
  getTranslation: jest.fn(),
};
```

### Test Utilities

```typescript
// test-utils/component-test-utils.ts
export function createComponentWrapper<T>(component: Type<T>, options?: ComponentTestOptions) {
  // Utility for component testing setup
}

export function setupThemeTest() {
  // Setup theme testing environment
}

export function setupAccessibilityTest() {
  // Setup accessibility testing environment
}
```

## Validation Criteria

### Must Pass Criteria

- [ ] All unit tests pass with >80% coverage
- [ ] ESLint validation passes with zero warnings
- [ ] TypeScript compilation succeeds with strict mode
- [ ] Bundle size under 250KB per component
- [ ] Accessibility tests pass WCAG 2.1 AA
- [ ] E2E tests pass on all supported browsers
- [ ] Performance meets Core Web Vitals targets

### Quality Assurance Criteria

- [ ] Code follows established patterns and conventions
- [ ] Components are properly documented
- [ ] Error handling implemented correctly
- [ ] Loading states work properly
- [ ] Responsive behavior validated
- [ ] Theme switching validated
- [ ] Language switching validated

## Failure Resolution

### Common Issues and Solutions

1. **Test Failures**: Check component logic and mock setup
2. **Coverage Issues**: Add missing test cases for uncovered code
3. **Accessibility Failures**: Add proper ARIA labels and keyboard support
4. **Performance Issues**: Optimize component rendering and bundle size
5. **Browser Compatibility**: Add polyfills or adjust code for older browsers

### Debugging Tools

```bash
# Debug test failures
npm run test:debug

# Debug accessibility issues
npm run test:a11y:debug

# Debug performance issues
npm run test:performance:debug
```
