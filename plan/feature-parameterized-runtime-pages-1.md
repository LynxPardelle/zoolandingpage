---
goal: Parameterized runtime pages with PokeAPI search and detail demo
version: 1.0
date_created: 2026-05-09
last_updated: 2026-05-09
owner: Codex
status: 'Completed'
tags: [feature, runtime-api, drafts, proxy, pokeapi, search]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-green)

Implement the approved parameterized runtime page design for Zoolandingpage. The implementation must let draft data sources resolve safe input from query parameters, scope data sources to page IDs, let the API proxy resolve server-only `urlTemplate` values safely, and upgrade the `pokeapi-demo.zoolandingpage.com.mx` draft with a searchable catalog plus `/pokemon?name=...` detail page.

## 1. Requirements & Constraints

- **REQ-001**: `runtime.dataSources[]` must support optional `pageIds: string[]` and preserve current behavior when omitted.
- **REQ-002**: `runtime.dataSources[].input` must keep existing raw literal object behavior.
- **REQ-003**: `runtime.dataSources[].input` must support resolver objects with `source: "literal" | "queryParam" | "var"`.
- **REQ-004**: Query-param input resolution must work in browser and SSR contexts.
- **REQ-005**: Input transforms must support `trim`, `lowercase`, and `uppercase`.
- **REQ-006**: `search-box` must support dynamic suggestions loaded from `VariableStoreService` through existing `valueInstructions`.
- **REQ-007**: The API proxy must support `urlTemplate` while preserving existing `url` behavior.
- **REQ-008**: `pokeapi-demo.zoolandingpage.com.mx` must include route `/pokemon` mapped to page ID `pokemon-detail`.
- **REQ-009**: The demo home page must include a search box that navigates to `/pokemon?name=<pokemon>`.
- **REQ-010**: The demo detail page must render selected Pokemon data from `remote.pokemon.selected.items.0.*`.
- **SEC-001**: Browser payloads must never supply upstream URLs, credentials, or arbitrary headers.
- **SEC-002**: `urlTemplate` placeholders must reference only fields declared in `allowedInputFields`.
- **SEC-003**: Template values must be scalar, non-empty, length-limited, and percent-encoded with no path-safe characters.
- **SEC-004**: Template-consumed input fields must not be appended again as query params or JSON body fields.
- **SEC-005**: Existing production origin/domain proxy guardrails must remain unchanged.
- **CON-001**: Do not implement path-param routes such as `/pokemon/pikachu` in this increment.
- **CON-002**: Do not alter unrelated drafts except for shared runtime compatibility.
- **CON-003**: Do not store secrets or API keys in git, draft payloads, notes, plans, or logs.
- **PAT-001**: Follow test-driven development; write failing tests before production code.
- **PAT-002**: Reuse existing `RuntimeDataSourceService`, `RuntimeApiProxyClientService`, `VariableStoreService`, `search-box`, `loopConfig`, `valueInstructions`, and `navigateToUrl`.
- **PAT-003**: Update `Codex.md` and curated notes only with reusable, sanitized decisions after implementation.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Add runtime data-source input resolution and page scoping in `zoolandingpage`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Add failing frontend tests in `src/app/shared/services/runtime-data-source.service.spec.ts` for `pageIds` filtering, literal input preservation, query-param input resolution, and transform behavior. | | |
| TASK-002 | Add type definitions in `src/app/shared/types/config-payloads.types.ts` for data-source `pageIds` and resolver input objects. | | |
| TASK-003 | Update `src/app/shared/utility/config-validation/config-payload.validators.ts` and its spec to validate optional `pageIds` and resolver input objects without rejecting existing literal inputs. | | |
| TASK-004 | Implement a focused input resolver in `src/app/shared/services/runtime-data-source.service.ts` or a new helper service under `src/app/shared/services/` that reads query params through browser `window.location.search` and SSR `REQUEST`. | | |
| TASK-005 | Update `RuntimeDataSourceService.start(...)` to skip sources whose `pageIds` do not include the active page ID and send resolved input to `RuntimeApiProxyClientService.readSource(...)`. | | |
| TASK-006 | Run the targeted frontend tests and keep them passing before moving to the next phase. | | |

