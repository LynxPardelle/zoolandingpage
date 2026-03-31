# Suggested API Payload (No Endpoints Assumed)

This repo does not assume a specific backend implementation, but the config system becomes most useful when a backend can store and return page configs.

This document describes a suggested payload shape that works well with `wrapper-orchestrator` and is easy for an AI assistant to generate.

For the current runtime, treat `site-config.json`, `page-config.json`, `components.json`, `variables.json`, `angora-combos.json`, and `i18n/*.json` as the authored payload set. `page-config.json` now owns page-level `seo`, `structuredData`, and `analytics` sections. Do not bundle debug-only UI into production page payloads unless the page explicitly owns that experience.

`angora-combos.json` is the runtime source of truth for reusable visual bundles. The client no longer recreates Zoolanding-specific combos from TypeScript fallback code.

If an API response omits `angora-combos`, the page still loads, but it runs without authored combo bundles for that draft.

## Site config payload

`site-config.json` owns domain routing, shared runtime settings, and the always-required site metadata used by every page in that domain.

```json
{
  "version": 1,
  "domain": "example.com",
  "defaultPageId": "default",
  "routes": [{ "path": "/", "pageId": "default", "label": "Home" }],
  "site": {
    "appIdentity": {
      "identifier": "examplecom",
      "name": "Example",
      "version": "1.0.0",
      "description": "Example landing site"
    },
    "seo": {
      "siteName": "Example",
      "title": "Example",
      "description": "Shared SEO defaults for the Example site.",
      "canonicalOrigin": "https://example.com",
      "defaultImage": "https://example.com/assets/og-default.png",
      "openGraph": {
        "type": "website",
        "site_name": "Example"
      },
      "twitter": {
        "card": "summary_large_image"
      }
    },
    "theme": {
      "defaultMode": "light",
      "palettes": {
        "light": {
          "bgColor": "#ffffff",
          "textColor": "#111111",
          "titleColor": "#222222",
          "linkColor": "#333333",
          "accentColor": "#444444",
          "secondaryBgColor": "#f5f5f5",
          "secondaryTextColor": "#555555",
          "secondaryTitleColor": "#666666",
          "secondaryLinkColor": "#777777",
          "secondaryAccentColor": "#888888"
        },
        "dark": {
          "bgColor": "#111111",
          "textColor": "#f5f5f5",
          "titleColor": "#fefefe",
          "linkColor": "#dddddd",
          "accentColor": "#cccccc",
          "secondaryBgColor": "#1b1b1b",
          "secondaryTextColor": "#bbbbbb",
          "secondaryTitleColor": "#aaaaaa",
          "secondaryLinkColor": "#999999",
          "secondaryAccentColor": "#888888"
        }
      }
    },
    "i18n": {
      "defaultLanguage": "en",
      "supportedLanguages": ["en", "es"]
    }
  },
  "defaults": {
    "ui": {
      "modals": {
        "_default": {
          "size": "sm"
        }
      }
    }
  },
  "runtime": {
    "localStorage": {
      "theme": "example-theme",
      "language": "example-language",
      "userPreferences": "example-preferences",
      "id": "example-id",
      "sessionId": "example-session-id",
      "allowAnalytics": "example-allow-analytics",
      "analyticsConsentSnooze": "example-allow-analytics-snooze",
      "pageViewCount": "example-page-view-count"
    },
    "features": {
      "debugMode": true
    },
    "analytics": {
      "enabled": false,
      "consentUI": "none",
      "consentSnoozeSeconds": 30,
      "track": ["ip", "language", "screenWidth"],
      "quickStats": {
        "pageView": { "event": "page_view", "path": "metrics.pageViews", "by": 1 },
        "events": [{ "name": "cta_click", "path": "metrics.ctaClicks", "by": 1 }]
      }
    }
  }
}
```

Rules:

