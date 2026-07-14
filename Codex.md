# Compatibility Pointer

The mandatory repository entrypoint is [AGENTS.md](./AGENTS.md). Use [docs/README.md](./docs/README.md) to open only the current contract needed for the task and [docs/repository-map.md](./docs/repository-map.md) for cross-repository ownership.

Do not add chronology here. Record notable app/tooling events in [changelog/app/](./changelog/app/), draft events in [changelog/drafts/](./changelog/drafts/), and reusable verified guidance under [ai-notes/](./ai-notes/). Use Git history only for targeted lookup of removed legacy memory, and verify historical claims against current code, workflows, manifests, and live state.

Local development must not provision or deploy AWS `dev` resources. Local drafts and harnesses remain first; any remote read needed from localhost uses the deployed `test` services and data.

The approved server-only integration foundation uses four independently deployable microservices: Data Spaces, Commerce, Integrations, and Notifications. Keep multiple small Lambdas within those service boundaries; do not create one repository per Lambda or add central platform-owner administration UI to Zoolandingpage. Drafts and public runtime must never contain provider credentials, payment or identity data, fiscal PII, bank data, or raw provider payloads. The Phase 0 AWS cleanup passed on 2026-07-14 CT after the two authorized orphan dev log groups were removed and an 18-region audit found zero remaining Zoolanding dev log groups. Implementation remains blocked until the HostGator, Stripe-volume, and fiscal-input gates in [the approved plan](./plan/infrastructure-server-only-integrations-1.md) are closed.

All repository changes must be promoted by protected pull requests in order: `dev -> test -> main`. Before each promotion, synchronize the target branch history back into the source branch through a validated PR when needed so the promotion is conflict-free and no branch history is discarded.
