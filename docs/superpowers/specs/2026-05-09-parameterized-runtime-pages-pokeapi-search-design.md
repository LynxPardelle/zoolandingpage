# Parameterized Runtime Pages And PokeAPI Search Design

Date: 2026-05-09 (Central Time)
Status: Approved design, pending implementation plan

## Context

Zoolandingpage now has the first runtime API proxy path in place: drafts can declare read data sources in public `site-config.json`, keep upstream policies in server-only `server/integrations.json`, call `POST /api-proxy/read`, map filtered API responses into `remote.*` variables, and render those variables through `valueInstructions` and `loopConfig`.

The current PokeAPI demo proves static API-backed cards, but each visible Pokemon card is backed by a fixed server source. The next increment should prove a reusable pattern for parameterized detail pages: a search result or link can navigate to a template page, and that page can fetch the right external record from a query value. The first accepted route shape is query based, such as `/pokemon?name=pikachu`, because it aligns with the current runtime navigation refresh and avoids a broader dynamic-route/SSR rewrite in this increment.

## Goals

- Add a polished search experience to `pokeapi-demo.zoolandingpage.com.mx`.
- Add a dedicated Pokemon detail page rendered from a reusable draft template.
- Fetch detail data through a query-driven API call, not through hardcoded one-source-per-record configuration.
- Keep the pattern reusable for blogs, catalogs, music releases, documentation entries, or any content where an index page links to a detail page.
- Preserve existing draft behavior by making all new config fields optional and backward compatible.
- Keep upstream URLs, server policy, and credentials out of browser runtime bundles.
- Include light and dark visual treatments suitable for a client-facing demo.

## Non-Goals

- Do not add `/pokemon/pikachu` or `/blog/my-post` path-parameter routing in this increment.
- Do not let browser payloads define arbitrary upstream URLs.
- Do not add arbitrary JavaScript execution or string-template scripting inside drafts.
- Do not require secrets for the PokeAPI demo.
- Do not change existing drafts unless needed for shared runtime compatibility.

## Approved Approach

Use the "runtime parametrizado" approach:

1. The home page loads a Pokemon index source and maps results into search suggestions.
2. The existing `search-box` emits `selectSuggestion`.
3. `eventInstructions` navigate to `event.eventData.href`, for example `/pokemon?name=pikachu`.
4. The route `/pokemon` resolves `pageId: "pokemon-detail"`.
5. A page-scoped data source reads the query param `name`, maps it to a safe proxy input field, and calls a server-only `urlTemplate`.
6. The proxy percent-encodes the template value, filters the upstream response, and returns only approved fields.
7. The detail page renders `remote.pokemon.selected.items.0.*` with static fallback variables so the draft never blanks out during loading or upstream errors.

This same model can power a blog detail page with `/post?slug=mi-articulo`, a product page with `/product?id=sku-123`, or an artist release page with `/release?id=album-123`.

## Frontend Runtime Contract

`runtime.dataSources[]` stays backward compatible. Existing static `input` objects keep working as literal input.

Add optional data-source scoping:

```json
{
  "id": "pokeapi-selected-pokemon",
  "pageIds": ["pokemon-detail"]
}
```

If `pageIds` is omitted, the data source keeps the current behavior and runs on every page. If present, the source runs only when the active page ID is included.

Add resolved input values inside `input`:

```json
{
  "input": {
    "pokemonName": {
      "source": "queryParam",
      "key": "name",
      "fallback": "pikachu",
      "transforms": ["trim", "lowercase"]
    }
  }
}
```

Supported resolver sources for this increment:

- `literal`: explicit value, equivalent to existing raw input values.
- `queryParam`: reads from the active URL query string.
- `var`: reads from `VariableStoreService`, useful for future scoped searches or user selections.

Supported transforms for this increment:

- `trim`
- `lowercase`
- `uppercase`

The resolver must work in both SSR and browser contexts. On the server it should use Angular `REQUEST`; in the browser it should use `window.location.search`.

## Search Box Behavior

The existing `search-box` should be reused, not replaced. It already supports authored suggestions and emits `selectSuggestion`.

