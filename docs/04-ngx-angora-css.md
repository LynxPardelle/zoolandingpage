# NGX-Angora-CSS Integration 🎨

This document provides detailed guidelines for integrating and using NGX-Angora-CSS within the Zoolandingpage project.

## 📚 Quick Reference

For comprehensive NGX-Angora-CSS documentation, see the [complete usage guide](./ngx-angora-css-usage-guide.md).

## 🔧 Project-Specific Integration

### Service Setup

```typescript
// app.component.ts - Main application setup
import { Component, AfterRender } from '@angular/core';
import { NGXAngoraService } from 'ngx-angora-css';

@Component({
  selector: 'app-root',
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements AfterRender {
  constructor(private _ank: NGXAngoraService) {}
  
  ngAfterRender(): void {
    this.initializeAngoraCSS();
  }
  
  private initializeAngoraCSS(): void {
    // Initialize brand colors
    this.setupBrandColors();
    
    // Setup custom combos
    this.setupCustomCombos();
    
    // Setup responsive breakpoints
    this.setupBreakpoints();
    
    // Generate CSS
    this._ank.cssCreate();
  }
}
```

### Brand Color System

```typescript
private setupBrandColors(): void {
  this._ank.pushColors({
    // Primary brand colors
    'brand-primary': '#1a73e8',
    'brand-primary-light': '#4285f4',
    'brand-primary-dark': '#0c5aa6',
    
    // Secondary colors
    'brand-secondary': '#34a853',
    'brand-secondary-light': '#46c663',
    'brand-secondary-dark': '#2d8f47',
    
    // Accent colors
    'brand-accent': '#fbbc04',
    'brand-accent-light': '#fcc934',
    'brand-accent-dark': '#e8ab02',
    
    // Neutral colors
    'brand-dark': '#202124',
    'brand-medium': '#5f6368',
    'brand-light': '#9aa0a6',
    'brand-background': '#f8f9fa',
    
    // Semantic colors
    'success': '#34a853',
    'warning': '#fbbc04',
    'error': '#ea4335',
    'info': '#4285f4'
  });
}
```

### Custom Combos for Landing Page

```typescript
private setupCustomCombos(): void {
  this._ank.pushCombos({
    // Hero section styling
    'heroSection': [
      'ank-minHeight-100vh',
      'ank-display-flex',
      'ank-alignItems-center',
      'ank-justifyContent-center',
      'ank-textAlign-center',
      'ank-bg-brand-background',
      'ank-p-20px',
      'ank-p-md-40px'
    ],
    
    // Interactive card with hover effects
    'interactiveCard': [
      'ank-bg-white',
      'ank-borderRadius-12px',
      'ank-boxShadow-0__4px__6px__rgbaSD0COM0COM0COM0_1ED',
      'ank-p-24px',
      'ank-transformHover-translateYSDMIN4pxED',
      'ank-boxShadowHover-0__8px__25px__rgbaSD0COM0COM0COM0_15ED',
      'ank-transitionDuration-300ms',
      'ank-transitionTimingFunction-ease-out'
    ],
    
    // CTA button styling
    'ctaPrimary': [
      'ank-bg-brand-primary',
      'ank-color-white',
      'ank-p-16px_32px',
      'ank-border-none',
      'ank-borderRadius-8px',
      'ank-fontSize-18px',
      'ank-fontWeight-600',
      'ank-cursor-pointer',
      'ank-transformHover-translateYSDMIN2pxED',
      'ank-bgHover-brand-primary-dark',
      'ank-boxShadowHover-0__4px__12px__rgbaSD26COM115COM232COM0_4ED'
    ],
    
    // Tutorial step indicator
    'tutorialStep': [
      'ank-w-48px',
      'ank-h-48px',
      'ank-borderRadius-50per',
      'ank-bg-brand-light',
      'ank-color-white',
      'ank-display-flex',
      'ank-alignItems-center',
      'ank-justifyContent-center',
      'ank-fontSize-18px',
      'ank-fontWeight-bold'
    ],
    
    // Active tutorial step
    'tutorialStepActive': [
      'tutorialStep',
      'ank-bg-brand-primary',
      'ank-transformActive-scaleSD1_1ED',
      'ank-boxShadow-0__0__0__4px__rgbaSD26COM115COM232COM0_3ED'
    ],
    
    // Section container
    'sectionContainer': [
      'ank-maxWidth-1200px',
      'ank-margin-0__auto',
      'ank-p-20px',
      'ank-p-md-40px',
      'ank-p-lg-60px'
    ],
    
    // Responsive grid
    'responsiveGrid': [
      'ank-display-grid',
      'ank-gridTemplateColumns-1fr',
      'ank-gridTemplateColumns-md-repeatSD2COM1frED',
      'ank-gridTemplateColumns-lg-repeatSD3COM1frED',
      'ank-gap-24px',
      'ank-gap-md-32px'
    ]
  });
}
```

### Responsive Breakpoints

