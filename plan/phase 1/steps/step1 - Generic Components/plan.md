# Step 1: Generic Components Plan

## Overview

This step focuses on creating reusable UI components using ngx-angora-css that will serve as the foundation for the entire Zoolandingpage project. These components will leverage the full power of ngx-angora-css abbreviations, combos, and utilities to create consistent, maintainable, and performant UI elements.

## Objectives

### Primary Goals

- Create a comprehensive component library using ngx-angora-css
- Establish consistent design patterns and styling conventions
- Implement responsive design principles across all components
- Ensure accessibility compliance (WCAG 2.1 AA)
- Set up proper TypeScript types

### Secondary Goals

- Create component documentation and usage examples
- Implement proper error handling and loading states
- Set up component testing infrastructure
- Establish performance optimization patterns

## Components to Develop

### 1. Layout Components

- **AppHeader**: Main navigation with responsive menu
- **AppFooter**: Footer with links and contact information
- **AppContainer**: Main content wrapper with responsive breakpoints
- **AppSection**: Reusable section wrapper with consistent spacing

### 2. Navigation Components

- **NavMenu**: Primary navigation menu with mobile responsiveness
- **Breadcrumb**: Navigation breadcrumb trail
- **LanguageToggle**: Spanish/English language switcher
- **ThemeToggle**: Light/dark mode switcher

### 3. Content Components

- **HeroSection**: Landing page hero with call-to-action
- **ContentBlock**: Generic content section with various layouts
- **FeatureCard**: Service/feature showcase cards
- **TestimonialCard**: Customer testimonial display
- **StatsCounter**: Animated statistics display

### 4. Interactive Components

- **Button**: Primary, secondary, and utility buttons with various states
- **ContactForm**: Lead capture form with validation
- **WhatsAppButton**: Direct WhatsApp contact integration
- **Modal**: Overlay dialog for various content
- **Accordion**: Expandable content sections

### 5. Utility Components

- **LoadingSpinner**: Loading state indicators
- **ProgressBar**: Progress indication for multi-step processes
- **Toast**: Notification and alert messages
- **Tooltip**: Contextual help and information
- **ImageGallery**: Responsive image display

## Technical Specifications

### MANDATORY Requirements

1. **Types Only - NO Interfaces/Enums**: All type definitions must use `type` keyword
1. **Atomic File Structure**: Each file should be 50-80 lines max, split functionality into separate files
1. **pushColors Method**: All theme changes must use ngx-angora-css `pushColors` method for dynamic theming
1. **Latest Angular Features**: Use `@if`, `@for`, `@switch`, `@defer` with `@placeholder`, `@error`, `@loading`

### ngx-angora-css Implementation

- **Theme Management**: Use `pushColors()` method for all color definitions and theme switching
- **Abbreviations**: Use size, spacing, and color abbreviations (e.g., `ank-p-20px`, `ank-m-16px`, `ank-bg-primary`)
- **Combos**: Leverage pre-built component combinations for rapid development
- **Responsive**: Implement breakpoint-specific styling with ngx-angora-css utilities
- **Dynamic Colors**: All colors must be defined via `pushColors` to support theme switching

### TypeScript Standards (ENFORCED)

- **Strict Mode**: All components must use TypeScript strict mode
- **Types Only**: NO interfaces or enums allowed - use `type` definitions exclusively
- **Generic Types**: Use generic types where appropriate for reusability
- **Documentation**: JSDoc comments for all public APIs

### Angular Latest Features (REQUIRED)

- **Control Flow**: Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- **Lazy Loading**: Implement `@defer` with `@placeholder`, `@error`, and `@loading` states
- **Signals**: Use signals for reactive state management
- **Standalone Components**: All components must be standalone
- **New Input/Output**: Use new `input()` and `output()` APIs where applicable

### File Structure (ATOMIC PRINCIPLE)

Each component must be split into minimal files:

```text
component-name/
├── component-name.component.ts (max 50-80 lines)
├── component-name.types.ts (type definitions only)
├── component-name.styles.ts (only animations and/or something that ngx-angora-css can not do)
├── component-name.constants.ts (constants and defaults)
└── index.ts (barrel export)
```

### Accessibility Requirements

- **ARIA Labels**: Proper ARIA attributes for screen readers
- **Keyboard Navigation**: Full keyboard accessibility support
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: Minimum 4.5:1 contrast ratio for text

### Performance Optimization

