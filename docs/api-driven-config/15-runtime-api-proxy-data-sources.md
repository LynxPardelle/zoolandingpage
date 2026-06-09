# Runtime API Proxy Data Sources

Drafts can declare read data sources and mutable API actions without exposing upstream URLs or credentials to the browser.

## Public Draft Config

Add public runtime wiring to `site-config.json`:

```json
{
  "runtime": {
    "dataSources": [
      {
        "id": "lynx-itunes-songs",
        "proxySourceId": "itunesSongSearch",
        "target": "remote.music.releases",
        "statusTarget": "remoteStatus.music.releases",
        "pageIds": ["default"],
        "input": { "term": "lynx pardelle", "entity": "song", "limit": 6 },
        "mapper": {
          "itemsPath": "results",
          "fields": {
            "title": "trackName",
            "href": "trackViewUrl",
            "description": "collectionName"
          }
        },
        "refresh": { "mode": "interval", "intervalMs": 300000 }
      }
    ],
    "apiActions": [
      {
        "id": "newsletter-signup",
        "proxyActionId": "mailingListSubscribe",
        "method": "POST",
        "statusTarget": "remoteStatus.newsletterSignup",
        "inputFields": ["email", "language"]
      }
    ]
  }
}
```

The frontend calls the proxy with the configured `proxySourceId` or `proxyActionId`, maps the safe response into `VariableStoreService`, and renders it with existing `valueInstructions` and `loopConfig.source: "var"` patterns.

Use `pageIds` when a source should run only on specific draft routes. Omitting `pageIds` keeps the source global for every page in the site.

`mergeMode` defaults to `replace`. Use `appendItems` when multiple data sources contribute records to one `{ "items": [...] }` target, such as a catalog built from several safe upstream endpoints:

```json
{
  "id": "pokeapi-charizard",
  "proxySourceId": "pokeapiCharizard",
  "target": "remote.pokemon.catalog",
  "mergeMode": "appendItems",
  "mapper": {
    "itemsPath": "items",
    "fields": {
      "id": "id",
      "name": "name",
      "moves": "moves"
    }
  }
}
```

Append mode merges incoming records by stable identity (`name`, then `id`, then `href`/`url`) and preserves fallback fields when the incoming API response does not include them.

`input` values are literal by default. A field can also resolve from the current URL query string or from an existing runtime variable:

```json
{
  "input": {
    "pokemonName": {
      "source": "queryParam",
      "key": "name",
      "fallback": "pikachu",
      "transforms": ["trim", "lowercase"]
    },
    "countryCode": {
      "source": "literal",
      "value": "MX"
    },
    "selectedId": {
      "source": "var",
      "path": "selection.currentId",
      "fallback": "default"
    },
    "offset": {
      "source": "queryParamPageOffset",
      "pageKey": "page",
      "pageSizeKey": "pageSize",
      "pageFallback": 1,
      "pageSizeFallback": 4
    }
  }
}
```

Supported transforms are `trim`, `lowercase`, and `uppercase`.

Use `queryParamPageOffset` when the upstream list endpoint supports `limit`/`offset` pagination and the draft stores page state in query params. With `page=3&pageSize=8`, the resolver sends `offset: 16`. This keeps large catalogs from loading every record in the browser just to change pages.

Use `requiredInputKeys` when a source should run only after an input is present. This is useful for query-param driven search/detail widgets that must not call the proxy on the default page load:

```json
{
  "id": "catalog-search-result",
  "proxySourceId": "pokemonDetail",
  "target": "remote.catalog.items",
  "mergeMode": "appendItems",
  "requiredInputKeys": ["pokemonName"],
  "input": {
    "pokemonName": {
      "source": "queryParam",
      "key": "pokemon",
      "transforms": ["trim", "lowercase"]
    }
  }
}
```

Use `skipWhenQueryParams` when a broad default source should not run after a narrower query-driven source becomes active:

```json
{
  "id": "catalog-index",
  "proxySourceId": "pokemonIndex",
  "target": "remote.catalog.items",
  "skipWhenQueryParams": ["pokemon", "type", "move"]
}
```

This prevents a default index from briefly replacing or appending unrelated records while a search, type, or move-specific source is loading.

Field mappings can be either a path string or an object. Object mappings support `fallback`, `prefix`, `suffix`, and `transform`, which is useful when a safe upstream field needs to become a display URL or a normalized ID:

```json
{
  "fields": {
    "title": "attributes.title",
    "href": {
      "path": "id",
      "prefix": "https://tidal.com/browse/album/"
    },
    "number": {
      "path": "url",
      "transform": "lastPathSegmentNumber",
      "prefix": "#"
    }
  }
}
```

Supported field transforms are:

- `uriComponent`: trims and URL-encodes a string for query strings or path segments.
- `lastPathSegment`: extracts the final segment from a URL/path.
- `lastPathSegmentNumber`: extracts the final segment and converts it to a number.
- `titleCase`: converts API labels such as `electric` or `mega-punch` into friendlier display text.

Use `mapper.prependItems` when a runtime API list needs stable local options before upstream records, such as a dropdown `Todos` option before dynamic API filter values:

