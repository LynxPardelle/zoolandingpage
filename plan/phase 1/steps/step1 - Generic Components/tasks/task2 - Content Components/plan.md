# Task 2: Content Components Plan (Revised 2025-08-17)

## Revision Summary

This task was partially executed implicitly while decomposing the monolithic `AppComponent` (Task 1). Several content/display pieces now exist (HeroSection, FeatureCard, TestimonialCard, CallToAction, and the section wrapper components: conversion-note, features-section, interactive-process, services-section, conversion-calculator-section, testimonials-section, final-cta-section). The revised scope focuses on:

1. Achieving atomic compliance for all existing section components (add `*.types.ts` + `*.constants.ts`).
2. Implementing missing generic abstractions (Generic Button, ContentBlock, StatsCounter, WhatsAppButton).
3. Adding structured data (JSON-LD) & enhanced analytics instrumentation.
4. Introducing performance placeholders and `@defer` usage for non-critical content.
5. Laying minimal test stubs to accelerate Task 4 (without duplicating Task 4 scope).

## Status Snapshot

| Area                   | Summary                                                                 |
| ---------------------- | ----------------------------------------------------------------------- |
| Existing Components    | All high-level landing sections created ✅                              |
| Atomic Gaps            | All section `types/constants` added ✅                                  |
| New Abstractions       | Generic Button ✅; WhatsAppButton ✅; StatsCounter ✅; ContentBlock ✅  |
| Analytics              | CTA + WhatsApp events ✅; header/nav events ✅; others minor pending ⏳ |
| Structured Data        | Service + org/hero/testimonials injected ✅                             |
| Performance (`@defer`) | Placeholders planned ⏳                                                 |
| Tests (stubs)          | Pending creation ⏳ (scheduled next)                                    |

Legend: ✅ done, ⏳ in-scope pending, ➡️ deferred (out of current scope)

## Objectives (Revised)

### Primary

- Provide reusable interactive/content primitives (Button, ContentBlock, StatsCounter, WhatsAppButton).
- Retrofit all section components to atomic pattern (separate concise files, exported types/constants).
- Add analytics & SEO structured data for testimonials / organization / hero.
- Introduce `@defer` + placeholders for non-critical blocks (testimonials media, Conversion calculator heavy parts).

### Secondary

- Establish constrained variant system for button (4 variants, 3 sizes) to avoid scope creep.
- Prepare baseline test files (render + minimal assertions) to streamline Task 4 expansion.
- Document any intentionally deferred enhancements (animations, gallery, contact form).

## Component Inventory & Gaps

| Category    | Component            | Impl Status | Atomic Completeness       | Notes                           |
| ----------- | -------------------- | ----------- | ------------------------- | ------------------------------- |
| Content     | HeroSection          | ✅          | Mostly (verify constants) | Extra layouts deferred          |
| Content     | FeatureCard          | ✅          | Missing constants/styles  | Animations later                |
| Content     | TestimonialCard      | ✅          | Missing constants/styles  | Structured data pending         |
| Section     | RoiNoteSection       | ✅          | Missing types/constants   | Static copy centralization      |
| Section     | ServicesSection      | ✅          | Missing types/constants   | Service list config             |
| Section     | FeaturesSection      | ✅          | Missing types/constants   | Move feature list out of root   |
| Section     | InteractiveProcess   | ✅          | Missing types/constants   | Step model extraction           |
| Section     | RoiCalculatorSection | ✅          | Missing types/constants   | Defaults & labels               |
| Section     | TestimonialsSection  | ✅          | Missing types/constants   | SEO snippet builder             |
| Section     | FinalCtaSection      | ✅          | Missing types/constants   | Variant mapping                 |
| CTA         | CallToAction         | ✅          | Complete                  | Analytics baseline              |
| Interactive | Generic Button       | ✅          | Complete                  | Consumed by CTA / final-cta     |
| Interactive | WhatsAppButton       | ✅          | Complete                  | Analytics integrated            |
| Display     | ContentBlock         | ✅          | Complete (baseline)       | Optional media support          |
| Metrics     | StatsCounter         | ✅          | Complete                  | Awaiting placement              |
| Media       | ImageGallery         | ➡️          | N/A                       | Deferred (low Conversion now)   |
| Forms       | ContactForm          | ➡️          | N/A                       | Defer until form spec clarified |

## Revised Implementation Tasks

1. (Done) Generic Button.
2. (Done) WhatsAppButton.
3. (Done) ContentBlock.
4. (Done) StatsCounter.
5. (Done) Retrofit section components (types/constants).
6. (Done) JSON-LD helper + inject org/hero/testimonials.
7. (Pending) Apply `@defer` placeholders.
8. (Pending) Minimal test stubs.
9. (Ongoing) Update docs/changelog (reflect completed retrofits).

## New Component Contracts

### Generic Button