The missing runtime support is dynamic suggestions from variables. `WrapperOrchestrator.resolveSearchConfig(...)` should resolve `config.suggestions` when it is a value thunk, while keeping all existing static search configs unchanged.

The PokeAPI index source should map API results into the shape the search box already accepts:

```json
{
  "id": "pokeapi-pokemon-index",
  "proxySourceId": "pokeapiPokemonIndex",
  "target": "remote.pokemon.index",
  "pageIds": ["default"],
  "input": {
    "limit": 151,
    "offset": 0
  },
  "mapper": {
    "itemsPath": "results",
    "fields": {
      "id": "name",
      "label": "name",
      "href": {
        "path": "name",
        "prefix": "/pokemon?name="
      }
    }
  }
}
```

The search component can then use:

```text
valueInstructions: set:config.suggestions,var,remote.pokemon.index.items
eventInstructions: navigateToUrl:event.eventData.href
```

If the API has not loaded yet, the search box can use authored fallback suggestions in `variables.json` or render with no suggestions until `remote.pokemon.index.items` is available. The built-in "no results" state remains valid.

## Detail Page Runtime Data

Add a new route to the demo draft:

```json
{
  "path": "/pokemon",
  "pageId": "pokemon-detail",
  "label": "Pokemon detail"
}
```

The detail page source should be scoped to `pokemon-detail`:

```json
{
  "id": "pokeapi-selected-pokemon",
  "proxySourceId": "pokeapiPokemonDetail",
  "target": "remote.pokemon.selected",
  "statusTarget": "remoteStatus.pokemon.selected",
  "pageIds": ["pokemon-detail"],
  "input": {
    "pokemonName": {
      "source": "queryParam",
      "key": "name",
      "fallback": "pikachu",
      "transforms": ["trim", "lowercase"]
    }
  },
  "mapper": {
    "itemsPath": "items",
    "fields": {
      "id": "id",
      "name": "name",
      "image": "sprites.other.official-artwork.front_default",
      "primaryType": "types.0.type.name",
      "secondaryType": "types.1.type.name",
      "height": "height",
      "weight": "weight",
      "baseExperience": "base_experience",
      "abilityOne": "abilities.0.ability.name",
      "hp": "stats.0.base_stat",
      "attack": "stats.1.base_stat",
      "defense": "stats.2.base_stat",
      "speed": "stats.5.base_stat"
    }
  }
}
```

The detail components should read from `remote.pokemon.selected.items.0.*` through `valueInstructions`. Static fallback variables should provide Pikachu data, so loading and safe upstream errors do not produce an empty page.

## Proxy Runtime Contract

The API proxy keeps supporting the existing `url` field. Add `urlTemplate` as an optional server-only policy field:

```json
{
  "id": "pokeapiPokemonDetail",
  "method": "GET",
  "urlTemplate": "https://pokeapi.co/api/v2/pokemon/{pokemonName}",
  "allowedInputFields": ["pokemonName"],
  "response": {
    "singleItem": true,
    "allowedFields": [
      "id",
      "name",
      "base_experience",
      "height",
      "weight",
      "sprites.other.official-artwork.front_default",
      "types.type.name",
      "abilities.ability.name",
      "stats.base_stat",
      "stats.stat.name"
    ],
    "maxBytes": 524288
  },
  "timeoutMs": 5000
}
```

Proxy rules:

- Template placeholders must reference fields declared in `allowedInputFields`.
- Unknown browser input fields remain rejected.
- Placeholder values must be scalar, non-empty, and length-limited before replacement.
- Placeholder values are percent-encoded with no path-safe characters, so `/`, `?`, `#`, and other control characters cannot change the URL structure.
- Fields consumed by `urlTemplate` are not appended again as query params or request body fields.
- The resolved URL must still pass the existing upstream URL validation.
- Existing policies that use `url` and static query/body input must continue to behave exactly as they do today.

## Draft Visual Direction

Use the approved PokeAPI demo direction:

- Keep the current warm light palette as the default.
- Add a dark theme treatment with a technical, high-contrast tone.
- Use PokeAPI yellow as the primary accent, coral for action/error accents, green for type/status highlights, and restrained blue for secondary technical signals.
- The home page should feature the search box near the hero and keep a polished catalog grid for demonstration value.
- The detail page should feel like a real reusable content template: large artwork region, name/type/id summary, metric tiles, stat bars, and a clear return link.
- The demo must remain responsive and readable on desktop and mobile.

