# Changelog

Use this folder for chronological history. Keep durable current decisions and standing rules in the owning document routed from [../docs/README.md](../docs/README.md) or in focused reusable guidance under [../ai-notes/](../ai-notes/).

## Structure

- `app/`: app, runtime, tooling, deploy, and release history.
- `drafts/`: draft authoring, draft QA, and draft publish history.

Use `YYYY-MM.md` files by default. Split into `drafts/{domain}/YYYY-MM.md` only when a shared month file becomes too noisy.

## Rules

- Keep timestamps in Central Time.
- Summarize what changed, what was verified, what was published, and what evidence exists.
- Do not paste raw logs, secrets, tokens, raw environment values, signed URLs, private customer data, or PII.
- Put process logs in `logs/`, not here.
