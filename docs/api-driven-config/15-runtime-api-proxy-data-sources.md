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

Field mappings can be either a path string or an object. Object mappings support `fallback`, `prefix`, and `suffix`, which is useful when a safe upstream field needs to become a display URL:

```json
{
  "fields": {
    "title": "attributes.title",
    "href": {
      "path": "id",
      "prefix": "https://tidal.com/browse/album/"
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
      }
    }
  ],
  "actions": []
}
```

This file is server-only. It can be published by the authoring package, but `runtime-read` must not include it in browser runtime bundles. Prefer nested `allowedFields` paths such as `results.trackName` over broad parent fields such as `results` so the proxy returns only the properties the draft needs.

When an upstream requires non-secret request headers, declare them in the server-only `headers` object. Keep credentials in Secrets Manager via `credentialRef`; do not place tokens or API keys in `headers`.

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
- Do not let the browser provide arbitrary upstream URLs.
- Keep every input field allowlisted in server policy.
- Keep every returned field allowlisted in server policy.
- Store real credentials in AWS Secrets Manager and reference them only by `credentialRef`.
- Do not enable destructive production actions without an authorization design.
