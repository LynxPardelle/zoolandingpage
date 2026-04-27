---
goal: Platform SEO upgrade and draft backfill
version: 1.0
date_created: 2026-04-27
last_updated: 2026-04-27
owner: GitHub Copilot
status: 'In progress'
tags: [feature, seo, ssr, drafts, migration]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In_progress-yellow)

This plan upgrades Zoolandingpage SEO from basic per-page metadata to a host-aware, draft-driven system with stronger crawl assets, richer metadata support, and a full backfill across published drafts.

## 1. Requirements & Constraints

- **REQ-001**: Add optional `keywords` and `robots` support to page-level SEO payloads.
- **REQ-002**: Add optional `keywords` and `robots` support to site-level SEO defaults.
- **REQ-003**: Emit `meta keywords` for compatibility.
- **REQ-004**: Emit `meta robots` using page override first, then site default.
- **REQ-005**: Keep `seo.title`, `seo.description`, and `seo.canonical` as the required validation baseline.
- **REQ-006**: Generate host-aware `robots.txt` and `sitemap.xml` in SSR mode.
- **REQ-007**: Extend automated QA to validate SEO metadata beyond title presence.
- **REQ-008**: Backfill all published drafts in the local draft tree after pulling published state.
- **CON-001**: Do not introduce speculative backend contracts unless frontend SSR cannot generate correct crawl assets.
- **CON-002**: Preserve existing service boundaries under `src/app/shared/services/`.
- **CON-003**: Keep new SEO fields optional for backward compatibility.
- **CON-004**: Use the direct CLI form `node tools/config-draft-sync.mjs ...` when documenting sync steps.
- **GUD-001**: Treat `meta keywords` as compatibility-only, not as the primary SEO signal.
- **GUD-002**: Structured data must match visible page content.
- **PAT-001**: Follow TDD for behavior-changing Angular and tooling changes.
- **PAT-002**: Finish with desktop and mobile browser QA on affected draft routes.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Extend the SEO contract and renderer with focused tests.

| Task     | Description                                                                                                                                        | Completed | Date |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-001 | Add failing unit tests in `src/app/shared/services/seo-metadata.service.spec.ts` for `keywords` and `robots` rendering and fallback behavior.      |           |      |
| TASK-002 | Extend `src/app/shared/types/config-payloads.types.ts` with optional page/site `keywords` and `robots` fields using localized values for keywords. |           |      |
| TASK-003 | Update `src/app/shared/services/seo-metadata.service.ts` to resolve and emit `keywords` and `robots` tags.                                         |           |      |
| TASK-004 | Update `docs/api-driven-config/schemas/seo.schema.json` to match the new SEO contract.                                                             |           |      |
| TASK-005 | Add or adjust validation coverage in `src/app/shared/services/config-bootstrap.service.ts` only if needed for schema/runtime alignment.            |           |      |

### Implementation Phase 2

- GOAL-002: Add host-aware crawl assets in SSR and verify their output.

| Task     | Description                                                                                                 | Completed | Date |
| -------- | ----------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-006 | Add failing proof for host-aware crawl assets using focused server/tooling tests or a reproducible command. |           |      |
| TASK-007 | Update `src/server.ts` to serve host-aware `robots.txt` with the active host sitemap URL.                   |           |      |
| TASK-008 | Update `src/server.ts` to serve host-aware `sitemap.xml` from route metadata and canonical origins.         |           |      |
| TASK-009 | Reduce `public/robots.txt` and `public/sitemap.xml` to fallback/static safety roles only if still needed.   |           |      |
| TASK-010 | Add a focused regression check for SSR output of crawl assets.                                              |           |      |

### Implementation Phase 3

- GOAL-003: Extend SEO smoke checks and backfill drafts.

| Task     | Description                                                                                                                    | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-011 | Extend `tools/draft-smoke-check.mjs` to inspect title, description, canonical, robots, keywords, and selected OG/Twitter tags. |           |      |
| TASK-012 | Update `tools/tests/draft-smoke-check.spec.mjs` to cover the new report shape and checks.                                      |           |      |
| TASK-013 | Pull the published state for each production domain with `node tools/config-draft-sync.mjs pull --stage=published ...`.        |           |      |
| TASK-014 | Backfill `site-config.json` and `page-config.json` across all published drafts with the new SEO fields.                        |           |      |
| TASK-015 | Clean or strengthen structured-data entries in drafts where the current schema types are incomplete, invalid, or over-claimed. |           |      |

### Implementation Phase 4

