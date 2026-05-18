# Promote Alias Into Standalone Draft

Date: 2026-05-15 (Central Time)
Scope: Reusable procedure for turning a domain alias into a dedicated local draft without app changes.
Status: Active
Applies To: Multi-route draft cutovers where a domain must become its own brand or product surface
Source Of Truth:

- `docs/11-draft-lifecycle.md`
- `ai-notes/knowledge/draft-authoring-rules.md`
- `ai-notes/constraints/routing-and-slug-rules.md`
- `ai-notes/constraints/ssr-hydration-and-canonical-sitemap.md`
- Distilled from the Sulanding standalone-draft cutover

Confidence: High
Last Reviewed: 2026-05-15 (Central Time)

## Use This When

- a domain currently lives as an alias under another draft
- the alias needs its own route map, metadata, or commercial positioning
- the user forbids Angular or app-code changes and the work must stay in `drafts/`

## Procedure

1. Remove the alias from the source draft first.
2. Create or copy the destination draft only after domain ownership is clear at `site-config.json` level.
3. Treat the copied draft as structural scaffolding, not as copy truth.
4. Rewrite the destination domain-root files before page-level authoring:
   - `site-config.json`
   - `variables.json`
   - shared `i18n`
   - shared `components.json`
5. If the new draft is effectively single-language, reduce supported languages immediately and remove language toggles from the shared shell.
6. Keep copied page `rootIds` when app changes are out of scope; fix route identity through `page-config.json`, metadata, and localized content instead.
7. Rewrite all active route metadata to the destination domain, including canonicals, OG URLs, Twitter metadata, and route-purpose metadata.
8. Rework CTA flows to current product reality. If forms or automation are not productized, prefer WhatsApp or another already-supported path.
9. Narrow copied route inventory to the pages that the new brand will actually support.
10. Distill one local findings note and one reusable `ai-notes/` note before closeout.

## Guardrails

- Do not leave the new domain as both an alias and a standalone draft.
- Do not rewrite copied component trees just to rename internal page roots when draft-only edits are sufficient.
- Do not keep bilingual UI if only one language is maintained.
- Do not promise unsupported workflows in copy just because the copied draft used broader language.
- Do not rely on `FAQPage` rich-result expectations for commercial draft routes.

## Validation Pattern

1. Parse changed JSON files in small route-scoped batches.
2. Run a domain-level draft smoke check after all active routes are authored.
3. Run desktop and mobile browser QA on every active route when rendering, payloads, canonicals, or draft behavior changed.
4. Audit the result at least three times before declaring completion.

## Common Shortcuts That Were Safe

- Preserve inherited `rootIds` when the copied templates already match the intended layout.
- Use a proven sibling draft for multi-route structure and a different sibling draft for product truth if one has better architecture and the other has better offer copy.
- Keep draft-specific research in `drafts/{domain}/findings/` and promote only the reusable workflow lesson into `ai-notes/`.
