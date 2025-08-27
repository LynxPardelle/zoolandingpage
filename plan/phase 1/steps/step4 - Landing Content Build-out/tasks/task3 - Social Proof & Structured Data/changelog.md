# Task 3: Social Proof & Structured Data - Changelog

## 2025-08-23

Changes:

- Localized Testimonials section title/subtitle via inputs; bound from Landing component using LanguageService.
- Converted testimonials list to computed() reacting to current language (ES/EN variants).
- Injected structured data (JSON-LD): WebSite, Organization, and ItemList of Review for testimonials using StructuredDataService and buildTestimonialListSchema().
- Kept accessibility: headings remain semantic; testimonial card preserves schema.org Review markup.

Files edited:

- src/app/landing-page/components/testimonials-section/testimonials-section.component.ts (add title/subtitle inputs)
- src/app/landing-page/components/testimonials-section/testimonials-section.component.html (bind to inputs)
- src/app/landing-page/components/landing-page/landing-page.component.ts (i18n testimonials + structured data injection)
- src/app/landing-page/components/landing-page/landing-page.component.html (pass title/subtitle)

Validation:

- Ran dev server (ng serve). Build completed and server available at <http://localhost:4200/>; console showed analytics page_view. Non-zero exit code observed from the task wrapper but app compiled and served correctly.

Notes / Next:

- Consider moving structured data to a dedicated SEO service if multiple pages are added.
- Add EN copy for Conversion note and Conversion strings to complete i18n coverage in Step 4.
