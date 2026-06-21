# Validation and Troubleshooting (Step 9)

This document describes runtime validation and common troubleshooting steps for API-driven configs.

## Runtime Validation

Payloads are validated at load time using lightweight type guards.

Primary validator file:

- [src/app/shared/utility/config-validation/config-payload.validators.ts](../../src/app/shared/utility/config-validation/config-payload.validators.ts)

If a payload fails validation, it is ignored and the bootstrap continues with the next stage.

## Common Issues

### Missing root components

Symptoms:

- The page renders blank or missing sections.

Checks:

- Verify `rootIds` in `page-config.json`.
- Ensure each ID exists in `components.json`.

### Combos not applied

Symptoms:

- Layout looks unstyled or missing combo effects.

Checks:

- Verify `angora-combos.json` is valid and non-empty.
- Ensure each combo entry is an array of class strings.

### Theme palette not applied

Symptoms:

- The draft renders with fallback Zoo colors instead of the draft brand palette.
- Theme toggle works, but the colors do not match the draft.

Checks:

- Verify `site-config.json.site.theme.palettes.light` and `site-config.json.site.theme.palettes.dark` both exist.
- Verify every palette includes all required keys: `bgColor`, `textColor`, `titleColor`, `linkColor`, `accentColor`, `secondaryBgColor`, `secondaryTextColor`, `secondaryTitleColor`, `secondaryLinkColor`, `secondaryAccentColor`.
- Verify `site-config.json.site.theme.defaultMode` is `light`, `dark`, or `auto`.
- Verify modal accent overrides, if used, stay within `accentColor` or `secondaryAccentColor`.
- Hard refresh after switching drafts to confirm there is no stale palette state from a previous draft.

### i18n not loading

Symptoms:

- Raw keys appear in the UI.

Checks:

- Verify `i18n/{lang}.json` includes the `dictionary` field.
- Ensure `lang` param matches supported languages.

### Structured data missing

Symptoms:

- No JSON-LD entries in page source.

Checks:

- Verify `page-config.json.structuredData.entries` is present and contains valid schema objects for pages that author structured data.
- Confirm entries are valid schema.org JSON objects.

### loopConfig does not render generated children

Symptoms:

- Container renders but expected repeated items are missing.

Checks:

- Verify `loopConfig.templateId` exists in `components.json`.
- Verify `loopConfig.source` and required fields (`path` or `count`) are present.
- For `var`/`i18n` sources, ensure the resolved value is an array.
- Check console warnings from `ConfigurationsOrchestrator` for invalid loop sources/template IDs.

### Footer social links not visible

Symptoms:

- Footer social section is hidden or empty.

Checks:

- Verify `variables.socialLinks` exists and is a non-empty array.
- Confirm each social entry has usable `url` and either `ariaLabelKey`/`labelKey` or fallback labels.
- Check the active `condition` and `loopConfig.path` values in `components.json`; they should point at `socialLinks`.

### Footer/legal text missing after migration

Symptoms:

- Footer legal text/buttons are missing.
- Legal modal text or icons are empty.

Checks:

- Verify API i18n payload includes `footer.legal.*` and `footer.actions.close` keys.
- Verify legal modal icon keys exist: `footer.legal.terms.icon` and `footer.legal.data.icon`.
- Verify local fallback is intentionally not expected. Missing keys now surface directly as raw i18n key text or empty modal labels.
- Check orchestrator warning: `Missing API i18n footer legal keys. Legal links will remain hidden.`

### Raw i18n key text appears in the UI

Symptoms:

- Buttons, labels, or debug UI render values like `ui.debugPanel.analyticsLatest` or `ui.controls.languageToggle`.

Checks:

- Verify the active draft dictionary includes the exact key path being rendered.
- Verify `components.json` and handler-owned lookups still reference the intended key path (`processSection.*`, `ui.accessibility.*`, `ui.debugPanel.*`, etc.).
- Do not expect the runtime to fill missing keys from local TypeScript constants. Missing draft keys must be fixed in the draft payload itself.

### Referenced modals fail validation

Symptoms:

- The draft does not render and the validation panel reports missing modal configuration.
- Buttons using `openModal:*` stop being considered valid even though modal body components exist.

