Date: 2026-04-28 (Central Time)
Scope: Reusable SSR hydration and canonical-SEO constraints for shared landing runtime behavior.
Status: Active
Applies To: Shared authored HTML rendering, SEO fallback metadata, sitemap generation
Source Of Truth:

- src/app/shared/components/generic-text/generic-text.ts
- src/app/shared/services/seo-metadata.service.ts
- src/app/shared/services/structured-data.service.ts
- src/app/shared/services/runtime-data-source.service.ts
- src/app/shared/utility/metadata-template.utility.ts
- src/server.ts
- drafts/pamelabetancourt.com/site-config.json
- drafts/pamelabetancourt.com/home/page-config.json
  Confidence: High
  Last Reviewed: 2026-05-13 (Central Time)

# SSR Hydration And Canonical Sitemap Rules

## Rule

- Do not render block-authored HTML inside inline or paragraph hosts in `GenericText`; promote those payloads to a block-safe host first.
- When a page omits `og:url`, fall back to the canonical page URL instead of the raw document origin.
- When generating `sitemap.xml`, dedupe routes by resolved canonical page URL, not by raw route path, because one page can intentionally ship multiple public aliases.
- API-fed detail pages may use metadata templates such as `{{var:...}}` and `{{query:...}}` in SEO and JSON-LD, but the runtime data source that fills SEO-critical variables must be marked `ssr: true`.
- Keep broad or heavy runtime sources out of SSR unless their values are needed for first paint, SEO, or JSON-LD.
- Dynamic detail route bases that are not useful by themselves, such as `/pokemon` without a `name` query, should be excluded from sitemap output and replaced with explicit configured URLs.
- JSON-LD values sourced from runtime variables or query params must be escaped before insertion into `<script type="application/ld+json">`.

## Why It Exists

- Invalid authored HTML nesting can survive SSR output but fail during production hydration with Angular `nextSibling` errors.
- Proxy, local, or alias origins can differ from the intended canonical `https` URL, which makes raw-origin SEO fallbacks drift from page intent.
- Multi-route pages such as Pamela can legally expose both `/` and `/home` in routing while only one of them should remain indexable in sitemap output.
- Crawlers read the server-rendered head first. If SSR does not wait for the small SEO-critical API read, crawlers can receive unresolved `{{...}}` templates in titles, canonicals, Open Graph images, or JSON-LD.
- A sitemap that lists parameterized base routes can invite crawlers to index incomplete pages instead of representative detail URLs.

## How To Work Safely

1. If shared text payloads can contain block HTML like `<p>`, `<ul>`, or multiple paragraphs, validate them with a production SSR browser pass in desktop and mobile viewports.
2. For SEO fallback changes, inspect the rendered canonical link, `og:url`, and default OG or Twitter image URLs on both canonical and alias routes.
3. For sitemap changes, verify the generated XML with real host headers and confirm duplicate page routes collapse to the canonical URL.
4. For API-fed SEO pages, fetch the raw SSR HTML before browser hydration and confirm the head contains resolved title, canonical, robots, Open Graph, Twitter, and JSON-LD values.
5. If the canonical host changes from a preview URL to a public draft URL, verify DNS and Traefik or Dokploy routing before claiming the URL is indexable.
