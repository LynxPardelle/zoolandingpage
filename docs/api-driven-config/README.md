# API‑Driven Configuration (Generic App Mode)

This folder documents the **configuration-driven UI system** used by this repo, with the goal of making landing pages (and eventually other pages) definable as **data** that can be stored in / loaded from an API.

It is written to be **friendly for an AI assistant** generating new landing pages by producing configuration only.

## What you can do with this system

- Declare UI as a tree of `TGenericComponent` objects.
- Compose pages by listing component IDs (root list) and letting containers declare children.
- Centralize interaction behavior using `eventInstructions`.
- Replace inline functions (e.g. `label: () => ...`) with `valueInstructions` (a safe, allowlisted DSL).
- Define per-draft global light and dark palettes through `variables.theme.palettes` without changing app code.
- Move reusable visual bundles into `angora-combos.json` so different drafts can share structure but keep distinct appearance.

## Appearance ownership

- `variables.theme`: semantic global palette data and modal accent defaults.
- `variables.ui.modals`: modal host behavior owned by the draft, such as size, variant, close behavior, accent color, and accessible labels for payload-rendered modal IDs.
- `angora-combos.json`: reusable class bundles and shared visual patterns.
- `components.json`: per-component layout and class composition.
- `i18n`: copy, labels, and other translatable content.

The runtime no longer injects hardcoded Zoolanding combo defaults. If a page needs combo-based appearance, author it in `angora-combos.json` and upload the same payload through the API.

Missing `angora-combos.json` is allowed, but it means the page runs without authored combo bundles for that draft.

Modal content and modal host behavior are separate concerns:

- `components.json` owns the rendered modal tree and the `modalRefId` conditions that decide which modal body is shown.
- `variables.ui.modals.{id}` owns how that modal host behaves once opened.

## Runtime ownership

- `site-config.json`: domain-level routing plus shared runtime settings under `runtime.app`, `runtime.localStorage`, and `runtime.features`.
- `analytics-config.json`: page-level analytics behavior, taxonomy, and `track` collection options.
- `variables.json`: page and UI data only. Do not place shared app metadata, storage keys, or analytics collection policy here.

## Draft Locale Configuration

Drafts can now declare their supported locales directly in `variables.json`.

Use `variables.i18n.defaultLanguage` to define the initial locale for the draft, and `variables.i18n.supportedLanguages` to list every locale the draft supports.

Example: single-language draft

```json
{
  "variables": {
    "i18n": {
      "defaultLanguage": "it",
      "supportedLanguages": [
        {
          "code": "it",
          "label": "IT"
        }
      ]
    }
  }
}
```

Example: dialect-aware draft

```json
{
  "variables": {
    "i18n": {
      "defaultLanguage": "pt-BR",
      "supportedLanguages": [
        {
          "code": "pt-BR",
          "label": "PT-BR",
          "ogLocale": "pt_BR"
        },
        {
          "code": "pt-PT",
          "label": "PT-PT",
          "ogLocale": "pt_PT"
        },
        {
          "code": "en",
          "label": "EN"
        }
      ]
    }
  }
}
```

For config-driven items that are not using i18n keys yet, you can also store locale maps directly in payloads.

Example: navigation or dropdown item labels stored directly in payload data

```json
{
  "id": "contact",
  "value": "contact",
  "label": {
    "pt-BR": "Contato",
    "pt": "Contacto",
    "en": "Contact",
    "default": "Contact"
  }
}
```

For dropdown and loop-generated navigation items, the runtime now expects draft-native fields only:

- `value` for the target section or navigation value.
- `href` only when you need an explicit URL instead of deriving `#${value}`.
- `label` as either a plain string or a locale map.
- `labelKey` / `ariaLabelKey` when the text should come from i18n payloads.

Legacy item fields such as `labelEs`, `labelEn`, and `sectionId` are no longer part of the runtime contract.

The runtime no longer synthesizes `variables.ui.languageOptions`. If a draft still uses a dropdown-based language selector, author `ui.languageOptions` explicitly in the payload or point the dropdown at another explicit payload source.

Example: locale map consumed by `langPick`

```text
set:config.text,langPick,i18n,footer.copyright,Copyright Example. All rights reserved.
```

```json
{
  "variables": {
    "ui": {
      "contact": {
        "whatsappPhone": "+525522699563",
        "whatsappMessageKey": "ui.contact.whatsappMessage",
        "faqMessageKey": "ui.sections.faq.subtitle",
        "finalCtaMessageKey": "hero.subtitle"
      },
      "footer": {
        "socialLinks": [
          {
            "id": "instagram",
            "url": "https://instagram.com/example",
            "labelKey": "footer.social.instagram.label",
            "ariaLabelKey": "footer.social.instagram.ariaLabel"
          }
        ]
      }
    }
  }
}
```

