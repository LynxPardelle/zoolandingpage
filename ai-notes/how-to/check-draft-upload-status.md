# Check Draft Upload Status

Date: 2026-05-15 (Central Time)
Scope: Repeatable workflow for comparing local draft JSON against uploaded production draft state.
Status: Active
Applies To: Draft authoring, release checks, production S3-backed authoring state
Source Of Truth:

- `docs/11-draft-lifecycle.md`
- `docs/api-driven-config/08-upload-to-api.md`
- `tools/draft-upload-status.mjs`

Confidence: High
Last Reviewed: 2026-05-15 (Central Time)

## Purpose

Use `tools/draft-upload-status.mjs` to answer which local draft JSON packages already match the uploaded S3-backed authoring state and which still need upload or publish work.

## Commands

Check all local domain drafts against the published state:

```bash
node tools/draft-upload-status.mjs --all --stage=published
```

Shortcut:

```bash
npm run drafts:upload-status
```

Check one draft:

```bash
node tools/draft-upload-status.mjs --domain=zoositioweb.com.mx --stage=published
```

Generate a machine-readable report:

```bash
node tools/draft-upload-status.mjs --all --stage=published --format=json --output=reports/draft-upload-status.json
```

Fail automation when anything is pending:

```bash
node tools/draft-upload-status.mjs --all --stage=published --fail-on-pending=true
```

## Status Meanings

- `uploaded`: local draft JSON matches the uploaded package for the selected stage.
- `needs-upload`: local and uploaded packages both exist, but differ.
- `not-uploaded`: no uploaded package was found for that domain/stage.

## Safety Notes

- The tool compares authoring package hashes and paths. It does not print draft file contents.
- Use `config-authoring getSite` as the normal source for production authoring state instead of direct bucket inspection, unless an incident specifically requires AWS-level object debugging.
- Keep raw endpoints, secrets, credentials, signed URLs, and PII out of notes and reports.
