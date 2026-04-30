# Zoolandingpage Codex Memory

## Canonical Paths

- Local draft source and scratch workspace: `drafts/`
- Local draft-specific notes: `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/`
- Curated AI/developer guidance: [ai-notes/README.md](./ai-notes/README.md)
- Shared workspace prompts and community AI tooling hub: `.github/prompts/`
- Portable repo-local skills: `.github/skills/`
- Skill-selection guidance for installed general skills: [ai-notes/notes/copilot-skill-routing.md](./ai-notes/notes/copilot-skill-routing.md)
- Workspace AI customization rollout note: [ai-notes/notes/workspace-ai-customization-rollout.md](./ai-notes/notes/workspace-ai-customization-rollout.md)
- Committed reusable rules and procedures: [ai-notes/](./ai-notes/)
- Note templates: [ai-notes/templates/](./ai-notes/templates/)
- Optional local-only scratch: `devonly/`
- Main implementation docs: `docs/`

## Current Decisions

- `drafts/` is the local authored draft tree and local per-draft scratch area.
- `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` are local-only and should not be treated as committed source of truth.
- `devonly/` is optional local-only untracked scratch if repo-level temporary investigation space is needed.
- `ai-notes/` is the curated, shared-first knowledge base that future agents and developers must read before new work.
- `zoolandingpage` is the canonical home for shared workspace prompts and other community AI tooling because it owns `zoolandingpage.code-workspace`.
- `AGENTS.md` plus this file are the repo-level agent hooks for v1.
- Notes should stay English-first to match repo documentation, while quoted source content may stay in its original language.
- Note headers should always include `Date`, `Scope`, `Status`, `Applies To`, `Source Of Truth`, `Confidence`, and `Last Reviewed`.
- Use Central Time for note dates and reviews.
- Public SSR releases should enable text compression at the Node/Express layer, defer analytics/prefetch work until after first render, and keep accordion disclosure buttons free of `aria-selected`.
- Do not remove the `src/index.html` Angora CSS link targets (`/css/animations.css`, `/css/angora-styles.css`, `/css/angora-styles-responsive.css`) without desktop/mobile visual QA; the runtime CSS generator depends on those stylesheet surfaces even when `angular.json` also lists the files.
- Production `optimization.styles.inlineCritical` stays disabled while Angora runtime CSS link targets live in `src/index.html`; otherwise Angular tries to inline those runtime/public stylesheet URLs and emits misleading `C:\css\...` warnings.
- Draft analytics with `consentUI: "none"` should avoid sensitive enrichment such as raw IP, precise geolocation, raw cookies, and battery details unless a consent flow and compliance review explicitly approve it.
- 2026-04-30 Lighthouse remediation closeout: `zoolandingpage.com.mx` draft was pushed and published through the config authoring API as version `20260430T065228Z-ed28164d3340` with `updatedBy: Codex`; live URL checks still need a post-Dokploy pass because `https://zoolandingpage.com.mx/` and `https://test.zoolandingpage.com.mx/` were not reliably reachable during local QA.
- `reports/lighthouse/` is ignored by git and should hold local Lighthouse/browser QA artifacts; do not assume those reports are committed unless they are explicitly force-added.
- 2026-04-30 testing incident: `https://test.zoolandingpage.com.mx/` returned CloudFront `504 Gateway Timeout` while the raw runtime-read API resolved the alias successfully; keep Dokploy SSR builds on the Docker `production` target and use `/health` or `/healthz` for lightweight health checks.
- 2026-04-30 Dokploy recovery: the app host recovered after EC2 reboot, Docker build-cache cleanup, persistent swap enablement, Traefik HTTPS routers for app hosts, and routing app domains directly to Dokploy while keeping API/assets on their existing CloudFront distributions. Do not commit volatile host IDs, IPs, or distribution IDs; use `npm run ops:public-health` for repeatable public checks.
- 2026-04-30 SSR deopt fix: Dokploy/Traefik adds `X-Forwarded-*` headers; Angular SSR must trust the known proxy headers or it returns a small CSR shell with no `<main>`. `npm run ssr:smoke` now covers this forwarded-header case.
- 2026-04-30 Lighthouse performance follow-up: Lighthouse CLI is a local dev dependency. SSR `runtime-bundle` fetches should use the raw server-only runtime endpoint before the browser-facing API custom domain to reduce TTFB when Node transport to the custom domain resets.
- 2026-04-30 Dokploy ENOSPC follow-up: testing deploys can fail while the old container stays healthy if `/` has too little free space. Keep Docker cleanup in the recovery checklist, keep Angular build tooling local to `node_modules` in Dockerfile build stages instead of installing global CLI layers, and keep `package-lock.json` in the Docker build context for `npm ci`.
- 2026-04-30 SSR bootstrap follow-up: server rendering must block on `RuntimeService.initialize(...)` through a server app initializer. Calling runtime initialization from a component constructor is race-prone on Dokploy because remote runtime-bundle latency can make Angular render only the CSR shell even when the runtime API is healthy.
- 2026-04-30 hydration follow-up: the browser must also run runtime bootstrap through the app initializer and `RuntimeService.connect()` must not duplicate that first load. Otherwise hydration can briefly render with empty `rootComponentsIds`, remove the SSR tree, and cause Lighthouse CLS regressions.
- 2026-04-30 SSR cache follow-up: cache server-side `runtime-bundle` payloads briefly in memory by request identity so health checks and repeated page requests do not pay the remote runtime-read latency on every SSR render.
- 2026-04-30 draft publish follow-up: `zoolandingpage.com.mx` draft was pushed and published through the config authoring API as version `20260430T145352Z-dc12bdffab68` with `updatedBy: codex`.
- 2026-04-30 SSR critical CSS follow-up: Angora runtime layout utilities that affect first-paint geometry, especially responsive display classes such as `ank-d-none`, `ank-d-md-flex`, and `ank-d-md-none`, need stable global fallbacks before hydration. Without those fallbacks, SSR can paint mutually exclusive header variants at once and Lighthouse reports high CLS even when hydrated DOM later looks correct.

## Naming Rules

- Iteration logs: `YYYY-MM-DD-topic.md`
- Visual baselines: `{page}-visual-baseline.md`
- General note filenames: kebab-case
- Use the existing templates before creating a new note type

## Closeout Checklist

Before ending a task:

1. Confirm the relevant shared notes were read first and inspect local draft notes when the task depends on an existing draft.
2. Update the canonical notes only if the task produced reusable guidance beyond one draft.
3. Keep draft-specific scratch notes in `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.
4. Keep repo-level scratch or operational notes local-only if you need them; do not make them part of the committed canonical tree.
5. Remove or avoid any secrets, credentials, raw env values, signed URLs, or PII from the notes.
6. Update repo docs if the workflow changed.
7. Audit, fix, and rerun the audit at least three times before calling the work correct.
8. If draft behavior changed, finish with browser QA on every affected draft route in desktop and mobile viewports.

## Guardrails

- If notes and code disagree, verify against code and docs, then repair the notes.
- Do not let one-off debugging output become canonical guidance without distillation.
- Keep canonical notes focused on reusable decisions, constraints, QA rules, and workflows.
