# Draft Lifecycle

This guide explains how to create, preview, update, upload, and publish Zoolanding drafts.

## The three states to keep separate

Every draft exists in three possible states:

1. `Local draft files`
   Your working copy in `drafts/{domain}/...`, served locally at `/drafts/...`.
2. `Authoring draft state`
   The draft stored in the config authoring API.
3. `Published runtime state`
   The version currently returned by the runtime API for live domains.

Do not treat those as the same thing. A local file edit affects only state 1 until you push and publish it.

## Read The Canonical Notes First

Before starting a new draft or major refinement pass, read:

1. [Documentation router](./README.md)
2. [Draft registry](./drafts-registry.json) for the canonical repo/path
3. [ai-notes index](../ai-notes/README.md) only when reusable guidance is needed
4. the draft README and curated `drafts/{domain}/ai_notes/README.md` when present; open findings/error history only when the task requires it

After durable work, update the canonical notes so future agents do not have to rediscover the same rules.

## Secure Repo Release Workflow

The secure release workflow moves draft publishing into per-draft GitHub repositories:

1. Work on `dev`.
2. Merge `dev -> test` by pull request.
3. Deploy test only after the merge lands on `test`.
4. Merge `test -> main` by pull request.
5. Deploy production only after the merge lands on `main`.

Before work starts, run the draft repo preflight. It reads [drafts-registry.json](./drafts-registry.json), clones any missing registered `draft-*` remote repo into its in-tree local path under `drafts/{domain}`, and runs `git pull --ff-only` in every clean target repo, including this hub repo and any affected local draft repos. If a target repo is dirty, report it instead of pulling over local changes.

Use the hub preflight helper:

```bash
npm run drafts:repo-preflight
```

Use the direct Node form when passing flags:

```bash
node tools/draft-repo-preflight.mjs --pull=true
```

New draft repos should be bootstrapped from the hub templates:

```bash
npm run drafts:repo-bootstrap -- --repo=drafts/example.com --domain=example.com --authoring-endpoint=https://api.zoolandingpage.com.mx/config-authoring
```

Every new draft repo must also be added to [drafts-registry.json](./drafts-registry.json) with its canonical domain, repo name, GitHub clone URL, and in-tree local path under `drafts/{domain}`.

The bootstrap must produce `AGENTS.md` as the small task router, `README.md` as the human index, `Codex.md` as a compatibility pointer, and the pinned C1 caller. Agents should follow one task-specific route from `AGENTS.md` instead of loading the hub, local documentation tree, or changelog by default.

After bootstrap or routing changes, run `npm run fleet:knowledge -- --repo=draft-example-com` from the hub to verify links, branches, required workflows, the origin remote, and C1 without writing files.

The release contract requires the deployed commit's exact associated, merged, same-repository PR with the fixed `dev -> test` or `test -> main` source/base pair, matching merge parents, and current target tip; a general ancestor relationship is insufficient. Required `guard` is pinned to the verified GitHub Actions app with no PR bypass identities. Test and production Environments independently allow only `test` and `main`, workflows serialize per repository/environment, and AWS trust requires the same exact branch ref as the Environment. The controlled rollout completed on 2026-07-15 CT for all 11 registered draft repositories: the 22 protected branches, 22 Environment policies, 22 per-draft IAM roles, and the exact-promotion workflow bundle were applied and read back. The generic 15-path bundle was promoted only through each draft repository's `dev` and `test` branches. Its later one-file PR-safety repin also reached all 11 `test` branches; every test run validated the exact change and then skipped plan, artifact upload, OIDC, and AWS deployment as designed. No draft `main` branch or production draft content was changed.

The hub template and all 11 `dev`/`test` copies use immutable policy pins: each draft caller pins the reusable PR-safety workflow, and that reusable workflow pins the corrected public-safety auditor. On a push, the verifier reads the exact first-parent `name-status` diff. Only additions or modifications inside the code-owned 15-path rollout closure in [`verify-promotion-commit.mjs`](../tools/templates/draft-repo/tools/verify-promotion-commit.mjs) may skip Config Authoring. Any path outside that closure, including content deletion or rename, requires deployment. Deleting, renaming, or type-changing an allowlisted control fails closed. `workflow_dispatch` always requires deployment.

