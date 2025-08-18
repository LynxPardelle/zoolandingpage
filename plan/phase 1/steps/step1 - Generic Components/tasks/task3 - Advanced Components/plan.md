# Task 3: Advanced Components Plan

## Overview

This task focuses on developing advanced UI components that provide sophisticated functionality and enhanced user interactions. These components serve as the final layer of the component library (modal dialogs, overlay functionality, utility + complex interactive elements). We are proceeding incrementally: Phase 1 (overlay & feedback primitives) has begun with baseline Modal, Toast, and LoadingSpinner implementations (pre-CDK integration).

## Objectives

### Primary Goals

- Build modal and overlay components for enhanced user interactions
- Create advanced utility components (loading, progress, notifications)
- Implement accessibility enhancements across all components
- Optimize performance and bundle size for production readiness
- Establish component composition patterns for complex layouts

### Secondary Goals

- Create advanced animation patterns and transitions
- Implement keyboard navigation enhancements
- Add comprehensive error boundary handling
- Set up component performance monitoring
- Create advanced theming and customization options

## Components to Develop

### 1. Modal and Overlay Components (Phase 1 IN PROGRESS)

#### Modal

**Purpose**: Overlay dialog component for various content types
**Features**:

- Multiple modal sizes (small, medium, large, full-screen)
- Header with title and close button
- Scrollable content area
- Footer with action buttons
- Backdrop click and ESC key closing
- Focus trap and accessibility support

**Status**: Upgraded to Angular CDK Overlay + FocusTrap + TemplatePortal; angora utility classes partially applied (panel, close button). Remaining: labeling helper, more utility class refactors.

**Technical Requirements (Revised)**:

- Replace custom host with Angular CDK Overlay + FocusTrap (pending)
- Implement `@defer` example for heavy modal content (pending)
- Add accessible labelling helper (pending)
- Theme-aware styling using angora combos instead of raw hard-coded styles (partial)
- Maintain small file size (<80 lines) (met)

#### Accordion

**Purpose**: Expandable content sections for organized information display
**Features**:

- Multiple expansion modes (single, multiple)
- Smooth expand/collapse animations
- Icon rotation and state indicators
- Keyboard navigation support
- Nested accordion support

**Technical Requirements**:

- Use `@if` for conditional content rendering
- CSS Grid/Flexbox for layout management
- Animation using Angular Animations API
- Proper ARIA attributes for accessibility

#### Dropdown

**Purpose**: Dropdown menu component for actions and navigation
**Features**:

- Trigger button with customizable content
- Positioned dropdown panel
- Menu items with icons and descriptions
- Keyboard navigation (arrow keys, enter, escape)
- Auto-positioning to avoid viewport overflow

**Technical Requirements**:

- Angular CDK Overlay for positioning
- Focus management and keyboard navigation
- Theme integration for menu styling
- Performance optimization for large lists

### 2. Utility Components (Phase 1 PARTIAL)

#### LoadingSpinner (Externalized & baseline variants complete)

**Purpose**: Loading state indicators for various contexts
**Features**:

- Multiple spinner styles (dots, bars, circular)
- Size variants (small, medium, large)
- Color customization via theme
- Overlay mode for blocking interactions
- Accessibility announcements for screen readers

**Technical Requirements**:

- CSS animations for smooth spinning
- Theme-aware color management
- Proper ARIA live regions
- Performance-optimized animations

#### ProgressBar

**Purpose**: Progress indication for multi-step processes or loading
**Features**:

- Determinate and indeterminate modes
- Step-based progress indicators
- Customizable colors and styling
- Label and percentage display
- Animation for progress changes

**Technical Requirements**:

- CSS transforms for smooth animations
- Theme integration for progress colors
- Accessibility compliance with ARIA attributes
- Performance optimization for frequent updates

#### Toast (Implemented baseline service + host)

**Purpose**: Notification and alert messages
**Features**:

- Multiple toast types (success, error, warning, info)
- Auto-dismiss with customizable timing
- Manual dismiss option
- Stacking and positioning options
- Action buttons within toasts

**Technical Requirements**:

- Angular service for toast management
- Animation for enter/exit transitions
- Theme-aware styling for different types
- Accessibility announcements
- Memory-efficient queue management

#### Tooltip

**Purpose**: Contextual help and information display
**Features**:

- Hover and focus trigger options
- Multiple positioning options (top, bottom, left, right)
- Auto-positioning to stay in viewport
- Rich content support (HTML, components)
- Customizable delay and duration

**Technical Requirements**:

- Angular CDK Overlay for positioning
- Event handling for show/hide triggers
- Performance optimization for frequent triggers
- Accessibility compliance with ARIA

### 3. Advanced Interactive Components (Progress)

