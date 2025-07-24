# Step 1: Generic Components - Automatic Validation

## Overview

This document outlines the automated testing and validation procedures for the Generic Components step. All tests must pass before the step can be considered complete.

## Test Categories

### Unit Tests

#### Component Rendering Tests
- **Test Framework**: Jest + Angular Testing Utilities
- **Coverage Target**: >90% code coverage for all components
- **Test Pattern**: Each component must have corresponding `.spec.ts` file

```typescript
// Example test structure for each component
describe('ComponentName', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ComponentName]
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(ComponentName);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render with default props', () => {
    // Test default rendering
  });

  it('should handle prop changes', () => {
    // Test input property changes
  });

  it('should emit events correctly', () => {
    // Test output events
  });
});
```

#### Component Integration Tests
- **Test Interactions**: Component-to-component communication
- **Test Props/Events**: Input/output property validation
- **Test State Management**: Component state changes and updates

### Accessibility Tests

#### Automated A11y Testing
- **Framework**: axe-core integration with Jest
- **Standard**: WCAG 2.1 AA compliance
- **Coverage**: All components tested for accessibility violations

```typescript
// Example accessibility test
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

it('should not have accessibility violations', async () => {
  const fixture = TestBed.createComponent(ComponentName);
  const results = await axe(fixture.nativeElement);
  expect(results).toHaveNoViolations();
});
```

#### Keyboard Navigation Tests
- **Tab Order**: Verify logical tab sequence
- **Focus Management**: Test focus trapping and restoration
- **Keyboard Shortcuts**: Test all keyboard interactions

### Performance Tests

#### Bundle Size Analysis
- **Threshold**: Individual components <50KB, total bundle <500KB
- **Tree Shaking**: Verify components are tree-shakable

```bash
# Bundle analysis command
npm run analyze

# Size validation
npm run test:bundle-size
```

#### Runtime Performance
- **Memory Leaks**: Test component cleanup and destruction
- **Change Detection**: Verify OnPush strategy effectiveness
- **Rendering Performance**: Measure initial render and update times

### TypeScript Validation

#### Type Safety Tests
- **Compilation**: Zero TypeScript errors or warnings
- **Strict Mode**: All components use strict TypeScript settings
- **Type Coverage**: >95% type coverage using type-coverage tool

```bash
# TypeScript validation commands
npm run type-check
npm run test:types
npx type-coverage --min 95
```

### Cross-browser Testing

#### Browser Compatibility
- **Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Framework**: Playwright for automated cross-browser testing
- **Coverage**: All components tested across target browsers

```typescript
// Example cross-browser test
test.describe('Component Cross-browser Tests', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work in ${browserName}`, async ({ page }) => {
      // Browser-specific component tests
    });
  });
});
```

## Automated Quality Gates

### Code Quality Checks

#### ESLint Validation
- **Configuration**: Angular ESLint rules + custom rules
- **Rules**: No errors allowed, warnings should be minimized
- **Command**: `npm run lint`

#### Prettier Formatting
- **Configuration**: Consistent code formatting across all files
- **Enforcement**: Pre-commit hooks ensure formatted code
- **Command**: `npm run format:check`

#### SonarQube Analysis
- **Quality Gate**: A rating for maintainability, reliability, security
- **Code Smells**: Zero code smells in new code
- **Duplication**: <3% code duplication

### Security Validation

#### Dependency Scanning
- **Tool**: npm audit + Snyk
- **Threshold**: Zero high/critical vulnerabilities
- **Command**: `npm audit && npm run security:check`

#### Code Security Analysis
- **Tool**: ESLint security plugin
- **Coverage**: Static analysis for security vulnerabilities
- **Validation**: No security rule violations

## Continuous Integration Pipeline

### GitHub Actions Workflow

```yaml
name: Generic Components Validation

on:
  push:
    paths:
      - 'src/app/shared/components/**'
  pull_request:
    paths:
      - 'src/app/shared/components/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npm run type-check
      
      - name: Lint
        run: npm run lint
      
      - name: Unit tests
        run: npm run test:components
      
      - name: Accessibility tests
        run: npm run test:a11y
      
      - name: Bundle size check
        run: npm run test:bundle-size
      
      - name: Cross-browser tests
        run: npm run test:cross-browser
```

### Quality Metrics Dashboard

#### Test Coverage Report
- **Minimum**: 90% line coverage, 85% branch coverage
- **Reporting**: Istanbul coverage reports with HTML output
- **Tracking**: Coverage trends over time

#### Performance Metrics
- **Bundle Size**: Track size changes over time
- **Runtime Performance**: Monitor component render times
- **Memory Usage**: Track memory consumption patterns

## Validation Commands

### Pre-commit Validation
```bash
# Run all pre-commit checks
npm run pre-commit

# Individual check commands
npm run type-check
npm run lint
npm run test:unit
npm run test:a11y
npm run format:check
```

### Full Validation Suite
```bash
# Complete validation pipeline
npm run validate:all

# Component-specific validation
npm run validate:components

# Performance validation
npm run validate:performance
```

### Integration Validation
```bash
# Test component integration
npm run test:integration

# End-to-end component tests
npm run test:e2e:components
```

## Success Criteria

### Automated Test Requirements
- [ ] All unit tests pass with >90% code coverage
- [ ] Zero accessibility violations detected by axe-core
- [ ] All TypeScript compilation passes without errors
- [ ] Bundle size within defined thresholds
- [ ] Cross-browser tests pass on all target browsers
- [ ] Zero ESLint errors, minimal warnings
- [ ] Security scans show no high/critical vulnerabilities

### Performance Requirements
- [ ] Component render time <100ms on average
- [ ] Memory usage stable with no leaks detected
- [ ] Bundle size impact <50KB per component
- [ ] Tree-shaking verification passes

### Quality Requirements
- [ ] SonarQube quality gate passes
- [ ] Code duplication <3%
- [ ] Type coverage >95%
- [ ] All pre-commit hooks pass

## Troubleshooting

### Common Test Failures

#### Component Rendering Issues
- Check import statements and module configuration
- Verify component dependencies are properly mocked
- Ensure TestBed configuration includes all required modules

#### Accessibility Violations
- Review ARIA attributes and labels
- Check color contrast ratios
- Verify keyboard navigation support

#### Performance Test Failures
- Analyze bundle composition for unexpected dependencies
- Check for memory leaks in component lifecycle
- Review change detection strategy implementation

### Debug Commands
```bash
# Debug test failures
npm run test:debug

# Analyze bundle composition
npm run analyze:bundle

# Debug accessibility issues
npm run test:a11y:debug
```

## Maintenance

### Regular Updates
- Update test snapshots when component markup changes
- Review and update accessibility test criteria
- Monitor and adjust performance thresholds
- Update browser compatibility matrix

### Test Data Management
- Maintain test fixtures for consistent component testing
- Update mock data as component interfaces evolve
- Version control test assets and configurations
