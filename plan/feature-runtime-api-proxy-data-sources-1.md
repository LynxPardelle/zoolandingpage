---
goal: Runtime API proxy and draft data sources implementation
version: 1.0
date_created: 2026-05-07
last_updated: 2026-05-07
owner: Codex
status: 'Implemented locally; deployment pending approval'
tags: [feature, architecture, security, frontend, serverless, drafts]
---

# Introduction

![Status: Implemented locally; deployment pending approval](https://img.shields.io/badge/status-Implemented%20locally%3B%20deployment%20pending%20approval-blue)

Implement the approved runtime API proxy and data sources design so Zoolanding drafts can consume multiple external APIs per site, refresh read data into runtime variables, and dispatch safe mutable actions through a server-side proxy without exposing credentials to the browser.

## 1. Requirements & Constraints

- **REQ-001**: Each draft/site MUST support multiple configured read data sources.
- **REQ-002**: Each draft/site MUST support multiple configured mutable API actions.
- **REQ-003**: Read data source results MUST be written into runtime variables under configured targets such as `remote.music.releases`.
- **REQ-004**: Data source status MUST be written into configured status targets or default `remoteStatus.{dataSourceId}` paths.
- **REQ-005**: Existing `loopConfig.source: "var"` and `valueInstructions` MUST be used for rendering remote data.
- **REQ-006**: `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` MUST be representable in server-only integration policy.
- **REQ-007**: The first frontend implementation MUST support read data sources and the client contract for actions; destructive production actions remain disabled until proxy authorization exists.
- **SEC-001**: Draft/browser payloads MUST NOT contain API secrets, bearer tokens, client secrets, raw signed URLs, private customer data, or unrestricted upstream URLs with credentials.
- **SEC-002**: The proxy MUST resolve all upstream requests through published server-only policy, not browser-provided URLs.
- **SEC-003**: The proxy MUST load credentials only from AWS Secrets Manager by `credentialRef`.
- **SEC-004**: The proxy MUST redact secrets from logs and responses.
- **SEC-005**: The proxy MUST enforce method, request field, response field, timeout, and response size allowlists.
- **CON-001**: Follow existing Angular service patterns in `src/app/shared/services`.
- **CON-002**: Follow existing Lambda repository patterns from `../zoolanding-config-authoring`, `../zoolanding-config-runtime-read`, and `../zoolanding-quick-stats-lambda`.
- **CON-003**: Use TDD for behavior-changing code. No production code without a failing test first.
- **CON-004**: Use `apply_patch` for manual file edits.
- **CON-005**: Do not push, deploy, create AWS resources, or store real secrets without explicit user approval.
- **PAT-001**: Add frontend config types in `src/app/shared/types/config-payloads.types.ts`.
- **PAT-002**: Add frontend runtime services as injectable Angular services with unit specs.
- **PAT-003**: Add proxy tests under `../zoolanding-api-proxy/tests`.
- **PAT-004**: Add docs under `docs/api-driven-config/` and keep `Codex.md` updated for durable decisions.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Create executable implementation scaffolding and contract tests before production code.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create this plan file at `plan/feature-runtime-api-proxy-data-sources-1.md`. | ✅ | 2026-05-07 |
| TASK-002 | Add failing frontend unit tests in `src/app/shared/services/variable-store.service.spec.ts` proving runtime overlay values are readable through `get`, `getArray`, and `snapshot`, and reset on `setPayload`; implement minimal overlay support and verify the isolated spec passes. | ✅ | 2026-05-07 |
| TASK-003 | Add failing frontend unit tests for a new `src/app/shared/services/runtime-data-source-mapper.service.spec.ts` proving `itemsPath`, field mappings, fallbacks, and empty arrays are handled; implement the mapper and verify the isolated spec passes. | ✅ | 2026-05-07 |
| TASK-004 | Add failing frontend unit tests for a new `src/app/shared/services/runtime-data-source.service.spec.ts` proving multiple data sources call the proxy, write target variables, and write status variables; implement the initial service and verify the isolated spec passes. | ✅ | 2026-05-07 |
| TASK-005 | Add failing frontend unit tests for a new `proxyAction` event handler proving only declared action input fields are sent to a proxy service. | ✅ | 2026-05-07 |

### Implementation Phase 2

- GOAL-002: Implement frontend runtime data sources while preserving existing draft behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Extend `VariableStoreService` with runtime overlay methods `setRuntimeValue(path, value)`, `patchRuntimeValues(values)`, `clearRuntimeValues()`, and ensure `setPayload` clears runtime overlay. | ✅ | 2026-05-07 |
| TASK-007 | Extend `TDraftSiteRuntimeConfig` in `src/app/shared/types/config-payloads.types.ts` with `dataSources?: readonly TRuntimeDataSourceConfig[]` and `apiActions?: readonly TRuntimeApiActionConfig[]`. | ✅ | 2026-05-07 |
| TASK-008 | Implement `RuntimeDataSourceMapperService` to map JSON responses using dot paths, `itemsPath`, field mappings, and per-field fallback values. | ✅ | 2026-05-07 |
| TASK-009 | Implement `RuntimeApiProxyClientService` using `environment.apiUrl` and endpoints `api-proxy/read` and `api-proxy/action`; verify isolated proxy client spec passes. | ✅ | 2026-05-07 |
| TASK-010 | Implement `RuntimeDataSourceService` to process multiple data sources, update runtime variables/status, schedule interval refreshes, and stop timers on disconnect; initial isolated spec passes for load/status behavior. | ✅ | 2026-05-07 |
| TASK-011 | Integrate `RuntimeDataSourceService` into `RuntimeService` after successful config bootstrap and before/alongside post-render class refresh; verify isolated runtime service spec passes. | ✅ | 2026-05-07 |
| TASK-012 | Implement `proxyAction` event handler and register it through the existing event handler provider. | ✅ | 2026-05-07 |

### Implementation Phase 3

- GOAL-003: Scaffold `zoolanding-api-proxy` as a local serverless repo with tests and no real secrets.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Create local repo folder `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy` if absent. | ✅ | 2026-05-07 |
| TASK-014 | Add `README.md`, `instructions.md`, `template.yaml`, `samconfig.toml`, `lambda_function.py`, `zoolanding_lambda_common.py`, `local_test.py`, and `tests/` following existing Lambda repo patterns. | ✅ | 2026-05-07 |
| TASK-015 | Add failing proxy tests for multiple integrations per domain, unknown integration rejection, method allowlist rejection, request field allowlist rejection, response filtering, and safe error responses. | ✅ | 2026-05-07 |
| TASK-016 | Implement proxy policy loading from `CONFIG_TABLE_NAME` and `CONFIG_PAYLOADS_BUCKET_NAME`, resolving the published prefix and `server/integrations.json`. | ✅ | 2026-05-07 |
| TASK-017 | Implement Secrets Manager credential lookup by `credentialRef` with a local dry-run/stub path for tests. | ✅ | 2026-05-07 |
| TASK-018 | Implement upstream request execution using Python standard library only, with method allowlist, timeout, response size limit, and JSON response parsing. | ✅ | 2026-05-07 |
| TASK-019 | Implement safe response filtering and redacted structured logs. | ✅ | 2026-05-07 |
| TASK-020 | Add SAM IAM policy statements for DynamoDB read, S3 read, and narrow Secrets Manager read by configurable secret prefix. | ✅ | 2026-05-07 |

### Implementation Phase 4

- GOAL-004: Add documentation and a safe demo draft path.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-021 | Add `docs/api-driven-config/15-runtime-api-proxy-data-sources.md` documenting public draft config, server-only policy, status variables, and examples. | ✅ | 2026-05-07 |
| TASK-022 | Update `docs/api-driven-config/README.md` and `docs/api-driven-config/06-authoring-checklist.md` to include runtime data sources and server-only policy rules. | ✅ | 2026-05-07 |
| TASK-023 | Add or update JSON schema docs for `site-config.schema.json` to describe `runtime.dataSources` and `runtime.apiActions`. | ✅ | 2026-05-07 |
| TASK-024 | Add a safe no-secret demo data source using an API such as PokeAPI or a local stub, without creating real AWS resources. | ✅ | 2026-05-07 |
| TASK-025 | Add a new `music.lynxpardelle.com` section that renders remote music release/song data through `loopConfig.source: "var"` using proxy-shaped data and safe fallback behavior. | ✅ | 2026-05-07 |
| TASK-026 | Add `drafts/music.lynxpardelle.com/server/integrations.json` with no real secrets; use stub/no-secret provider policy unless real Secrets Manager credentials are approved later. | ✅ | 2026-05-07 |

### Implementation Phase 5

- GOAL-005: Verify implementation with automated tests, build, and browser QA.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-027 | Run targeted Angular specs for variable store, mapper, data source service, proxy client, and event handler. | ✅ | 2026-05-07 |
| TASK-028 | Run proxy unit tests in `../zoolanding-api-proxy`. | ✅ | 2026-05-07 |
| TASK-029 | Run `npm run build` in `zoolandingpage`. | ✅ | 2026-05-07 |
| TASK-030 | Run draft smoke checks that include `music.lynxpardelle.com`; if broad smoke is unstable, run a narrowed check and record the limitation. | ✅ | 2026-05-07 |
| TASK-031 | Start local dev server or production SSR server and run browser QA on affected music draft route in desktop and mobile. | ✅ | 2026-05-07 |
| TASK-032 | Repeat audit/fix/rerun cycle at least three times before closeout. | ✅ | 2026-05-07 |
| TASK-033 | Confirm no real secrets were added with a lightweight secret scan over modified repos. | ✅ | 2026-05-07 |

## 3. Alternatives

- **ALT-001**: Direct browser fetch from draft-configured URLs. Rejected because it exposes CORS limitations, cannot protect credentials, and cannot safely support `POST`, `PUT`, `PATCH`, or `DELETE`.
- **ALT-002**: Add `loopConfig.source: "api"` and make component rendering async. Rejected because it increases rendering complexity and duplicates existing variable-driven rendering primitives.
- **ALT-003**: Create one Lambda per external provider. Rejected because every new draft/provider would require additional AWS edits and deployments.
- **ALT-004**: Store secrets in S3 with server-only object paths. Rejected because AWS Secrets Manager better matches secret lifecycle, IAM scoping, rotation, and audit expectations.

## 4. Dependencies

- **DEP-001**: Existing Angular app in `C:\Users\lince\Documents\GitHub\zoolandingpage`.
- **DEP-002**: Existing config authoring repo `C:\Users\lince\Documents\GitHub\zoolanding-config-authoring`.
- **DEP-003**: Existing runtime read repo `C:\Users\lince\Documents\GitHub\zoolanding-config-runtime-read`.
- **DEP-004**: Existing Lambda patterns in `C:\Users\lince\Documents\GitHub\zoolanding-quick-stats-lambda`.
- **DEP-005**: AWS Secrets Manager for deployed credential storage; local tests must use stubs and no real secrets.
- **DEP-006**: `environment.apiUrl` remains the browser-facing API base URL.

## 5. Files

- **FILE-001**: `src/app/shared/services/variable-store.service.ts` - add runtime overlay support.
- **FILE-002**: `src/app/shared/services/variable-store.service.spec.ts` - add overlay tests.
- **FILE-003**: `src/app/shared/types/config-payloads.types.ts` - add runtime data source and action types.
- **FILE-004**: `src/app/shared/services/runtime-data-source-mapper.service.ts` - new mapper service.
- **FILE-005**: `src/app/shared/services/runtime-data-source-mapper.service.spec.ts` - new mapper tests.
- **FILE-006**: `src/app/shared/services/runtime-api-proxy-client.service.ts` - new proxy client.
- **FILE-007**: `src/app/shared/services/runtime-api-proxy-client.service.spec.ts` - new proxy client tests.
- **FILE-008**: `src/app/shared/services/runtime-data-source.service.ts` - new runtime orchestration service.
- **FILE-009**: `src/app/shared/services/runtime-data-source.service.spec.ts` - new runtime service tests.
- **FILE-010**: `src/app/core/services/runtime.service.ts` - start/stop runtime data service.
- **FILE-011**: `src/app/shared/utility/event-handler/handlers/*.ts` - add proxy action event handler.
- **FILE-012**: `docs/api-driven-config/15-runtime-api-proxy-data-sources.md` - new docs.
- **FILE-013**: `docs/api-driven-config/README.md` - docs index update.
- **FILE-014**: `docs/api-driven-config/06-authoring-checklist.md` - authoring rules update.
- **FILE-015**: `docs/api-driven-config/schemas/site-config.schema.json` - schema update.
- **FILE-016**: `drafts/music.lynxpardelle.com/default/components.json` - add remote music section.
- **FILE-017**: `drafts/music.lynxpardelle.com/default/variables.json` - add fallback/status labels if needed.
- **FILE-018**: `drafts/music.lynxpardelle.com/server/integrations.json` - server-only no-secret policy.
- **FILE-019**: `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\*` - new local proxy repo files.
- **FILE-020**: `Codex.md` - durable notes for reusable workflow decisions.

## 6. Testing

- **TEST-001**: `VariableStoreService` runtime overlay test proves overlay values override static payload variables and reset on `setPayload`.
- **TEST-002**: mapper tests prove multiple items, missing paths, nested paths, and fallbacks.
- **TEST-003**: runtime data source tests prove multiple sources run independently and write separate targets/statuses.
- **TEST-004**: proxy client tests prove endpoint URLs use `environment.apiUrl` and request bodies contain `domain`, `pageId`, and `sourceId` or `actionId`.
- **TEST-005**: event handler tests prove action inputs are bounded by configured fields.
- **TEST-006**: proxy unit tests prove multiple integrations per domain.
- **TEST-007**: proxy unit tests prove unknown source/action IDs are rejected.
- **TEST-008**: proxy unit tests prove disallowed methods and unknown request fields are rejected.
- **TEST-009**: proxy unit tests prove response allowlists and max response size are enforced.
- **TEST-010**: browser QA proves `music.lynxpardelle.com` renders the new section without breaking existing sections.

## 7. Risks & Assumptions

- **RISK-001**: Existing broad CORS patterns are not suitable for credentialed mutable proxy actions. The new proxy must use tighter CORS and authorizer-ready design.
- **RISK-002**: Spotify and TIDAL require credentials; local implementation must use stubs or no-secret APIs until credentials are available in Secrets Manager.
- **RISK-003**: Directly adding a new section to the music draft could expose existing loop binding issues. Browser QA must verify old and new sections.
- **RISK-004**: S3-backed policy reads add runtime latency. Use short in-memory cache first and evaluate DynamoDB/S3 cache later.
- **RISK-005**: Destructive actions require stronger authorization. First increment must not ship real destructive production actions without an authorizer.
- **ASSUMPTION-001**: `config-authoring` will continue storing all JSON files from draft packages, including `server/integrations.json`.
- **ASSUMPTION-002**: `runtime-read` will continue returning only known browser payload files and will not expose `server/integrations.json`.
- **ASSUMPTION-003**: Local testing can use no-secret APIs or stubbed proxy responses.
- **ASSUMPTION-004**: Deployed custom domain routing for a new `/api-proxy/*` behavior will be handled after local implementation and explicit user approval.

## 8. Related Specifications / Further Reading

- [Runtime API Proxy And Data Sources Design](../docs/superpowers/specs/2026-05-07-runtime-api-proxy-data-sources-design.md)
- [Architecture](../docs/02-architecture.md)
- [Loop Config](../docs/api-driven-config/13-loop-config.md)
- [Event Instructions](../docs/api-driven-config/05-event-instructions.md)
- [Quick Stats Lambda Integration](../docs/09-quick-stats-lambda.md)
