# Generic Combo Catalog

The combo catalog is a generic feature service for reusable Angora combo presets. It is not blog-owned. Blog builders, draft builders, quizzes, and future feature editors can consume the same catalog when a draft opts in through browser-safe runtime config.

## Runtime Reference

Drafts may declare an optional public reference in `site-config.json`:

```json
{
  "runtime": {
    "comboCatalog": {
      "enabled": true,
      "endpoint": "/features/combo-catalog/read",
      "authProfileId": "staff",
      "draftDomain": "zoositioweb.com.mx"
    }
  }
}
```

This object is public. It must not contain table names, credential references, tokens, secrets, authorizer policy, or server-side resource names.

When enabled, Angular resolves `runtimeCombos` from the endpoint and installs the returned combo payload with `AngoraCombosService.setAuxiliaryCombos("combo-catalog", payload)`. Local payload combo files continue to work when the remote endpoint is disabled, missing, or invalid.

## Precedence

The intended combo resolution order is:

1. Global catalog combos.
2. Draft-scoped catalog combos.
3. Site `angora-combos.json`.
4. Page `angora-combos.json`.
5. Temporary preview/editor combos.

Later layers may override earlier layers for the same combo key. Preview/editor overrides are session-local and must not become public runtime state unless explicitly saved through an authenticated action.

## Service Ownership

`zoolanding-combo-catalog` is the dedicated Lambda/SAM repo for this feature. It owns the source-of-truth DynamoDB table and supports three deployment environments: `dev`, `test`, and `prod`.

The table is PAY_PER_REQUEST, encrypted, and has point-in-time recovery enabled. Version history and snapshots are intentionally out of scope for v1; writes use `updatedAt` optimistic locking to avoid accidental lost updates.

## Read Contract

Public reads are origin-bound and intended for draft runtime usage:

- `runtimeCombos`
- `comboList`
- `comboDetail`
- `groupList`
- `draftPolicy`

CORS/origin checks are not authorization. They only limit browser access to approved Zoolanding draft hosts.

## Write Contract

Writes require an auth-admin session, CSRF validation, approved user state, and server-side capabilities:

- `createCombo`
- `updateCombo`
- `batchUpsertCombos`
- `softDeleteCombo`
- `createGroup`
- `updateGroup`
- `setDraftPolicy`

Required capabilities are explicit:

- `combo:read`
- `combo:draft:write`
- `combo:global:write`
- `combo:delete`
- `combo:policy:update`

## Draft UI Rule

Draft admin surfaces such as `/admin/combos` must be composed from generic components. The app may add reusable primitives and services, but it should not hardcode a Zoosite-specific combo manager.
