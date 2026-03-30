# Loop Config (`loopConfig`)

This document defines the object-based loop model used to generate repeated components at runtime.

## Why `loopConfig`

`loopConfig` replaces hardcoded `Array.from(...)` ID generation in stores and lets API payload data drive repeated UI blocks.

## Location

`loopConfig` is defined on `TGenericComponent` and is primarily used on container components, but generated template components can also use it when another generated container references them explicitly.

## Shape

```ts
loopConfig:
  | {
      source: 'var' | 'i18n';
      path: string;
      templateId: string;
      idPrefix?: string;
      bindings?: Array<{
        to: string;
        sources: Array<string | { from: string; transform?: 'i18nKey' | 'locale' | 'navigationHref' }>;
        fallback?: unknown;
      }>;
    }
  | {
      source: 'repeat';
      count: number;
      templateId: string;
      idPrefix?: string;
      bindings?: Array<{
        to: string;
        sources: Array<string | { from: string; transform?: 'i18nKey' | 'locale' | 'navigationHref' }>;
        fallback?: unknown;
      }>;
    }
```

## Fields

- `source`: where loop items come from.
- `path`: required for `var` and `i18n`.
- `count`: required for `repeat`.
- `templateId`: component ID used as the materialization template.
- `idPrefix`: optional generated ID prefix. Defaults to `templateId`.
- `bindings`: optional explicit mapping from loop item data into the generated component.

## Binding model

- `to`: path on the generated component to write, for example `config.text` or `config.href`.
- `sources`: ordered fallback list. The first resolved value wins.
- `fallback`: optional authored fallback when every source resolves to an empty value.

Supported transforms:

- `i18nKey`: resolves the source value as a translation key.
- `locale`: resolves locale-map values like `{ en, es, default }` using the current language.
- `navigationHref`: normalizes section IDs or authored targets into the final link href.

Use `$item` as a source path when the loop item itself is already the final value, for example a string array.

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
