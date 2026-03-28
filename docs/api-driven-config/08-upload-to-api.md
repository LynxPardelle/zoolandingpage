# Suggested API Payload (No Endpoints Assumed)

This repo does not assume a specific backend implementation, but the config system becomes most useful when a backend can store and return page configs.

This document describes a suggested payload shape that works well with `wrapper-orchestrator` and is easy for an AI assistant to generate.

## Recommended payload shape

Use a **map** keyed by component `id`:

```ts
export type LandingPageConfigPayload = {
  version: 1;
  pageId: string;
  rootIds: readonly string[];
  variables?: {
    theme?: unknown;
    i18n?: {
      defaultLanguage: string;
      supportedLanguages: readonly unknown[];
    };
    contact?: {
      whatsappPhone: string;
    };
  };
  components: Record<
    string,
    {
      id: string;
      type: string;
      config: unknown;
      valueInstructions?: string;
      eventInstructions?: string;
      order?: number;
      meta_title?: string;
    }
  >;
};
```

Why a map?

- IDs are already primary keys.
- Diffing and merging is simpler.
- Updating a single component doesn’t require rewriting a large array.

## Transport considerations

- Store configs as JSON.
- Validate on write (server-side):
  - unique IDs
  - `type` in allowed set
  - `valueInstructions` only uses allowlisted resolver IDs
  - no function values (JSON can’t represent them anyway)
  - required nested contracts such as `variables.theme`, `variables.i18n.defaultLanguage`, `variables.i18n.supportedLanguages`, and `variables.contact.whatsappPhone` when WhatsApp handlers are used

## Client loading strategy (future)

A future client-side loader can:

1. Fetch `LandingPageConfigPayload` by `pageId`.
2. Store it in an in-memory registry (instead of TS-defined arrays).
3. Provide `getComponentById(id)` and root ID lists.
4. Render via `<wrapper-orchestrator [componentsIds]="payload.rootIds" />`.

## Security model

- `valueInstructions` is allowlisted; unknown resolver IDs are ignored.
- Avoid exposing secrets through `env.*`.
- Keep handlers deterministic and side-effect-free.
- Treat missing required payload sections as validation failures rather than relying on local runtime fallbacks.
