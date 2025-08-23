# Task 3: Animations and Angora Integration - Changelog

## Changes

- Hero: Animate content with Angular triggers; disabled when `prefers-reduced-motion` is on
- Modal: Backdrop fade and panel scale-in disabled when reduced motion
- Minor: Added `ank-transition-none` on image container when reduced motion

## Validation

- ng serve compiles without errors
- Manual check: toggle OS reduced motion; animations are subdued/removed