The dark theme mockup approved in the brainstorming companion uses:

- Background: `#0f1218`
- Surface: `#151a22`
- Deep surface: `#0a0d12`
- Border: `#2d3a4f`
- Title: `#fff7d8`
- Text: `#edf2f7`
- Muted text: `#aab6c7`
- Accent: `#ffd54a`
- Coral: `#ff806a`
- Green: `#7ee3a2`

## Error Handling

Runtime source status remains:

- `idle`
- `loading`
- `success`
- `empty`
- `error`

For the demo:

- Missing `name` falls back to `pikachu`.
- Invalid or unavailable upstream records should return a safe proxy error and keep fallback detail variables visible.
- Search index failure should not break the page; the search can show no suggestions while featured cards continue rendering fallback data.
- Browser-visible errors must not include upstream response bodies, stack traces, credentials, or server-only policy details.

## Reusable Blog Example

The same contract can support a blog detail page:

```json
{
  "routes": [
    { "path": "/post", "pageId": "blog-detail" }
  ],
  "runtime": {
    "dataSources": [
      {
        "id": "blog-post-detail",
        "proxySourceId": "cmsPostDetail",
        "target": "remote.blog.selectedPost",
        "pageIds": ["blog-detail"],
        "input": {
          "slug": {
            "source": "queryParam",
            "key": "slug",
            "fallback": "inicio",
            "transforms": ["trim"]
          }
        },
        "mapper": {
          "itemsPath": "items",
          "fields": {
            "title": "title",
            "author": "author.name",
            "publishedAt": "publishedAt",
            "body": "content"
          }
        }
      }
    ]
  }
}
```

The server-only policy would own `urlTemplate`, credentials, response field allowlists, and upstream-specific headers.

## Compatibility And Safety

- Existing drafts with no `runtime.dataSources` changes must keep rendering the same.
- Existing data sources with static `input` must keep sending identical proxy payloads.
- Existing `server/integrations.json` policies with `url` must keep working.
- Production draft-domain guardrails remain unchanged: public draft origins can request only their own domain through the proxy.
- Testing and local QA can still preview cross-draft behavior through the established testing/local policy.
- No secrets, API keys, tokens, signed URLs, or private upstream URLs with embedded credentials may be committed.

## Testing Strategy

Follow TDD before implementation edits.

Frontend tests:

- input resolver reads query params in browser and SSR contexts
- raw `input` values remain literal
- `pageIds` filters data sources by active page and omitted `pageIds` preserves current behavior
- search config resolves dynamic `suggestions` while static suggestions still work
- `selectSuggestion` plus `navigateToUrl:event.eventData.href` reaches `/pokemon?name=...`
- mapper prefix/suffix still maps safe search result links
- fallback variables keep detail components renderable during loading/error

Proxy tests:

- `urlTemplate` replaces allowed placeholders with encoded values
- template fields are not duplicated as query params
- unknown input fields are rejected
- placeholders not declared in `allowedInputFields` are rejected
- empty, object, array, or overlong template values are rejected
- resolved URLs still require valid HTTPS upstream URLs
- existing `url` integrations continue to pass current tests

Draft/browser QA:

- Desktop and mobile pass on `/`.
- Desktop and mobile pass on `/pokemon?name=pikachu`.
- Desktop and mobile pass on another query such as `/pokemon?name=charizard`.
- Search selection navigates to the detail route.
- No visible debug overlay when `debugWorkspace=false`.
- No console errors, failed application requests, broken images, or horizontal overflow.
- Repeat audit/fix/rerun at least three times before closeout.

## Implementation Planning Defaults

- Keep this as one focused implementation increment across `zoolandingpage` and `zoolanding-api-proxy`.
- Implement query-param detail pages first; defer path-param route matching.
- Reuse `search-box`, `loopConfig`, `valueInstructions`, `navigateToUrl`, `VariableStoreService`, and the existing API proxy.
- Add only narrow shared runtime helpers needed for input resolution, page scoping, and URL template safety.
- Publish and validate the PokeAPI demo after tests pass.