#### TabGroup

**Purpose**: Tabbed content organization
**Features**:

- Horizontal and vertical tab layouts
- Scrollable tabs for overflow
- Lazy loading of tab content
- Keyboard navigation between tabs
- Custom tab templates

**Technical Requirements**:

- Use `@defer` for tab content lazy loading
- Focus management for keyboard navigation
- Theme integration for tab styling
- Responsive behavior for mobile

Status: Implemented keyboard navigation, roving tabindex, lazy content with @defer. Remaining: vertical orientation, overflow scroll handling, additional theme variants.

#### Stepper

**Purpose**: Multi-step process guidance
**Features**:

- Linear and non-linear step progression
- Step validation and error states
- Custom step templates
- Navigation controls (next, previous, complete)
- Progress indication

**Technical Requirements**:

- Form integration for step validation
- Animation for step transitions
- Accessibility support for screen readers
- Mobile-responsive layout

#### SearchBox

**Purpose**: Advanced search input with suggestions
**Features**:

- Auto-complete suggestions
- Search history
- Keyboard navigation in suggestions
- Custom result templates
- Loading states for async search

**Technical Requirements**:

- Debounced input handling
- Angular CDK Overlay for suggestions
- Performance optimization for large datasets
- Accessibility compliance

## Technical Specifications

### MANDATORY Requirements

1. **Types Only**: All type definitions use `type` keyword, NO interfaces/enums
2. **Atomic File Structure**: Each component split into 50-80 line files maximum
3. **pushColors Method**: All color management through ngx-angora-css `pushColors`
4. **Latest Angular Features**: Use `@if`, `@for`, `@defer` with loading states
5. **CDK Integration**: Leverage Angular CDK for overlay, focus, and accessibility
6. **Performance First**: Optimize for bundle size and runtime performance

### Component Architecture Pattern

Each component follows this structure:

```text
component-name/
├── component-name.component.ts      (max 50-80 lines)
├── component-name.types.ts          (type definitions)
├── component-name.styles.ts         (custom animations only)
├── component-name.constants.ts      (constants and defaults)
├── component-name.service.ts        (component-specific service if needed)
├── component-name.component.html    (template)
├── component-name.component.scss    (minimal custom styles)
└── index.ts                         (barrel export)
```

### Angular CDK Integration

#### Overlay Configuration

```typescript
// Example overlay configuration for modals
type OverlayConfig = {
  hasBackdrop: boolean;
  backdropClass: string;
  panelClass: string;
  positionStrategy: PositionStrategy;
  scrollStrategy: ScrollStrategy;
};
```

#### Focus Management

```typescript
// Example focus trap implementation
type FocusTrapConfig = {
  autoCapture: boolean;
  restoreFocus: boolean;
  initialFocus: HTMLElement | string;
};
```

### Accessibility Standards

#### ARIA Implementation

- **Modal**: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- **Accordion**: `role="button"`, `aria-expanded`, `aria-controls`
- **Dropdown**: `role="menu"`, `role="menuitem"`, `aria-haspopup`
- **Tabs**: `role="tablist"`, `role="tab"`, `role="tabpanel"`
- **Toast**: `role="alert"` or `role="status"`, `aria-live`

#### Keyboard Navigation

- **Modal**: Tab, Shift+Tab, Escape
- **Accordion**: Enter, Space, Arrow keys
- **Dropdown**: Arrow keys, Enter, Escape
- **Tabs**: Arrow keys, Home, End
- **Stepper**: Arrow keys, Enter, Space

## Implementation Tasks

### Phase 1 (Updated Progress)

1. (Done) Baseline Modal component (manual overlay)
2. (Done) Toast service + host
3. (Done) LoadingSpinner variants
4. (Done) Upgrade Modal to use CDK Overlay & FocusTrap + TemplatePortal
5. (In Progress) Add angora classes (reduce raw CSS) to modal & toast (panel, close button done; toast levels pending)
6. (Done) Externalize modal inline template/styles (atomic separation)
7. (Done) Externalize toast inline template/styles + introduce angora utility classes for layout
8. (Done) Externalize LoadingSpinner template/styles
9. (In Progress) Accordion initial implementation (logic + a11y) – animations still pending
10. (Done) Externalized previously inline advanced component templates (GenericButton, StatsCounter)
11. (Done) Introduced ProgressBar scaffold (determinate/indeterminate)
12. (Done) Dropdown: keyboard navigation, focus management, aria-activedescendant (initial a11y pass)
13. (Pending) Add keyboard & focus cycle tests (Modal, Accordion, Dropdown, ProgressBar)

### Phase 2: Disclosure Components (Adjusted)