Checks:

- Verify every modal referenced by `openModal:<modalId>` has a matching `variables.ui.modals.<modalId>` entry.
- Verify every modal rendered behind `condition: "all:modalRefId,<modalId>"` also has a matching `variables.ui.modals.<modalId>` entry.
- Verify each modal config includes either `ariaLabel` or `ariaLabelKey`.

### SEO payload falls back to the domain only

Symptoms:

- The page title becomes the current domain or hostname.
- The description meta tag is empty.

Checks:

- Verify `page-config.json.seo` exists in the active draft or API payload.
- Verify `page-config.json.seo.title`, `page-config.json.seo.description`, and `page-config.json.seo.canonical` are all non-empty strings.
- Do not expect the runtime to inject the old shell title or shell description anymore.

### Footer does not render at all

Symptoms:

- Entire footer section is absent.

Checks:

- Verify `page-config.rootIds` includes `siteFooter`.
- Verify footer components are present in `components` payload.
- Verify footer visibility conditions now reference real i18n/variable paths, for example `footer.legal.*`, `footer.copyright`, or `socialLinks`.

### Interactive process section is hidden

Symptoms:

- Process section does not render.

Checks:

- Verify `variables.processSection.steps` exists and is a non-empty array.
- Verify each step has either literal text or i18n keys for:
- `title` / `titleKey`
- `summary` / `summaryKey`
- `content` / `contentKey`
- `meta` / `metaKey`
- `detailItems` / `detailItemsKey` / `detailItemKeys`
- Verify any `*Key` values resolve in the active i18n dictionary.
- Verify `components.json` uses `config.itemsSource` / `config.tabsSource` for the process renderers instead of inline `set:config.items` or `set:config.tabs` mutations.
- Verify detail-mode icon fields are authored when the current design expects them: `toggleIconName`, `detailMetaIconName`, and `detailItemIconName` for accordion; `detailMetaIconName` and `detailItemIconName` for tab-group.

### Search-box trigger or close button is missing its icon

Symptoms:

- The collapsed search button renders without an icon.
- The close button opens the panel but shows no icon.

Checks:

- Verify the active draft authored `config.triggerIcon` and `config.closeIcon` for the `search-box` component.
- Verify `config.suggestions` is present and contains valid entries when search results are expected.
- Do not expect the wrapper runtime to provide a separate search fetcher anymore.

### Stats counters are not updating from variables

Symptoms:

- Stats counters show fallback values only.
- Stats counters stop rendering expected number formats.

Checks:

- Verify `variables.statsCounters` exists as an object.
- Verify each authored stats entry uses numeric `target` and `durationMs`.
- Verify `formatMode` is a string and any `formatPrefix` / `formatSuffix` values are strings.
- Verify optional `min` and `max` values are numeric when present.
- Verify stats counter `valueInstructions` bind plain config fields such as `target`, `durationMs`, `formatMode`, `formatPrefix`, `formatSuffix`, `min`, and `max`.
- Verify stats counter `config` objects do not include temporary fields such as `rawTarget`, `minClamp`, or `maxClamp`.

### Input fields do not react to each other

Symptoms:

- One field updates, but sibling outputs or helper text do not react.

Checks:

- Verify the related components are rendered inside the same `interaction-scope` subtree.
- Verify `valueInstructions` use `scope` / `scopeOr` rather than `var` / `varOr` for local interaction state.
- Verify each `input` config has a non-empty `fieldId`.

### Interaction scope submission does nothing

Symptoms:

- Submit button renders, but no submit-side effects happen.

Checks:

- Verify the host component type is `interaction-scope` with `config.tag = 'form'` when using native submit buttons.
- Verify `config.submitEventInstructions` is present when submit should trigger orchestrated actions.
- Verify the relevant event handler IDs are allowlisted (`submitScope`, `resetScope`, `setScopeValue` when used).

### Computed outputs stay at zero or produce invalid values

Symptoms:

- Result text or stats counters never move off fallback values.

Checks:

- Verify each computation definition includes `resultId` and `initial`.
- Verify numeric steps use valid `field` or `literal` sources.
- Verify divide steps do not depend on a zero denominator unless the fallback behavior is intentional.

### labelKey / ariaLabelKey not applied