### Implementation Phase 2

- GOAL-002: Add dynamic search suggestions support without replacing `search-box`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Add failing tests for `WrapperOrchestrator.resolveSearchConfig(...)` proving `config.suggestions` can be a thunk from `valueInstructions` and static suggestions still work. | | |
| TASK-008 | Update `src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts` to resolve `suggestions` explicitly when it is dynamic. | | |
| TASK-009 | Run targeted wrapper/search tests and verify no static search-box behavior regresses. | | |

### Implementation Phase 3

- GOAL-003: Add safe `urlTemplate` support to `zoolanding-api-proxy`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Add failing proxy tests in `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\tests\test_handler.py` for encoded template replacement, no query duplication, undeclared placeholders, invalid template values, and legacy `url` compatibility. | | |
| TASK-011 | Update `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\lambda_function.py` to resolve `urlTemplate` from allowlisted input and return remaining input for query/body forwarding. | | |
| TASK-012 | Update `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\instructions.md` and `README.md` with the `urlTemplate` contract. | | |
| TASK-013 | Run `python -m unittest discover -s tests -p "test_*.py"` in `zoolanding-api-proxy`. | | |

### Implementation Phase 4

- GOAL-004: Upgrade `pokeapi-demo.zoolandingpage.com.mx` draft with search, detail page, and light/dark visual treatment.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Update `drafts/pokeapi-demo.zoolandingpage.com.mx/site-config.json` routes and runtime data sources for `pokeapiPokemonIndex` and `pokeapiPokemonDetail`. | | |
| TASK-015 | Update `drafts/pokeapi-demo.zoolandingpage.com.mx/server/integrations.json` with `pokeapiPokemonIndex` and `pokeapiPokemonDetail` using `urlTemplate`. | | |
| TASK-016 | Update the default page components to include a polished search box, detail links, and theme controls if required by the approved visual direction. | | |
| TASK-017 | Create `drafts/pokeapi-demo.zoolandingpage.com.mx/pokemon-detail/page-config.json`, `components.json`, `variables.json`, and `i18n/es.json`. | | |
| TASK-018 | Ensure both light and dark palettes render professionally on home and detail routes. | | |

### Implementation Phase 5

- GOAL-005: Validate, publish, and close out.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | Run `npm test` or targeted Angular tests first, then full app build if targeted tests pass. | | |
| TASK-020 | Run proxy unit tests after implementation. | | |
| TASK-021 | Publish the updated PokeAPI draft through the existing config draft sync workflow. | | |
| TASK-022 | Run browser QA on `/`, `/pokemon?name=pikachu`, and `/pokemon?name=charizard` in desktop and mobile viewports. | | |
| TASK-023 | Repeat audit/fix/rerun at least three times before closeout. | | |
| TASK-024 | Update `Codex.md`, `ai-notes/notes/project-session-memorandum.md`, and `ai-notes/notes/project-todos.md` only with sanitized reusable outcomes. | | |

## 3. Alternatives

- **ALT-001**: Static search suggestions and fixed Pokemon detail sources. Rejected because it does not prove reusable blog/catalog detail pages.
- **ALT-002**: Dynamic path routes such as `/pokemon/pikachu`. Rejected for this increment because it touches more routing and SSR behavior than the approved query-param design.
- **ALT-003**: New bespoke Pokemon search component. Rejected because existing `search-box`, `valueInstructions`, and `eventInstructions` can support the behavior with smaller shared runtime changes.

## 4. Dependencies

- **DEP-001**: Existing `zoolandingpage` Angular runtime and draft authoring structure.
- **DEP-002**: Existing `zoolanding-api-proxy` Lambda repository at `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy`.
- **DEP-003**: Existing config authoring and runtime-read APIs for draft publish and testing preview.
- **DEP-004**: Public PokeAPI endpoints for no-secret demo data.
- **DEP-005**: Existing in-app browser or Playwright tooling for visual QA.