1. (Done) Modal component CDK Overlay integration
2. (In Progress) Accordion component (animations added; further refinement pending)
3. (Done) Shared positioning abstraction (OverlayPositioningService extracted)
4. (Done) Develop Dropdown component with positioning + keyboard nav & a11y
5. (Pending) Implement Tooltip component (reuse extracted positioning abstraction)
6. (Pending) Extend keyboard navigation and a11y tests

### Phase 3: Remaining Utility Enhancements

1. Build LoadingSpinner with multiple variants (DONE)
2. Create ProgressBar with determinate/indeterminate modes (ENHANCED: label slot, aria-valuetext, theme color variants, reduced-motion)
3. Implement Toast notification system (DONE baseline; theming refactor completed; animations in place)
4. Develop Tooltip component with positioning (PARTIAL: scaffold + position variants + escape handling)
5. Add theme integration and performance optimizations (ONGOING)

### Phase 4: Advanced Interactive Components (Updated Progress – 2025-08-18)

1. (Done) TabGroup component with lazy loading (@defer placeholder integrated)
2. (Pending) Stepper component (validation + linear/non-linear modes)
3. (Baseline Done) SearchBox with auto-complete (debounce + overlay + keyboard nav)
4. (In Progress) Tooltip advanced a11y & theming

#### SearchBox Implementation Snapshot

Implemented:

- Debounced fetch scheduling (configurable debounce + minLength)
- CDK Overlay positioning via shared `OverlayPositioningService`
- Keyboard navigation (ArrowUp/Down, Enter, Escape) + active option tracking
- Externalized template & styles; reuse angora utility classes

Pending:

- aria-activedescendant pattern on input (currently custom selection)
- Custom result template projection support
- History & recent searches feature
- Loading spinner integration (optional)

#### Inline Template Elimination Progress

- WhatsAppButton: externalized template (2025-08-18)
- ContentBlock: externalized template (2025-08-18)
- Remaining inline production templates: none (spec-only inline templates acceptable)

### Functional Requirements (Progress Summary)

- [ ] Tooltip displays on hover/focus with proper positioning (scaffold present; finalize a11y)
- [x] TabGroup switches tabs and lazy loads content
- [ ] Stepper validates steps and shows progress
- [x] SearchBox provides auto-complete functionality (baseline)

### Technical Requirements (Progress Summary)

- [x] Components using CDK Overlay where appropriate (Modal, Dropdown, SearchBox, Tooltip scaffold)
- [ ] Keyboard navigation full coverage (Stepper + final Tooltip pending)
- [ ] Angora utility classes replace raw CSS (pending: tooltip surface full conversion, spinner variant tokenization)

### Deliverables (Incremental – 2025-08-18)

- [x] TabGroup lazy loading
- [x] SearchBox baseline overlay & navigation
- [x] Accessibility utilities (AriaLiveService, MotionPreferenceService, FocusVisibleDirective)
- [x] Performance baseline script
- [ ] Stepper component
- [ ] Tooltip full a11y + theming
- [ ] Keyboard & focus cycle tests (all advanced components)

## Success Criteria

### Functional Requirements (Progress)

- [x] Modal opens/closes correctly with backdrop and ESC key (baseline)
- [x] Modal template & styles externalized (no inline template for production)
- [x] Toast notifications appear and dismiss correctly (auto-dismiss, manual close)
- [x] Toast template & styles externalized
- [x] LoadingSpinner shows appropriate loading states (externalized)
- [x] Accordion basic open/close + keyboard navigation (animations pending)

- [x] Dropdown positions correctly and handles overflow (overlay + service abstraction)
- [x] ProgressBar updates smoothly with progress changes (determinate + indeterminate, aria-valuetext, label slot)
- [ ] Tooltip displays on hover/focus with proper positioning
- [x] TabGroup switches tabs and lazy loads content
- [ ] Stepper validates steps and shows progress
- [x] SearchBox provides auto-complete functionality (baseline)

### Technical Requirements

- [x] Modal uses Angular CDK Overlay & FocusTrap
- [ ] Remaining components use Angular CDK where appropriate (Dropdown & Tooltip scaffold use CDK Overlay; others pending)
- [x] Focus management for Modal implemented (trap + restore)
- [ ] Focus management for other components pending
- [ ] Keyboard navigation follows accessibility guidelines (Modal/Accordion/Dropdown implemented; others pending)
- [ ] Components integrate with theme system
- [ ] Bundle size remains under performance limits
- [ ] Animation performance is smooth (60fps)
- [ ] Memory usage is optimized
- [ ] Angora utility classes replace raw CSS for shared patterns (partial: modal panel & button, spinner uses minimal raw animation CSS, toast levels pending conversion)

### Quality Requirements

