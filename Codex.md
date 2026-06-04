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
- Draft repo registry: `docs/drafts-registry.json`
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
- 2026-05-17 CT: Secure draft release workflow is active for the current public `LynxPardelle/draft-*` repos: `dev -> test -> main`, GitHub Actions deploys only from `test` and `main`, source-branch guards, GitHub OIDC to per-repo/per-environment AWS IAM roles, IAM-protected authoring Lambda Function URL for deploys, environment-aware test/production aliases, and native GitHub branch protection on `test` and `main` requiring the `guard` check with zero required approvals so the repo owner can merge their own PRs after checks pass. The `draft-zoolandingpage-com-mx` test workflow was verified through OIDC without changing the production pointer.
- 2026-05-20 CT: A successful `draft-*` deploy only proves the draft config payload was published. Before declaring a production draft ready, verify the shared app container is serving the current `main-*.js` bundle, the real browser is not stuck on the boot curtain, and the console has no config/CORS bootstrap errors. If the public domain still calls old endpoints such as `/site-config`, redeploy or wait for the app/Dokploy runtime instead of changing draft content.
- 2026-05-16 CT: Before Zoolanding or draft repo work, run `git pull --ff-only` in every clean target repo, including affected `draft-*` repos. If a target repo is dirty, report it instead of pulling over local changes. New draft repos must carry this same rule in their repo memory.
- 2026-05-17 CT: `docs/drafts-registry.json` is the canonical registry of draft domains, GitHub repos, clone URLs, and sibling local paths. Before work, `node tools/draft-repo-preflight.mjs --pull=true` must read that registry, clone any missing registered `draft-*` repo into the sibling workspace path, then pull every clean target repo. If a registered path exists but is not a git repo, or a repo is dirty, report it instead of overwriting it.
- 2026-05-18 21:14 CT: Managed `*.zoolandingpage.com.mx` aliases require two steps after draft deploy: runtime alias records from authoring, then front-door sync through `tools/ops/sync-managed-alias-front-door.mjs` for Route 53, Traefik file-provider routing, and TLS issuance. Keep front-door IP, SSM target, and remote Traefik file path out of committed notes and pass them by environment or CLI.
- 2026-05-18 21:30 CT: Runtime-read reset probes showed sequential custom-domain and raw API Gateway requests clean, but burst probes still fail: custom domain can return `ECONNRESET` when raw stays clean at moderate concurrency, while higher concurrency can also make raw API Gateway return HTTP `500`. Keep SSR raw fallback active and use `tools/ops/probe-runtime-front-door.mjs` for before/after evidence before claiming a front-door/API fix.
- 2026-05-20 CT: Runtime-read burst failures are capacity-related unless new evidence disagrees: the audit found Lambda account concurrency at `10`, API Gateway `5XXError` during burst windows, and CloudFront `/runtime-bundle*` previously on disabled caching. Keep `/runtime-bundle*` on a short CloudFront cache policy keyed by all query strings through `tools/ops/configure-runtime-front-door-cache.mjs`. Use `tools/ops/probe-runtime-front-door.mjs --cache-mode=default --target=custom-domain` to validate viewer cache, and `--cache-mode=no-store` only for origin stress. The Lambda regional quota later showed `ConcurrentExecutions: 1000`; `ConfigRuntimeRead` has reserved concurrency `100` as a no-fixed-cost cap/reservation, leaving `900` unreserved concurrency for other functions. Keep `tools/ops/configure-runtime-observability.mjs --apply` as the repeatable setup for runtime-read alarms, SNS, tags, and a notification-only monthly budget. Do not enable Provisioned Concurrency or CloudWatch Synthetics without explicit cost approval.
- 2026-05-18 21:57 CT: Express SSR helper reads for robots, sitemap, and 404 route decisions must follow the same raw-first runtime-read fallback rule as Angular bootstrap. `src/server.ts` should try `CONFIG_API_SERVER_FALLBACK_URL` / `CONFIG_API_RUNTIME_FALLBACK_URL` before `CONFIG_API_URL` and preserve stage path prefixes such as `/Prod`.
- 2026-05-19 11:57 CT: Per-host alias overrides are supported through `site.hostOverrides`. Use them for alias-specific `seo.canonicalOrigin`, canonical host/HTTPS enforcement, Search Console verification, and Google tag/Ads/GTM config while keeping the base draft config as the default. Top-level `aliases`, `environments.<env>.aliases`, and `site.hostOverrides` keys all resolve to the owning draft in local SSR.
- 2026-05-19 12:05 CT: For current product aliases on Zoosite, Zoolandingpage, and Sulandingpage, aliases should canonicalize to the primary `.com.mx` domain instead of self-canonicalizing. Example: `zoositioweb.com` canonicalizes to `https://zoositioweb.com.mx`.
- 2026-05-16 CT: Approved OIDC direction is one AWS GitHub OIDC provider per account with deploy roles split by draft repo and GitHub Environment/branch. Keep it bootstrap-driven so agents can create/update roles, GitHub Environments, role ARN variables, and workflows consistently.
- 2026-05-17 CT: Draft deployment workflows should use Node 24-based GitHub Actions majors: `actions/checkout@v5`, `actions/setup-node@v5`, and `aws-actions/configure-aws-credentials@v6`. Do not generate new draft workflows with `@v4` for these actions because GitHub runners warn about Node 20 action runtime deprecation.
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
- `generic-media` may use bounded image retries for transient asset CDN resets, but do not treat those retries as proof that the CDN/API/front-door reset source has been repaired.
- Express SSR helper reads should prefer the raw runtime-read fallback and use only bounded retries before falling back to the API custom domain.
- 2026-06-04 16:10 CT, updated 17:21 CT: Loading-curtain readiness for Angora drafts must account for rendered combo CSS, not just "some CSS rules exist." Before explicit `cssCreate` class updates, sync draft combos from `ConfigStoreService`, split authored class strings into individual tokens, and keep the curtain active until the current DOM has rendered combo classes such as `sectionTitle` and their critical color/text combo markers (for example `__COM_sectionTitle-titleColor`) exist. Re-sample the DOM inside the readiness loop, because the first hide request can run before dynamic roots are in the DOM. Use a timer fallback around `requestAnimationFrame` in readiness code so automated/background browsers cannot leave the curtain permanently stuck.