## 5. Files

- **FILE-001**: `src/app/shared/types/config-payloads.types.ts`
- **FILE-002**: `src/app/shared/utility/config-validation/config-payload.validators.ts`
- **FILE-003**: `src/app/shared/utility/config-validation/config-payload.validators.spec.ts`
- **FILE-004**: `src/app/shared/services/runtime-data-source.service.ts`
- **FILE-005**: `src/app/shared/services/runtime-data-source.service.spec.ts`
- **FILE-006**: `src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.ts`
- **FILE-007**: `src/app/shared/components/wrapper-orchestrator/wrapper-orchestrator.component.spec.ts`
- **FILE-008**: `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\lambda_function.py`
- **FILE-009**: `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\tests\test_handler.py`
- **FILE-010**: `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\instructions.md`
- **FILE-011**: `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\README.md`
- **FILE-012**: `drafts/pokeapi-demo.zoolandingpage.com.mx/site-config.json`
- **FILE-013**: `drafts/pokeapi-demo.zoolandingpage.com.mx/server/integrations.json`
- **FILE-014**: `drafts/pokeapi-demo.zoolandingpage.com.mx/default/components.json`
- **FILE-015**: `drafts/pokeapi-demo.zoolandingpage.com.mx/pokemon-detail/page-config.json`
- **FILE-016**: `drafts/pokeapi-demo.zoolandingpage.com.mx/pokemon-detail/components.json`
- **FILE-017**: `drafts/pokeapi-demo.zoolandingpage.com.mx/pokemon-detail/variables.json`
- **FILE-018**: `drafts/pokeapi-demo.zoolandingpage.com.mx/pokemon-detail/i18n/es.json`
- **FILE-019**: `Codex.md`
- **FILE-020**: `ai-notes/notes/project-session-memorandum.md`
- **FILE-021**: `ai-notes/notes/project-todos.md`

## 6. Testing

- **TEST-001**: Frontend runtime source tests fail before implementation and pass after `pageIds` and input resolver support.
- **TEST-002**: Frontend config validator tests fail before schema support and pass after update.
- **TEST-003**: Wrapper search config tests fail before dynamic suggestions resolution and pass after update.
- **TEST-004**: Proxy `urlTemplate` tests fail before implementation and pass after update.
- **TEST-005**: Full or targeted Angular tests pass after frontend implementation.
- **TEST-006**: Proxy unit test suite passes after proxy implementation.
- **TEST-007**: Browser QA passes desktop and mobile for `/`, `/pokemon?name=pikachu`, and `/pokemon?name=charizard`.
- **TEST-008**: Final browser QA reports no console errors, no failed application requests, no bad responses, no broken images, and no horizontal overflow.

## 7. Risks & Assumptions

- **RISK-001**: Dynamic suggestions may not refresh if runtime variable updates do not trigger wrapper recomputation. Mitigate by verifying with tests and browser QA.
- **RISK-002**: Query-param input resolution can differ between SSR and browser. Mitigate by testing both request-backed and browser-backed paths.
- **RISK-003**: PokeAPI can rate-limit or temporarily fail. Mitigate with fallback variables and safe error states.
- **RISK-004**: Draft files are local and ignored by git. Mitigate by publishing through config authoring and documenting version evidence.
- **ASSUMPTION-001**: `/pokemon?name=...` is the approved first increment route shape.
- **ASSUMPTION-002**: PokeAPI remains no-secret and safe for the public demo.
- **ASSUMPTION-003**: Existing raw API Gateway proxy base remains usable for browser/runtime calls during testing.

## 8. Related Specifications / Further Reading

- `docs/superpowers/specs/2026-05-09-parameterized-runtime-pages-pokeapi-search-design.md`
- `docs/superpowers/specs/2026-05-07-runtime-api-proxy-data-sources-design.md`
- `Codex.md`
- `ai-notes/README.md`
- `C:\Users\lince\Documents\GitHub\zoolanding-api-proxy\README.md`
