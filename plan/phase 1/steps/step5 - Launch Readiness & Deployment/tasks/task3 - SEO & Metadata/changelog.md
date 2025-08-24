# Task 3: SEO & Metadata — Changelog

Date: 2025-08-23

Changes implemented:

- Reactive SEO meta setup in `LandingPageComponent` using Angular `Title` and `Meta` services.
  - Localized title/description per LanguageService
  - Open Graph: title, description, type, url, image, locale
  - Twitter Card: summary_large_image (title, description, image)
  - Canonical link tag added/updated dynamically
- Structured Data: Left existing JSON-LD (Website, Organization, Testimonials) in place; validated injection flow.
- Added `public/robots.txt` (allows all) and `public/sitemap.xml` (home URL) drafts for search engines.

Validation:

- Dev server started; inspected head tags to confirm meta updates change when toggling language.
- Verified robots.txt and sitemap.xml are served from the public assets path.

Next up:

- Replace placeholder domain (example.com) with the real production hostname once available.
- Update OG/Twitter image URL to a real asset (1200x630 recommended) and ensure it’s publicly accessible.
- Run Google Rich Results test on JSON-LD and fix any warnings.

---

Date: 2025-08-23 (later)

Changes:

- Updated domain to [https://zoolandingpage.com](https://zoolandingpage.com) across meta, structured data, robots.txt and sitemap.xml
- Set OG image to [https://zoolandingpage.com/assets/og-1200x630.jpg](https://zoolandingpage.com/assets/og-1200x630.jpg) and Organization logo to [https://zoolandingpage.com/assets/logo-512x512.png](https://zoolandingpage.com/assets/logo-512x512.png)

Notes:

- Ensure the referenced assets exist at those URLs in production deployment.
