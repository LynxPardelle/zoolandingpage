# Zoolandingpage Agent Workflow

This is the mandatory repo entrypoint. Keep it short: route to canonical documents instead of copying them here.

## Read Before Editing

1. Start at [docs/README.md](./docs/README.md) and open only the documents routed for the task.
2. For cross-repository work, verify ownership and entrypoints in [docs/repository-map.md](./docs/repository-map.md).
3. For reusable authoring or workflow constraints, use the focused index in [ai-notes/README.md](./ai-notes/README.md).
4. Read [changelog/](./changelog/) only when implementation, QA, release, or publish history is needed.
5. For an existing draft, begin with `drafts/{domain}/README.md` and its curated `ai_notes/README.md` when present. Open `findings/`, `errors-reports/`, evidence, or coordination history only when the task requires it.

[Codex.md](./Codex.md) is a compatibility pointer, not a default read or a knowledge store. It never overrides verified code, workflows, manifests, or the canonical documents above.

## Repository Boundaries

- `drafts/{domain}` is the canonical local draft path. Do not assume `drafts/_repos` is current.
- `ai-notes/` contains curated, reusable guidance—not session history.
- `changelog/app/` owns notable app/runtime/tooling chronology; `changelog/drafts/` owns notable draft chronology.
- Draft-local `ai_notes/`, `findings/`, and `errors-reports/` are local investigative/history surfaces, not shared canonical guidance.
- `.superpowers/` is the only location for local Superpowers plans, specs, scripts, and evidence. Never commit `.superpowers/` or `docs/superpowers/`.
- `devonly/` is optional ignored scratch. Put process logs under `logs/`, never at the repo root or inside draft folders.
- Put generated Microsoft documents, PDFs, and images under the ignored `Output/` directory.
- Write shared repository documentation in English by default. Direct quotations and source material may remain in their original language.
- Keep timestamps in Central Time.

## Safety And Delivery

- Never store secrets, credentials, tokens, raw environment values, signed URLs, private customer data, or PII in code, docs, notes, logs, examples, or retrieval tools.
- Describe sensitive dependencies abstractly. If code/runtime and documentation disagree, record the mismatch and verify the implementation before updating guidance.
- Preserve each repository's verified branch, release, rollback, and trust boundaries. Do not infer that sibling repositories share the hub's topology.
- Treat nested draft repositories as independent Git repositories. Stage, commit, and push from their own roots.
- Do not overwrite dirty, detached, unclassified, or unrelated user work. Do not mix changes into another active PR.
- Before declaring work correct, audit, fix, and rerun the audit at least three times.
- Draft changes that affect payloads, routes, styles, scripts, or rendered behavior require desktop and mobile browser QA on every affected route. Documentation-only changes require link, workflow, and public-safety validation instead.

## Update The Right Surface

- Update canonical docs or `ai-notes/` only for verified guidance reusable beyond one draft.
- Update a draft-local index for durable context specific to that draft.
- Update `changelog/` for what changed, was verified, was deployed, or was published.
- Do not add chronology to this file or `Codex.md`.
