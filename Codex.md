# Zoolandingpage Codex Memory

This file is durable project memory, not a changelog. Keep it short, stable, and useful before editing the repo.

## Purpose

- Store only important project decisions, boundaries, reusable rules, and active constraints.
- Do not add chronological closeouts, terminal transcripts, QA dumps, deployment logs, or one-off task summaries here.
- Put chronological history in `changelog/app/` or `changelog/drafts/`.
- Put reusable procedures and deeper guidance in `ai-notes/`.
- Put runtime, test, and development logs under `logs/`.

## Canonical Paths

- App source: `src/`
- App tooling and tests: `tools/`
- Local draft source tree and draft scratch workspace: `drafts/`
- Local draft-specific notes: `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/`
- App changelog: `changelog/app/`
- Draft changelog: `changelog/drafts/`
- Runtime/dev/test logs: `logs/`
- Curated AI/developer guidance: [ai-notes/README.md](./ai-notes/README.md)
- Shared workspace prompts and community AI tooling hub: `.github/prompts/`
- Portable repo-local skills: `.github/skills/`
- Note templates: `ai-notes/templates/`
- Optional local-only scratch: `devonly/`
- Main implementation docs: `docs/`
- Generated Microsoft documents, PDFs, and images: `Output/`

## Memory Boundaries

- `AGENTS.md` and this file are repo-level AI hooks and must stay as durable memory/rules only.
- `ai-notes/` is the curated, shared-first knowledge base for reusable workflow, authoring, QA, operations, and release guidance.
- `changelog/` is the only committed home for chronological app and draft history.
- `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/` are local-only draft history and investigation areas, not committed source of truth.
- `.superpowers/`, `devonly/`, generated reports, and raw logs are local scratch unless a reusable lesson is distilled into `ai-notes/` or an event belongs in `changelog/`.
- Keep note and changelog timestamps in Central Time.
- Notes should stay English-first to match repo documentation, while quoted source content may stay in its original language.

## Current Project Decisions

- `drafts/` is the local authored draft tree and local per-draft scratch area.
- 2026-05-15 10:44 CT: Domain drafts are mirrored to one GitHub repo per draft under `LynxPardelle/draft-*`. Per-draft repos should track sanitized runtime draft config and required public assets only. Keep `ai_notes/`, `findings/`, `errors-reports/`, `CVs_N_photos/`, PDFs, logs, `.env*`, private keys, certificates, credential JSON, local databases, local agent state, and other PII/secrets local-only through each draft repo `.gitignore`.
- 2026-05-17 CT: Draft repos may be public only after a public-safety audit passes against current files and git history. Run `node tools/draft-public-safety-audit.mjs --history=true` from the hub repo before changing visibility, before PR, and before merges that publish draft content. Blocking findings include tracked local-only folders/files, secret-looking values, credential material, local DBs/exports, and PII source documents. Review findings such as emails, phone/WhatsApp numbers, and identity keywords must be confirmed as intentional public draft content or removed.
- 2026-05-17 CT: Secure draft release workflow is active for the current public `LynxPardelle/draft-*` repos: `dev -> test -> main`, GitHub Actions deploys only from `test` and `main`, source-branch guards, GitHub OIDC to per-repo/per-environment AWS IAM roles, IAM-protected authoring Lambda Function URL for deploys, environment-aware test/production aliases, and native GitHub branch protection on `test` and `main` requiring the `guard` check plus one approving review. The `draft-zoolandingpage-com-mx` test workflow was verified through OIDC without changing the production pointer.
- 2026-05-16 CT: Before Zoolanding or draft repo work, run `git pull --ff-only` in every clean target repo, including affected `draft-*` repos. If a target repo is dirty, report it instead of pulling over local changes. New draft repos must carry this same rule in their repo memory.
- 2026-05-16 CT: Approved OIDC direction is one AWS GitHub OIDC provider per account with deploy roles split by draft repo and GitHub Environment/branch. Keep it bootstrap-driven so agents can create/update roles, GitHub Environments, role ARN variables, and workflows consistently.
- `zoolandingpage` is the canonical home for shared workspace prompts and community AI tooling because it owns `zoolandingpage.code-workspace`.
- Shared prompts or AI tooling that apply across multiple Zoolanding repos should live in this repo first; service-specific deploy prompts and workflow skills stay in their service repos.
- `devonly/` may be used only as optional local scratch and should be cleaned when the work is done.
- Use `tools/draft-upload-status.mjs` to compare local draft JSON with the S3-backed authoring state before/after draft publish work. Treat `uploaded`, `needs-upload`, and `not-uploaded` as the standard release inventory statuses.
- Do not store secrets, credentials, tokens, raw environment values, signed URLs, private customer data, or PII in committed notes, changelogs, or generated docs.
- If a workflow depends on sensitive data, describe the dependency abstractly instead of copying the value.

## App Guardrails

- Public SSR releases should enable text compression at the Node/Express layer, defer analytics/prefetch work until after first render, and keep accordion disclosure buttons free of `aria-selected`.
- Do not remove the `src/index.html` Angora CSS link targets (`/css/animations.css`, `/css/angora-styles.css`, `/css/angora-styles-responsive.css`) without desktop/mobile visual QA; runtime CSS generation depends on those stylesheet surfaces.
- Production `optimization.styles.inlineCritical` stays disabled while Angora runtime CSS link targets live in `src/index.html`; otherwise Angular can emit misleading `C:\css\...` warnings.
- Angora-owned classes should be generated through `ngx-angora-css` managed stylesheets, not hardcoded back into `src/styles.scss`.
- Browser-only behavior should be gated with `PLATFORM_ID`/`isPlatformBrowser(...)`; keep the optional `REQUEST` token for SSR request URL/header data only.
- Runtime API credentials belong in server-only policies and secret stores. Browser draft payloads should reference safe IDs, mappings, allowlists, and variable targets only.
- Production draft domains must ignore `draftDomain` query params. Cross-draft preview by query param is allowed only on local hosts and `test.zoolandingpage.com.mx`.

