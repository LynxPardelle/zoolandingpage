# Task 1: Hero & Messaging - Changelog

## Changes

- LandingPageComponent: heroData switched from constant signal to computed that reacts to LanguageService
- Added EN copy alongside ES for title, subtitle, description, primary/secondary labels, and badges
- Kept reduced-motion guards and Angora utility classes in HeroSection (no hardcoded colors)

## Validation

- ng serve: Application compiled and started locally (Angular dev server output OK)
- Console shows initial `page_view` analytics; hero renders with ES by default and updates when language changes
- Next: consider localizing template-only strings in hero placeholders (non-blocking)