## Draft Memory

- `zoositioweb.com.mx` is the current complete-website product draft. It should stay commercial, client-facing, bilingual-ready, and theme-ready, with WhatsApp as the first contact path until first-class forms/email/CRM integrations are productized.
- 2026-05-15 10:58 CT: Use `zoositioweb` as the public brand name for the complete-website product. Do not use the previous short name in active draft content, SEO metadata, WhatsApp messages, aliases, storage keys, or authoring scripts.
- zoositioweb Phase 1 active routes are `/`, `/servicios`, `/planes`, `/sitios-web-para-pymes`, `/plataforma`, `/nosotros`, `/preguntas-frecuentes`, `/contacto`, `/sectores/consultorios`, `/sectores/despachos`, `/sectores/inmobiliarias`, `/sectores/servicios-locales`, `/sectores/constructoras`, and `/sectores/agencias`.
- zoositioweb plan names are `Presencia`, `Clientes`, and `Crecimiento`; keep public copy outcome-led and avoid exposing internal cost structure.
- 2026-05-14 22:19 CT: zoositioweb keeps FAQs centralized in `/preguntas-frecuentes` instead of repeating FAQ accordions on every commercial page. Public copy should stay commercial, positive, and client-facing; avoid negative phrasing, promises, and internal terms such as `draft`.
- 2026-05-14 22:19 CT: zoositioweb dark theme uses `#25d366` as the live-data accent and `#128c7e` as the darker WhatsApp action color through `successColor`; WhatsApp CTAs should use `successColor`, not the general accent token.
- 2026-05-14 22:19 CT: For draft work, avoid changing app code unless the user explicitly asks for it or grants permission. Prefer draft configuration first; if the draft cannot express the needed behavior and app changes are not approved, record the gap as a possible future platform feature in AI notes.
- 2026-05-14 22:19 CT: zoositioweb card icon slots should be handled through draft classes with explicit SVG width/height classes, and local-only card hrefs may include the draft preview query params when raw anchor card links must preserve preview context.
- 2026-05-14 22:46 CT, superseded 2026-05-15 CT: `zoolandingpage.com.mx` served `sulandingpage.com.mx` and `sulandingpage.com` temporarily before Sulanding became its own draft. Current Zoolanding aliases should stay scoped to `zoolandingpage.com` and its test aliases unless a new cutover explicitly changes them.
- 2026-05-15 CT: zoositioweb route design should keep distinct page personalities through draft configuration: home as commercial storefront, servicios as process/workflow, planes as comparison/pricing board, plataforma as technical foundation, contacto as action-focused intake, FAQs as help center, and sector pages with industry-specific accents.
- 2026-05-15 09:44 CT: zoositioweb sector pages should not share one generic visual template. Keep consultorios calm and appointment-oriented, despachos formal and practice-area oriented, inmobiliarias search/listing oriented, servicios locales fast-contact and service-area oriented, constructoras portfolio/project oriented, and agencias case-study/portfolio oriented. Express these differences through draft configuration first.
- 2026-05-18 17:29 CT: zoositioweb sector pages may use page-local complete `variables.theme` overrides for sector-specific palettes. The runtime merges page variables over shared variables and `ThemeService` applies `variables.theme`, but the validator requires complete light/dark 18-token palettes. For sector accents, prefer `var(--ank-accentColor)` in component styles so theme changes control borders and gradients without app/global style edits.
- 2026-05-18 18:21 CT: zoositioweb CTAs that use `successColor` should pair it with `onSuccessColor` instead of hard-coded white text so sector palettes remain readable in light and dark themes. Expandable controls should expose an `expand_more` affordance and emit `accordion_toggle`; theme and language controls should keep their behavior action and also emit measurable events.
- 2026-05-18 18:47 CT: Keep `/nosotros` exposed in shared header, mobile navigation, footer, and home because team expertise is a sales asset for zoositioweb. Home should keep this as a compact expert-proof section that links to `/nosotros`; deeper team detail belongs on the `/nosotros` route.
- 2026-05-18 18:47 CT: Future zoositioweb SEO expansion remains blog/guides, comparison pages, location pages, case studies/examples, deeper platform/cloud-limit content after real cost validation, and unsupported integration pages only after those capabilities are productized.
- 2026-05-18 19:06 CT: zoositioweb home and `/nosotros` team cards should use borderless skill badges with SVG icons instead of the generic-card empty feature-icon square. Do not publish "photo pending" copy for Oswaldo.
- 2026-05-18 21:08 CT: User confirmed Oswaldo García should keep Google Ads in Zoosite team cards but not marketing; marketing belongs to Pamela Betancourt. Use `drafts/zoositioweb.com.mx/CVs_N_photos/oswaldo.jpeg` for Oswaldo and frame him around web development, responsive work, and Google Ads. Hector Coronado's public role should emphasize `desarrollo de sitios y aplicaciones web profesionales` instead of backend/fullstack wording.
- 2026-05-18 21:20 CT: Zoosite team positioning: Alec Montaño and Hector Coronado should use the public role `Desarrollo de software, Arquitectura de Nube, Ingeniería de Datos e IA`; Oswaldo García should use `Desarrollo web y Google Ads`; Pamela Betancourt is the only team member positioned with marketing. `/nosotros` should be SEO-oriented around software, cloud, data, and AI, with a post-contact Pamela Betancourt recommendation/backlink section to `https://pamelabetancourt.zoolandingpage.com.mx/`.
- 2026-05-18 21:46 CT: Zoosite should treat `datos propios`, `analítica propia`, and `recopilación/análisis de datos desde el día 1` as a core sales and SEO advantage across the product site. Public copy may mention the team's own system collecting interaction signals such as pages consulted, section attention, important clicks, language choice, and WhatsApp actions, while avoiding claims about sensitive personal-data collection or unsupported integrations.
- 2026-05-18 22:32 CT: Zoosite SEO hardening should keep route titles under roughly 65 characters, descriptions in the 100-170 character range, unique sector descriptions, canonical URLs on `https://zoositioweb.com.mx`, hydrated JSON-LD, `/404` and unknown routes as `noindex,follow`, and accessibility-safe draft markup. Avoid semantic `ul/li` in config patterns where `wrapper-orchestrator` becomes a direct child of the list; use visual `div` rows unless the app can render list children without wrappers.
- 2026-05-18 23:44 CT: Zoosite may publicly communicate first test round in 5 days when base scope and materials are complete, prices before IVA, 100% invoiceable service, human support from developers, and consulting guidance for technology, data, cloud, and AI. Keep `/privacidad` and `/terminos` as draft-local legal footer routes.
- 2026-05-19 11:57 CT: Zoosite, Zoolandingpage, and Sulandingpage have disabled Google tag scaffolds, ad-attribution storage, and `site.hostOverrides` for their configured aliases. Do not enable Google tags or Search Console verification until real GA4, Google Ads, conversion label, optional GTM, and Search Console values are provided.
- 2026-05-19 16:52 CT, updated 20:19 CT: GA4 measurement is configured for Zoolandingpage, Sulandingpage, and Zoosite primary domains plus the provided `.com` aliases. The current Google Ads direction is GA4-only and centralized on the `zoositioweb.com.mx` GA4 stream (`G-QRWR768FCM`) because the external owner configured GA4 cross-domain measurement; do not add physical `AW-...` tags or Ads conversion labels unless that strategy changes explicitly. Internal `whatsapp_click` maps to Google event `lead_conversion_whatsapp` with safe `pyme_id` values (`zoolandingpagecommx`, `sulandingpagecommx`, `zoositiowebcommx`). Optional GTM IDs and Search Console verification values are still pending.
- 2026-05-19 20:03 CT: GA4-forwarded events now wait for `gtag` `event_callback` with a 200 ms fallback timeout. WhatsApp handlers already wait for `AnalyticsService.track(...)` before opening `wa.me`, so GA4-only `lead_conversion_whatsapp` gets a delivery window without adding direct `AW-...` tags.
- 2026-05-19 23:12 CT: For zoositioweb WhatsApp analytics coverage, keep link tracking declarative at component/draft config level. Do not add a global document-level WhatsApp click fallback unless the user explicitly reopens that strategy.
- 2026-05-19 16:54 CT, updated 20:19 CT: Aliases with active GA4 measurement should render with `enforceCanonicalHost: false` and canonical links to the primary `.com.mx` domain; a 301 redirect would prevent the alias tag from firing, whether the alias uses the central GA4 stream or its own destination.
- 2026-05-18 10:18 CT: On zoositioweb, when a page-level closing section before the footer needs to avoid card-inside-card composition, prefer a full-width band and transparent inner layout container. Apply it to the specific page being reviewed; `/planes` currently uses this pattern without inner borders and with right-aligned CTAs, while home keeps its previous contained close.
- 2026-05-20 18:06 CT, updated 20:26 CT: Provisional Zoolandingpage/Zoosite identity uses a compact square Z logo with a teal rule, no decorative dot, plus a temporary `zoositioweb` wordmark for contexts where text branding is useful. Draft browser icons belong in `site-config.json.site.icons`; use HTTPS public asset URLs from `assets.zoolandingpage.com.mx` when assets are uploaded, with `/assets/brand/zoolandingpage-default-favicon.svg` as the app fallback. Default social share images should use the uploaded raster logo card at `https://assets.zoolandingpage.com.mx/zoolandingpage.com.mx/shared/seo-images/zoolandingpage-zoositioweb-default-logo-card.jpg`; drafts may override `site.seo.defaultImage` or page Open Graph/Twitter image fields when they have their own social artwork.
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
