# Quick Stats Lambda Integration

This guide explains how Zoolandingpage integrates with the "Zoolanding Quick Stats" AWS Lambda to read/update a simple JSON stats document per app in S3.

- Lambda repo: `zoolanding-quick-stats-lambda`
- Purpose: increment counters, append events, set flags, merge partial objects, and delete paths using a compact operations list
- Storage: `s3://<bucket>/<appName>/stats.json`

The API URL will be provided via environment configuration when ready. In the Angular app, always use `environment.apiUrl` for the endpoint base instead of hardcoding URLs.

## Endpoint

- Base URL: `environment.apiUrl`
- Method: `POST`
- Headers: `Content-Type: application/json`
- Path: Determined by deployment (could be base or with a path segment). Keep it configurable. In examples below, we use the base `environment.apiUrl` directly; append any specific path once infra confirms it.

## Request body

Top-level payload:

- `appName` (string, required): Use a stable identifier, e.g. `"zoolandingpage"`.
- `ops` (array, required): List of operations to apply in order.
- `createIfMissing` (boolean, optional, default `true`): If `false` and the S3 JSON doesn't exist, the request fails.
- `dryRun` (boolean, optional, default `false`): If `true`, returns the computed result without writing to S3.
- `ifMatchEtag` (string, optional): For optimistic concurrency. If provided and does not match the current ETag on the server, the request fails with a 400.

Operation types (dot-paths; numeric segments are array indices):

- `set`: `{ op: 'set', path: string, value: any }`
- `inc`: `{ op: 'inc', path: string, by?: number } // default by = 1`
- `delete`: `{ op: 'delete', path: string }`
- `merge`: `{ op: 'merge', path: string, value: Record<string, any> } // deep merge`
- `append`: `{ op: 'append', path: string, value: any } // ensures array and pushes`

Path examples:

- `metrics.pageViews`
- `users.0.name` // `users` must be an array; `0` refers to index 0
- `flags.betaEnabled`

## Response body

On success (200):

```json
{
  "ok": true,
  "bucket": "zoolanding-quick-stats",
  "key": "zoolandingpage/stats.json",
  "stats": { /* updated document */ },
  "etag": "\"abc123...\"",
  "versionId": "...", // if versioning enabled
  "dryRun": false
}
```

On failure (400/500):

```json
{ "ok": false, "error": "<message>" }
```

Notes:

- If you use `ifMatchEtag` and it doesn't match the server's current ETag, the server returns `{ ok:false, error:"ETag mismatch, please retry" }` with status 400.
- When `dryRun` is true (or the server is configured for DRY_RUN), the response will include `dryRun: true` and the file is not written.

## Angular usage

Always get the endpoint from `environment.apiUrl`. If deployment later requires a specific subpath (e.g., `/v1/quick-stats`), append it in a single place in your service.

### Minimal types (optional)

```ts
export type StatsOp =
  | { op: 'set'; path: string; value: any }
  | { op: 'inc'; path: string; by?: number }
  | { op: 'delete'; path: string }
  | { op: 'merge'; path: string; value: Record<string, any> }
  | { op: 'append'; path: string; value: any };

export interface ApplyOpsRequest {
  appName: string;
  ops: StatsOp[];
  createIfMissing?: boolean;
  dryRun?: boolean;
  ifMatchEtag?: string;
}

export interface ApplyOpsResponse {
  ok: boolean;
  error?: string;
  bucket?: string;
  key?: string;
  stats?: Record<string, any>;
  etag?: string;
  versionId?: string;
  dryRun?: boolean;
}
```

### Angular service example

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';

@Injectable({ providedIn: 'root' })
export class StatsService {
  private http = inject(HttpClient);
  // Keep this centralized so we can adjust the path later if needed
  private readonly endpoint = `${environment.apiUrl}`; // append path here if required

  applyOps(req: ApplyOpsRequest) {
    return this.http.post<ApplyOpsResponse>(this.endpoint, req);
  }
}
```

### Common examples

1. Increment a counter

```ts
statsService.applyOps({
  appName: 'zoolandingpage',
  ops: [ { op: 'inc', path: 'metrics.pageViews', by: 1 } ]
}).subscribe();
```

1. Append an event to an array

```ts
statsService.applyOps({
  appName: 'zoolandingpage',
  ops: [ { op: 'append', path: 'events', value: { type: 'visit', ts: Date.now() } } ]
}).subscribe();
```

1. Set/merge structured data

```ts
statsService.applyOps({
  appName: 'zoolandingpage',
  ops: [
    { op: 'set', path: 'user.agent', value: navigator.userAgent },
    { op: 'merge', path: 'flags', value: { betaEnabled: true } }
  ]
}).subscribe();
```

1. Use optimistic concurrency

```ts
// First read/update to get the current etag from response
statsService.applyOps({ appName: 'zoolandingpage', ops: [], dryRun: true }).subscribe(res => {
  const etag = res.etag;
  statsService.applyOps({
    appName: 'zoolandingpage',
    ifMatchEtag: etag,
    ops: [ { op: 'inc', path: 'metrics.saves', by: 1 } ]
  }).subscribe();
});
```

### Error handling pattern

```ts
statsService.applyOps({ appName: 'zoolandingpage', ops: [] }).subscribe({
  next: (res) => {
    if (!res.ok) {
      console.warn('Stats error', res.error);
    }
  },
  error: (err) => console.error('Network error', err)
});
```

## Environment configuration

- Set `apiUrl` in `environment.ts` (and production environments) to the Lambda's API Gateway URL when it is available.
- Keep any path segments centralized in the `StatsService` so we can change them without touching callers.

Example (development):

```ts
export const environment = {
  // ...
  apiUrl: 'https://<api-id>.execute-api.<region>.amazonaws.com',
  // apiVersion: 'v1' // optional, if infra uses versioned paths
};
```

## CORS & security

- Ensure the API Gateway exposes CORS headers for `POST` from your app origin.
- Do not send PII. Prefer aggregate metrics and anonymized events.
- Use a stable `appName` for this project, e.g., `zoolandingpage`.

## Local and dry-run testing

For safe testing from the app without writing to S3, set `dryRun: true` in the request. The response will include the computed `stats` without persisting it.

## Troubleshooting

- 400 "Body is not valid JSON": Make sure you're sending a JSON string body with the fields described above.
- 400 "Missing or invalid appName/ops": Validate types (`appName` string, `ops` array).
- ETag mismatch: Remove `ifMatchEtag` or retry after fetching the latest ETag.
- CORS errors: Confirm API Gateway CORS settings allow your origin and the `POST` method.

---

For full Lambda implementation details (supported ops, error semantics), see the backend repository `zoolanding-quick-stats-lambda`.
