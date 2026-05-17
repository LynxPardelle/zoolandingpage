---
goal: Secure per-draft GitHub repo release workflow
version: 0.1
date_created: 2026-05-16
last_updated: 2026-05-16
owner: Codex
status: 'Planning'
tags: [security, drafts, github-actions, aws, oidc, release]
---

# Introduction

![Status: Planning](https://img.shields.io/badge/status-Planning-yellow)

Move draft publishing from local authoring API calls into controlled GitHub pull requests and post-merge GitHub Actions deployments. The target workflow makes Git the source of truth for draft content, protects production and test branches, and restricts authoring API write access to trusted GitHub Actions identities.

## 1. Requirements & Constraints

- **REQ-001**: Each draft must live in one private GitHub repository named with the `draft-*` prefix.
- **REQ-002**: Each draft repository must use `dev`, `test`, and `main`.
- **REQ-003**: `dev` is the only unprotected branch and must not deploy.
- **REQ-004**: `test` must deploy only after a merge lands on `test`.
- **REQ-005**: `main` must deploy only after a merge lands on `main`.
- **REQ-006**: Production publish must be reachable only through `test -> main`.
- **REQ-007**: Test publish must be reachable only through `dev -> test`.
- **REQ-008**: Test domains and aliases must resolve to the test published draft, not the production published draft.
- **REQ-009**: Production domains and aliases must resolve to the production published draft.
- **REQ-010**: New draft creation must bootstrap repo, branches, protection rules, GitHub Actions, AWS authorization, and local-only ignore rules.
- **SEC-001**: Local machines must not be able to publish or update production drafts through an unauthenticated authoring API.
- **SEC-002**: GitHub Actions must not use long-lived AWS access keys when OIDC can be used.
- **SEC-003**: AWS trust policies must constrain GitHub OIDC by repository and environment or branch.
- **SEC-004**: Authoring Lambda must enforce caller, action, domain, and environment permissions server-side.
- **SEC-005**: `updatedBy` must come from the trusted deployment identity, not only from user-supplied JSON.
- **SEC-006**: Secrets, API keys, signed URLs, raw environment values, PII, and local draft scratch folders must not be committed to draft repos.
- **CON-001**: Plan and documentation land before infrastructure changes.
- **CON-002**: All behavior-changing code needs focused tests before implementation.
- **CON-003**: Use the existing `zoolandingpage` repo as the shared workflow and AI-guidance hub.
- **CON-004**: Do not create AWS resources, GitHub repos, branch protections, or deploys without explicit approval.

## 2. Architecture Decision

Use one GitHub OIDC identity provider per AWS account, then create narrow IAM roles per draft repo and deployment environment.

Recommended role shape:

- `draft-{domain}-test-deploy`
  - trusted `sub`: `repo:LynxPardelle/draft-{domain}:environment:test`
  - allowed authoring actions: test deploy only
  - allowed draft domains: canonical domain plus configured test aliases
- `draft-{domain}-production-deploy`
  - trusted `sub`: `repo:LynxPardelle/draft-{domain}:environment:production`
  - allowed authoring actions: production deploy only
  - allowed draft domains: canonical domain plus configured production aliases

Avoid one broad production role for all repos. A wildcard role such as `repo:LynxPardelle/draft-*:*` is easier to operate but creates avoidable blast radius. If a shared role is ever used, it must still be paired with server-side domain and environment enforcement in the authoring API.

## 3. Branching And Merge Gates

### Branches

- `dev`: active authoring branch, no deploy.
- `test`: protected branch, deploys test after merge.
- `main`: protected branch, deploys production after merge.

### Required GitHub protections

- Protect `test` and `main`.
- Require pull requests before merge.
- Require required status checks.
- Disallow force pushes and deletions.
- Require linear history if compatible with the team's merge style.
- Require conversation resolution.
- Use GitHub Environments named `test` and `production`.
- Restrict environment deployment branches:
  - `test` environment allows only `test`.
  - `production` environment allows only `main`.

### Source branch enforcement

GitHub branch protection protects target branches but does not fully express the desired promotion graph by itself. Add a required workflow check:

- PR targeting `test` fails unless source branch is `dev`.
- PR targeting `main` fails unless source branch is `test`.

This makes the intended graph explicit and auditable.

## 4. Draft Environment Model

Current authoring state has a draft pointer and a published pointer. The secure release workflow needs environment-aware published pointers:

- `published.production`
- `published.test`

The runtime reader should resolve the request host to `(canonicalDomain, environment)` and then load the matching published pointer.

Recommended config extension:

```json
{
  "aliases": ["pamelabetancourt.com"],
  "environments": {
    "test": {
      "aliases": [
        "test.pamelabetancourt.com",
        "test.pamelabetancourt.zoolandingpage.com.mx"
      ]
    },
    "production": {
      "aliases": ["pamelabetancourt.com"]
    }
  }
}
```

Backward compatibility:

- Existing `aliases` remain production aliases.
- New `environments.test.aliases` declare test hosts.
- Authoring Lambda stores alias lookup records with an environment field.
- Runtime Lambda uses environment-aware alias records to choose test or production published state.

## 5. GitHub Actions Design

### Test deploy workflow

Trigger:

```yaml
on:
  push:
    branches: [test]
```

Behavior:

1. Checkout repo.
2. Validate draft package and schema.
3. Run secret/PII scan.
4. Build or pack sanitized draft payload.
5. Request OIDC token with `id-token: write`.
6. Assume draft test deploy role.
7. Call authoring API with signed AWS identity.
8. Publish to test environment.
9. Verify runtime bundle for every configured test alias.

### Production deploy workflow

Trigger:

```yaml
on:
  push:
    branches: [main]
```

Behavior:

1. Checkout repo.
2. Validate draft package and schema.
3. Run secret/PII scan.
4. Build or pack sanitized draft payload.
5. Request OIDC token with `id-token: write`.
6. Assume draft production deploy role.
7. Call authoring API with signed AWS identity.
8. Publish to production environment.
9. Verify runtime bundle for every configured production alias.

## 6. Authoring API Hardening Plan

### Phase 1: Make write authorization explicit

- Add tests proving unauthenticated `createSite`, `upsertDraft`, `publishDraft`, and `setSiteStatus` are denied.
- Add tests proving a trusted test deploy role can publish only `environment=test`.
- Add tests proving a trusted production deploy role can publish only `environment=production`.
- Add tests proving a role for one draft cannot update another draft.
- Add audit fields derived from the authenticated principal.

### Phase 2: Add GitHub OIDC deploy path

- Configure AWS IAM OIDC provider for `token.actions.githubusercontent.com`.
- Add narrow test and production roles for one pilot draft.
- Use GitHub Environments to bind workflow jobs to `test` and `production`.
- Store role ARN and non-secret domain metadata in GitHub environment variables.
- Avoid long-lived AWS access keys in GitHub secrets.

### Phase 3: Environment-aware runtime delivery

- Extend authoring registry metadata with environment-aware published pointers.
- Extend alias records with environment metadata.
- Extend runtime reader to choose the published pointer for the resolved environment.
- Keep production domains on production state.
- Route configured test aliases to test state.

### Phase 4: Bootstrap new draft repos

- Add a repeatable repo bootstrap procedure or script.
- Create branches in the correct order.
- Add `.gitignore` for local-only draft material and PII-risk folders.
- Add branch protections and required status checks.
- Add GitHub Environments.
- Add OIDC role references.
- Add test/prod deploy workflows.
- Add source-branch guard workflow.

## 7. Implementation Steps

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create this planning document. | ✅ | 2026-05-16 |
| TASK-002 | Add reusable AI note for secure draft repo workflow. | ✅ | 2026-05-16 |
| TASK-003 | Update `Codex.md` with the durable target workflow decision. | ✅ | 2026-05-16 |
| TASK-004 | Review current `zoolanding-config-authoring` tests and template for auth gaps. | | |
| TASK-005 | Create failing authoring API tests for unauthenticated write denial. | | |
| TASK-006 | Implement server-side deploy identity validation in `zoolanding-config-authoring`. | | |
| TASK-007 | Add environment-aware published pointers and alias records. | | |
| TASK-008 | Update `zoolanding-config-runtime-read` tests and runtime resolver for environment-aware aliases. | | |
| TASK-009 | Create pilot draft repo workflow files for `dev`, `test`, and `main`. | | |
| TASK-010 | Configure pilot GitHub branch protections and environments. | | |
| TASK-011 | Configure pilot AWS OIDC roles with least privilege. | | |
| TASK-012 | Run pilot deploy to test and verify all configured test aliases. | | |
| TASK-013 | Promote pilot from `test` to `main` and verify production aliases. | | |
| TASK-014 | Turn pilot setup into a repeatable new-draft bootstrap guide/script. | | |
| TASK-015 | Update active lifecycle docs after implementation is verified. | | |

## 8. Files Expected To Change Later

- `C:\Users\lince\Documents\GitHub\zoolanding-config-authoring\template.yaml`
- `C:\Users\lince\Documents\GitHub\zoolanding-config-authoring\lambda_function.py`
- `C:\Users\lince\Documents\GitHub\zoolanding-config-authoring\tests\*`
- `C:\Users\lince\Documents\GitHub\zoolanding-config-runtime-read\lambda_function.py`
- `C:\Users\lince\Documents\GitHub\zoolanding-config-runtime-read\tests\*`
- `docs/11-draft-lifecycle.md`
- `docs/api-driven-config/08-upload-to-api.md`
- `ai-notes/how-to/create-secure-draft-repo.md`
- `ai-notes/notes/secure-draft-release-workflow.md`
- `.github/workflows/*` templates or generator assets

## 9. Testing

- **TEST-001**: Unauthenticated authoring write requests return unauthorized.
- **TEST-002**: Wrong repo role cannot update a draft domain.
- **TEST-003**: Test role cannot publish production environment.
- **TEST-004**: Production role cannot publish test environment unless explicitly allowed.
- **TEST-005**: `dev -> test` PR source guard passes; other source branches fail.
- **TEST-006**: `test -> main` PR source guard passes; other source branches fail.
- **TEST-007**: Push to `test` deploys only test published pointer.
- **TEST-008**: Push to `main` deploys only production published pointer.
- **TEST-009**: Runtime bundle for test aliases resolves test state.
- **TEST-010**: Runtime bundle for production aliases resolves production state.
- **TEST-011**: Secret/PII scan blocks unsafe draft files before deploy.
- **TEST-012**: New draft repo bootstrap produces the required branches, protections, workflows, and ignore rules.

## 10. Risks & Mitigations

- **RISK-001**: Overbroad OIDC trust could let any repo deploy any draft. Mitigation: narrow trust by repo and environment, then enforce domain/stage in Lambda.
- **RISK-002**: API Gateway IAM auth may prove awkward for current CLI. Mitigation: keep local pack/validate workflows, but reserve publish/update for GitHub Actions.
- **RISK-003**: Test alias routing can accidentally serve production state. Mitigation: environment-aware alias records and runtime tests for every alias.
- **RISK-004**: Existing docs still describe local publish. Mitigation: mark this plan as target state now, then update active docs only after implementation is verified.
- **RISK-005**: Managing many per-draft roles manually is error-prone. Mitigation: automate role/repo bootstrap after the pilot is verified.
- **RISK-006**: GitHub branch protection alone may not enforce source branch graph. Mitigation: required PR source-branch guard workflow.

## 11. Open Questions

- Which draft should be the pilot?
- Should production deploy require manual environment approval for the first few releases, or should it be fully automatic after merge from day one?
- Should `getSite` for draft state be restricted immediately, or should only write actions be blocked in the first hardening pass?
- Should local CLI publish commands be removed, disabled by default, or kept for emergency break-glass use with separate IAM permission?
