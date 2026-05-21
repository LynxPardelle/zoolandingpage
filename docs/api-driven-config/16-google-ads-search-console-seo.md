# Google Ads, Search Console, and SEO Runtime

This guide covers draft-owned Google tag, Google Ads conversion, Search Console, robots, sitemap, and consent settings.

## Google tag config

Add Google settings under `site-config.json.runtime.analytics.googleTag`.

For the current Zoolandingpage, Sulandingpage, and Zoosite rollout, Google Ads is expected to import or consume the linked GA4 event stream. The six configured domains currently use the central `zoositioweb.com.mx` GA4 stream (`G-QRWR768FCM`) after cross-domain measurement was configured in GA4, and they do not add physical `AW-...` Google Ads destinations. Keep `AW-...` IDs and conversion labels reserved for a future explicit direct-Ads conversion strategy.

```json
{
  "runtime": {
    "analytics": {
      "enabled": true,
      "consentUI": "none",
      "googleTag": {
        "enabled": true,
        "environments": {
          "local": false,
          "test": true,
          "production": true
        },
        "measurementIds": ["G-XXXXXXXXXX"],
        "adsIds": ["AW-XXXXXXXXXX"],
        "gtmId": "GTM-XXXXXXX",
        "sendPageView": false,
        "attribution": {
          "storage": "session",
          "ttlDays": 90
        },
        "events": {
          "whatsapp_click": {
            "name": "lead_conversion_whatsapp",
            "params": {
              "pyme_id": "identificador_de_la_pyme"
            }
          }
        },
        "conversions": {
          "whatsapp_click": {
            "sendTo": "AW-XXXXXXXXXX/CONVERSION_LABEL",
            "value": 1,
            "currency": "MXN"
          }
        }
      }
    }
  }
}
```

Notes:

- `measurementIds` accepts GA4 or Google tag IDs such as `G-...` or `GT-...`.
- `adsIds` accepts Google Ads IDs such as `AW-...`, but only use it when the site needs direct Google Ads conversion tracking instead of GA4-imported conversions.
- `gtmId` is optional and accepts `GTM-...`.
- `sendPageView` should stay `false` when the SPA sends controlled `page_view` events manually through `AnalyticsService`.
- Drafts without `googleTag.enabled: true` and at least one destination ID do not inject Google tags.
- `environments` defaults to enabled unless an environment is explicitly set to `false`.
- Event mappings can rename internal events and add static safe params. For example, map internal `whatsapp_click` to Google's `lead_conversion_whatsapp` and include a non-PII `pyme_id`.

## Analytics bridge

`AnalyticsService.track(...)` remains the internal analytics entrypoint. When Google tag config is active, the service mirrors the same internal event to `dataLayer` or `gtag` after sanitizing metadata.

The bridge currently maps:

- `page_view` to a controlled Google event with `page_title`, `page_location`, and `page_path`.
- `whatsapp_click` to the configured GA4 event name, such as `lead_conversion_whatsapp`, and any configured Google Ads conversion when direct Ads conversion tracking is intentionally enabled.

When `gtag` is available, mirrored Google events are sent with `event_callback` and a 200 ms fallback timeout. WhatsApp handlers already wait for `AnalyticsService.track(...)` before opening `wa.me`; this gives GA4-only lead events a delivery window without adding a fixed per-button delay or a direct `AW-...` tag.

The app does not wire page views by declaring `gtag` in an Angular component. `RuntimeService` emits the initial browser `page_view` and subsequent client-navigation `page_view` events through `AnalyticsService`, which then mirrors them to Google. This keeps internal analytics and GA4 aligned and avoids duplicate Router-level listeners.

`gclid`, `gbraid`, `wbraid`, and UTM parameters are captured from the URL and stored in the configured attribution storage. Those values are attached to mirrored events. Ad parameters and obvious PII query keys such as email, phone, WhatsApp phone, address, RFC, and CURP are removed from canonical URLs, Google `page_location`, `page_path`, and page-view `event_label`.

Do not send personal identifiers in event metadata, URLs, dataLayer, or conversion payloads.

## Search Console

Add Search Console settings under `site-config.json.site.searchConsole`.

```json
{
  "site": {
    "searchConsole": {
      "googleSiteVerification": "verification-token-from-google",
      "htmlFile": {
        "path": "/googleabc123.html",
        "content": "google-site-verification: googleabc123.html"
      },
      "environments": {
        "test": true,
        "production": true
      }
    }
  }
}
```