- [ ] Components pass accessibility audits (WCAG 2.1 AA)
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness tested
- [ ] Performance meets Core Web Vitals standards
- [ ] Documentation is comprehensive
- [ ] Testing achieves >90% coverage

## Dependencies

### Required Libraries

- **Angular CDK**: Overlay, Focus Trap, A11y, Portal
- **Angular Animations**: For component animations
- **ngx-angora-css**: Theme and styling integration

### Development Dependencies

- **Jest**: Unit testing
- **Cypress**: E2E testing
- **Axe-core**: Accessibility testing

## Performance Considerations

### Bundle Size Optimization

- Tree-shakable component exports
- Lazy loading for non-critical components
- CDK module selective imports
- Optimize animation bundle size

### Runtime Performance

- Use OnPush change detection
- Debounce frequent events (search, resize)
- Optimize DOM queries and updates
- Memory leak prevention

### Accessibility Performance

- Minimize screen reader announcements
- Optimize focus management
- Efficient keyboard event handling

## Risk Mitigation

### Technical Risks

- **CDK Version Compatibility**: Test with Angular CDK updates
- **Performance Impact**: Monitor bundle size and runtime performance
- **Browser Support**: Test overlay positioning across browsers
- **Memory Leaks**: Proper cleanup of subscriptions and overlays

### Accessibility Risks

- **Focus Management**: Comprehensive keyboard navigation testing
- **Screen Reader Support**: Test with multiple screen readers
- **Color Contrast**: Verify contrast ratios in all themes
- **Motion Sensitivity**: Respect reduced motion preferences

## Next Steps

After completing this task:

1. Advanced component library ready for complex applications
2. Accessibility standards established and implemented
3. Performance optimization patterns documented
4. Component composition guidelines available
5. Foundation set for application-specific components

## Deliverables (Progress Updated)

- [x] Complete Modal component with CDK Overlay integration
      -- [ ] Complete Accordion component with smooth animations (logic done)
      -- [x] Complete Dropdown component with auto-positioning (keyboard + a11y initial pass)
      -- [x] Complete LoadingSpinner with multiple variants (externalized)
      -- [x] Complete ProgressBar with animation support (determinate + indeterminate + reduced motion)
- [x] Complete Toast notification system (baseline)
- [ ] Complete Tooltip component with CDK positioning
- [ ] Complete TabGroup with lazy loading
- [ ] Complete Stepper with form validation integration
- [ ] Complete SearchBox with auto-complete functionality
- [ ] Component documentation with accessibility guidelines
- [ ] Unit test suite with >90% coverage (INITIAL SPECS ADDED)
- [ ] Accessibility compliance verification
- [ ] Performance optimization report
- [ ] CDK integration best practices documentation

## Revision Addendum (2025-08-17)

Prerequisites satisfied from Task 1 & partially Task 2 (foundation + core content sections). Task 3 will NOT start until Task 2 atomic retrofits + generic primitives (Button, StatsCounter, etc.) are in place. Adjustments:

- Scope Confirmation: Keep full advanced set (Modal, Accordion, Dropdown, Toast, Tooltip, TabGroup, Stepper, SearchBox, LoadingSpinner, ProgressBar) but reorder to deliver enabling infrastructure first (Toast/Modal for global UX patterns, then navigation/structure components).
- Dependencies: Generic Button (Task 2) becomes required for Modal/Toast/Dropdown actions; StatsCounter independent; ContactForm still deferred (so Stepper may rely on simplified form mock initially).
- Risk Reduction: Introduce a phased milestone approach (see below) to avoid large PRs.

### Phased Milestones

1. Overlay Core: Modal (focus trap), Toast service (basic), LoadingSpinner.
2. Navigation/Disclosure: Accordion, Dropdown, Tooltip (shared positioning strategy abstraction).
3. Composition: TabGroup, Stepper.
4. Advanced Interaction: SearchBox (debounce + overlay suggestions), ProgressBar.

### Success Criteria Adjustments

Add: Reuse Generic Button for all actionable controls. Provide a positioning utility reused by Dropdown + Tooltip (no duplication). Minimum a11y test stub per component (full audits move to Task 4).

### Out-of-Scope Clarification

- No theming overhaul here (only consumption of existing token system).
- No full animation choreography library (basic enter/exit only; advanced sequencing could be future enhancement).

### Immediate Pre-Start Checklist

- [ ] Task 2: Generic Button merged
- [ ] Task 2: Atomic retrofits complete
- [ ] Task 2: JSON-LD helper merged (ensures head manipulation pattern stable)
- [ ] Task 2: Basic analytics pattern reused (CTA + WhatsAppButton)

If any remain incomplete, defer Task 3 start.

---
