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
      { "id": "edit", "label": "Editar", "icon": "edit" }
    ]
  }
}
```

## `generic-cell`

Use for a standalone cell value or as the table cell renderer. It formats text, number, date, boolean, and JSON values.

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
    "multiple": true
  }
}
```

## Deferred Builder Primitives

`generic-canvas`, `generic-draggable`, `generic-dropzone`, `generic-resizable`, and `generic-selection-overlay` remain deferred until the first package edit/publish vertical slice proves the editor workflow. They should stay page-builder primitives, not blog-specific components.
