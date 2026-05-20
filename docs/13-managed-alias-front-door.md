# Managed Alias Front Door

Date: 2026-05-18 (Central Time)
Status: Active
Scope: DNS, Traefik/Dokploy file-provider routing, and runtime API reset probes for managed `*.zoolandingpage.com.mx` aliases.

## Purpose

Draft deploys persist `site-config.json.aliases` into the config registry so runtime-read can resolve an alias to the canonical draft. That does not create DNS, Traefik routers, or TLS certificates by itself.

Use `tools/ops/sync-managed-alias-front-door.mjs` after a draft alias is declared and deployed. The tool reads published draft repos through `docs/drafts-registry.json`, filters managed aliases under `*.zoolandingpage.com.mx`, then can:

- upsert Route 53 `A` records
- render Traefik dynamic file-provider config
- write that config to the Dokploy host through SSM
- create a remote backup before replacing the Traefik dynamic file

No secrets, tokens, raw environment values, instance IDs, or account-specific identifiers should be committed. Pass operational values by environment variables or CLI flags.

## Inputs

Required for Route 53 apply:

- `ZOOLANDING_FRONT_DOOR_IPV4` or `--target-ip`
- `ZOOLANDING_ROUTE53_HOSTED_ZONE_ID` or `--hosted-zone-id` unless the hosted zone can be resolved by name

Required for Traefik apply:

- `ZOOLANDING_TRAEFIK_UPSTREAM_URL` or `--upstream-url`
- `ZOOLANDING_TRAEFIK_DYNAMIC_FILE` or `--remote-traefik-file`
- `ZOOLANDING_SSM_INSTANCE_NAME` or `--ssm-instance-name`

Useful optional inputs:

- `AWS_PROFILE`
- `AWS_REGION` or `--region`
- `--domain=example.com` to limit to one canonical draft
- `--environment=production`, `--environment=test`, or `--environment=all`
- `--traefik-output=path.yml` to inspect generated config locally
- `--include-drafts-root=true` only when you intentionally want to read local `drafts/` instead of the registered sibling `draft-*` repos
- `--traefik-mode=router-block` plus `--block-label="draft test aliases"` when updating only a marked router block inside an existing Dokploy dynamic file

## Dry Run

Run a dry run before every apply:

```powershell
$env:ZOOLANDING_FRONT_DOOR_IPV4 = "<front-door-ipv4>"
$env:ZOOLANDING_TRAEFIK_UPSTREAM_URL = "http://<dokploy-service-name>:4000"

node tools/ops/sync-managed-alias-front-door.mjs --domain=despacholegalastralex.com --environment=all --traefik-output=logs/ops/managed-aliases-traefik.yml
```

Expected dry-run output:

- aliases found
- source config file for each alias
- Route 53 change count
- generated Traefik YAML

## Apply

After reviewing the dry run:

```powershell
node tools/ops/sync-managed-alias-front-door.mjs `
  --domain=despacholegalastralex.com `
  --environment=all `
  --traefik-mode=full-file `
  --apply `
  --ssm-instance-name="<ssm-managed-instance-name>" `
  --remote-traefik-file=/etc/dokploy/traefik/dynamic/<managed-zoolanding-file>.yml
```

The SSM remote script writes a backup before replacing the dynamic file:

```text
<dynamic-file-directory>/backups/<file-name>.<utc-stamp>.bak
```

If the target dynamic file already contains hand-managed or Dokploy-generated routers, do not use full-file replacement. Use router-block patch mode against a marked block:

```powershell
node tools/ops/sync-managed-alias-front-door.mjs `
  --domain=despacholegalastralex.com `
  --environment=test `
  --target-ip="<front-door-ipv4>" `
  --upstream-url="http://<dokploy-service-name>:4000" `
  --traefik-mode=router-block `
  --block-label="draft test aliases" `
  --service-name="<existing-traefik-service-name>" `
  --apply `
  --ssm-instance-name="<ssm-managed-instance-name>" `
  --remote-traefik-file=/etc/dokploy/traefik/dynamic/<existing-zoolanding-file>.yml
```

Router-block mode replaces only:

```text
    # Managed by Codex: <label> begin
    ...
    # Managed by Codex: <label> end
```

If the markers do not exist, it inserts the block under `http.routers`. It still backs up the remote file first.

Traefik should hot-reload file-provider config and request/renew certificates through the configured resolver. If the first HTTPS request fails while a certificate is being issued, retry after Traefik logs show the router is loaded.

