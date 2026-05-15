# Data Dropper Lambda Integration

This guide explains how Zoolandingpage posts raw analytics/events to the "Zoolanding Data Dropper" AWS Lambda. The function validates minimal fields, then stores the ORIGINAL request body (unchanged) in S3 under a date-partitioned key.

- Lambda repo: `zoolanding-data-dropper-lambda`
- Purpose: accept arbitrary analytics JSON, validate basics, and persist as-is for later processing
- Storage pattern: `s3://<bucket>/<appName>/YYYY/MM/DD/<timestampMs>-<shortReqId>.json`

Use `environment.apiUrl` as the frontend base URL. In the current platform, the stable custom domain is `https://api.zoolandingpage.com.mx`, and the analytics path is `/analytics`.

## Endpoint

- Base URL: `environment.apiUrl`
- Method: `POST`
- Headers: `Content-Type: application/json`
- Path: `/analytics`

## Request body

The function expects a JSON body (string) with at least:

- `appName` (string, required): use a stable identifier. In the current runtime this should come from `variables.appIdentity.identifier` via `RuntimeConfigService.appIdentifier()`
- `timestamp` (number, required): UNIX time in seconds or milliseconds; the function normalizes to milliseconds
- `timezone` (string, optional): IANA timezone such as `America/Mexico_City`; when valid, the Lambda returns and stores viewer-local time metadata while keeping the raw JSON unchanged

You can include any other fields. The function uploads the ORIGINAL body unchanged.

Example minimal payload:

```json
{
  "appName": "zoolandingpagecommx",
  "timestamp": 1735689600000
}
```

Example richer payload (will be stored exactly as sent):

```json
{
  "appName": "zoolandingpagecommx",
  "timestamp": 1735689600123,
  "event": "page_view",
  "path": "/",
  "language": "en-US",
  "timezone": "America/Mexico_City",
  "userAgent": "...",
  "screen": { "w": 1920, "h": 1080 }
}
```

## Response body

On success (200):

```json
{
  "ok": true,
  "bucket": "zoolanding-data-raw",
  "key": "zoolandingpage/2025/01/01/1735689600123-abc12345.json",
  "size": 342,
  "eventTime": {
    "timestampMs": 1735689600123,
    "utc": "2025-01-01T00:00:00.123Z",
    "timezone": "America/Mexico_City",
    "local": "2024-12-31T18:00:00.123-06:00",
    "localDate": "2024-12-31",
    "localHour": "18"
  }
}
```

On failure (400/500):

```json
{ "ok": false, "error": "<message>" }
```

Notes:

- `timestamp` is normalized to milliseconds if you send seconds
- The key includes a short request id suffix for uniqueness
- UTC remains the S3 partition standard; viewer-local time is exposed as response fields and S3 object metadata when `timezone` is valid
- ETL should use `sessionId` to connect later events to the session timezone when only the first or early events include `timezone`
- In DRY_RUN mode (for development), the function will return `ok: true` with `dryRun: true` and won’t write to S3

## Angular usage

Use `environment.apiUrl` as the base. If infra later introduces a subpath (e.g., `/v1/data-dropper`), append it in one place inside the service.

### Minimal types (optional)

```ts
export interface DataDropPayload extends Record<string, any> {
  appName: string;
  timestamp: number; // seconds or milliseconds
}

export interface DataDropResponse {
  ok: boolean;
  error?: string;
  bucket?: string;
  key?: string;
  size?: number;
  dryRun?: boolean;
}
```

### Angular service example

```ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@/environments/environment';

@Injectable({ providedIn: 'root' })
export class DataDropperService {
  private http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/analytics`;

  drop(payload: DataDropPayload) {
    return this.http.post<DataDropResponse>(this.endpoint, payload);
  }
}
```

### Common usage examples

1. Send a page view event

```ts
const payload = {
  appName: runtimeConfig.appIdentifier(),
  timestamp: Date.now(),
  event: 'page_view',
  path: location.pathname,
  language: navigator.language,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  userAgent: navigator.userAgent,
};

this.dataDropper.drop(payload).subscribe();
```

The production `AnalyticsService` may send richer context such as `timezone` on an early event and smaller payloads later in the same session. Do not require the app to repeat `timezone` on every event just for ETL; connect events by `sessionId` and carry the session timezone forward during the ETL pass.

1. Send a form submission event

```ts
const payload = {
  appName: runtimeConfig.appIdentifier(),
  timestamp: Date.now(),
  event: 'lead_submit',
  formId: 'contact',
  // Avoid PII: do not send email/phone/name directly
  fields: ['companySize', 'budgetRange'],
};

this.dataDropper.drop(payload).subscribe();
```

### Error handling pattern

```ts
this.dataDropper.drop({ appName: runtimeConfig.appIdentifier(), timestamp: Date.now() }).subscribe({
  next: res => {
    if (!res.ok) console.warn('Data drop error', res.error);
  },
  error: err => console.error('Network error', err),
});
```

## Environment configuration

- Set `apiUrl` in `environment.ts` and production environment files to the stable API base URL.
- Keep subpaths centralized in the service so callers don’t need to change.

Example (development):

```ts
export const environment = {
  // ...
  apiUrl: 'https://api.zoolandingpage.com.mx',
};
```

## CORS & security

- Ensure API Gateway CORS allows `POST` from your app origin and sends proper headers
- Don’t send PII; prefer anonymized or aggregated fields
- Use a stable identifier from draft payloads, not a display name literal
- Treat timezone as useful but limited context. Do not infer precise location from it, and do not add IP/geolocation/cookies without the configured consent and compliance review.

## ETL starting point

The Lambda is the raw ingestion layer, not the analytics transformation layer. Future ETL should:

- read raw S3 objects by `appName` and UTC partition date
- parse each object body without assuming optional fields are always present
- group events by `sessionId` when available
- choose a session timezone from the first valid IANA `timezone` in that session
- derive local date/hour during ETL for events missing their own `timezone`
- preserve `source_key` and raw payload references for replay and debugging

The backend repo contains the detailed ETL handoff document at `zoolanding-data-dropper-lambda/docs/etl-starting-point.md`.

## Troubleshooting

- 400 "Body is not valid JSON": Ensure the body is a JSON string (Angular’s HttpClient handles this automatically)
- 400 "Missing or invalid appName/timestamp": Validate types
- CORS errors: Confirm API Gateway CORS configuration

---

For full Lambda implementation details, see the backend repository `zoolanding-data-dropper-lambda`.
For platform context, also see `02-architecture.md` and `05-analytics-tracking.md` in this repo.
