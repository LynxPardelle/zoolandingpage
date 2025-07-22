# NGX-Angora-CSS Usage Guide

## Table of Contents

1. [Overview](#overview)
2. [Installation and Setup](#installation-and-setup)
3. [Basic Usage](#basic-usage)
4. [Properties and Values](#properties-and-values)
5. [Pseudo-classes and Elements](#pseudo-classes-and-elements)
6. [Abbreviations System](#abbreviations-system)
7. [Combos System](#combos-system)
8. [Reserved Words](#reserved-words)
9. [Methods and API](#methods-and-api)
10. [Best Practices](#best-practices)
11. [Examples](#examples)

## Overview

NGX-Angora-CSS is a dynamic CSS generation library that allows you to write CSS properties and values directly in HTML class names. It provides a powerful system for creating responsive, interactive, and maintainable styling through class-based declarations.

### Key Features

- **Dynamic CSS Generation**: CSS rules are generated on-the-fly based on your class names
- **Responsive Design**: Built-in breakpoint support for mobile-first design
- **Interactive States**: Support for hover, focus, active, and other pseudo-classes
- **Abbreviations System**: Create custom shorthand for properties and values
- **Combos System**: Define reusable style combinations with variable values
- **Framework Agnostic**: Works with Angular, React, Vue, or vanilla JavaScript

### Class Structure

All Angora CSS classes follow this pattern:

```text
ank-property-value || ank-property-breakpoint-value
```

## Installation and Setup

### NPM Installation

```bash
npm install ngx-angora-css
```

### Angular Integration

```typescript
import { Component } from '@angular/core';
import { NGXAngoraService } from 'ngx-angora-css';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent {
  constructor(private _ank_: NGXAngoraService) {
    // Initialize CSS generation
    this._ank.cssCreate();
  }
  
  ngDoCheck(): void {
    // Regenerate CSS when DOM changes
    this._ank.cssCreate();
  }
}
```

### Setup CSS File

Create a CSS file named `ank-styles.css` and link it to your HTML:

```html
<link rel="stylesheet" href="your/assets/location/ank-styles.css">
```

**Important**: This file is where Angora CSS will inject the generated CSS rules.

## Basic Usage

### Simple Property-Value Declarations

```html
<!-- Spacing -->
<div class="ank-p-20px ank-m-10px">Padding 20px, margin 10px</div>
<div class="ank-mt-15px ank-mb-25px">Margin top 15px, bottom 25px</div>

<!-- Colors -->
<div class="ank-color-red ank-bg-blue">Red text, blue background</div>
<div class="ank-color-primary ank-bg-secondary">Using semantic colors</div>

<!-- Typography -->
<h1 class="ank-fontSize-24px ank-fontWeight-bold">Large bold heading</h1>
<p class="ank-lineHeight-1_6 ank-letterSpacing-1px">Styled paragraph</p>

<!-- Layout -->
<div class="ank-display-flex ank-justifyContent-center ank-alignItems-center">
  Flexbox centered content
</div>
```

### Responsive Design

```html
<!-- Mobile-first responsive classes -->
<div class="ank-p-10px ank-p-md-20px ank-p-lg-30px">
  Responsive padding: 10px on mobile, 20px on medium, 30px on large
</div>

<div class="ank-fontSize-16px ank-fontSize-sm-18px ank-fontSize-lg-20px">
  Responsive text: 16px mobile, 18px small, 20px large
</div>

<!-- Grid layout responsive -->
<div class="ank-display-grid ank-gridTemplateColumns-1fr ank-gridTemplateColumns-md-repeatSD2COM1frED ank-gridTemplateColumns-lg-repeatSD3COM1frED ank-gap-20px">
  Responsive grid: 1 column mobile, 2 columns tablet, 3 columns desktop
</div>
```

### Available Breakpoints

| Prefix | Breakpoint | Min Width |
|--------|------------|-----------|
| `xs` | Extra Small | 0px |
| `sm` | Small | 576px |
| `md` | Medium | 768px |
| `lg` | Large | 992px |
| `xl` | Extra Large | 1200px |
| `xxl` | XXL | 1400px |

## Properties and Values

### Value Types and Formats

#### Numeric Values

```html
<!-- Pixels -->
<div class="ank-w-300px ank-h-200px">Fixed dimensions</div>

<!-- Percentages -->
<div class="ank-w-100per ank-h-50per">Percentage dimensions</div>

<!-- Em and Rem units -->
<div class="ank-fontSize-2em ank-p-1_5rem">Relative units</div>

<!-- Viewport units -->
<div class="ank-height-100vh ank-width-50vw">Viewport dimensions</div>
```

#### Color Values

```html
<!-- Named colors -->
<div class="ank-color-red ank-bg-blue">Named colors</div>

<!-- Hex colors -->
<div class="ank-color-HASHFF0000 ank-bg-HASH00FF00">Hex colors</div>

<!-- RGB/RGBA -->
<div class="ank-color-rgbSD255COM0COM0ED">RGB color</div>
<div class="ank-bg-rgbaSD0COM255COM0COM0_5ED">RGBA background</div>

<!-- HSL colors -->
<div class="ank-color-hslSD120COM100perCOM50perED">HSL color</div>
```

#### Multi-value Properties

```html
<!-- Border shorthand -->
<div class="ank-border-1px__solid__black">Border: 1px solid black</div>

<!-- Box shadow -->
<div class="ank-boxShadow-0__2px__4px__rgbaSD0COM0COM0COM0_1ED">Shadow effect</div>

<!-- Transform -->
<div class="ank-transform-translateSD10pxCOM20pxED">Transform translate</div>
```

## Pseudo-classes and Elements

### Interactive States

```html
<!-- Hover effects -->
<div class="ank-colorHover-blue ank-bgHover-red">
  Changes color and background on hover
</div>

<!-- Focus states -->
<input class="ank-border-gray-300 ank-borderFocus-blue-500 ank-borderWidthFocus-2px">

<!-- Active states -->
<button class="ank-transformActive-scaleSD0_95ED">Press effect</button>

<!-- Complex interactive button -->
<button class="ank-bg-primary ank-color-white ank-p-12px__24px ank-border-none ank-borderRadius-6px ank-cursor-pointer ank-bgHover-primary-dark ank-transformHover-translateYSDMIN2pxED ank-boxShadowHover-0__4px__8px__rgbaSD0COM0COM0COM0_2ED ank-transformActive-translateYSD0ED ank-boxShadowFocus-0__0__0__3px__rgbaSD0COM123COM255COM0_25ED">
  Complete Interactive Button
</button>
```

### Form States

```html
<!-- Checkbox styling -->
<input type="checkbox" class="ank-bgChecked-green ank-borderChecked-green">

<!-- Input validation -->
<input type="email" class="ank-border-gray-300 ank-borderValid-green ank-borderInvalid-red">

<!-- Disabled states -->
<button disabled class="ank-opacityDisabled-0_5 ank-cursorDisabled-not-allowed">
  Disabled Button
</button>
```

### Pseudo-elements

```html
<!-- Adding content with pseudo-elements -->
<div class="ank-contentBefore-CDB★CDB ank-colorBefore-gold">
  Star before text
</div>

<!-- Placeholder styling -->
<input placeholder="Enter text" class="ank-colorPlaceholder-gray-400 ank-fontStylePlaceholder-italic">

<!-- Selection styling -->
<div class="ank-bgSelection-blue ank-colorSelection-white">
  Select this text to see custom selection colors
</div>
```

## Abbreviations System

### Creating Custom Abbreviations

```typescript
// Add value abbreviations
_ank.pushAbreviationsValues({
  'spaceSmall': '16px',
  'spaceMedium': '24px',
  'spaceLarge': '32px',
  'textSmall': '16px',
  'textMedium': '18px',
  'textLarge': '20px'
});

// Add class abbreviations
_ank.pushAbreviationsClasses({
  'alIte': 'ank-alignItems',
  'alIteCent': 'ank-alignItems-center'
});
```

### Using Abbreviations

```html
<!-- Using value abbreviations -->
<div class="ank-padding-spaceMedium ank-fontSize-textLarge">
  Padded container with large text
</div>

<!-- Using class abbreviations -->
<div class="ank-display-flex ank-justifyContent-center alIte-center ank-minHeight-100vh">
  <div>Centered content</div>
</div>
```

## Combos System

### Creating Basic Combos

```typescript
// Create reusable style combinations
_ank.pushCombos({
  'cardBase': 'ank-bg-white ank-borderRadius-8px ank-boxShadow-0__2px__4px__rgbaSD0COM0COM0COM0_1ED ank-p-20px',
  'btnPrimary': 'ank-bg-primary ank-color-white ank-p-10px_20px ank-border-none ank-borderRadius-5px ank-cursor-pointer'
});
```

### Variable Combos with VAL/DEF Pattern

```typescript
// Combos with variable values and defaults
_ank.pushCombos({
  'customBox': [
    'ank-w-VAL1DEF85perDEF',
    'ank-border-VAL2DEF1px__solid__darkDEF',
    'ank-bg-VAL3DEFsuccessDEF',
    'ank-color-VAL4DEFaquaDEF',
    'ank-p-VAL5DEF1_5remDEF'
  ]
});
```

### Using Combos

```html
<!-- Basic combo usage -->
<div class="cardBase">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

<!-- Variable combo with defaults -->
<div class="customBox">Default styling</div>

<!-- Variable combo with custom values -->
<div class="customBoxVALSVL75perVL3px__dashed__grayVLtealVLbeastVL2rem">
  Custom: 75% width, dashed gray border, teal background, beast text color, 2rem padding
</div>
```

## Reserved Words

### Character Replacements

| Reserved Word | Translates To | Example |
|---------------|---------------|---------|
| `per` | `%` | `50per` → `50%` |
| `COM` | `,` | `redCOMblue` → `red, blue` |
| `CDB` | `"` | `CDBtextCDB` → `"text"` |
| `MIN` | `-` | `MIN10px` → `-10px` |
| `SD` | `(` | `calcSD...` → `calc(...` |
| `ED` | `)` | `...100pxED` → `...100px)` |
| `HASH` | `#` | `HASHFF0000` → `#FF0000` |
| `__` | ` ` | `margin__top` → `margin top` |
| `_` | `.` | `1_5rem` → `1.5rem` |

### CSS Selector Delimiters

| Reserved Word | Translates To | Example |
|---------------|---------------|---------|
| `CHILD` | ` > ` | `divCHILDspan` → `div > span` |
| `ADJ` | ` + ` | `pADJdiv` → `p + div` |
| `SIBL` | ` ~ ` | `h1SIBLp` → `h1 ~ p` |
| `ALL` | `*` | `ALL` → `*` |

### Usage Examples

```html
<!-- Complex CSS values -->
<div class="ank-boxShadow-0__2px__4px__lavenderCOM__inset__2px__0__4px__fairy">
  Complex box shadow
</div>

<!-- CSS calc() function -->
<div class="ank-width-calcSD50px__PLUS__10vwED">
  Width: calc(50px + 10vw)
</div>

<!-- Child selectors -->
<div class="ank-colorSELCHILDspan-red">
  Targets child spans with red color
</div>
```

## Methods and API

### Core Methods

```typescript
// CSS Generation
_ank.cssCreate(); // Generate CSS for current DOM

// Color Management
_ank.pushColors({
  'brand-blue': '#1a73e8',
  'brand-green': '#34a853'
});

// Breakpoint Management
_ank.pushBPS({
  'tablet': 768,
  'desktop': 1024
});

// Abbreviation Management
_ank.pushAbreviationsValues({
  'spaceMd': '24px'
});

_ank.pushAbreviationsClasses({
  'flexCol': 'ank-flexDirection-column'
});

// Combo Management
_ank.pushCombos({
  'btn-primary': 'ank-bg-primary ank-color-white ank-p-10px_20px'
});
```

### Utility Methods

```typescript
// Color Transformations
_ank.lighten('#ff0000', 0.2);
_ank.darken('#ff0000', 0.2);
_ank.saturate('#ff0000', 0.2);
_ank.complement('#ff0000');

// CSS Conversions
_ank.cssValidToCamel('background-color'); // Returns: 'backgroundColor'
_ank.camelToCSSValid('backgroundColor'); // Returns: 'background-color'

// Debug
_ank.changeDebugOption(); // Toggle debug mode
```

## Best Practices

### Class Organization

1. **Group Related Properties**: Keep layout, spacing, and visual properties together
2. **Use Semantic Names**: Prefer `ank-color-primary` over `ank-color-blue`
3. **Mobile-First**: Start with base styles, then add responsive modifiers

### Performance Tips

1. **Initialize Early**: Call `cssCreate()` during application initialization
2. **Batch Updates**: Add multiple colors/combos at once
3. **Use Efficient Values**: Avoid overly complex single-string combos

### Naming Conventions

1. **Consistent Units**: Stick to px, rem, or % consistently within a project
2. **Clear Abbreviations**: Use descriptive names for custom abbreviations
3. **Avoid Conflicts**: Check against reserved words and built-in values

## Examples

### Complete Card Component

```html
<div class="ank-bg-white ank-borderRadius-8px ank-boxShadow-0__2px__4px__rgbaSD0COM0COM0COM0_1ED ank-p-30px ank-marginBottom-20px ank-transformHover-translateYSDMIN2pxED ank-boxShadowHover-0__4px__8px__rgbaSD0COM0COM0COM0_15ED">
  <h3 class="ank-fontSize-24px ank-color-gray-800 ank-marginBottom-15px ank-fontWeight-600">
    Card Title
  </h3>
  <p class="ank-fontSize-16px ank-lineHeight-1_6 ank-color-gray-600 ank-marginBottom-20px">
    This is a complete card component with hover effects and proper spacing.
  </p>
  <button class="ank-bg-primary ank-color-white ank-p-10px_20px ank-border-none ank-borderRadius-5px ank-cursor-pointer ank-bgHover-primary-dark ank-transformHover-translateYSDMIN1pxED">
    Action Button
  </button>
</div>
```

### Responsive Navigation

```html
<nav class="ank-bg-white ank-boxShadow-0__2px__4px__rgbaSD0COM0COM0COM0_1ED ank-p-10px ank-p-md-20px">
  <div class="ank-display-flex ank-justifyContent-spaceBetween ank-alignItems-center ank-maxWidth-1200px ank-margin-0__auto">
    <div class="ank-fontSize-20px ank-fontSize-md-24px ank-fontWeight-bold ank-color-primary">
      Brand
    </div>
    
    <!-- Mobile menu toggle -->
    <button class="ank-display-block ank-display-md-none ank-bg-transparent ank-border-none ank-fontSize-18px ank-cursor-pointer">
      ☰
    </button>
    
    <!-- Desktop navigation -->
    <div class="ank-display-none ank-display-md-flex ank-gap-30px">
      <a href="#" class="ank-color-gray-700 ank-textDecoration-none ank-fontWeight-500 ank-colorHover-primary">
        Home
      </a>
      <a href="#" class="ank-color-gray-700 ank-textDecoration-none ank-fontWeight-500 ank-colorHover-primary">
        About
      </a>
      <a href="#" class="ank-color-gray-700 ank-textDecoration-none ank-fontWeight-500 ank-colorHover-primary">
        Contact
      </a>
    </div>
  </div>
</nav>
```

### Form with Validation Styles

```html
<form class="ank-maxWidth-500px ank-margin-0__auto ank-p-20px">
  <div class="ank-marginBottom-20px">
    <label class="ank-display-block ank-marginBottom-5px ank-fontWeight-600 ank-color-gray-700">
      Email
    </label>
    <input 
      type="email" 
      required
      class="ank-width-100per ank-p-12px ank-border-1px__solid__gray-300 ank-borderRadius-6px ank-fontSize-16px ank-borderFocus-blue-500 ank-outlineFocus-none ank-borderValid-green-500 ank-borderInvalid-red-500"
      placeholder="Enter your email"
    >
  </div>
  
  <div class="ank-marginBottom-20px">
    <label class="ank-display-block ank-marginBottom-5px ank-fontWeight-600 ank-color-gray-700">
      Message
    </label>
    <textarea 
      required
      rows="4"
      class="ank-width-100per ank-p-12px ank-border-1px__solid__gray-300 ank-borderRadius-6px ank-fontSize-16px ank-borderFocus-blue-500 ank-outlineFocus-none ank-borderValid-green-500 ank-borderInvalid-red-500 ank-resize-vertical"
      placeholder="Enter your message"
    ></textarea>
  </div>
  
  <button 
    type="submit"
    class="ank-width-100per ank-bg-primary ank-color-white ank-p-12px ank-border-none ank-borderRadius-6px ank-fontSize-16px ank-fontWeight-600 ank-cursor-pointer ank-bgHover-primary-dark ank-transformHover-translateYSDMIN1pxED ank-boxShadowFocus-0__0__0__3px__rgbaSD0COM123COM255COM0_25ED"
  >
    Send Message
  </button>
</form>
```

This comprehensive guide covers all aspects of using NGX-Angora-CSS effectively in your projects. The library provides powerful tools for creating maintainable, responsive, and interactive designs through its class-based approach.