## Validation

Validate every newly synced alias:

```powershell
Resolve-DnsName <alias>
curl.exe -I https://<alias>/
curl.exe -I "https://<alias>/ruta-inventada?lang=es"
```

Expected:

- DNS returns the configured front-door IPv4
- home returns HTTP `200`
- invented route returns HTTP `404`
- HTTPS works without `curl -k`

Then run browser QA for desktop and mobile on:

- `https://<alias>/`
- `https://<alias>/ruta-inventada?lang=es`
- `https://<alias>/missing-route?lang=en`

Check visible page rendering, console errors, network failures, and responsive overflow.

## Runtime Front-Door Reset Probe

Use `tools/ops/probe-runtime-front-door.mjs` when `api.zoolandingpage.com.mx` shows transient resets:

```powershell
node tools/ops/probe-runtime-front-door.mjs `
  --domain=despacholegalastralex.zoolandingpage.com.mx `
  --requests=200 `
  --concurrency=10 `
  --cache-mode=no-store `
  --format=markdown `
  --output=logs/ops/runtime-front-door-probe.md
```

The probe sends the same `runtime-bundle` request to:

- `https://api.zoolandingpage.com.mx`
- the raw runtime-read API Gateway base

It reports request count, transport errors, status counts, exact error messages, and latency p50/p95 per target. Treat a single passing request as insufficient evidence; compare failure rate before and after any CloudFront/API/front-door mitigation.

Use `--cache-mode=no-store` for origin stress tests. Use `--cache-mode=default --target=custom-domain` when validating the real viewer path after CloudFront runtime-bundle caching is enabled.

## Runtime Bundle Cache Mitigation

`/runtime-bundle*` is public config data keyed by `domain`, `path`, and `lang`. If probes show raw API Gateway and custom-domain requests both returning HTTP `500` under burst pressure, check Lambda account concurrency before changing app or 404 logic.

The 2026-05-20 CT audit found:

- Lambda regional account concurrency returned `ConcurrentExecutions: 10`.
- CloudFront `/runtime-bundle*` was using `Managed-CachingDisabled`.
- Parallel custom-domain and raw-origin probes produced API Gateway `5XXError` metrics while Lambda logs showed no app exception in the sampled window.

Use a short CloudFront cache on `/runtime-bundle*` to reduce repeated origin hits. The cache policy must include all query strings in the cache key and should keep TTLs short so publishes converge quickly:

```powershell
node tools/ops/configure-runtime-front-door-cache.mjs `
  --apply `
  --wait `
  --min-ttl=1 `
  --default-ttl=10 `
  --max-ttl=60
```

The tool writes a local backup and patched distribution config under `logs/ops/` before it calls `update-distribution`. It updates only the `/runtime-bundle*` cache behavior. It does not cache authoring, upload, analytics, or API proxy routes.

Also request a higher Lambda regional concurrency quota when the account limit is still `10`; CloudFront caching reduces origin pressure, but it does not raise raw API Gateway capacity.

When the quota is approved, put a reserved concurrency cap on the runtime-read Lambda instead of using Provisioned Concurrency:

```powershell
aws lambda put-function-concurrency `
  --function-name <runtime-read-function-name> `
  --reserved-concurrent-executions 100
```

Reserved concurrency has no fixed capacity charge and caps runtime-read so it cannot consume the whole regional pool. Provisioned Concurrency does create a standing capacity charge and should require explicit cost approval. After setting the cap, verify account and function state:

```powershell
aws lambda get-account-settings
aws lambda get-function-concurrency --function-name <runtime-read-function-name>
node tools/ops/probe-runtime-front-door.mjs `
  --domain=zoolandingpage.com.mx `
  --requests=200 `
  --concurrency=16 `
  --target=all `
  --cache-mode=no-store
```

## Mitigation Rules

- If custom-domain resets occur but raw API Gateway stays clean, investigate CloudFront origin behavior, keepalive, HTTP version, TLS, and origin timeouts before changing runtime-read code.
- If both custom and raw endpoints fail, inspect API Gateway metrics, Lambda concurrency/quota, and Lambda logs first.
- If local `curl.exe` or Node fails but browser and PowerShell succeed, capture all client results; do not declare a platform outage from one Windows client alone.
- Keep SSR using the raw runtime-read fallback for server-side bootstrap until the custom-domain reset source is proven fixed over a repeated probe.
