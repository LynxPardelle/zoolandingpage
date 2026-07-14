# Compatibility Pointer

The mandatory repository entrypoint is [AGENTS.md](./AGENTS.md). Use [docs/README.md](./docs/README.md) to open only the current contract needed for the task and [docs/repository-map.md](./docs/repository-map.md) for cross-repository ownership.

Do not add chronology here. Record notable app/tooling events in [changelog/app/](./changelog/app/), draft events in [changelog/drafts/](./changelog/drafts/), and reusable verified guidance under [ai-notes/](./ai-notes/). Use Git history only for targeted lookup of removed legacy memory, and verify historical claims against current code, workflows, manifests, and live state.

Local development must not provision or deploy AWS `dev` resources. Local drafts and harnesses remain first; any remote read needed from localhost uses the deployed `test` services and data.
