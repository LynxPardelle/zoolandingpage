# Runtime API Proxy And Data Sources Design

Date: 2026-05-07
Status: Approved design, pending implementation plan

## Context

Zoolanding drafts can already render dynamic values through `valueInstructions`, repeat payload-backed UI through `loopConfig`, and trigger configured behaviors through `eventInstructions`. The missing capability is a secure runtime path for a draft to consume one or more external APIs, refresh read data, and trigger non-GET requests without exposing credentials to the browser.

Current platform APIs use separate serverless repositories:

- `zoolanding-config-authoring` stores versioned draft payload files in S3 and persists site routing metadata in DynamoDB.
- `zoolanding-config-runtime-read` resolves a published site and returns only the browser runtime bundle files.
- `zoolanding-image-upload` handles public asset upload URLs.
- `zoolanding-data-dropper-lambda` and `zoolanding-quick-stats-lambda` handle analytics and small mutable stats documents.

The new capability should follow the same SAM + API Gateway + Lambda pattern, but must not copy the current public CORS and unauthenticated mutation posture for sensitive proxy behavior.

## Goals

- Allow each draft/site to configure multiple external API integrations.
- Support read sources and action-oriented requests across `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`.
- Keep draft authoring simple: adding a draft or enabling an integration should mostly be JSON editing plus the existing push/publish workflow.
- Keep secrets out of frontend payloads, draft files, git history, logs, and browser-accessible responses.
- Reuse existing render primitives by writing API results into runtime variables that `loopConfig` and `valueInstructions` can consume.
- Avoid editing AWS resources manually for every new draft in testing or production.

## Non-Goals

- This design does not make drafts execute arbitrary JavaScript.
- This design does not let frontend payloads define arbitrary upstream URLs with credentials.
- This design does not replace the current config-authoring, runtime-read, image-upload, analytics, or quick-stats APIs.
- This design does not store third-party API credentials in S3 draft payload files.

## Recommended Architecture

Create a new repository named `zoolanding-api-proxy`.

The proxy is a backend-for-frontend service deployed behind `https://api.zoolandingpage.com.mx`, for example:

- `POST /api-proxy/read`
- `POST /api-proxy/action`

The frontend never calls Spotify, TIDAL, Productivo, or other credentialed APIs directly. It calls the proxy with:

- `domain`
- `pageId`
- `sourceId` for read sources or `actionId` for mutations
- optional safe request input declared by the draft contract

The proxy resolves the published site, loads the matching server-only integration policy, loads the required secret from AWS Secrets Manager, calls the upstream API, filters/maps the upstream response, and returns a safe JSON result.

## Multiple API Model

Multiple APIs per draft are a first-class requirement. A single site may declare many read sources and many mutable actions.

Example public draft-facing configuration:

```json
{
  "runtime": {
    "dataSources": [
      {
        "id": "spotify-releases",
        "proxySourceId": "spotifyArtistAlbums",
        "target": "remote.music.releases",
        "refresh": { "mode": "interval", "intervalMs": 900000 },
        "mapper": {
          "itemsPath": "items",
          "fields": {
            "title": "name",
            "href": "externalUrl",
            "imageUrl": "imageUrl",
            "releaseDate": "releaseDate"
          }
        }
      },
      {
        "id": "blog-posts",
        "proxySourceId": "cmsRecentPosts",
        "target": "remote.blog.posts",
        "refresh": { "mode": "load" },
        "mapper": {
          "itemsPath": "posts",
          "fields": {
            "title": "title",
            "excerpt": "summary",
            "href": "url"
          }
        }
      }
    ],
    "apiActions": [
      {
        "id": "newsletter-signup",
        "proxyActionId": "mailingListSubscribe",
        "method": "POST",
        "statusTarget": "remoteStatus.newsletterSignup"
      }
    ]
  }
}
```

Example server-only integration policy stored with the published draft package but not returned by `runtime-read`:

```json
{
  "version": 1,
  "domain": "music.lynxpardelle.com",
  "integrations": [
    {
      "id": "spotifyArtistAlbums",
      "provider": "spotify",
      "method": "GET",
      "urlTemplate": "https://api.spotify.com/v1/artists/{artistId}/albums",
      "allowedInputs": {
        "artistId": "0BJZMxkwimGbieNAvoAH0W"
      },
      "credentialRef": "zoolanding/music/spotify",
      "responsePolicy": {
        "maxBytes": 262144,
        "allowedFields": ["items.name", "items.external_urls.spotify", "items.images", "items.release_date"]
      },
      "cacheTtlSeconds": 900
    },
    {
      "id": "mailingListSubscribe",
      "provider": "mailing-provider",
      "method": "POST",
      "urlTemplate": "https://api.example.com/lists/{listId}/members",
      "allowedInputs": {
        "listId": "public-music-list"
      },
      "credentialRef": "zoolanding/music/mailing-provider",
      "requestPolicy": {
        "allowedBodyFields": ["email", "language", "source"],
        "maxBodyBytes": 8192
      },
      "responsePolicy": {
        "maxBytes": 65536,
        "allowedFields": ["ok", "id", "status"]
      },
      "requiresUserGesture": true,
      "rateLimit": {
        "windowSeconds": 60,
        "maxRequests": 10
      }
    }
  ]
}
```

The public config decides what the page does with returned data. The server-only config decides what the proxy is allowed to call.

## Storage And Publishing

Use the existing `config-authoring` package upload path for server-only JSON files. The current authoring CLI walks every `.json` file under `drafts/{domain}` and sends them as package files. The authoring Lambda stores those files under the versioned S3 prefix.

Add a reserved folder:

```text
drafts/{domain}/server/integrations.json
```

The runtime-read Lambda should continue returning only the known browser files:

