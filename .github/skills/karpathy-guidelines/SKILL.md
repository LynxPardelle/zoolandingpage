---
name: karpathy-guidelines
description: 'Repo-local execution discipline for Zoolanding coding tasks. Use when implementing, debugging, refactoring, reviewing, or planning Angular, tooling, or sibling-Lambda work that needs explicit assumptions, minimal diffs, and concrete verification.'
user-invocable: true
---

# Karpathy Guidelines

Use this repo-local version to keep Karpathy-style execution portable across clones of Zoolandingpage.

## When to Use

- behavior-changing Angular work
- tooling and authoring workflow changes
- sibling-Lambda coordination work
- any task where ambiguity or over-engineering would create risk

## Workflow

1. Define the target.

   - Restate the requested outcome.
   - Name the narrowest proof that would show the task is done.
   - Call out what is out of scope.

2. Read the real context first.

   - Read `Codex.md`, `ai-notes/README.md`, and the most relevant note.
   - If the task touches an existing draft, inspect `drafts/{domain}/ai_notes/`, `drafts/{domain}/findings/`, and `drafts/{domain}/errors-reports/`.

3. Choose the smallest affected surface.

   - Prefer a surgical change in `src/`, `tools/`, `docs/`, or the relevant sibling repo.
   - Reuse existing service and routing boundaries before inventing new abstractions.

4. Make the smallest working change.

   - Avoid speculative configuration, helpers, or extension points.
   - Keep unrelated cleanup out of the diff.

5. Verify concretely.

   - Use the narrowest relevant test, lint, preview, or browser check.
   - If draft behavior changed, finish with desktop and mobile browser QA on every affected route.

6. Close with signal.
   - Summarize what changed.
   - State what was verified and what was not.
   - Call out residual risks or assumptions.

## Repo-Specific Rules

- Prefer the repo-local frontend workflow skill before falling back to generic patterns.
- Keep reusable guidance in `ai-notes/` and draft-specific history local under `drafts/`.
- When the task spans multiple repos or contracts, prefer the config-platform audit agent rather than guessing.