- **OnPush Strategy**: Use OnPush change detection where possible
- **Lazy Loading**: Implement lazy loading for non-critical components
- **Bundle Optimization**: Tree-shakable exports and minimal dependencies
- **Memory Management**: Proper cleanup of subscriptions and event listeners

## Implementation Strategy

### Task 1: Foundation Components (Week 1)

1. Set up component library structure
2. Create base layout components (AppHeader, AppFooter, AppContainer)
3. Implement primary navigation components
4. Establish styling conventions and documentation

### Task 2: Content Components (Week 2)

1. Develop hero section and content blocks
2. Create feature cards and testimonial components
3. Implement interactive elements (buttons, forms)
4. Add animation and transition effects

### Task 3: Advanced Components (Week 3)

1. Build modal and overlay components
2. Create utility components (loading, progress, toast)
3. Implement accessibility enhancements
4. Optimize performance and bundle size

### Task 4: Testing and Documentation (Week 4)

1. Write comprehensive unit tests
2. Create component usage documentation
3. Perform accessibility testing
4. Conduct performance optimization review

## File Structure

```text
src/app/core/
├── components/
│   ├── layout/
│   │   ├── app-header/
│   │   ├── app-footer/
│   │   ├── app-container/
│   │   └── app-section/
src/app/shared/
├── components/
│   ├── navigation/
│   │   ├── nav-menu/
│   │   ├── breadcrumb/
│   │   ├── language-toggle/
│   │   └── theme-toggle/
│   ├── content/
│   │   ├── hero-section/
│   │   ├── content-block/
│   │   ├── feature-card/
│   │   ├── testimonial-card/
│   │   └── stats-counter/
│   ├── interactive/
│   │   ├── button/
│   │   ├── contact-form/
│   │   ├── whatsapp-button/
│   │   ├── modal/
│   │   └── accordion/
│   └── utility/
│       ├── loading-spinner/
│       ├── progress-bar/
│       ├── toast/
│       ├── tooltip/
│       └── image-gallery/
├── types/
│   ├── component.types.ts
│   ├── theme.types.ts
│   └── navigation.types.ts
│   └── event.types.ts
│   └── form.types.ts
│   └── content.types.ts
├── services/
│   ├── theme.service.ts
│   ├── language.service.ts
│   ├── analytics.service.ts
│   └── toasts.service.ts
└── index.ts (barrel exports)
```

## Success Criteria

### Functional Requirements

- [ ] All components render correctly across desktop, tablet, and mobile
- [ ] Components properly integrate with ngx-angora-css styling system
- [ ] Language switching works seamlessly across all components
- [ ] Theme switching (light/dark) functions properly
- [ ] All interactive elements respond to user input correctly

### Technical Requirements

- [ ] Components pass all unit tests with >90% code coverage
- [ ] TypeScript compilation without errors or warnings
- [ ] Accessibility audit shows WCAG 2.1 AA compliance
- [ ] Performance audit shows no significant impact on Core Web Vitals
- [ ] Components are properly tree-shakable and optimized

### Quality Requirements

- [ ] Code follows established style guide and conventions
- [ ] All components have proper documentation and examples
- [ ] Error handling is implemented for all edge cases
- [ ] Loading and empty states are properly handled
- [ ] Components are responsive and performant on all devices

## Dependencies

### Required Libraries

- **Angular 20+**: Core framework
- **ngx-angora-css**: Primary styling framework
- **TypeScript**: Type safety and development experience
- **RxJS**: Reactive programming support

### Development Dependencies

- **Jest**: Unit testing framework
- **Testing Library**: Component testing utilities
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality gates

## Risk Mitigation

### Technical Risks

- **SSR Compatibility**: Test all components with server-side rendering
- **Performance Impact**: Monitor bundle size and runtime performance
- **Browser Support**: Test across all supported browsers and versions
- **Accessibility Issues**: Regular accessibility audits during development

### Development Risks

- **Scope Creep**: Stick to defined component list and requirements
- **Styling Inconsistencies**: Establish clear design system early
- **Testing Gaps**: Maintain high test coverage throughout development
- **Documentation Debt**: Document components as they are developed

## Next Steps

After completing this step:

1. Components will be ready for integration into page layouts
2. Design system will be established for consistent styling
3. Development team can begin building page-specific features
4. Testing infrastructure will be in place for ongoing development

## Deliverables

- Functional component library with all specified components
- Comprehensive unit test suite with >90% coverage
- Component documentation with usage examples
- Accessibility compliance report
- Performance optimization report
- Integration guide for development team
