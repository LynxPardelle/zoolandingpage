# Loop Config (`loopConfig`)

This document defines the object-based loop model used to generate repeated components at runtime.

## Why `loopConfig`

`loopConfig` replaces hardcoded `Array.from(...)` ID generation in stores and lets payload data or host-owned runtime data drive repeated UI blocks.

## Location

`loopConfig` is defined on `TGenericComponent` and is primarily used on container components, but generated template components can also use it when another generated container references them explicitly.

## Shape

```ts
loopConfig:
  | {
  source: 'var' | 'i18n' | 'host';
      path: string;
      templateId: string;
      idPrefix?: string;
      bindings?: Array<{
        to: string;
        sources: Array<string | { from: string; transform?: 'i18nKey' | 'locale' | 'navigationHref' | 'uriComponent' }>;
        fallback?: unknown;
        prefix?: string;
        suffix?: string;
      }>;
    }
  | {
      source: 'repeat';
      count: number;
      templateId: string;
      idPrefix?: string;
      bindings?: Array<{
        to: string;
        sources: Array<string | { from: string; transform?: 'i18nKey' | 'locale' | 'navigationHref' | 'uriComponent' }>;
        fallback?: unknown;
        prefix?: string;
        suffix?: string;
      }>;
    }
```

## Fields

- `source`: where loop items come from.
- `path`: required for `var`, `i18n`, and `host`.
- `count`: required for `repeat`.
- `templateId`: component ID used as the materialization template.
- `idPrefix`: optional generated ID prefix. Defaults to `templateId`.
- `bindings`: optional explicit mapping from loop item data into the generated component.
- `view`: optional collection view applied before materialization. It can filter, sort, and paginate arrays without changing the upstream data shape.

## Binding model

- `to`: path on the generated component to write, for example `config.text` or `config.href`.
- `sources`: ordered fallback list. The first resolved value wins.
- `fallback`: optional authored fallback when every source resolves to an empty value.
- `prefix` / `suffix`: optional strings applied to the first resolved source value, useful for generated detail or filter links.

Supported transforms:

- `i18nKey`: resolves the source value as a translation key.
- `locale`: resolves locale-map values like `{ en, es, default }` using the current language.
- `navigationHref`: normalizes section IDs or authored targets into the final link href.
- `uriComponent`: encodes the source value so it can be safely placed inside a query string or path segment.

Use `$item` as a source path when the loop item itself is already the final value, for example a string array.

## Collection View

`loopConfig.view` is useful for API-fed lists, catalogs, blog indexes, and repeated detail attributes. It runs in this order:

1. `filters`
2. `sort`
3. `pagination`

Example:

```ts
{
  loopConfig: {
    source: 'var',
    path: 'remote.catalog.items',
    templateId: 'cardTemplate',
    idPrefix: 'catalogCard',
    view: {
      filters: [
        {
          path: 'type',
          op: 'equals',
          value: { source: 'scope', path: 'values.type' },
          ignoreValues: ['', 'all']
        },
        {
          path: 'tags.name',
          op: 'includes',
          value: { source: 'scope', path: 'values.tag' },
          ignoreValues: ['', 'all']
        }
      ],
      sort: {
        by: { source: 'scope', path: 'values.sort' },
        options: {
          'date-desc': { path: 'publishedAt', direction: 'desc', type: 'text' },
          'title-asc': { path: 'title', direction: 'asc', type: 'text' }
        }
      },
      pagination: {
        page: { source: 'scope', path: 'values.page' },
        pageSize: 6,
        applyWhenAnyQueryParam: ['tag', 'search']
      }
    }
  }
}
```

Supported filter operators are `equals`, `notEquals`, `contains`, `includes`, `exists`, and `notExists`. Paths can traverse arrays, so `tags.name` checks every tag object in `tags`.

`pagination.applyWhenAnyQueryParam` is optional. When present, client-side loop pagination only runs if at least one listed query param has an active value. Use it for hybrid catalogs where the default source is already paginated by the upstream API, but query-specific sources such as `?tag=...` or `?move=...` return a full narrowed collection that still needs client-side pagination.

`value`, `sort.by`, `pagination.page`, and `pagination.pageSize` can read from:

- `{ source: "scope", path: "values.fieldId" }`
- `{ source: "var", path: "remote.filters.type" }`
- `{ source: "host", path: "runtimeState.viewport.width" }`
- `{ source: "queryParam", key: "pokemon" }`
- `{ source: "literal", value: "featured" }`

Filters may also use `activeWhen` with the same value-source shape. This lets a local loop filter stay inactive when a query-driven API source already returned a narrowed collection.

## Example

```ts
{
  id: 'footerSocialSection',
  type: 'container',
  condition: 'all:varLenGt,socialLinks,0',
  loopConfig: {
    source: 'var',
    path: 'socialLinks',
    templateId: 'footerSocialLinkTemplate',
    idPrefix: 'footerSocialLink',
    bindings: [
      {
        to: 'config.href',
        sources: ['href', 'url', { from: 'value', transform: 'navigationHref' }],
      },
      {
        to: 'config.text',
        sources: ['icon', { from: 'labelKey', transform: 'i18nKey' }, { from: 'label', transform: 'locale' }],
      },
      {
        to: 'config.ariaLabel',
        sources: [
          { from: 'ariaLabelKey', transform: 'i18nKey' },
          { from: 'ariaLabel', transform: 'locale' },
          { from: 'labelKey', transform: 'i18nKey' },
          { from: 'label', transform: 'locale' },
        ],
      },
    ],
  },
  config: {
    tag: 'div',
    classes: 'ank-display-flex ank-gap-16px ank-alignItems-center',
    components: [],
  }
}
```

## Runtime notes

- Materialization runs in `ConfigurationsOrchestratorService` before render.
- Generated IDs are deterministic (`{idPrefix}__{index+1}`).
- `bindings` are applied before any component-level runtime finalizers.
- Child component references inside generated containers can use `{{index}}` to point at another generated component with the same numeric suffix, for example `badgeText__{{index}}`.
- Unknown templates or invalid loop source data are ignored with warnings.
