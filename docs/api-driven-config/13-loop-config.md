# Loop Config (`loopConfig`)

This document defines the object-based loop model used to generate repeated components at runtime.

## Why `loopConfig`

`loopConfig` replaces hardcoded `Array.from(...)` ID generation in stores and lets API payload data drive repeated UI blocks.

## Location

`loopConfig` is defined on `TGenericComponent` and is currently used on container components.

## Shape

```ts
loopConfig:
  | { source: 'var' | 'i18n'; path: string; templateId: string; idPrefix?: string }
  | { source: 'repeat'; count: number; templateId: string; idPrefix?: string }
```

## Fields

- `source`: where loop items come from.
- `path`: required for `var` and `i18n`.
- `count`: required for `repeat`.
- `templateId`: component ID used as the materialization template.
- `idPrefix`: optional generated ID prefix. Defaults to `templateId`.

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
- Unknown templates or invalid loop source data are ignored with warnings.
- Existing non-loop components remain backward compatible.
