# Draft Auth Audit Matrix

Use this matrix before publishing draft-auth changes that affect custom sign-in, account pages, admin user management, MFA, or future protected surfaces such as blogs, analytics dashboards, uploads, and draft settings.

## Scope

- Auth stays optional per draft through `runtime.authRemote` or `runtime.auth`.
- Drafts with custom auth should use same-origin BFF routes and HttpOnly server sessions.
- `/mi-cuenta` is authenticated for any signed-in draft user, including pending users.
- `/admin/*` requires approved admin groups and must re-check server-side state before every admin action.
- Browser config may include only public same-origin paths and sanitized metadata. Tenant policy, user pool, admin groups, environment, and secret refs remain server-only.

## Matrix

| State | Route or API | Precondition | Expected result | Validation |
| --- | --- | --- | --- | --- |
| Client without MFA | `/acceso` to `/mi-cuenta` | Approved `zoosite-client`, no software-token MFA | Sign-in creates HttpOnly BFF session; account page shows client state, no admin link, and MFA enrollment UI | Auth client specs, BFF session specs, browser login with throwaway client |
| Admin with MFA | `/acceso` to `/verificar-acceso` to `/admin/usuarios` | Approved `zoosite-admin` with TOTP challenge | MFA challenge page appears; valid code creates session; admin list loads | BFF challenge specs, Angular form specs, browser login with controlled admin test user |
| Pending user | `/mi-cuenta`, `/admin/usuarios` | Authenticated default-status pending user | `/mi-cuenta` renders account status; admin API/page denies access | BFF pending-user specs and browser pending-user smoke |
| Suspended user | `/auth/session/me`, protected pages | Existing session whose user state is suspended or disabled | BFF rejects session revalidation; protected content does not render | BFF suspension/session-version specs and browser smoke |
| Expired or revoked session | `/auth/session/me`, protected pages | Expired cookie record, revoked session, or session-version mismatch | BFF returns 401; browser redirects/signs out or shows account-load error without private data | BFF expiry specs, Angular protected-route specs |
| Admin lost-device reset | `/auth/admin/users/{subject}/mfa/reset` | Approved admin session, target is another user | BFF disables target software-token MFA preference, bumps target `sessionVersion`, writes audit event, returns sanitized user | BFF reset specs, Angular admin action specs, admin browser smoke |
| Cognito or BFF error | sign-in, MFA, account, admin APIs | Cognito/API failure or denied policy | Controlled JSON error and user-facing copy; no secret/token/session echo | BFF negative specs, Angular error-state specs, mocked staging chaos only |

## Required Checks

Run the static draft guard before package upload:

```powershell
node tools/runtime-data-source-condition-guard.mjs --draft-root=drafts\zoositioweb.com.mx --domain=zoositioweb.com.mx
npm run config:pack -- --domain=zoositioweb.com.mx --drafts-root=drafts --stage=draft --output=$env:TEMP\zoosite-package.json
node drafts\zoositioweb.com.mx\tools\deploy-draft.mjs --draft-root=drafts\zoositioweb.com.mx --domain=zoositioweb.com.mx --validate-only=true
```

Run focused platform checks:

```powershell
node --test tools/tests/runtime-data-source-condition-guard.spec.mjs tools/tests/auth-profile-registry.spec.mjs tools/tests/site-config-schema.spec.mjs
npm run test -- --watch=false --browsers=ChromeHeadless --include src/app/state/auth/*.spec.ts --include src/app/shared/utility/event-handler/handlers/auth-admin-action.handlers.spec.ts --include src/app/shared/utility/event-handler/handlers/auth-form-action.handlers.spec.ts --include src/app/shared/utility/config-validation/config-payload.validators.spec.ts
```

Run BFF checks in `zoolanding-auth-admin`:

```powershell
python -m unittest discover -s tests -p "test_*.py"
sam validate
pip-audit -r requirements.txt
```

For draft publication, still run:

```powershell
node tools/draft-public-safety-audit.mjs --repo=drafts\zoositioweb.com.mx --history=true --summary=true
```

## Browser QA

Check desktop and mobile:

- `/acceso`: invalid fields, failed sign-in, slow sign-in loading, successful sign-in transition.
- `/mi-cuenta`: unauthenticated redirect, authenticated hard reload, account loading, MFA enable/disable branch.
- `/admin/usuarios`: user list load, approve, elevate, suspend, reactivate, reset MFA pending/success/error states.
- `/verificar-acceso`: invalid code, slow challenge submit, success/error.
- `/configurar-mfa`: setup start, QR rendering, manual secret wrapping, verify submit.

Pass criteria:

- Visible feedback appears quickly after clicks.
- Protected pages do not show private data before BFF revalidation.
- No full `otpauth://` URI is visible as ordinary text or logged.
- No JWT, access token, refresh token, raw Cognito `Session`, client secret, or credential ref appears in browser storage, URL, logs, or public config.
