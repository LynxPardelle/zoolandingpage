# Zoolandingpage

Zoolandingpage is the Angular frontend for a config-driven landing page platform.

In local development, the app renders draft JSON from the repo-root `drafts/` tree, served at `/drafts/...`. In production, it renders a published runtime bundle returned by the config runtime API. The same platform also integrates with a config authoring API, a public asset upload API, a raw analytics collector, and a quick-stats service.

## What this repository owns

- The Angular application and SSR shell.
- Local draft authoring and preview workflows.
- The draft round-trip CLI in `tools/config-draft-sync.mjs`.
- Frontend integration with the config runtime, analytics, quick stats, and public asset hosting.
- The main platform documentation for developers working across the Zoolanding stack.

## Platform map

- `zoolandingpage`: Angular app, local draft preview, frontend runtime integration.
- `zoolanding-config-authoring`: create, pull, update, and publish draft packages.
- `zoolanding-config-runtime-read`: return one effective runtime bundle for `domain + path + lang`.
- `zoolanding-image-upload`: issue presigned upload URLs for public landing-page assets.
- `zoolanding-data-dropper-lambda`: collect raw analytics events.
- `zoolanding-quick-stats-lambda`: maintain simple per-app counters and stats in S3.

## The three config states

These three states are the most important concept for new contributors:

1. `Local draft files`: JSON files under `drafts/{domain}/...` that you edit in the repo.
2. `Authoring draft state`: the draft currently stored in the config authoring API.
3. `Published runtime state`: the version the runtime API returns to live sites.

Most confusion comes from mixing those states. This repo now documents them separately and links the transitions between them.

## Quick start

### Docker-first development

```bash
git clone https://github.com/LynxPardelle/zoolandingpage.git
cd zoolandingpage
make dev
```

The Docker workflow is the default team path. If your local setup uses the raw Angular dev server instead, the same draft URLs and CLI commands still apply.

### Local draft preview

Open the app with explicit draft query parameters so the runtime resolves the correct domain and page:

```text
http://127.0.0.1:4200/?draftDomain=zoolandingpage.com.mx&draftPageId=default
http://127.0.0.1:4200/?draftDomain=test.zoolandingpage.com.mx&draftPageId=default
```

If your dev server is exposed on another port through Docker, keep the same query parameters and switch only the host/port.

Draft-specific scratch material now lives beside the payloads under `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/`. Reusable guidance belongs in `ai-notes/`.

## Core workflows

### Inspect the draft CLI

The canonical local authoring CLI is:

```bash
node tools/config-draft-sync.mjs help
```

Supported commands today:

- `pack`
- `unpack`
- `pull`
- `push`
- `create`
- `publish`

### Smoke-check local drafts against live aliases

When a local dev server is already running, you can run the browser-based draft smoke check:

```bash
node tools/draft-smoke-check.mjs --local-base-url=http://127.0.0.1:4200
```

Or use the package script:

```bash
npm run drafts:smoke -- --local-base-url=http://127.0.0.1:4200
```

What it checks:

- every local draft route renders a title and a first heading
- the page does not fall into the `Unresolved draft` fallback
- any draft with a managed `*.zoolandingpage.com.mx` alias matches its live counterpart for title, first heading, and key header controls

If you save the structured report with `--output=...`, each route now includes both desktop and mobile viewport results.

If Chromium is not installed in a default location, pass `--browser-path=...`.

The package scripts in `package.json` wrap the same commands, but the direct `node tools/config-draft-sync.mjs ...` form is the clearest option when you need explicit arguments.

### Typical round-trip

```bash
node tools/config-draft-sync.mjs pull --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx
node tools/config-draft-sync.mjs push --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
node tools/config-draft-sync.mjs publish --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --updated-by="Your Name"
```

If the custom domain `https://api.zoolandingpage.com.mx/config-authoring` resets the connection during publish, retry through the raw API Gateway authoring endpoint documented in [docs/06-deployment.md](docs/06-deployment.md) to separate front-door transport problems from authoring-Lambda problems.

For the full workflow, read [docs/11-draft-lifecycle.md](docs/11-draft-lifecycle.md).

### Upload public assets

Public landing-page assets do not belong in config payload storage. They live in the public files bucket and are uploaded through the presign endpoint:

```text
POST https://api.zoolandingpage.com.mx/image-upload/presign
```

For the current request shape, upload sequence, and how to reference the returned `publicUrl` from draft JSON, read [docs/12-public-assets-and-file-uploads.md](docs/12-public-assets-and-file-uploads.md).

## Documentation map

Start here in this order:

1. [docs/DEVELOPER_ONBOARDING.md](docs/DEVELOPER_ONBOARDING.md)
2. [ai-notes/README.md](ai-notes/README.md)
3. [docs/02-architecture.md](docs/02-architecture.md)
4. [docs/03-development-guide.md](docs/03-development-guide.md)
5. [docs/11-draft-lifecycle.md](docs/11-draft-lifecycle.md)
6. [docs/12-public-assets-and-file-uploads.md](docs/12-public-assets-and-file-uploads.md)
7. [docs/api-driven-config/README.md](docs/api-driven-config/README.md)
8. [docs/06-deployment.md](docs/06-deployment.md)

Specialized references:

- [docs/05-analytics-tracking.md](docs/05-analytics-tracking.md)
- [docs/08-data-dropper-lambda.md](docs/08-data-dropper-lambda.md)
- [docs/09-quick-stats-lambda.md](docs/09-quick-stats-lambda.md)
- [docs/10-wrapper-orchestrator.md](docs/10-wrapper-orchestrator.md)

## Important folders

```text
drafts/                            Local draft source of truth for development
drafts/{domain}/ai_notes/          Local draft-specific notes and historical context
drafts/{domain}/findings/          Local draft-specific findings and investigation
drafts/{domain}/errors-reports/    Local draft-specific incident notes when needed
ai-notes/                          Canonical reusable workflow and knowledge base
src/app/shared/services/            Config, analytics, SEO, and runtime services
src/app/shared/types/               Payload contracts used by the frontend runtime
tools/config-draft-sync.mjs         Local CLI for pack/pull/push/create/publish
docs/api-driven-config/             Config payload reference and DSL docs
```

## Related repositories

Workspace repos:

- `../zoolanding-data-dropper-lambda`
- `../zoolanding-quick-stats-lambda`

Related platform repos used by this frontend:

- `../zoolanding-config-authoring`
- `../zoolanding-config-runtime-read`
- `../zoolanding-image-upload`

## Contributing

When you update payloads, workflows, or endpoint behavior, update documentation in the same change. Start with [ai-notes/README.md](ai-notes/README.md) plus the relevant committed note before new work, inspect local `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` when a task depends on an existing draft, and distill only reusable learnings back into the canonical folder before closing the task. Finish draft-affecting work with three audit passes and browser QA in desktop and mobile viewports. The main repo should remain the source of truth for platform-level behavior; the Lambda repos should stay focused on their own contracts and deployment details.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