```typescript
private setupBreakpoints(): void {
  this._ank.pushBPS({
    'xs': 0,
    'sm': 576,
    'md': 768,
    'lg': 992,
    'xl': 1200,
    'xxl': 1400
  });
}
```

## 🧩 Component Integration Patterns

### Hero Section Component

```typescript
@Component({
  selector: 'app-hero-section',
  standalone: true,
  template: `
    <section class="heroSection">
      <div class="ank-maxWidth-800px">
        <h1 class="ank-fontSize-32px ank-fontSize-md-48px ank-fontSize-lg-56px ank-fontWeight-bold ank-color-brand-dark ank-marginBottom-24px">
          {{ title }}
        </h1>
        <p class="ank-fontSize-18px ank-fontSize-md-20px ank-color-brand-medium ank-lineHeight-1_6 ank-marginBottom-32px">
          {{ subtitle }}
        </p>
        <button class="ctaPrimary" (click)="onCTAClick()">
          {{ buttonText }}
        </button>
      </div>
    </section>
  `
})
export class HeroSectionComponent implements AfterRender {
  title = 'Experience the Power of Effective Landing Pages';
  subtitle = 'Learn why your business needs a landing page while seeing one in action';
  buttonText = 'Start Learning';
  
  constructor(private _ank: NGXAngoraService) {}
  
  ngAfterRender(): void {
    this._ank.cssCreate();
  }
  
  onCTAClick(): void {
    // Analytics tracking
    // Scroll to next section
  }
}
```

### Interactive Tutorial Component

```typescript
@Component({
  selector: 'app-interactive-tutorial',
  standalone: true,
  template: `
    <section class="sectionContainer">
      <div class="ank-textAlign-center ank-marginBottom-48px">
        <h2 class="ank-fontSize-36px ank-fontWeight-bold ank-color-brand-dark">
          Interactive Tutorial
        </h2>
      </div>
      
      <div class="responsiveGrid">
        <div 
          *ngFor="let step of tutorialSteps; let i = index"
          class="interactiveCard"
          [class.tutorialStepActive]="currentStep === i"
          (click)="selectStep(i)"
        >
          <div class="tutorialStep ank-marginBottom-16px">
            {{ i + 1 }}
          </div>
          <h3 class="ank-fontSize-20px ank-fontWeight-600 ank-marginBottom-12px">
            {{ step.title }}
          </h3>
          <p class="ank-color-brand-medium ank-lineHeight-1_5">
            {{ step.description }}
          </p>
        </div>
      </div>
    </section>
  `
})
export class InteractiveTutorialComponent implements AfterRender {
  currentStep = 0;
  tutorialSteps = [
    { title: 'Hero Section', description: 'Capture attention immediately' },
    { title: 'Value Proposition', description: 'Clearly communicate benefits' },
    { title: 'Social Proof', description: 'Build trust with testimonials' },
    { title: 'Call to Action', description: 'Guide visitors to convert' }
  ];
  
  constructor(private _ank: NGXAngoraService) {}
  
  ngAfterRender(): void {
    this._ank.cssCreate();
  }
  
  selectStep(step: number): void {
    this.currentStep = step;
    // Trigger animations, analytics, etc.
  }
}
```

### Form Component with Validation Styles

```typescript
@Component({
  selector: 'app-lead-capture-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="leadForm" (ngSubmit)="onSubmit()" class="ank-maxWidth-500px ank-margin-0__auto">
      <div class="ank-marginBottom-24px">
        <label class="ank-display-block ank-marginBottom-8px ank-fontWeight-600 ank-color-brand-dark">
          Email *
        </label>
        <input 
          type="email" 
          formControlName="email"
          class="ank-width-100per ank-p-12px ank-border-2px__solid__brand-light ank-borderRadius-8px ank-fontSize-16px ank-borderFocus-brand-primary ank-outlineFocus-none"
          [class.ank-border-error]="emailControl?.invalid && emailControl?.touched"
          [class.ank-border-success]="emailControl?.valid && emailControl?.touched"
          placeholder="Enter your email"
        >
        <div *ngIf="emailControl?.invalid && emailControl?.touched" 
             class="ank-color-error ank-fontSize-14px ank-marginTop-4px">
          Please enter a valid email address
        </div>
      </div>
      
      <div class="ank-marginBottom-24px">
        <label class="ank-display-block ank-marginBottom-8px ank-fontWeight-600 ank-color-brand-dark">
          Message
        </label>
        <textarea 
          formControlName="message"
          rows="4"
          class="ank-width-100per ank-p-12px ank-border-2px__solid__brand-light ank-borderRadius-8px ank-fontSize-16px ank-borderFocus-brand-primary ank-outlineFocus-none ank-resize-vertical"
          placeholder="Tell us about your project"
        ></textarea>
      </div>
      
      <button 
        type="submit"
        [disabled]="leadForm.invalid"
        class="ctaPrimary ank-width-100per"
        [class.ank-opacity-50]="leadForm.invalid"
        [class.ank-cursor-not-allowed]="leadForm.invalid"
      >
        Send Message
      </button>
    </form>
  `
})
export class LeadCaptureFormComponent implements AfterRender {
  leadForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    message: ['', Validators.required]
  });
  
  constructor(
    private fb: FormBuilder,
    private _ank: NGXAngoraService
  ) {}
  
  ngAfterRender(): void {
    this._ank.cssCreate();
  }
  
  get emailControl() { return this.leadForm.get('email'); }
  
  onSubmit(): void {
    if (this.leadForm.valid) {
      // Handle form submission
    }
  }
}
```

## 🎭 Animation Patterns

### Sketch-Style Animations

```typescript
@Component({
  selector: 'app-sketch-animation',
  template: `
    <div class="sketchContainer" #sketchContainer>
      <svg class="sketchSvg" viewBox="0 0 400 300">
        <path 
          class="sketchPath"
          d="M50,50 L350,50 L350,250 L50,250 Z"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-dasharray="1000"
          stroke-dashoffset="1000"
        />
      </svg>
    </div>
  `,
  styles: [`
    .sketchContainer {
      /* NGX-Angora classes applied via ngAfterRender */
    }
    
    .sketchPath {
      animation: drawPath 2s ease-in-out forwards;
    }
    
    @keyframes drawPath {
      to {
        stroke-dashoffset: 0;
      }
    }
  `]
})
export class SketchAnimationComponent implements AfterRender {
  constructor(private _ank: NGXAngoraService) {}
  