## Start here

- Concepts and the overall model: [01-concepts.md](01-concepts.md)
- Component data model and common fields: [02-component-model.md](02-component-model.md)
- Dynamic values (`valueInstructions`) DSL: [03-value-instructions.md](03-value-instructions.md)
- Value handler catalog (what resolver IDs exist): [04-value-handlers-catalog.md](04-value-handlers-catalog.md)
- Events (`eventInstructions`) DSL: [05-event-instructions.md](05-event-instructions.md)
- Conditions (`condition`) DSL: [09-condition-instructions.md](09-condition-instructions.md)
- Condition handler catalog: [10-condition-handlers-catalog.md](10-condition-handlers-catalog.md)
- Loop object model (`loopConfig`): [13-loop-config.md](13-loop-config.md)
- Loop materialization behaviors/catalog: [14-loop-resolution-catalog.md](14-loop-resolution-catalog.md)
- AI authoring checklist + guardrails: [06-authoring-checklist.md](06-authoring-checklist.md)
- End-to-end example config: [07-example-landing-config.md](07-example-landing-config.md)
- Suggested API payload shape (no endpoints assumed): [08-upload-to-api.md](08-upload-to-api.md)
- Draft migration guide: [11-draft-migration.md](11-draft-migration.md)
- Validation and troubleshooting: [12-validation.md](12-validation.md)

## Schemas (Phase 2, Step 1)

- Page config: [schemas/page-config.schema.json](schemas/page-config.schema.json)
- Site config: [schemas/site-config.schema.json](schemas/site-config.schema.json)
- Components: [schemas/components.schema.json](schemas/components.schema.json)
- Variables: [schemas/variables.schema.json](schemas/variables.schema.json)
- Angora combos: [schemas/angora-combos.schema.json](schemas/angora-combos.schema.json)
- i18n: [schemas/i18n.schema.json](schemas/i18n.schema.json)
- SEO: [schemas/seo.schema.json](schemas/seo.schema.json)
- Structured data: [schemas/structured-data.schema.json](schemas/structured-data.schema.json)
- Analytics config: [schemas/analytics-config.schema.json](schemas/analytics-config.schema.json)

## Draft Interceptor (Step 7)

In development, a draft interceptor can redirect API config requests to:

```text
public/assets/drafts/{domain}/{pageId}/...
```

This is enabled when `environment.drafts.enabled` is true. It only affects GET requests to config endpoints.

### Local Draft Selection via URL

For local development and QA, draft resolution is driven from the browser URL and site-config payloads rather than environment-owned default domains or page IDs.

Supported query parameters:

- `draftDomain`: selects the draft domain folder
- `draftPageId`: selects the draft page ID folder

Examples:

```text
http://localhost:4200/?draftDomain=music.lynxpardelle.com&draftPageId=default
http://localhost:4200/?draftDomain=zoolandingpage.com.mx&draftPageId=default
```

This allows AI-authored drafts and the default Zoolanding draft to be tested side by side using the same application build.

If you are running on localhost and omit `draftDomain`, the runtime no longer assumes a default draft identity. Provide `draftDomain` explicitly or navigate from a runtime path that can resolve the active site through `site-config.json`.

### Manual Draft QA Flow

1. Start the app locally.
2. Open the target draft URL with `draftDomain` and `draftPageId`.
3. Verify network requests load payloads from the expected draft path.
4. Toggle the theme and verify both light and dark palettes match the active draft.
5. Refresh once to confirm saved theme preference wins over the draft default mode.
6. Review rendering and interactions.
7. Switch back to the default Zoolanding draft using the corresponding URL.
8. Hard refresh after switching drafts when validating state-dependent behavior.

## Related docs

- Existing high-level orchestrator doc: [../10-wrapper-orchestrator.md](../10-wrapper-orchestrator.md)

## Key implementation files

- Renderer: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts](../../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts)
- Component union: [src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts](../../src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.types.ts)
- Registry (current source of truth for components): [src/app/shared/services/configurations-orchestrator.ts](../../src/app/shared/services/configurations-orchestrator.ts)
- Value orchestrator: [src/app/shared/services/value-orchestrator.ts](../../src/app/shared/services/value-orchestrator.ts)
- Value allowlist: [src/app/shared/services/value-orchestrator-allowlist.ts](../../src/app/shared/services/value-orchestrator-allowlist.ts)
- Value handlers: [src/app/shared/utility/value-handler](../../src/app/shared/utility/value-handler)
- Condition orchestrator: [src/app/shared/services/condition-orchestrator.ts](../../src/app/shared/services/condition-orchestrator.ts)
- Condition handlers: [src/app/shared/utility/condition-handler](../../src/app/shared/utility/condition-handler)
