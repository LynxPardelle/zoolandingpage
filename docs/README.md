# Zoolandingpage Documentation

Use this page as a task router. Open only the document needed for the current task, then verify its claims against executable code, JSON, workflows, or live state.

Use this page as the shared start-here index for developers and agents. Open only the section that matches the task.

## Start Here

- [Developer onboarding](./DEVELOPER_ONBOARDING.md): first-day setup, local draft workflow, and safe first exercise.
- [Getting started](./01-getting-started.md): install and run the application.
- [Development guide](./03-development-guide.md): day-to-day Angular development.
- [Architecture](./02-architecture.md): frontend, runtime configuration, and service boundaries.
- [Repository map](./repository-map.md): which Zoolanding repository owns each cross-repository responsibility.
- [Draft registry](./drafts-registry.json): machine-readable ownership and allowed deployment environments for all `draft-*` repositories.
- [Satellite registry](./satellite-repositories.json): machine-readable routing and CI/CD expectations for the managed satellite pilot.

## Draft Authoring And Publication

- [Draft lifecycle](./11-draft-lifecycle.md): local, testing, and production states; pack/pull/publish workflows.
- [API-driven configuration](./api-driven-config/README.md): configuration model and authoring contracts.
- [Public assets and uploads](./12-public-assets-and-file-uploads.md): asset ownership and upload flow.
- [Managed alias front door](./13-managed-alias-front-door.md): canonical domains, aliases, and front-door routing.
- [Draft registry](./drafts-registry.json): canonical repository and local path for each registered draft.

For an existing draft, continue at `drafts/{domain}/README.md`, then its curated `ai_notes/README.md` if present. Do not load draft findings, error reports, evidence, or coordination history by default.

## Runtime And Integration Contracts

- [Component model](./api-driven-config/02-component-model.md)
- [Value handlers](./api-driven-config/04-value-handlers-catalog.md)
- [Event instructions](./api-driven-config/05-event-instructions.md)
- [Conditions](./api-driven-config/09-condition-instructions.md)
- [Loops](./api-driven-config/13-loop-config.md)
- [API proxy data sources](./api-driven-config/15-runtime-api-proxy-data-sources.md)
- [Auth profile registry](./api-driven-config/17-auth-profile-registry.md)
- [Content hub article packages](./api-driven-config/18-content-hub-article-packages.md)
- [Protected feature contract](./api-driven-config/19-protected-feature-contract.md)
- [Generic content-builder primitives](./api-driven-config/20-generic-content-builder-primitives.md)
- [Generic combo catalog](./api-driven-config/21-generic-combo-catalog.md)
- [Server-only integration foundation](./api-driven-config/22-server-only-integration-microservices.md)

The owning service repository remains canonical for implementation, deployment, rollback, and trust-boundary detail. Use the [repository map](./repository-map.md) before editing a sibling.

## Operations, Release, And Observability

- [Deployment guide](./06-deployment.md)
- [Analytics and tracking](./05-analytics-tracking.md)
- [Analytics centralization](./08-analytics-centralization.md)
- [Data dropper integration](./08-data-dropper-lambda.md)
- [Quick stats integration](./09-quick-stats-lambda.md)
- [Wrapper orchestrator](./10-wrapper-orchestrator.md)

Verify operational instructions against current workflows, manifests, and live state when applicable. Historical paths and stack outputs are evidence, not current configuration.

## UI, Angora, And Frontend Reference

- [Ngx Angora CSS integration](./04-ngx-angora-css.md)
- [Ngx Angora CSS usage guide](./ngx-angora-css-usage-guide.md)
- [Animations and Angora integration](./07-animations-and-angora-integration.md)
- [Current Angular feature guide](./angular-latest-features-guide.md)
- [Centralized i18n implementation](./CENTRALIZED_I18N_IMPLEMENTATION.md)

## Reusable Knowledge And History

- [ai-notes index](../ai-notes/README.md): curated reusable constraints, knowledge, and procedures.
- [App changelog](../changelog/app/): notable application/runtime/tooling chronology.
- [Draft changelog](../changelog/drafts/): notable draft authoring, QA, and publication chronology.

Read changelogs only when history is relevant. Root entrypoints and canonical contracts must describe current rules, not replay past work.

## Documentation Rules

- Prefer one canonical owner and links over copied explanations.
- Keep current contracts separate from dated evidence.
- Do not link committed guidance to local `.superpowers/`, `devonly/`, raw evidence, or absolute machine paths.
- Do not put secrets, raw environment values, signed URLs, private customer data, or PII in documentation.
- When code and docs disagree, verify the implementation before changing the canonical contract.
