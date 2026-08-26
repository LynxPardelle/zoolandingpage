# Generic Content Builder Primitives

Phase 3 adds atomic frontend primitives that drafts can compose into blog/admin/editor surfaces. They are generic app components, not blog-specific managers.

These components are available through `wrapper-orchestrator` and `components.json`.

## `generic-table`

Use for admin lists, queues, revision tables, asset inventories, and other data grids.

The table supports:

- literal rows or rows sourced from `var` / `host`
- Material table rendering
- client sort
- optional pagination
- single or multiple selection
- loading, error, and empty states
- row actions
- allowlisted row event payload fields

By default, row events do not emit full rows. If an action needs row data, declare `eventPayloadFields`.

Row actions can also declare `hrefTemplate` for same-origin navigation based on row fields. Use `{fieldName}` placeholders and keep the template rooted at `/`. External URLs and protocol-relative links are ignored by the component.

```json
{
  "id": "articleAdminTable",
  "type": "generic-table",
  "eventInstructions": "proxyAction:updateArticleStatus",
  "config": {
    "label": "Artículos",
    "rowsSource": { "source": "var", "path": "contentHub.articles", "fallback": [] },
    "rowIdPath": "articleId",
    "eventPayloadFields": ["articleId", "status"],
    "columns": [
      { "id": "title", "header": "Título", "valuePath": "title" },
      { "id": "status", "header": "Estado", "valuePath": "status" }
    ],
    "pagination": { "enabled": true, "pageSize": 10, "pageSizeOptions": [10, 25] },
    "selection": { "enabled": true, "mode": "multiple", "label": "Seleccionar artículo" },
    "rowActions": [
      {
        "id": "edit",
        "label": "Editar",
        "icon": "edit",
        "hrefTemplate": "/admin/blog/articulos/{articleId}/editor?articleId={articleId}"
      }
    ]
  }
}
```

## `generic-cell`

Use for a standalone cell value or as the table cell renderer. It formats text, number, currency, date, boolean, JSON, and list values.

Currency formatting is opt-in. Set `format: "currency"` and provide an uppercase ISO-style three-letter `currency`. `currencyDisplay` accepts `symbol`, `narrowSymbol`, `code`, or `name`; `maximumFractionDigits` accepts an integer from 0 through 20. Set `showCurrencyCode: true` to append exactly one code even when the selected display already includes it. The renderer uses the active language (`es-MX`, `en-US`, or `zh-CN` for the built-in language codes), then the site default language, then Spanish when it needs a locale fallback. Non-finite values render `emptyText` instead of a misleading amount.

The same fields are available on a `generic-table` column:

```json
{
  "id": "estimatedRefund",
  "header": "Recuperación estimada",
  "valuePath": "refund",
  "format": "currency",
  "currency": "MXN",
  "currencyDisplay": "symbol",
  "maximumFractionDigits": 0,
  "showCurrencyCode": true
}
```

Use `format: "list"` for arrays of strings or objects. `itemPath` selects the field to render from each object, and `separator` controls the join text. When `itemPath` is omitted, object values fall back to `label`, `name`, `slug`, `taxonomyId`, or `id`.

When `componentId` or `componentIds` is configured, the cell lazy-loads `wrapper-orchestrator` and passes this host context:

- `parent`
- `row`
- `column`
- `value`
- `rowIndex`

```json
{
  "id": "statusCell",
  "type": "generic-cell",
  "config": {
    "value": true,
    "format": "boolean",
    "trueText": "Publicado",
    "falseText": "Borrador"
  }
}
```

```json
{
  "id": "tagsCell",
  "type": "generic-cell",
  "config": {
    "value": [
      { "label": "SEO" },
      { "label": "Builder" }
    ],
    "format": "list",
    "itemPath": "label",
    "separator": ", "
  }
}
```

## Opt-in navigation and accessibility fields

These fields preserve existing behavior when omitted:

- `generic-link.config.preserveLanguageQueryParam`: defaults to `true`. Set it to `false` on links between exact, language-bound routes so a stale `lang` query parameter is not carried to the destination. Other sticky runtime query parameters remain intact.
- `generic-button.config.ariaChecked`: adds the boolean `aria-checked` state for buttons that intentionally implement a checked-state interaction.
- `generic-container.config.ariaLive`: accepts `off`, `polite`, or `assertive`. Pair `ariaLive: "polite"` with `role: "status"` for a non-interrupting result announcement.
- `generic-container.config.tabindex`: accepts a finite number and is bound on every supported container tag. Use `-1` for a result region that must be focusable by `focusElementById` without joining the normal Tab order.

Single-select `generic-input` button groups expose `radiogroup`/`radio` semantics, checked state, a roving tabindex, and wrapping Arrow Left/Right/Up/Down navigation. Tab keeps its native browser behavior. Visible helper and validation text is associated with the native control through stable ids and `aria-describedby`; invalid controls expose `aria-invalid`. Number controls preserve any finite entered value, including finite values outside `min`/`max` so validation can report the constraint, while empty or non-finite values normalize to `null`.

```json
{
  "id": "calculatorResult",
  "type": "container",
  "config": {
    "tag": "section",
    "role": "status",
    "ariaLive": "polite",
    "tabindex": -1
  }
}
```

## `generic-rich-text`

Use for article body fields, summaries, content notes, and future draft-authored rich text fields.

Providers:

- `quill`: browser rich editor using Quill Delta JSON/object or plain text.
- `textarea`: markdown/plain-text fallback and SSR-safe editor.

Guardrail: HTML export is not authoritative. Backend publish validation/sanitization must still enforce content safety.

```json
{
  "id": "articleBody",
  "type": "generic-rich-text",
  "config": {
    "fieldId": "body",
    "provider": "quill",
    "format": "quill-delta-json",
    "label": "Contenido",
    "placeholder": "Escribe el artículo",
    "toolbar": ["bold", "italic", "heading", "bulletList", "orderedList", "link", "clean"],
    "sanitizerPolicyId": "trusted-authors"
  }
}
```

## `generic-file-dropzone`

Use when basic `generic-input` file controls are not enough: drag/drop, multiple files, accept labels, max-size labels, rejected-file feedback, and media-manager UX.

This component does not upload files by itself. It emits accepted `File` objects and file summaries to the configured event flow; upload authorization and storage policy stay server-side.

Current public draft uploads should go through the hub workflow in [../12-public-assets-and-file-uploads.md](../12-public-assets-and-file-uploads.md). Do not put upload grants or signed URLs in content-builder draft payloads.

When a protected upload action must not run without a selected file, set `required: true` and place the dropzone inside an `interaction-scope`. Pair the submit button with `disabledWhenInvalidScope: true` so the browser blocks empty local selection before the backend performs its own authorization and validation.

```json
{
  "id": "articleAssets",
  "type": "generic-file-dropzone",
  "eventInstructions": "uploadPublicImage:articleAssets",
  "config": {
    "fieldId": "assets",
    "label": "Archivos",
    "dropLabel": "Arrastra archivos aquí",
    "browseLabel": "Elegir archivos",
    "accept": "image/*,.pdf",
    "acceptLabel": "Imágenes o PDF",
    "maxFileSizeBytes": 5242880,
    "maxSizeLabel": "Máximo 5 MB por archivo",
    "multiple": true,
    "required": true
  }
}
```

## Deferred Builder Primitives

`generic-canvas`, `generic-draggable`, `generic-dropzone`, `generic-resizable`, and `generic-selection-overlay` remain deferred until the first package edit/publish vertical slice proves the editor workflow. They should stay page-builder primitives, not blog-specific components.