- `site-config.json`
- shared and page `components.json`
- shared and page `variables.json`
- shared and page `angora-combos.json`
- shared and page `i18n/{lang}.json`
- page `page-config.json`

The new proxy reads `server/integrations.json` directly from the same published S3 prefix. This keeps authoring and publishing simple while preserving browser isolation.

## Secret Management

Use AWS Secrets Manager for all real credentials. Do not use S3 for secret values and do not store secrets in draft files.

Server-only integration policies may contain only stable references such as:

```json
{ "credentialRef": "zoolanding/music/spotify" }
```

The proxy Lambda execution role gets narrow `secretsmanager:GetSecretValue` access to approved secret prefixes. Secrets are never returned to the browser, never logged, and never written into `remote.*` variables.

To keep operations simple, provide a script or CLI command later for creating/updating secret references. That command should write to Secrets Manager and print only metadata, not secret values.

## Frontend Runtime Behavior

Add a frontend data runtime service that starts after config bootstrap:

- reads `siteConfig.runtime.dataSources`
- calls the proxy for enabled sources
- writes mapped results into `VariableStore`
- writes request state into `remoteStatus`
- schedules refreshes when configured
- stops timers on runtime disconnect/navigation

The variable overlay should be separate from static payload variables so a new bootstrap resets old remote data.

Example runtime targets:

```json
{
  "remote": {
    "music": {
      "releases": {
        "items": []
      }
    }
  },
  "remoteStatus": {
    "spotify-releases": {
      "state": "loading",
      "updatedAt": null,
      "error": null
    }
  }
}
```

Draft components can render the returned data with existing primitives:

```json
{
  "id": "musicReleasesGrid",
  "type": "container",
  "loopConfig": {
    "source": "var",
    "path": "remote.music.releases.items",
    "templateId": "musicReleaseCardTemplate",
    "idPrefix": "musicReleaseCard",
    "bindings": [
      { "to": "config.title", "sources": ["title"], "fallback": "" },
      { "to": "config.description", "sources": ["releaseDate"], "fallback": "" },
      { "to": "config.href", "sources": ["href"], "fallback": "#" },
      { "to": "config.image.src", "sources": ["imageUrl"], "fallback": "" }
    ]
  }
}
```

## Mutable Actions

Actions are event-driven and go through the proxy. A new generic event handler can dispatch a configured action:

```text
proxyAction:newsletter-signup
```

The handler resolves safe inputs from the nearest interaction scope, component config, or literal event args. The proxy enforces the server-only request policy before forwarding anything upstream.

For `DELETE` and other destructive actions:

- the server-only integration must explicitly allow the method
- the public draft action must set `requiresUserGesture`
- the proxy must reject unknown body/query/header fields
- the proxy should support idempotency keys for retry-safe operations
- responses should be filtered before returning to the browser

## Error Handling

Every source/action should produce a consistent status object:

- `idle`
- `loading`
- `success`
- `empty`
- `error`

Errors returned to the browser should be stable, non-sensitive messages. Upstream response bodies, authorization errors, raw headers, and stack traces should stay in CloudWatch logs with secrets redacted.

## Security Controls

Minimum controls for `zoolanding-api-proxy`:

- no arbitrary upstream URL from browser payloads
- allowlisted integration IDs per published domain
- Secrets Manager for credentials
- narrow IAM policies
- method allowlist per integration
- request field allowlist
- response field allowlist
- response size limit
- timeout and retry limits
- per-domain and per-action rate limits
- CORS origin allowlist, not wildcard for sensitive actions
- no credential forwarding from the browser
- structured logs with redaction
- optional Lambda authorizer for admin or high-risk actions

## Testing Strategy

The implementation must follow TDD.

Frontend tests:

- variable store supports a runtime overlay and resets it on payload reload
- data source mapper handles arrays, missing paths, fallbacks, and empty responses
- runtime data service writes `remote.*` and `remoteStatus.*`
- event handler sends only allowed action inputs
- existing `loopConfig.source: "var"` renders remote items through bindings

Proxy tests:

- resolves multiple integrations for one domain
- rejects unknown source/action IDs
- rejects disallowed methods
- rejects unknown request fields
- redacts secrets from logs and responses
- enforces response size and field allowlists
- supports read cache TTL
- handles upstream 4xx/5xx/timeouts with safe browser errors

Integration verification:

- public demo source can use a no-secret API such as PokeAPI
- `music.lynxpardelle.com` can render a new music section from a safe proxy response
- Spotify/TIDAL integrations require real Secrets Manager credentials or a stubbed proxy response for local testing
- existing drafts and data drops continue to work

## Rollout Plan

1. Document the contract and schemas in `zoolandingpage`.
2. Add frontend runtime data source support behind a feature flag.
3. Add `zoolanding-api-proxy` with local tests and SAM template.
4. Add a no-secret demo integration first.
5. Add `music.lynxpardelle.com` section using proxy-backed data.
6. Add optional Spotify/TIDAL server-only policies once credentials are available in Secrets Manager.
7. Run unit tests, build, draft smoke checks, and browser QA on affected draft routes in desktop and mobile.
8. Repeat audit/fix at least three times before closeout.

## Open Decisions For Implementation Planning

- Whether to expose one endpoint (`/api-proxy/execute`) or split read/action endpoints.
- Whether read caching should live in Lambda memory only, DynamoDB, or S3.
- Whether high-risk actions need an authorizer in the first increment or only when an admin action appears.
- The exact schema names for `runtime.dataSources`, `runtime.apiActions`, and `server/integrations.json`.

For the first implementation plan, default to split read/action endpoints, in-memory Lambda cache only, and no admin/destructive production action until an authorizer is in place.