- Keep `runtime.localStorage` limited to logical slot names, not arbitrary keys.
- Keep `runtime.features` focused on runtime behavior flags, not component content.
- Keep always-required site metadata in `site-config.json.site`.
- Keep site-wide SEO defaults in `site-config.json.site.seo` and reserve `page-config.json.seo` for page-specific metadata.
- Use `site-config.json.defaults` for optional shared values that multiple pages in the same domain reuse.
- Multi-page domains should centralize repeated values in `site-config.json` and keep per-page `variables.json` files as route-specific deltas.

## Recommended payload shape

Use a **components array** in transport payloads and drafts:

```ts
export type LandingPageConfigPayload = {
  version: 1;
  domain: string;
  pageId: string;
  rootIds: readonly string[];
  variables?: {
    contact?: {
      whatsappPhone: string;
      whatsappMessageKey?: string;
      faqMessageKey?: string;
      finalCtaMessageKey?: string;
    };
  };
  components: Array<{
    id: string;
    type: string;
    config: unknown;
    domain?: string;
    pageId?: string;
    valueInstructions?: string;
    eventInstructions?: string;
    order?: number;
    meta_title?: string;
  }>;
};
```

Draft storage rules:

- Shared site components can live in `public/assets/drafts/{domain}/components.json` with top-level `pageId: "allPages"`.
- Page-owned components stay in `public/assets/drafts/{domain}/{pageId}/components.json`.
- The debug authoring exporter should emit those same two files directly instead of flattening shared and page-owned entries back into one page payload.
- The runtime merges shared plus page-owned draft components by `id`, and the page-owned component wins on collision.

API storage rules:

- Persist `domain` and `pageId` for each stored component record.
- Use `pageId: "allPages"` for shared components.
- The lambda should return only the effective component array for the requested `domain` and `pageId`; the client should not need to merge `allPages` records itself.

## Transport considerations

- Store configs as JSON.
- Validate on write (server-side):
  - unique IDs
  - `type` in allowed set
  - `valueInstructions` only uses allowlisted resolver IDs
  - no function values (JSON can’t represent them anyway)
  - `angora-combos` present whenever the page depends on authored combo keys for appearance
  - required nested contracts such as `site.appIdentity`, `site.theme`, `site.i18n.defaultLanguage`, `site.i18n.supportedLanguages`, and `config.ui.contact.whatsappPhone` / `config.ui.contact.whatsappMessageKey` when WhatsApp handlers are used through shared defaults or page variables

## Client loading strategy (future)

A future client-side loader can:

1. Fetch `LandingPageConfigPayload` for the requested `domain` and `pageId`.
2. Receive one merged array of components already filtered for that page.
3. Store it in an in-memory registry keyed by component `id`.
4. Provide `getComponentById(id)` and root ID lists.
5. Render via `<wrapper-orchestrator [componentsIds]="payload.rootIds" />`.

## Page-owned analytics payload

`page-config.json.analytics` now carries page-level engagement behavior plus optional page-specific overrides:

```json
{
  "version": 1,
  "pageId": "default",
  "domain": "example.com",
  "rootIds": ["siteHeader", "landingPage", "siteFooter"],
  "analytics": {
    "sectionIds": ["home", "features"],
    "scrollMilestones": [25, 50, 75, 100],
    "quickStats": {
      "events": [{ "name": "cta_click", "path": "metrics.ctaClicks", "by": 1 }]
    }
  }
}
```

Rules:

- Put domain-wide analytics policy in `site-config.json` under `runtime.analytics`.
- Keep `page-config.json.analytics` page-owned: `sectionIds`, `scrollMilestones`, and only page-specific analytics overrides.
- `events` maps canonical framework event IDs to the names sent to the analytics sink.
- `categories` maps canonical framework categories to sink-specific category values.
- `quickStats.events` maps canonical event IDs to metric paths and increments.
- `track` belongs in `site-config.json` unless a page truly needs to override it.
- Keep handler IDs and `eventInstructions` action names in code; only emitted taxonomy belongs in payloads.

## Security model

- `valueInstructions` is allowlisted; unknown resolver IDs are ignored.
- Do not rely on `env.*`; shared runtime settings belong in `site-config.json`.
- Keep handlers deterministic and side-effect-free.
- Treat missing required payload sections as validation failures rather than relying on local runtime fallbacks.