The meta tag renders in the initial SSR `<head>`. The dynamic `/google*.html` route responds with the configured `content` without requiring a physical file per client.

DNS TXT verification is still recommended for root-domain ownership. TXT records are handled in DNS/operations, not in draft JSON.

## Domain and alias overrides

Use `site.hostOverrides` when the same draft must serve different Google tags, Search Console verification, or canonical host settings per alias.

When aliases are supporting campaign or convenience domains, set their `seo.canonicalOrigin` to the primary domain instead of the alias. Example: `zoositioweb.com` and `sitiosweb.zoolandingpage.com.mx` should canonicalize to `https://zoositioweb.com.mx` when `zoositioweb.com.mx` is the primary domain.

When aliases need Google measurement before redirect, keep `enforceCanonicalHost: false` on that alias override so the page can render, inject the tag, and still emit a primary-domain canonical link. If `enforceCanonicalHost: true`, the alias redirects before its tag can run. For central cross-domain measurement, use the same `measurementIds` value on the primary domain and participating aliases.

```json
{
  "domain": "zoositioweb.com.mx",
  "aliases": ["sitiosweb.zoolandingpage.com.mx"],
  "environments": {
    "test": {
      "aliases": ["test.sitiosweb.zoolandingpage.com.mx"]
    }
  },
  "site": {
    "seo": {
      "canonicalOrigin": "https://zoositioweb.com.mx",
      "enforceCanonicalHost": true,
      "forceHttps": true
    },
    "hostOverrides": {
      "sitiosweb.zoolandingpage.com.mx": {
        "seo": {
          "canonicalOrigin": "https://zoositioweb.com.mx",
          "enforceCanonicalHost": false,
          "forceHttps": true
        },
        "googleTag": {
          "enabled": false,
          "environments": {
            "local": false,
            "test": false,
            "production": false
          },
          "sendPageView": false
        },
        "searchConsole": {
          "googleSiteVerification": "alias-verification-token",
          "htmlFile": {
            "path": "/googlealias123.html",
            "content": "google-site-verification: googlealias123.html"
          },
          "environments": {
            "test": true,
            "production": true
          }
        }
      }
    }
  }
}
```

Host override keys also act as draft aliases for SSR lookup. This matters when an alias is only configured in `hostOverrides` or under `environments.<env>.aliases`.

Google tag overrides inherit unspecified base Google tag fields. Set arrays such as `measurementIds`, `adsIds`, or `ga4Ids` to the exact IDs for that host. For a central GA4 property, repeat the central `G-...` ID across participating hosts; for separate properties, set each host's own destination. Active alias tags can coexist with a canonical URL that points to the primary domain.

## Browser icons

Add browser icon settings under `site-config.json.site.icons` when a draft needs its own favicon or theme color. If a draft omits this block, the runtime falls back to `/assets/brand/zoolandingpage-default-favicon.svg`.

```json
{
  "site": {
    "icons": {
      "favicon": "https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/favicon.svg",
      "appleTouchIcon": "https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/apple-touch-icon.png",
      "maskIcon": "https://assets.zoolandingpage.com.mx/zoositioweb.com.mx/shared/brand/mask-icon.svg",
      "themeColor": "#128c7e"
    }
  }
}
```

Use root-relative app assets or HTTPS public asset URLs. For uploaded icon files, save the final `publicUrl` returned by `image-upload/presign`; do not save the presigned `uploadUrl` because it expires and can expose upload capability while it is valid.

## Robots and sitemap

`robots.txt` is generated per requested host and keeps:

- `Allow: /`
- `Disallow` entries for real internal/admin/debug/API paths.
- An absolute `Sitemap: https://host/sitemap.xml`.

`sitemap.xml` is generated from configured routes and sitemap URLs. Each URL includes:

- `<lastmod>` from page metadata when available, otherwise the local `page-config.json` file modification time, otherwise site publish/draft metadata or `site-config.json` file modification time.
- `<changefreq>weekly</changefreq>` for broad crawler compatibility.
- `<priority>1.0</priority>` for `/` and lower priorities for internal pages.

Google ignores `changefreq` and `priority`; they are emitted only for general sitemap consumer compatibility.

## Consent and legal

When Google cookies or tags are active, each draft must confirm its market-specific privacy disclosure and consent flow. The app respects the existing analytics consent storage where consent UI is enabled, but legal copy and consent policy remain draft/operations responsibilities.

For Google Ads and GA4 readiness, verify with Tag Assistant only after real IDs are configured in the target environment.
