# THN validation-only candidate

Date: 2026-09-07 (Central Time)

- Add an isolated GitHub validation workflow triggered only by `codex/thn-content-hub-task029-integration`.
- The job has read-only repository permissions, no cloud credentials or environment approval, and no deployment or promotion step.
- Run the owning repository's tests and build checks; retain an explicitly non-deployable candidate package and source/run/digest receipt for 30 days.
- Existing deployment triggers, activation defaults and other drafts are unchanged. The artifact is QA evidence, not a legacy recovery migration or a deployment authorization.
- The public-safety audit recognizes one exact negative workflow-permission assertion in test files. Current/history regressions retain blocking detection for appended or substituted literal values.
- Gitleaks exceptions identify only reviewed synthetic historical scanner fixtures by exact fingerprint.

Validation: parsed workflow boundary checks and Actionlint. Remote test results belong to the corresponding GitHub run, not this source document.