Symptoms:

- Social links show fallback labels instead of translated key values.

Checks:

- Verify each social link has valid `labelKey` / `ariaLabelKey`.
- Verify those keys exist in API i18n dictionary.
- If key values are absent, verify the payload provides `label` as a usable string or locale map.

### Optional draft auth fails validation

Symptoms:

- A draft with protected routes behaves as public or ignores auth settings.
- Cognito Hosted UI sign-in does not start from a protected route.
- Validation rejects `site-config.json` after adding `runtime.auth`.

Checks:

- Verify auth is optional: drafts that do not need auth should omit both `runtime.auth` and `runtime.authRemote`.
- Use either full static `runtime.auth` or public remote reference `runtime.authRemote`, not both. `runtime.authRemote` may contain only `enabled`, `authProfileId`, and `endpoint`.
- For remote auth, Angular sends only `{ domain, authProfileId }` to `runtime.authRemote.endpoint`, validates the backend `auth` response as public `runtime.auth`, and keeps auth disabled if the request or response is invalid.
- Verify public auth config contains only safe runtime metadata: `issuer`, `clientId`, `hostedUiDomain`, scopes, callback paths, page IDs, and safe group claim names.
- Do not put OAuth/JWT tokens, refresh tokens, client secrets, signed URLs, upstream credentials, or server-only authorization policy in draft payloads.
- Do not put `access` blocks or upstream credential `auth` blocks in `site-config.json.runtime.dataSources` or `site-config.json.runtime.apiActions`; those belong only in `server/integrations.json`.
- Use generic components plus `eventInstructions: "authAction:login"`, `authAction:signup`, `authAction:forgotPassword`, or `authAction:logout` for draft auth controls. Do not build draft-specific Angular auth components unless the generic component system cannot express the required UI.
- Treat PKCE state/verifier storage as temporary browser transaction data only. It must not become durable authorization state and must not be copied into notes, draft payloads, or logs.
- Verify `issuer` and `hostedUiDomain` are absolute HTTPS URLs with no username/password, backslashes, whitespace, or control characters.
- Verify `redirectPath`, `logoutPath`, `loginPath`, `postLoginPath`, `postLogoutPath`, and `routes[].auth.redirectTo` are same-origin paths that start with `/`.
- Do not use external URLs, protocol-relative URLs such as `//example.com`, `javascript:`, `data:`, backslashes, whitespace, control characters, or paths that omit the leading `/`.
- Verify protected route redirects resolve in the expected order: `routes[].auth.redirectTo`, then `runtime.auth.loginPath`, then no redirect.
- Do not expect `logoutPath` to act as a sign-in fallback.
- Treat `sessionStorage` auth data as editable UX metadata only. Backend APIs must validate JWTs, tenant ownership, and group claims.
- Resolve `authProfileId` through the server-only Auth Profile Registry before provisioning Cognito or authorizing protected APIs; browser config must not be the source of tenant ownership or group policy.
- Validate `server/auth-profile-registry.json` against the server-only contract before packaging: profiles require `authProfileId`, `tenantId`, `status`, `issuer`, `hostedUiDomain`, `clientId`, `audiences`, `callbackUrls`, `logoutUrls`, `loginPath`, and `logoutPath`. Optional `environmentClaim` values must be Cognito custom claims such as `custom:zoolanding_env` so testing and production users can be separated inside one client pool when a draft explicitly needs that model. `environmentClaimMode` is optional, defaults to strict `single`, and may be `list` only when a draft intentionally allows one verified Cognito user claim such as `prod,test` to pass multiple stack environments.
- Validate `server/integrations.json` before packaging: `access.required: true` requires `access.authProfileId`; `access.allowedGroups` must be non-empty strings; `auth` is reserved for upstream credential references such as `bearer`, `api-key-header`, or `oauth2-client-credentials`.
- For SSR pilots, keep protected pages free of private data/actions and mark them `noindex,nofollow` until the server can emit proper redirect/status responses.

## Debug Tips

- Ensure the active draft `site-config.json` sets `runtime.features.debugMode` when you need debug-only tooling.
- Watch console for `[ConfigBootstrap]` errors.
- Use the debug overlay to download draft payloads.