```json
{
  "mapper": {
    "itemsPath": "results",
    "prependItems": [{ "value": "all", "label": "Todos" }],
    "fields": {
      "value": "name",
      "label": {
        "path": "name",
        "transform": "titleCase"
      }
    }
  }
}
```

When an upstream endpoint returns one object instead of an array, set `mapper.singleItem` to `true` so the response is rendered as one mapped item:

```json
{
  "mapper": {
    "singleItem": true,
    "fields": {
      "title": "name",
      "image": "sprites.other.official-artwork.front_default"
    }
  }
}
```

## Server-Only Policy

Put upstream URLs, methods, response filters, and credential references in `drafts/{domain}/server/integrations.json`:

```json
{
  "version": 1,
  "sources": [
    {
      "id": "itunesSongSearch",
      "method": "GET",
      "url": "https://itunes.apple.com/search",
      "allowedInputFields": ["term", "entity", "limit"],
      "response": {
        "allowedFields": [
          "resultCount",
          "results.trackName",
          "results.trackViewUrl",
          "results.collectionName"
        ],
        "maxBytes": 524288
      },
      "access": {
        "required": true,
        "authProfileId": "staff",
        "allowedGroups": ["Editors"]
      }
    }
  ],
  "actions": []
}
```

This file is server-only. It can be published by the authoring package, but `runtime-read` must not include it in browser runtime bundles. Prefer nested `allowedFields` paths such as `results.trackName` over broad parent fields such as `results` so the proxy returns only the properties the draft needs.

When an upstream requires non-secret request headers, declare them in the server-only `headers` object. Keep credentials in Secrets Manager via `credentialRef`; do not place tokens or API keys in `headers`.

Use `access` for user/JWT authorization. Use `auth` only for upstream credentials. Do not mix them:

- `access.required: true` requires `access.authProfileId`.
- `access.allowedGroups` must contain non-empty group names when present.
- `credentialRef` lives at the integration root and points at the upstream secret reference.
- `auth.type` may be `bearer`, `api-key-header`, or `oauth2-client-credentials`; keep it for upstream credential behavior only.
- Do not put `access`, upstream `auth`, tokens, API keys, or client secrets in the public `site-config.json.runtime.dataSources` / `runtime.apiActions` entries.

For parameterized detail pages, put the URL pattern in server-only policy as `urlTemplate` instead of letting the browser send an upstream URL:

```json
{
  "id": "pokemonDetail",
  "method": "GET",
  "urlTemplate": "https://pokeapi.co/api/v2/pokemon/{pokemonName}",
  "allowedInputFields": ["pokemonName"],
  "response": {
    "singleItem": true,
    "allowedFields": [
      "id",
      "name",
      "sprites.other.official-artwork.front_default",
      "types.type.name"
    ]
  }
}
```

Every `urlTemplate` placeholder must also appear in `allowedInputFields`. Placeholder values must be scalar, non-empty, and within the proxy length limit; the proxy trims and percent-encodes them before making the upstream request. Fields consumed by `urlTemplate` are not forwarded again as query/body input.

For detail endpoints that return a single object, `response.singleItem: true` wraps the filtered object as `{ "items": [ ... ] }` so standard `itemsPath: "items"` draft mappings can render it:

```json
{
  "id": "pokeapiPikachu",
  "method": "GET",
  "url": "https://pokeapi.co/api/v2/pokemon/pikachu",
  "allowedInputFields": [],
  "response": {
    "singleItem": true,
    "allowedFields": [
      "id",
      "name",
      "sprites.other.official-artwork.front_default",
      "types.type.name"
    ]
  }
}
```

## Rendering

Use fallback variables so a draft still renders if the proxy is not deployed or an upstream API is unavailable:

```json
{
  "variables": {
    "remote": {
      "music": {
        "apiDemo": {
          "releases": {
            "items": [{ "title": "Looking Bass", "href": "https://music.apple.com/us/album/looking-bass/1435009398?i=1435009402&uo=4" }]
          }
        }
      }
    }
  }
}
```

Then render the source through `loopConfig`:

```json
{
  "id": "runtimeApiList",
  "type": "container",
  "loopConfig": {
    "source": "var",
    "path": "remote.music.releases.items",
    "templateId": "runtimeApiLinkTemplate",
    "bindings": [
      { "to": "config.href", "sources": ["href"], "fallback": "#" },
      { "to": "config.text", "sources": ["title"], "fallback": "Remote item" }
    ]
  },
  "config": { "tag": "div", "components": [] }
}
```

## Security Rules

- Do not put secrets, bearer tokens, client secrets, API keys, signed URLs, or upstream credential material in draft browser payloads.
- For remote auth bootstrap, browser payloads may use `runtime.authRemote` with only `enabled`, `authProfileId`, and `endpoint`; the app must send only `{ domain, authProfileId }` to `/auth/runtime-config`.
- Do not let the browser provide arbitrary upstream URLs.
- Keep every input field allowlisted in server policy.
- Keep every `urlTemplate` placeholder allowlisted in server policy.
- Keep every returned field allowlisted in server policy.
- Store real credentials in AWS Secrets Manager and reference them only by `credentialRef`.
- Put user authorization rules in `access`, not in upstream credential `auth`.
- Do not enable destructive production actions without an authorization design.
