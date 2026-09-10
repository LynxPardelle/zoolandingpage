# Immutable safety-policy refresh for Journal validation

Date: 2026-09-10 (Central Time)

The Hair Narrative PR reproduced a false positive from the older pinned
public-safety auditor: a complete negative workflow-permission assertion was
classified as a credential assignment, including its historical copies.

The reusable workflow now pins the already reviewed policy revision
`db5b7253f17ca94b43f1014fbe735b4fb2e9430f`. Its existing regression permits only
that exact complete statement in test files and still rejects altered values,
adjacent literals and appended comments in current files and history.

A workflow digest regression proves every other byte is unchanged after
normalizing the one policy reference. Existing callers remain pinned to their
previous immutable workflow versions; no other draft or fleet template is
repinned. Full-history Gitleaks, canonical auditing, read-only permissions and
workflow lint remain mandatory. This is CI source preparation, not deployment.
