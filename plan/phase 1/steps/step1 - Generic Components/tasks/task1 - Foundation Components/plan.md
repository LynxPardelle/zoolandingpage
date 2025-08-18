# Task 1: Foundation Components Plan

## Overview

This task focuses on creating the foundational layout and navigation components that will serve as the structural backbone for the entire Zoolandingpage project. These components establish the basic page structure, navigation patterns, and core styling conventions using ngx-angora-css.

## Objectives

### Primary Goals

- Set up the component library structure and organization
- Create essential layout components (AppHeader, AppFooter, AppContainer, AppSection)
- Implement primary navigation components with responsive behavior
- Establish ngx-angora-css styling conventions and theme management
- Set up proper TypeScript types and component architecture

### Secondary Goals

- Create component documentation templates
- Implement basic accessibility patterns
- Set up initial testing infrastructure
- Establish performance optimization baseline

## Components to Develop

### 1. Core Layout Components

#### AppHeader

**Purpose**: Main application header with navigation and branding
**Features**:

- Responsive navigation menu
- Logo/branding area
- Language toggle integration
- Theme toggle integration
- Mobile hamburger menu
- Sticky positioning option

**Technical Requirements**:

- Use `@defer` for mobile menu with `@placeholder` and `@loading`
- Implement `pushColors` for theme-aware styling
- Use `@if` for responsive menu display
- Support keyboard navigation (tab, enter, escape)

#### AppFooter

**Purpose**: Application footer with links and contact information
**Features**:

- Contact information display
- Social media links
- Copyright information
- Additional navigation links
- Responsive column layout

**Technical Requirements**:

- Responsive grid layout using ngx-angora-css
- Dynamic year calculation for copyright
- Accessible link structure
- Theme-aware color schemes

#### AppContainer

**Purpose**: Main content wrapper with responsive breakpoints
**Features**:

- Responsive max-width constraints
- Consistent padding and margins
- Flexible content positioning
- Breakpoint-specific layouts

**Technical Requirements**:

- Use ngx-angora-css breakpoint utilities
- Implement fluid typography scaling
- Support multiple layout variants
- Optimize for Core Web Vitals

#### AppSection

**Purpose**: Reusable section wrapper with consistent spacing
**Features**:

- Standardized vertical spacing
- Background color variations
- Content alignment options
- Responsive padding adjustments

**Technical Requirements**:

- Theme-aware background colors via `pushColors`
- Consistent spacing scale
- Support for various content types
- Accessibility-compliant heading structure

### 2. Navigation Components

#### NavMenu

**Purpose**: Primary navigation menu with mobile responsiveness
**Features**:

- Horizontal desktop layout
- Mobile slide-out/overlay menu
- Active state indication
- Smooth transitions
- Keyboard navigation support

**Technical Requirements**:

- Use `@if` for responsive menu variants
- Implement `@defer` for mobile menu components
- Focus management for accessibility
- Animation using CSS transitions

#### LanguageToggle

**Purpose**: Spanish/English language switcher
**Features**:

- Toggle between Spanish and English
- Persist language preference
- Smooth transition animations
- Accessible button states

**Technical Requirements**:

- Use Angular signals for language state
- Local storage integration
- ARIA labels for screen readers
- Theme-aware styling

#### ThemeToggle

**Purpose**: Light/dark mode switcher
**Features**:

- Toggle between light and dark themes
- System preference detection
- Persist theme choice
- Smooth color transitions

**Technical Requirements**:

- Integration with ngx-angora-css `pushColors`
- System theme detection
- Local storage persistence
- Reduced motion support

## Technical Specifications

### MANDATORY Requirements

1. **HTML Template Files Only**: ALL components MUST use `templateUrl`, NO inline templates allowed
2. **Complete Type Safety**: Type everything including function variables, error objects, and method parameters
3. **Environment Variables**: ALL configuration must use environment variables (localStorage keys, API URLs, etc.)
4. **Correct ngx-angora-css Methods**:
   - Use `pushColors()` for adding/updating colors
   - Use proper theme integration methods
5. **Types Only**: All type definitions use `type` keyword, NO interfaces/enums
6. **Atomic File Structure**: Each component split into 50-80 line files maximum
7. **Latest Angular Features**: Use `@if`, `@for`, `@defer` with loading states
8. **Signals**: Use signals for reactive state management

### Component Structure Template

Each component follows this MANDATORY structure:

```text
component-name/
├── component-name.component.ts (max 50-80 lines, uses templateUrl)
├── component-name.component.html (separate HTML template file)
├── component-name.types.ts (type definitions only)
├── component-name.constants.ts (constants and defaults)
└── index.ts (barrel export)
```

### Environment Integration Example

```typescript
// ✅ REQUIRED - Environment usage in services
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ExampleService {
  private readonly storageKey: string = environment.localStorage.themeKey;
  private readonly apiUrl: string = environment.apiUrl;

  savePreference(value: string): void {
    const key: string = environment.localStorage.userPreferencesKey;
    localStorage.setItem(key, value);
  }
}
```

### ngx-angora-css Correct Implementation

```typescript
// ✅ REQUIRED - Correct method usage
export class ThemeService {
  private applyTheme(): void {
    // Use pushColors for adding/updating colors
    this._ank.pushColors({
      primary: '#ffffff',
      secondary: '#f8fafc',
      accent: '#2563eb',
    });

    // Use updateClasses for CSS class updates
    this._ank.updateClasses(['ank-m-5rem']);

    this._ank.cssCreate();
  }
}
```

#### Styling Conventions