## Draft Memory

- `zoositioweb.com.mx` is the current complete-website product draft. It should stay commercial, client-facing, bilingual-ready, and theme-ready, with WhatsApp as the first contact path until first-class forms/email/CRM integrations are productized.
- 2026-05-15 10:58 CT: Use `zoositioweb` as the public brand name for the complete-website product. Do not use the previous short name in active draft content, SEO metadata, WhatsApp messages, aliases, storage keys, or authoring scripts.
- zoositioweb Phase 1 active routes are `/`, `/servicios`, `/planes`, `/sitios-web-para-pymes`, `/plataforma`, `/nosotros`, `/preguntas-frecuentes`, `/contacto`, `/sectores/consultorios`, `/sectores/despachos`, `/sectores/inmobiliarias`, `/sectores/servicios-locales`, `/sectores/constructoras`, and `/sectores/agencias`.
- zoositioweb plan names are `Presencia`, `Clientes`, and `Crecimiento`; keep public copy outcome-led and avoid exposing internal cost structure.
- 2026-05-14 22:19 CT: zoositioweb keeps FAQs centralized in `/preguntas-frecuentes` instead of repeating FAQ accordions on every commercial page. Public copy should stay commercial, positive, and client-facing; avoid negative phrasing, promises, and internal terms such as `draft`.
- 2026-05-14 22:19 CT: zoositioweb dark theme uses `#25d366` as the live-data accent and `#128c7e` as the darker WhatsApp action color through `successColor`; WhatsApp CTAs should use `successColor`, not the general accent token.
- 2026-05-14 22:19 CT: For draft work, avoid changing app code unless the user explicitly asks for it or grants permission. Prefer draft configuration first; if the draft cannot express the needed behavior and app changes are not approved, record the gap as a possible future platform feature in AI notes.
- 2026-05-14 22:19 CT: zoositioweb card icon slots should be handled through draft classes with explicit SVG width/height classes, and local-only card hrefs may include the draft preview query params when raw anchor card links must preserve preview context.
- 2026-05-14 22:46 CT: `zoolandingpage.com.mx` also serves the aliases `zoolandingpage.com`, `sulandingpage.com.mx`, and `sulandingpage.com`; keep the frontend public host allowlist aligned with these aliases.
- 2026-05-15 CT: zoositioweb route design should keep distinct page personalities through draft configuration: home as commercial storefront, servicios as process/workflow, planes as comparison/pricing board, plataforma as technical foundation, contacto as action-focused intake, FAQs as help center, and sector pages with industry-specific accents.
- 2026-05-15 09:44 CT: zoositioweb sector pages should not share one generic visual template. Keep consultorios calm and appointment-oriented, despachos formal and practice-area oriented, inmobiliarias search/listing oriented, servicios locales fast-contact and service-area oriented, constructoras portfolio/project oriented, and agencias case-study/portfolio oriented. Express these differences through draft configuration first.
- `pokeapi-demo.zoolandingpage.com.mx` is the client-facing runtime API demo and should keep API-specific labels, routes, and per-type styling in draft mapper/config data rather than hardcoding them into generic app code.
- `music.lynxpardelle.com` keeps Spotify/TIDAL credentials out of draft config and browser payloads. Server-only runtime API proxy patterns and Secrets Manager references are required before reactivation.

## Changelog Rules

- Use `changelog/app/YYYY-MM.md` for app/runtime/tooling/deploy history.
- Use `changelog/drafts/YYYY-MM.md` for draft authoring, draft QA, and draft publish history.
- Split a draft into `changelog/drafts/{domain}/YYYY-MM.md` only when the monthly shared file becomes too noisy.
- Changelog entries may be chronological and evidence-heavy; Codex entries must be distilled.
- Keep raw logs out of changelog. Link or summarize sanitized evidence only when useful.

## Closeout Checklist

Before ending a task:

1. Confirm the relevant shared notes were read first and inspect local draft notes when the task depends on an existing draft.
2. Update `Codex.md` only if the task produced a durable project decision or changed a standing rule.
3. Update `changelog/app/` or `changelog/drafts/` only for chronological task history worth retaining.
4. Keep draft-specific scratch notes in `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, or `drafts/{domain}/errors-reports/`.
5. Keep repo-level scratch and raw operational output local-only.
6. Put process logs under `logs/` and avoid leaving `*.log` files in the repo root, `Output/`, `reports/`, `devonly/`, or draft folders.
7. Remove or avoid secrets, credentials, raw env values, signed URLs, and PII from notes/changelogs.
8. Update repo docs if the workflow changed.
9. Audit, fix findings, and rerun the audit at least three times before calling work correct.
10. If draft behavior changed, finish with browser QA on every affected draft route in desktop and mobile viewports.

## Guardrails

- If notes and code disagree, verify against code and docs, then repair the note after verification.
- Do not let one-off debugging output become canonical guidance without distillation.
- Keep canonical notes focused on reusable decisions, constraints, QA rules, and workflows.