- GOAL-004: Update docs, run audits, and close with browser QA.

| Task     | Description                                                                                                   | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-016 | Update `docs/11-draft-lifecycle.md` and related API-driven config docs for the new SEO workflow and contract. |           |      |
| TASK-017 | Update reusable notes under `ai-notes/` if the rollout yields durable workflow guidance.                      |           |      |
| TASK-018 | Run focused unit tests and smoke checks, then rerun after each local fix.                                     |           |      |
| TASK-019 | Audit the work at least three times.                                                                          |           |      |
| TASK-020 | Run desktop and mobile browser QA on every affected draft route and resolve any issue found before closeout.  |           |      |

## 3. Alternatives

- **ALT-001**: Add only new head tags and keep static `robots.txt` and `sitemap.xml`. Rejected because it leaves the multi-domain crawl asset problem unresolved.
- **ALT-002**: Move sitemap and crawl logic into backend lambdas immediately. Rejected for the initial rollout because SSR can likely solve the host-aware gap with less cross-repo risk.
- **ALT-003**: Skip `meta keywords` entirely. Rejected because the user explicitly requested compatibility support.

## 4. Dependencies

- **DEP-001**: Angular SSR server in `src/server.ts` must remain the authoritative SEO-capable runtime path.
- **DEP-002**: Draft route inventory in local files must remain available for sitemap generation and smoke-check coverage.
- **DEP-003**: `tools/config-draft-sync.mjs` is required to pull published draft baselines before backfill.
- **DEP-004**: Browser QA depends on a working local preview or SSR server for affected routes.

## 5. Files

- **FILE-001**: `src/app/shared/services/seo-metadata.service.ts` — SEO head rendering.
- **FILE-002**: `src/app/shared/services/seo-metadata.service.spec.ts` — SEO renderer tests.
- **FILE-003**: `src/app/shared/types/config-payloads.types.ts` — SEO contract types.
- **FILE-004**: `docs/api-driven-config/schemas/seo.schema.json` — SEO schema.
- **FILE-005**: `src/app/shared/services/config-bootstrap.service.ts` — validation alignment.
- **FILE-006**: `src/server.ts` — host-aware crawl assets.
- **FILE-007**: `public/robots.txt` — fallback/static asset role.
- **FILE-008**: `public/sitemap.xml` — fallback/static asset role.
- **FILE-009**: `tools/draft-smoke-check.mjs` — route-level SEO smoke checks.
- **FILE-010**: `tools/tests/draft-smoke-check.spec.mjs` — smoke-check tests.
- **FILE-011**: `docs/11-draft-lifecycle.md` — draft sync and rollout workflow.
- **FILE-012**: `drafts/**/site-config.json` and `drafts/**/page-config.json` — SEO backfill.

## 6. Testing

- **TEST-001**: `seo-metadata.service.spec.ts` must fail before implementation and pass after implementation for `keywords` and `robots`.
- **TEST-002**: Focused SSR or tooling proof must fail before host-aware crawl asset implementation and pass after it.
- **TEST-003**: `tools/tests/draft-smoke-check.spec.mjs` must cover the expanded SEO summary/report shape.
- **TEST-004**: Full `node tools/draft-smoke-check.mjs` run must pass for the full draft inventory after draft backfill.
- **TEST-005**: Browser QA must confirm clean desktop and mobile behavior for affected draft routes.

## 7. Risks & Assumptions

- **RISK-001**: Static no-SSR deployments may not support correct per-host `robots.txt` and `sitemap.xml` without additional deployment work.
- **RISK-002**: Some drafts may contain outdated or weak structured data that requires manual review instead of a blind migration.
- **RISK-003**: Pulling published drafts may reveal drift between local draft files and published state.
- **ASSUMPTION-001**: Current SSR routing and route inventory are sufficient to generate sitemap URLs without a new backend endpoint.
- **ASSUMPTION-002**: The existing localized text resolution path can be reused for SEO keywords.
- **ASSUMPTION-003**: Published drafts can be safely migrated with optional fields before any stricter future validation.

## 8. Related Specifications / Further Reading

- `docs/11-draft-lifecycle.md`
- `docs/02-architecture.md`
- `ai-notes/knowledge/draft-authoring-rules.md`
- `plan/phase 1/steps/step5 - Launch Readiness & Deployment/tasks/task3 - SEO & Metadata/plan.md`
- Google Search Central: SEO Starter Guide
- Google Search Central: AI features and your website
- Bing Webmaster Guidelines
- OpenAI Developers: Overview of OpenAI Crawlers