- **Spacing**: Use `ank-p-{size}px`, `ank-m-{size}px` for consistent spacing
- **Colors**: Use `ank-bg-{color}`, `ank-text-{color}` with dynamic theme support
- **Layout**: Use `ank-flex`, `ank-grid` utilities for responsive layouts
- **Typography**: Use `ank-text-{size}` with responsive scaling

### Accessibility Requirements

- **ARIA Labels**: All interactive elements have proper ARIA attributes
- **Keyboard Navigation**: Full keyboard support with visible focus indicators
- **Screen Readers**: Semantic HTML structure with proper headings
- **Color Contrast**: Minimum 4.5:1 contrast ratio for all text

### Performance Requirements

- **OnPush Strategy**: Use OnPush change detection for all components
- **Lazy Loading**: Use `@defer` for non-critical component parts
- **Bundle Size**: Each component <5KB gzipped
- **Runtime Performance**: No blocking operations in component lifecycle

## Implementation Tasks

### Week 1: Core Setup and AppContainer/AppSection (Days 1-2)

1. Set up component library folder structure
2. Create base TypeScript types and constants
3. Implement AppContainer with responsive breakpoints
4. Implement AppSection with theme support
5. Create initial documentation templates

### Week 1: AppHeader Component (Days 3-4)

1. Create AppHeader with responsive navigation
2. Implement mobile hamburger menu with `@defer`
3. Add language and theme toggle integration
4. Implement keyboard navigation support
5. Add accessibility attributes and testing

### Week 1: AppFooter and NavMenu (Days 5-7)

1. Create AppFooter with responsive layout
2. Implement NavMenu with active state management
3. Add proper link structure and navigation
4. Implement smooth transitions and animations
5. Conduct initial accessibility audit

## File Organization

```text
src/app/core/
├── components/
│   ├── layout/
│   │   ├── app-header/
│   │   │   ├── app-header.component.ts
│   │   │   ├── app-header.types.ts
│   │   │   ├── app-header.constants.ts
│   │   │   └── index.ts
│   │   ├── app-footer/
│   │   │   ├── app-footer.component.ts
│   │   │   ├── app-footer.types.ts
│   │   │   ├── app-footer.constants.ts
│   │   │   └── index.ts
│   │   ├── app-container/
│   │   │   ├── app-container.component.ts
│   │   │   ├── app-container.types.ts
│   │   │   ├── app-container.constants.ts
│   │   │   └── index.ts
│   │   └── app-section/
│   │       ├── app-section.component.ts
│   │       ├── app-section.types.ts
│   │       ├── app-section.constants.ts
│   │       └── index.ts
├── navigation/
│   ├── nav-menu/
│   │   ├── nav-menu.component.ts
│   │   ├── nav-menu.types.ts
│   │   ├── nav-menu.constants.ts
│   │   └── index.ts
│   ├── language-toggle/
│   │   ├── language-toggle.component.ts
│   │   ├── language-toggle.types.ts
│   │   ├── language-toggle.constants.ts
│   │   └── index.ts
│   └── theme-toggle/
│       ├── theme-toggle.component.ts
│       ├── theme-toggle.types.ts
│       ├── theme-toggle.constants.ts
│       └── index.ts
├── types/
│   ├── layout.types.ts
│   ├── navigation.types.ts
│   └── theme.types.ts
└── services/
    ├── theme.service.ts
    └── language.service.ts
```

## Success Criteria

### Functional Requirements

- [ ] AppHeader renders correctly with responsive navigation
- [ ] AppFooter displays properly across all screen sizes
- [ ] AppContainer provides consistent content wrapping
- [ ] AppSection supports theme variations
- [ ] NavMenu functions on both desktop and mobile
- [ ] Language toggle switches content language
- [ ] Theme toggle changes color scheme smoothly

### Technical Requirements

- [ ] All components use TypeScript strict mode
- [ ] File size limits maintained (50-80 lines per file)
- [ ] All colors managed through `pushColors` method
- [ ] Latest Angular features implemented (`@if`, `@defer`, etc.)
- [ ] Components pass initial unit tests
- [ ] Bundle size under target limits

### Quality Requirements

- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] Performance metrics meet Core Web Vitals standards
- [ ] Code follows established conventions
- [ ] Documentation is complete and accurate
- [ ] Cross-browser compatibility verified

## Dependencies

### Required

- Angular 19+ with latest features
- ngx-angora-css for styling framework
- TypeScript for type safety
- RxJS for reactive patterns

### Development

- Jest for unit testing
- ESLint and Prettier for code quality
- Angular DevKit for build tools

## Risks and Mitigation

### Technical Risks

- **SSR Issues**: Test all components with server-side rendering from start
- **Bundle Size**: Monitor component size and optimize early
- **Browser Support**: Test on all target browsers regularly

### Development Risks

- **Scope Creep**: Stick to defined component list
- **Styling Inconsistencies**: Establish clear ngx-angora-css patterns early
- **Performance Issues**: Regular performance testing and optimization

## Next Steps

After completing this task:

1. Foundation components will be ready for content components
2. Styling conventions established for consistent development
3. Navigation patterns set for user experience
4. Theme and language systems operational
5. Testing patterns established for remaining tasks

## Deliverables

- [ ] Complete AppHeader component with responsive navigation
- [ ] Complete AppFooter component with responsive layout
- [ ] Complete AppContainer and AppSection components
- [ ] Complete NavMenu with mobile responsiveness
- [ ] Complete LanguageToggle and ThemeToggle components
- [ ] Component documentation with usage examples
- [ ] Initial unit test suite with >80% coverage
- [ ] Accessibility compliance report
- [ ] Performance baseline measurements
