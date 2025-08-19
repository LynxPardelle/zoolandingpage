# Advanced Toast Notification System

## Overview

The enhanced Toast component provides a sophisticated notification system with advanced features including multiple toast types, custom actions, animations, and flexible positioning. Built with Angular 19+ signals and standalone components.

## Features

### 🎨 Multiple Toast Types

- **Success**: Green theme with checkmark icon
- **Error**: Red theme with X icon (doesn't auto-dismiss by default)
- **Warning**: Orange theme with warning icon
- **Info**: Blue theme with info icon

### ✨ Advanced Functionality

- **Custom Actions**: Add interactive buttons to toasts
- **Progress Indicators**: Visual countdown for auto-dismissing toasts
- **Hover Persistence**: Toasts pause auto-dismiss when hovered
- **Flexible Positioning**: Top/bottom and left/right/center positioning
- **Animation System**: Smooth enter/exit animations with reduced motion support
- **Title Support**: Optional titles for more detailed notifications
- **Stacking Management**: Automatic toast limit with oldest removal

### 🎯 Accessibility Features

- **ARIA Labels**: Proper screen reader support
- **Keyboard Navigation**: Dismiss buttons are focusable
- **Live Regions**: Different aria-live values for error vs other types
- **Reduced Motion**: Respects user's motion preferences

## Usage

### Basic Toast Types

```typescript
import { ToastService } from './shared/components/utility/toast';

constructor(private toastService: ToastService) {}

// Simple notifications
this.toastService.success('Operation completed successfully!');
this.toastService.error('Something went wrong');
this.toastService.warning('This action cannot be undone');
this.toastService.info('New features available');
```

### Advanced Toasts with Actions

```typescript
this.toastService.show({
  level: 'warning',
  title: 'Unsaved Changes',
  text: 'You have unsaved changes. Do you want to save before leaving?',
  autoCloseMs: 0, // Don't auto-dismiss
  actions: [
    {
      label: 'Save',
      action: () => this.saveChanges(),
      style: 'primary',
    },
    {
      label: 'Discard',
      action: () => this.discardChanges(),
      style: 'secondary',
    },
  ],
});
```

### Configuration Options

```typescript
// Change toast position
this.toastService.setPosition({
  vertical: 'top',
  horizontal: 'center',
});

// Update global configuration
this.toastService.updateConfig({
  maxVisible: 3,
  defaultAutoCloseMs: 7000,
  animationDuration: 400,
});
```

## Component Integration

### In your template:

```html
<!-- Add toast host anywhere in your app -->
<app-toast-host></app-toast-host>
```

### In your component:

```typescript
import { ToastComponent } from './shared/components/utility/toast';

@Component({
  imports: [ToastComponent],
  // ...
})
```

## Toast Types Reference

### ToastMessage Interface

```typescript
interface ToastMessage {
  readonly id: string;
  readonly level: ToastLevel;
  readonly title?: string;
  readonly text: string;
  readonly autoCloseMs?: number;
  readonly persistOnHover?: boolean;
  readonly showProgress?: boolean;
  readonly actions?: ToastAction[];
  readonly dismissible?: boolean;
}
```

### ToastAction Interface

```typescript
interface ToastAction {
  readonly label: string;
  readonly action: () => void;
  readonly style?: 'primary' | 'secondary';
}
```

### ToastConfig Interface

```typescript
interface ToastConfig {
  readonly position: ToastPosition;
  readonly maxVisible: number;
  readonly defaultAutoCloseMs: number;
  readonly animationDuration: number;
}
```

## Styling & Theming

The Toast component uses the ngx-angora-css utility system with CSS custom properties for theming:

### CSS Custom Properties

```css
/* Success theme */
--ank-altSuccessColor: #10b981;
--ank-altOnSuccessColor: #fff;

/* Error theme */
--ank-altErrorColor: #ef4444;
--ank-altOnErrorColor: #fff;

/* Warning theme */
--ank-altWarningColor: #f59e0b;
--ank-altOnWarningColor: #fff;

/* Info theme */
--ank-altInfoColor: #3b82f6;
--ank-altOnInfoColor: #fff;
```

### Animation Customization

```scss
// Custom animation timing
.toast-item {
  --toast-animation-duration: 300ms;
  --toast-animation-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

// Disable animations globally
@media (prefers-reduced-motion: reduce) {
  .toast-item {
    animation: none !important;
  }
}
```

## Best Practices

### 1. Toast Type Guidelines

- **Success**: Confirmations, completed actions
- **Error**: Critical failures requiring user attention
- **Warning**: Potentially destructive actions, expiring sessions
- **Info**: Updates, tips, non-critical information

### 2. Auto-Dismiss Strategy

- Success/Info: 3-7 seconds
- Warning: 7-10 seconds or user action required
- Error: Never auto-dismiss or very long delay

### 3. Action Button Usage

- Maximum 2-3 actions per toast
- Use clear, action-oriented labels
- Primary action should be the most common/safe choice

### 4. Accessibility Considerations

- Keep text concise but descriptive
- Use titles for context when needed
- Ensure actions are keyboard accessible
- Test with screen readers

## Performance Considerations

- **Signal-based**: Reactive state management with Angular signals
- **Standalone Components**: Tree-shakable and optimized
- **Animation Optimization**: GPU-accelerated transforms
- **Memory Management**: Automatic cleanup of dismissed toasts
- **Bundle Size**: Minimal impact with lazy-loaded animations

## Browser Support

- Modern browsers with CSS Grid and Custom Properties support
- Graceful degradation for older browsers
- Reduced motion support for accessibility

## Testing

```typescript
// Example test
it('should show success toast with correct message', () => {
  const toastService = TestBed.inject(ToastService);
  const id = toastService.success('Test message');

  expect(toastService.list()).toEqual([
    expect.objectContaining({
      id,
      level: 'success',
      text: 'Test message',
    }),
  ]);
});
```

## Migration Guide

### From Basic Toast

```typescript
// Old way
toastService.push('success', 'Message');

// New way (backward compatible)
toastService.success('Message');
```

### Enhanced Features

```typescript
// Add title and actions
toastService.show({
  level: 'success',
  title: 'Upload Complete',
  text: 'Your file has been processed',
  actions: [{ label: 'View File', action: () => openFile() }],
});
```

## Demo Implementation

The current application includes interactive demo buttons in the bottom-left corner showcasing:

- Different toast types
- Error handling with actions
- Multi-action toasts
- Position changes
- Clear all functionality

These demos provide a comprehensive overview of the Toast system's capabilities and serve as implementation examples.
