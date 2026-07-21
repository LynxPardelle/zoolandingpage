# Spreadsheet-Driven QA Release Workflow

Date: 2026-07-21 (Central Time)
Scope: Manual QA findings tracked in a shared spreadsheet
Status: Active
Applies To: Zoolandingpage and managed draft repositories that use spreadsheet-based QA
Source Of Truth:

- The active QA spreadsheet and its explanation/configuration tabs
- `AGENTS.md`
- `docs/repository-map.md`
- Each owning repository's protected branch and deployment workflows
- GitHub pull requests, checks, workflow runs, and live browser evidence

Confidence: High
Last Reviewed: 2026-07-21 (Central Time)

Use this procedure whenever manual QA findings arrive in a spreadsheet. The spreadsheet is the control record; repositories, CI, deployments, and live browser checks remain the implementation evidence.

## Required Tracking Fields

Keep or add fields for:

- stable QA ID and short title
- description and acceptance criteria
- status and target environment
- implementation branch and pull request
- verification evidence and source links
- last-updated timestamp in Central Time
- blocker or decision note when the item is incomplete

Document every new field, allowed status, or configuration value in the spreadsheet's explanation or configuration tab before using it. Do not invent missing acceptance criteria. Mark an incomplete item as blocked and identify the missing evidence or decision.

## Per-Finding Delivery Loop

For each actionable row:

1. Read the full row, linked evidence, explanation tab, and relevant repository entrypoints.
2. Move the row to an in-progress state and record the target environment.
3. Create a dedicated branch named `codex/<qa-id>-<short-slug>` from the verified current `dev` branch.
4. Add or update a failing regression check when the finding is behaviorally testable, then implement the smallest complete fix.
5. Run focused tests and the repository-required validation. Audit, fix, and rerun the audit at least three times before declaring the change correct.
6. Open a pull request to `dev`. Merge only after required checks succeed and the diff matches the QA row.
7. Update the row with the branch, pull request, merge commit, checks, sources, and Central Time timestamp.

Do not combine unrelated QA rows into one implementation branch. A row that lacks enough information stays blocked; it is never marked complete to make the package appear closed.

## Package Promotion

After every actionable row is merged to `dev`:

1. Audit the complete package three times. Include tests, schema/config validation, public-safety checks, and a diff review against the spreadsheet.
2. Promote only through the repository's verified protected chain: `dev` to `test`, then `test` to `main`.
3. Wait for the exact merge commit's test deployment. Record the pull request and workflow-run URLs in the spreadsheet.
4. On test, check every affected route at desktop and mobile viewport sizes. Inspect visible acceptance criteria, broken images, horizontal overflow, browser console errors, and failed application requests.
5. If test fails, return the defect to a dedicated QA branch, merge it through `dev`, and repeat package promotion and browser QA.
6. Promote `test` to `main` only after the test evidence is clean. Wait for the exact production deployment and repeat the affected-route desktop/mobile browser audit on the public production host.
7. Mark a row complete and set its environment to production only after the production browser audit passes.

Never bypass a protected branch, deployment provenance guard, or repository ownership boundary. Treat a successful merge as insufficient until the expected artifact is served and the live page is verified.

## Evidence Standard

Each completed row must make the result independently auditable. Prefer stable HTTPS links and record:

- source or reference material used to interpret the finding
- implementation pull request and merge commit
- promotion pull requests
- test and production workflow runs
- browser routes and viewport coverage
- exact test totals or validation result
- known warnings that were reviewed and found non-blocking
- final Central Time timestamp

Do not paste secrets, signed URLs, tokens, raw environment values, private customer data, or PII into a QA spreadsheet. When a source is access-restricted, record a safe descriptive link or repository-owned document instead of copying sensitive contents.

## Closeout Gate

The package is complete only when:

- every actionable row is complete in production or explicitly blocked with a reason
- each fix has its own branch and review evidence
- the package passed three audit/fix/retest rounds
- test and production browser QA passed on desktop and mobile for every affected route
- the spreadsheet matches the actual deployed state and contains working evidence/source links
- temporary browser and local test state has been closed or preserved only when it is an intentional deliverable