  ngAfterRender(): void {
    // Apply NGX-Angora styles for the container
    this._ank.pushCombos({
      'sketchContainer': [
        'ank-width-100per',
        'ank-maxWidth-400px',
        'ank-margin-0__auto',
        'ank-color-brand-primary'
      ]
    });
    
    this._ank.cssCreate();
  }
}
```

## 📱 Responsive Design Patterns

### Mobile-First Approach

```html
<!-- Progressive enhancement from mobile to desktop -->
<div class="ank-p-16px ank-p-sm-24px ank-p-md-32px ank-p-lg-48px">
  <h1 class="ank-fontSize-24px ank-fontSize-sm-32px ank-fontSize-md-40px ank-fontSize-lg-48px">
    Responsive Heading
  </h1>
  
  <div class="ank-display-flex ank-flexDirection-column ank-flexDirection-md-row ank-gap-16px ank-gap-md-24px">
    <div class="ank-flex-1">Content 1</div>
    <div class="ank-flex-1">Content 2</div>
  </div>
</div>
```

### Grid Layouts

```html
<!-- Responsive grid that adapts to screen size -->
<div class="ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-sm-repeatSD2COM1frED ank-gridTemplateColumns-lg-repeatSD3COM1frED ank-gridTemplateColumns-xl-repeatSD4COM1frED ank-gap-20px">
  <div class="interactiveCard">Card 1</div>
  <div class="interactiveCard">Card 2</div>
  <div class="interactiveCard">Card 3</div>
  <div class="interactiveCard">Card 4</div>
</div>
```

## ⚡ Performance Optimization

### Efficient Style Management

```typescript
// ✅ Batch operations for better performance
ngAfterRender(): void {
  // Single batch of color definitions
  this._ank.pushColors({
    'custom-blue': '#1a73e8',
    'custom-green': '#34a853',
    'custom-yellow': '#fbbc04'
  });
  
  // Single batch of combo definitions
  this._ank.pushCombos({
    'combo1': ['ank-p-20px', 'ank-bg-white'],
    'combo2': ['ank-m-16px', 'ank-borderRadius-8px'],
    'combo3': ['ank-fontSize-18px', 'ank-fontWeight-600']
  });
  
  // Single CSS generation call
  this._ank.cssCreate();
}

// ❌ Avoid multiple CSS generation calls
ngAfterRender(): void {
  this._ank.pushColors({ 'color1': '#123456' });
  this._ank.cssCreate(); // Inefficient
  
  this._ank.pushCombos({ 'combo1': ['ank-p-20px'] });
  this._ank.cssCreate(); // Inefficient
}
```

### Memory Management

```typescript
export class ComponentWithCleanup implements AfterRender, OnDestroy {
  private subscription?: Subscription;
  
  ngAfterRender(): void {
    this._ank.cssCreate();
    
    // Setup observables that need cleanup
    this.subscription = this.someService.data$.subscribe(data => {
      // Handle data updates
    });
  }
  
  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }
}
```

## 🔍 Debugging NGX-Angora-CSS

### Development Tools

```typescript
// Enable debug mode in development
ngAfterRender(): void {
  if (!environment.production) {
    this._ank.changeDebugOption(); // Toggle debug mode
  }
  
  this._ank.cssCreate();
}
```

### Common Issues and Solutions

1. **Styles not applying**: Ensure `cssCreate()` is called after style definitions
2. **SSR errors**: Verify client-side only execution
3. **Performance issues**: Batch style operations
4. **Missing styles**: Check for typos in class names
5. **Override conflicts**: Use more specific selectors or `!important`

This integration guide provides the foundation for effectively using NGX-Angora-CSS in the Zoolandingpage project while maintaining performance and best practices.