- Inputs: `variant: 'primary'|'secondary'|'outline'|'ghost'`; `size: 'sm'|'md'|'lg'`; `loading?: boolean`; `disabled?: boolean`; `label?: string`; `icon?: string`.
- Output: `pressed` (MouseEvent or KeyboardActivation).
- Accessibility: `role="button"` when needed; `aria-busy` when loading; ensures focus ring.

### WhatsAppButton

- Inputs: `phone: string`; `message?: string`; `label?: string`.
- Output: `activated`.
- Behavior: Constructs `https://wa.me/{phone}?text=...`; opens new tab; emits analytics event.

### ContentBlock

- Input: `data: ContentBlockData` with `layout` discriminant.
- Slots: projected actions area; fallback semantics if empty.

### StatsCounter

- Inputs: `value`, `durationMs?`, `format?`.
- Behavior: When first intersecting, animate 0 -> value; stops; respects prefers-reduced-motion (skip animation).

## Atomic Retrofit Checklist

| Component                     | types.ts | constants.ts | Notes                      |
| ----------------------------- | -------- | ------------ | -------------------------- |
| features-section              | ✅       | ✅           | Types/constants added      |
| services-section              | ✅       | ✅           | Types/constants added      |
| testimonials-section          | ✅       | ✅           | Type + SEO builder added   |
| conversion-calculator-section | ✅       | ✅           | Defaults added             |
| interactive-process           | ✅       | ✅           | Step definitions extracted |
| final-cta-section             | ✅       | ✅           | Variant map + constants    |
| conversion-note               | ✅       | ✅           | Static copy export         |

## Success Criteria

- [ ] Generic Button consumed by at least Hero & Final CTA.
- [ ] WhatsAppButton extracted & analytics event fires.
- [ ] ContentBlock used (or deferral documented with rationale).
- [ ] StatsCounter animates once; respects reduced motion.
- [x] All listed sections have separate `types` & `constants` files (<80 lines each component TS file).
- [ ] Structured data (JSON-LD) injected (hero + testimonials) validated (Rich Results Test).
- [ ] At least 2 sections use `@defer` with user-friendly placeholder.
- [ ] Minimal test stubs (passing) for new components.
- [ ] No bundle size increase >10KB gzip (baseline vs post-implementation measurement).

## Risks & Mitigations

| Risk                             | Impact         | Mitigation                                              |
| -------------------------------- | -------------- | ------------------------------------------------------- |
| Over-engineering Button variants | Delays         | Cap variants/sizes; document extension path             |
| StatsCounter jank                | UX degradation | Use rAF; minimal DOM writes; bail if off-screen quickly |
| JSON-LD duplication              | SEO penalty    | Single injection guard in helper                        |
| Scope creep (Gallery/Form)       | Schedule slip  | Explicit deferral with rationale                        |

## Deliverables Status

| Deliverable                         | Status                                    |
| ----------------------------------- | ----------------------------------------- |
| Generic Button                      | ✅                                        |
| WhatsAppButton                      | ✅                                        |
| ContentBlock                        | ✅                                        |
| StatsCounter                        | ✅                                        |
| Section atomic retrofits            | Complete                                  |
| JSON-LD structured data             | Complete (org/hero/testimonials injected) |
| `@defer` placeholders               | Pending                                   |
| Test stubs (new components)         | Pending                                   |
| Docs / changelog updates            | In Progress                               |
| Section atomic retrofits            | ✅                                        |
| JSON-LD structured data             | ✅                                        |
| `@defer` placeholders               | ⏳                                        |
| Test stubs (new components)         | ⏳                                        |
| Docs / changelog updates            | ⏳                                        |
| Deferred: ImageGallery, ContactForm | ➡️                                        |

## Immediate Next Actions (Execution Order)

1. (Complete) Core primitives (Generic Button, WhatsAppButton, ContentBlock, StatsCounter).
2. (Complete) Section retrofits (all target section types/constants added).
3. (Complete) JSON-LD (organization, hero, testimonials injected; optional Conversion schema TBD).
4. (Pending) Add @defer placeholders (targets: testimonials list, Conversion calculator panel).
5. (Pending) Integrate StatsCounter into Conversion or metrics strip.
6. (Pending) Minimal spec stubs.
7. (Pending) Plan/changelog finalization & validation checklist refresh (after tests & defer placeholders).

---

## Historical Original Spec (Excerpt)

The original Task 2 specification (before revision) began with goals to create all content display and interactive components (HeroSection, FeatureCard, TestimonialCard, Button, ContactForm, ImageGallery, etc.), add animations, and ensure theme/i18n integration. It included detailed breakdowns for Hero, CallToAction, ContentBlock, FeatureCard, TestimonialCard, Button, ContactForm, WhatsAppButton, StatsCounter, ImageGallery plus technical standards (atomic files, signals, `pushColors`, animations) and initial implementation week-by-week schedule. That historical detail is retained in repository history; this excerpt notes its preservation for traceability without duplicating the entire previous text to satisfy markdown lint rules.