When deployment is required, the unprivileged validation job creates a closed JSON plan containing only `schemaVersion`, target SHA, domain, environment, version ID, ordered actions, and validated draft files. Its validation-attempt version ID is `{environment}-{full SHA}-{run ID}-{run attempt}`. Local plan mode must receive an explicit bounded `--version-id` when GitHub run metadata is unavailable; a full target SHA remains required through `GITHUB_SHA`. Plan output must be a new relative path beneath the draft root. Absolute/traversal paths, missing or linked/junction parents, and existing or linked targets fail closed. The workflow removes a root `.draft-deploy` link itself, recursively replaces only a verified real `.draft-deploy` directory, and then passes the relative `.draft-deploy/deployment-plan.json` path. Because [`upload-artifact` classifies files inside a dot-prefixed directory as hidden](https://github.com/actions/upload-artifact#uploading-hidden-files), the upload explicitly enables hidden files only for this freshly recreated artifact root; the privileged job still requires the exact plan-and-manifest two-file set. The plan and SHA-256 manifest use an artifact name bound to run ID, run attempt, and SHA, with one-day retention. Validation exports the single numeric artifact ID, bound name, captured version ID, and SHA-256 of the manifest through job outputs; the external manifest digest is not stored only beside the plan it authenticates. GitHub documents that people with repository read access can download workflow artifacts, so an artifact from a public draft repository is not a confidentiality boundary ([download access](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/download-workflow-artifacts?tool=webui), [retention and deletion](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/remove-workflow-artifacts)). The plan must never contain the authoring API endpoint, credentials, tokens, response bodies, fiscal PII, or raw provider payloads. In this contract, `server-only` means excluded from the browser/runtime public projection; it does not mean secret or safe to place in a public repository or artifact.

The dependent OIDC job does not check out the repository, install Node, or run repository code. Its first step validates the numeric artifact ID, artifact-name coordinates, external manifest digest, and captured version coordinates before passing one ID—never a name, list, or pattern—to the download action. It then requires the exact two-file set, compares the manifest against the external digest, runs strict checksum verification, and validates the closed top-level/file schemas, exact domain/environment/version/action order, unique structural paths and path-derived metadata, and non-secret deployment coordinates. The target branch tip is rechecked immediately before credential configuration. The request uses runner-native `curl --aws-sigv4`; request and response files remain temporary, and failure output is a stable generic message rather than a payload or response body. Deployment concurrency uses `cancel-in-progress: false` so a later run cannot interrupt an upsert/publish pair.

Config Authoring versions remain immutable. A repeated version returns `version_already_exists`, which the workflow treats as failure because it cannot prove the stored bytes match the plan. A failure after upsert but before publish can therefore leave an immutable, unpublished version without changing the published pointer. Rerunning only the failed deploy job consumes the original validation outputs and does not recalculate names or versions from the new job attempt; rerunning validation creates a new run-attempt artifact and version. Cleanup or byte-equality reconciliation for an orphan remains future backend work, not a reason to accept the conflict as success.

## Local draft structure

```text
drafts/
  {domain}/
   ai_notes/
   findings/
   errors-reports/
    site-config.json
    components.json
    variables.json
    angora-combos.json
    i18n/{lang}.json
    {pageId}/
      page-config.json
      components.json
      variables.json
      angora-combos.json
      i18n/{lang}.json
```

Domain-root files provide shared defaults. Page-root files override them for one route.

## Create a new draft locally

The current platform does not have a separate scaffold generator for local files. The practical path is:

1. Create a new domain folder under `drafts/{domain}`.
2. Add `site-config.json` for the new domain.
3. Before creating the draft repo or authoring config, ask the user for the intended canonical domain and every production/test alias they want managed.
4. Use `https://test.zoolandingpage.com.mx/?draftDomain={domain}` as the default test environment. Do not create dedicated `test.*` aliases unless the user explicitly approves that host.
5. Declare only approved production aliases in `site-config.json.aliases`.
6. If the branded domain is not live yet and no approved production alias exists, keep the draft preview on the shared test host until cutover instead of inventing a managed alias.
7. Create at least one page folder such as `default`.
8. Add `page-config.json` and `components.json` for that page.
9. Add `variables.json`, `angora-combos.json`, and `i18n/*.json` only when the draft needs them.
10. Create `ai_notes/`, `findings/`, and `errors-reports/` only when the draft needs local history, investigation, or incident tracking that should stay out of the committed canonical notes.

For a shared header/footer or repeated site UI, use the domain-root `components.json` instead of duplicating the same component definitions across pages.

Draft-authored navigation and CTA links should be production-safe relative paths such as `/contact` or `/servicios`. Reserve `draftDomain` and `draftPageId` query parameters for local preview URLs, not authored site navigation.

## Preview a draft locally

Open the app with explicit draft query parameters:

```text
http://127.0.0.1:4200/?draftDomain=zoolandingpage.com.mx&draftPageId=default
http://127.0.0.1:4200/?draftDomain=newsite.example&draftPageId=default
```

If you are using the Docker dev server on another port, keep the same query parameters and only change the host/port.

## Smoke-check local drafts against live aliases

Once your local dev server is running, you can automate the same browser-level smoke checks that are usually done manually:

```bash
node tools/draft-smoke-check.mjs --local-base-url=http://127.0.0.1:4200
```

What this script validates:

1. every local draft route renders a non-empty title and a first heading
2. the local preview does not fall into the `Unresolved draft` fallback
3. any draft with a managed `*.zoolandingpage.com.mx` alias matches its live counterpart for title, first heading, and key header controls such as the search trigger and mobile navigation trigger

Useful options:

- `--domain=example.com` to limit the run to one draft; repeat the flag for multiple drafts
- `--browser-path=...` if Chromium is not installed in a default location
- `--output=reports/draft-smoke.json` to save the structured report to disk

The structured JSON report records both desktop and mobile viewport results for every checked route.

Before closing draft-affecting work, also open every affected draft route in browser QA on both desktop and mobile viewports, fix any visible, runtime, console, or network issue you find there, and rerun the impacted checks.

## Inspect the current CLI

Use the built-in help first:

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

## Pull an existing draft from the API

This replaces your local draft tree with the current API state for that domain.

```bash
node tools/config-draft-sync.mjs pull --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --environment=test
```

Use `--stage=published` if you need the published state instead of the current draft.

`--environment` is required for remote reads. `dev` maps explicitly to the deployed `test` environment; the client verifies the returned domain, environment, and stage before it cleans or writes any local draft file.

For the standard Zoolanding custom-domain authoring URL, the CLI now retries automatically through the raw API Gateway endpoint if the front door resets the connection or the request times out. You can override the retry target with `--fallback-endpoint=https://...`, change the request timeout with `--request-timeout-ms=20000`, raise the retry budget with `--retry-attempts=3`, and shorten or extend the wait between retries with `--retry-delay-ms=250`.

## Pack a local draft into a file

This is useful for inspection or manual API calls.

```bash
node tools/config-draft-sync.mjs pack --domain=zoolandingpage.com.mx --output=.tmp-zoolanding-draft-package.json
```

## Push local changes to the authoring draft

```bash
node tools/config-draft-sync.mjs push --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --environment=test --updated-by="Your Name"
```

This unsigned local command is legacy documentation. The deployed authoring API now requires IAM-signed requests, so normal draft publishing should happen through the per-draft GitHub Actions workflow after merge.

## Check uploaded draft status

Before pushing/publishing, or after publishing when you need to verify what is already in the S3-backed production authoring state, run:

```bash
node tools/draft-upload-status.mjs --all --stage=published
```

The shortcut is:

```bash
npm run drafts:upload-status
```

Use `--domain=example.com` to limit the check, `--include-file-details=true` to list changed paths, and `--fail-on-pending=true` in automation when any draft that differs from production should fail the job.

## Create a new site in the authoring API

If the site does not exist yet in the backend, use `create` instead of `push`.

```bash
node tools/config-draft-sync.mjs create --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=newsite.example --environment=test --publish-on-create=false
```

That command uploads the local file tree as a new authoring draft. It does not require a separate manual package-building step.

## Publish the current authoring draft

```bash
node tools/config-draft-sync.mjs publish --endpoint=https://api.zoolandingpage.com.mx/config-authoring --domain=zoolandingpage.com.mx --environment=test --updated-by="Your Name"
```

This unsigned local command is legacy documentation. The deployed authoring API now requires IAM-signed requests, and normal publish should happen through the per-draft GitHub Actions workflow. Publishing changes the authoring state only insofar as it promotes the current draft to the published version pointer. It does not guarantee that live frontend caches or deployments have already refreshed.

If the custom-domain authoring endpoint resets the connection or stalls, the CLI now retries automatically through the raw API Gateway endpoint for the standard Zoolanding authoring URL. Use `--fallback-endpoint=https://...` if you need to force a different retry target, `--retry-attempts=3` to allow additional attempts on retryable failures, `--retry-delay-ms=250` to control the pause between attempts, or point directly at the raw endpoint documented in [06-deployment.md](06-deployment.md).

## Recommended workflows

### Update an existing site

1. Run `node tools/draft-repo-preflight.mjs --pull=true` so every registered draft repo exists locally and clean worktrees are updated with `git pull --ff-only`.
2. Read the relevant committed notes and inspect the local draft `ai_notes/`, `findings/`, and `errors-reports/` folders when they exist.
3. Edit local files.
4. Preview locally.
5. Commit to the draft repo `dev` branch.
6. Merge `dev -> test` by PR; the `test` branch deploys the test environment after merge.
7. Verify every configured test alias.
8. Merge `test -> main` by PR; the `main` branch deploys production after merge.
9. Validate the runtime bundle and the live site separately.
10. Record durable learnings in the canonical AI notes.

### Create a new site

1. Create the local draft tree.
2. Create local `ai_notes/`, `findings/`, and `errors-reports/` folders only if the draft needs local history, investigation, or incident tracking.
3. Preview locally.
4. Upload any required public assets.
5. Create the site in the authoring API.
6. Publish it.
7. Run upload status against `--stage=published`.
8. Validate the runtime bundle and then validate the live site.
9. Distill reusable guidance from the new draft into `ai-notes/`.

## What to check when a published change is not visible

Use this order:

1. check the local draft file you edited
2. check the authoring draft with `getSite` or `pull`
3. run `tools/draft-upload-status.mjs` against `--stage=published`
4. check that the draft was published
5. check the runtime bundle response for the domain
6. check frontend deployment and cache behavior

If the runtime bundle is correct and the live page is still wrong, you are usually looking at a frontend deployment or cache problem, not a missing publish.

## Related docs

- [03-development-guide.md](03-development-guide.md)
- [12-public-assets-and-file-uploads.md](12-public-assets-and-file-uploads.md)
- [api-driven-config/08-upload-to-api.md](api-driven-config/08-upload-to-api.md)
- [api-driven-config/11-draft-migration.md](api-driven-config/11-draft-migration.md)
