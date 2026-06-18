const PROFILE_STATUSES = new Set(['planned', 'provisioning', 'active', 'suspended', 'failed']);
const INTEGRATION_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const UPSTREAM_AUTH_TYPES = new Set(['bearer', 'api-key-header', 'oauth2-client-credentials']);
const SAFE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const SAFE_DOMAIN = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;
const SECRET_REF = /^(\/[^\s\\]+|[^/\s\\]+\/[^\s\\]+|arn:aws:(ssm|secretsmanager):[^\s\\]+)$/;
const CUSTOM_ENVIRONMENT_CLAIM = /^custom:[A-Za-z0-9_]{1,20}$/;
const DEFAULT_GROUPS_CLAIM = 'cognito:groups';
const DEFAULT_SCOPES = ['openid', 'email', 'profile'];
const CUSTOM_AUTH_KEYS = new Set(['signin', 'signup', 'passwordRecovery']);
const CUSTOM_SIGNIN_KEYS = new Set(['enabled']);
const CUSTOM_SIGNUP_KEYS = new Set(['enabled', 'setTenantClaim', 'setEnvironmentClaim', 'defaultGroups']);
const CUSTOM_PASSWORD_RECOVERY_KEYS = new Set(['enabled']);
const MFA_KEYS = new Set(['mode', 'totp']);
const TOTP_MFA_KEYS = new Set(['enabled', 'issuer', 'accountLabelTemplate', 'friendlyDeviceName']);
const MFA_MODES = new Set(['off', 'optional', 'required']);
const AUTH_SESSION_KEYS = new Set([
  'mode',
  'signinPath',
  'mePath',
  'logoutPath',
  'challengeRespondPath',
  'mfaSetupPath',
  'mfaVerifyPath',
  'mfaEnrollStartPath',
  'mfaEnrollVerifyPath',
  'mfaDisablePath',
  'csrfCookieName',
  'challengeCsrfCookieName',
  'mfaEnrollCsrfCookieName',
  'csrfHeaderName',
]);
const AUTH_ADMIN_KEYS = new Set([
  'usersPath',
  'approveUserPathTemplate',
  'groupsPathTemplate',
  'suspendUserPathTemplate',
  'reactivateUserPathTemplate',
  'resetUserMfaPathTemplate',
]);
const AUTH_APPROVAL_STATUSES = new Set(['pending', 'approved', 'rejected', 'suspended']);
const JWT_TOKEN_USES = new Set(['id', 'access']);
const DEFAULT_JWT_TOKEN_USES = ['id', 'access'];

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDomain(value) {
  return cleanString(value)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/', 1)[0]
    .split(':', 1)[0];
}

function hasUnsafeChars(value) {
  return typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || value.includes('\\')
    || /[\s\u0000-\u001F\u007F]/.test(value);
}

function isHttpsAbsoluteUrl(value) {
  if (hasUnsafeChars(value)) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function isSafeSameOriginPath(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.trim() === value
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && !/[\s\u0000-\u001F\u007F]/.test(value);
}

function isNonEmptyStringArray(value) {
  return Array.isArray(value) && value.every(item => typeof item === 'string' && item.trim().length > 0 && item.trim() === item);
}

function pathFromHttpsUrl(value) {
  if (!isHttpsAbsoluteUrl(value)) return '';
  const parsed = new URL(value);
  return `${parsed.pathname || '/'}${parsed.search}${parsed.hash}`;
}

function readClaimArray(value) {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.split(/\s+/).filter(Boolean);
  }
  return [];
}

function uniqueStrings(values) {
  return [...new Set((values ?? []).filter(value => typeof value === 'string' && value.length > 0))];
}

function pushIf(condition, errors, message) {
  if (condition) errors.push(message);
}

function validateSocialIdpSecretRefs(refs, index, errors) {
  const prefix = `profiles[${index}].socialIdpSecretRefs`;
  if (refs === undefined) return;
  if (!refs || typeof refs !== 'object' || Array.isArray(refs)) {
    errors.push(`${prefix} must be an object when present`);
    return;
  }

  for (const [provider, providerRefs] of Object.entries(refs)) {
    if (!SAFE_ID.test(provider)) {
      errors.push(`${prefix}.${provider} provider must be stable`);
      continue;
    }
    if (typeof providerRefs === 'string') {
      if (!SECRET_REF.test(providerRefs)) {
        errors.push(`${prefix}.${provider} must be an SSM or Secrets Manager reference, not a raw credential value`);
      }
      continue;
    }
    if (!providerRefs || typeof providerRefs !== 'object' || Array.isArray(providerRefs)) {
      errors.push(`${prefix}.${provider} must be a reference or object of references`);
      continue;
    }
    for (const [key, value] of Object.entries(providerRefs)) {
      if (typeof value !== 'string' || !SECRET_REF.test(value)) {
        errors.push(`${prefix}.${provider}.${key} must be an SSM or Secrets Manager reference, not a raw credential value`);
      }
    }
  }
}

function validateKnownKeys(value, allowedKeys, prefix, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      errors.push(`${prefix}.${key} is not supported`);
    }
  }
}

function validateCustomAuth(customAuth, profile, index, errors) {
  const prefix = `profiles[${index}].customAuth`;
  if (customAuth === undefined) return;
  if (!customAuth || typeof customAuth !== 'object' || Array.isArray(customAuth)) {
    errors.push(`${prefix} must be an object when present`);
    return;
  }

  validateKnownKeys(customAuth, CUSTOM_AUTH_KEYS, prefix, errors);

  const signin = customAuth.signin;
  if (signin !== undefined) {
    const signinPrefix = `${prefix}.signin`;
    if (!signin || typeof signin !== 'object' || Array.isArray(signin)) {
      errors.push(`${signinPrefix} must be an object when present`);
    } else {
      validateKnownKeys(signin, CUSTOM_SIGNIN_KEYS, signinPrefix, errors);
      pushIf(signin.enabled !== undefined && typeof signin.enabled !== 'boolean', errors, `${signinPrefix}.enabled must be boolean when present`);
    }
  }

  const signup = customAuth.signup;
  if (signup !== undefined) {
    const signupPrefix = `${prefix}.signup`;
    if (!signup || typeof signup !== 'object' || Array.isArray(signup)) {
      errors.push(`${signupPrefix} must be an object when present`);
    } else {
      validateKnownKeys(signup, CUSTOM_SIGNUP_KEYS, signupPrefix, errors);
      pushIf(signup.enabled !== undefined && typeof signup.enabled !== 'boolean', errors, `${signupPrefix}.enabled must be boolean when present`);
      pushIf(signup.setTenantClaim !== undefined && typeof signup.setTenantClaim !== 'boolean', errors, `${signupPrefix}.setTenantClaim must be boolean when present`);
      pushIf(signup.setEnvironmentClaim !== undefined && typeof signup.setEnvironmentClaim !== 'boolean', errors, `${signupPrefix}.setEnvironmentClaim must be boolean when present`);
      if (signup.defaultGroups !== undefined) {
        if (!isNonEmptyStringArray(signup.defaultGroups)) {
          errors.push(`${signupPrefix}.defaultGroups must be a string array when present`);
        } else {
          const allowedGroups = new Set(Array.isArray(profile.allowedGroups) ? profile.allowedGroups : []);
          const unknownGroups = signup.defaultGroups.filter(group => !allowedGroups.has(group));
          pushIf(unknownGroups.length > 0, errors, `${signupPrefix}.defaultGroups must be contained in allowedGroups`);
        }
      }
    }
  }

  const passwordRecovery = customAuth.passwordRecovery;
  if (passwordRecovery !== undefined) {
    const recoveryPrefix = `${prefix}.passwordRecovery`;
    if (!passwordRecovery || typeof passwordRecovery !== 'object' || Array.isArray(passwordRecovery)) {
      errors.push(`${recoveryPrefix} must be an object when present`);
    } else {
      validateKnownKeys(passwordRecovery, CUSTOM_PASSWORD_RECOVERY_KEYS, recoveryPrefix, errors);
      pushIf(passwordRecovery.enabled !== undefined && typeof passwordRecovery.enabled !== 'boolean', errors, `${recoveryPrefix}.enabled must be boolean when present`);
    }
  }
}

function validateMfaPolicy(mfa, index, errors) {
  const prefix = `profiles[${index}].mfa`;
  if (mfa === undefined) return;
  if (!mfa || typeof mfa !== 'object' || Array.isArray(mfa)) {
    errors.push(`${prefix} must be an object when present`);
    return;
  }

  validateKnownKeys(mfa, MFA_KEYS, prefix, errors);
  pushIf(typeof mfa.mode !== 'string' || !MFA_MODES.has(mfa.mode), errors, `${prefix}.mode must be off, optional, or required`);

  if (mfa.totp !== undefined) {
    const totpPrefix = `${prefix}.totp`;
    if (!mfa.totp || typeof mfa.totp !== 'object' || Array.isArray(mfa.totp)) {
      errors.push(`${totpPrefix} must be an object when present`);
    } else {
      validateKnownKeys(mfa.totp, TOTP_MFA_KEYS, totpPrefix, errors);
      pushIf(typeof mfa.totp.enabled !== 'boolean', errors, `${totpPrefix}.enabled must be boolean`);
      pushIf(mfa.mode !== 'off' && mfa.totp.enabled !== true, errors, `${totpPrefix}.enabled must be true when mfa.mode is enabled`);
    }
  }
}

function validatePublicAuthServiceMetadata(profile, index, errors) {
  const prefix = `profiles[${index}]`;
  if (profile.session !== undefined) {
    const sessionPrefix = `${prefix}.session`;
    if (!profile.session || typeof profile.session !== 'object' || Array.isArray(profile.session)) {
      errors.push(`${sessionPrefix} must be an object when present`);
    } else {
      validateKnownKeys(profile.session, AUTH_SESSION_KEYS, sessionPrefix, errors);
      pushIf(profile.session.mode !== undefined && profile.session.mode !== 'server-cookie', errors, `${sessionPrefix}.mode must be server-cookie`);
      for (const key of ['signinPath', 'mePath', 'logoutPath', 'challengeRespondPath', 'mfaSetupPath', 'mfaVerifyPath']) {
        pushIf(profile.session[key] !== undefined && !isSafeSameOriginPath(profile.session[key]), errors, `${sessionPrefix}.${key} must be a same-origin path`);
      }
      for (const key of ['csrfCookieName', 'challengeCsrfCookieName', 'csrfHeaderName']) {
        pushIf(profile.session[key] !== undefined && (typeof profile.session[key] !== 'string' || hasUnsafeChars(profile.session[key])), errors, `${sessionPrefix}.${key} is invalid`);
      }
    }
  }

  if (profile.admin !== undefined) {
    const adminPrefix = `${prefix}.admin`;
    if (!profile.admin || typeof profile.admin !== 'object' || Array.isArray(profile.admin)) {
      errors.push(`${adminPrefix} must be an object when present`);
    } else {
      validateKnownKeys(profile.admin, AUTH_ADMIN_KEYS, adminPrefix, errors);
      for (const key of AUTH_ADMIN_KEYS) {
        pushIf(profile.admin[key] !== undefined && !isSafeSameOriginPath(profile.admin[key]), errors, `${adminPrefix}.${key} must be a same-origin path`);
      }
    }
  }
}

function validateServerOnlyAuthAdminPolicy(profile, index, errors) {
  const prefix = `profiles[${index}]`;
  if (profile.allowedTokenUses !== undefined) {
    pushIf(!isNonEmptyStringArray(profile.allowedTokenUses), errors, `${prefix}.allowedTokenUses must be a string array when present`);
    if (Array.isArray(profile.allowedTokenUses)) {
      const unknownTokenUses = profile.allowedTokenUses.filter(tokenUse => !JWT_TOKEN_USES.has(tokenUse));
      pushIf(unknownTokenUses.length > 0, errors, `${prefix}.allowedTokenUses must contain only id or access`);
      pushIf(new Set(profile.allowedTokenUses).size !== profile.allowedTokenUses.length, errors, `${prefix}.allowedTokenUses must not contain duplicates`);
    }
  }
  if (profile.adminGroups !== undefined) {
    pushIf(!isNonEmptyStringArray(profile.adminGroups), errors, `${prefix}.adminGroups must be a string array when present`);
    if (Array.isArray(profile.adminGroups) && Array.isArray(profile.allowedGroups)) {
      pushIf(!profile.adminGroups.every(group => profile.allowedGroups.includes(group)), errors, `${prefix}.adminGroups must be a subset of allowedGroups`);
    }
  }
  if (profile.manageableGroups !== undefined) {
    pushIf(!isNonEmptyStringArray(profile.manageableGroups), errors, `${prefix}.manageableGroups must be a string array when present`);
    if (Array.isArray(profile.manageableGroups) && Array.isArray(profile.allowedGroups)) {
      pushIf(!profile.manageableGroups.every(group => profile.allowedGroups.includes(group)), errors, `${prefix}.manageableGroups must be a subset of allowedGroups`);
    }
  }
  if (profile.defaultUserStatus !== undefined) {
    pushIf(typeof profile.defaultUserStatus !== 'string' || !AUTH_APPROVAL_STATUSES.has(profile.defaultUserStatus), errors, `${prefix}.defaultUserStatus is invalid`);
  }
  if (profile.adminGroupsAutoApproved !== undefined) {
    pushIf(typeof profile.adminGroupsAutoApproved !== 'boolean', errors, `${prefix}.adminGroupsAutoApproved must be a boolean`);
  }
  if (profile.maxSessionSeconds !== undefined) {
    pushIf(typeof profile.maxSessionSeconds !== 'number' || !Number.isFinite(profile.maxSessionSeconds) || profile.maxSessionSeconds <= 0, errors, `${prefix}.maxSessionSeconds must be a positive number`);
  }
}

function validateProfile(profile, index, seen, errors) {
  const prefix = `profiles[${index}]`;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
    errors.push(`${prefix} must be an object`);
    return;
  }

  const domain = profile.domain === undefined ? '' : normalizeDomain(profile.domain);
  const key = `${domain || '<draft>'}#${profile.authProfileId}`;
  if (profile.domain !== undefined) {
    const rawDomain = cleanString(profile.domain);
    pushIf(rawDomain !== domain || !SAFE_DOMAIN.test(domain), errors, `${prefix}.domain must be a lowercase hostname`);
  }
  pushIf(typeof profile.authProfileId !== 'string' || !SAFE_ID.test(profile.authProfileId), errors, `${prefix}.authProfileId is required and must be stable`);
  pushIf(seen.has(key), errors, `${prefix} duplicates domain + authProfileId`);
  seen.add(key);

  pushIf(typeof profile.tenantId !== 'string' || !SAFE_ID.test(profile.tenantId), errors, `${prefix}.tenantId is required`);
  pushIf(!PROFILE_STATUSES.has(profile.status), errors, `${prefix}.status is invalid`);
  pushIf(profile.provider !== undefined && profile.provider !== 'cognito', errors, `${prefix}.provider must be cognito when present`);
  pushIf(!isHttpsAbsoluteUrl(profile.issuer), errors, `${prefix}.issuer must be an HTTPS absolute URL without userinfo, whitespace, controls, or backslashes`);
  pushIf(!isHttpsAbsoluteUrl(profile.hostedUiDomain), errors, `${prefix}.hostedUiDomain must be an HTTPS absolute URL without userinfo, whitespace, controls, or backslashes`);
  pushIf(typeof profile.clientId !== 'string' || profile.clientId.trim().length === 0, errors, `${prefix}.clientId is required`);
  pushIf(!isNonEmptyStringArray(profile.audiences), errors, `${prefix}.audiences must be a non-empty string array`);
  pushIf(!isNonEmptyStringArray(profile.callbackUrls) || !profile.callbackUrls.every(isHttpsAbsoluteUrl), errors, `${prefix}.callbackUrls must be HTTPS absolute URLs`);
  pushIf(!isNonEmptyStringArray(profile.logoutUrls) || !profile.logoutUrls.every(isHttpsAbsoluteUrl), errors, `${prefix}.logoutUrls must be HTTPS absolute URLs`);
  pushIf(!isSafeSameOriginPath(profile.loginPath), errors, `${prefix}.loginPath must be a same-origin path`);
  pushIf(!isSafeSameOriginPath(profile.logoutPath), errors, `${prefix}.logoutPath must be a same-origin path`);
  pushIf(profile.tenantClaim !== undefined && (typeof profile.tenantClaim !== 'string' || profile.tenantClaim.trim().length === 0 || profile.tenantClaim.trim() !== profile.tenantClaim), errors, `${prefix}.tenantClaim must be a stable claim name when present`);
  pushIf(profile.environmentClaim !== undefined && (typeof profile.environmentClaim !== 'string' || profile.environmentClaim.trim() !== profile.environmentClaim || !CUSTOM_ENVIRONMENT_CLAIM.test(profile.environmentClaim)), errors, `${prefix}.environmentClaim must be a Cognito custom claim such as custom:zoolanding_env`);
  pushIf(profile.groupClaim !== undefined && (typeof profile.groupClaim !== 'string' || profile.groupClaim.trim().length === 0 || profile.groupClaim.trim() !== profile.groupClaim), errors, `${prefix}.groupClaim must be a stable claim name when present`);
  pushIf(profile.allowedGroups !== undefined && !isNonEmptyStringArray(profile.allowedGroups), errors, `${prefix}.allowedGroups must be a string array when present`);

  for (const secretKey of ['clientSecret', 'refreshToken', 'accessToken', 'idToken', 'signedUrl', 'upstreamCredential', 'token', 'apiKey', 'password']) {
    pushIf(secretKey in profile, errors, `${prefix}.${secretKey} must not be stored in the auth profile registry`);
  }

  validateSocialIdpSecretRefs(profile.socialIdpSecretRefs, index, errors);
  validateCustomAuth(profile.customAuth, profile, index, errors);
  validateMfaPolicy(profile.mfa, index, errors);
  validatePublicAuthServiceMetadata(profile, index, errors);
  validateServerOnlyAuthAdminPolicy(profile, index, errors);
}

export function validateAuthProfileRegistry(registry) {
  const errors = [];
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    return { valid: false, errors: ['registry must be an object'] };
  }

  pushIf(registry.version !== 1, errors, 'registry.version must be 1');
  pushIf(!Array.isArray(registry.profiles), errors, 'registry.profiles must be an array');

  const seen = new Set();
  if (Array.isArray(registry.profiles)) {
    registry.profiles.forEach((profile, index) => validateProfile(profile, index, seen, errors));
  }

  return { valid: errors.length === 0, errors };
}

export function resolveAuthProfile(registry, domain, authProfileId) {
  if (!registry || !Array.isArray(registry.profiles)) return null;
  const normalizedDomain = normalizeDomain(domain);
  const cleanProfileId = cleanString(authProfileId);

  return registry.profiles.find(profile =>
    profile?.authProfileId === cleanProfileId
    && (profile?.domain === undefined || normalizeDomain(profile?.domain) === normalizedDomain)
  ) ?? null;
}

export function buildPublicAuthRuntimeConfig(profile, options = {}) {
  if (!profile) return null;
  const validation = validateAuthProfileRegistry({ version: 1, profiles: [profile] });
  if (!validation.valid) {
    throw new Error(`Invalid auth profile: ${validation.errors.join('; ')}`);
  }

  const redirectPath = options.redirectPath ?? pathFromHttpsUrl(profile.callbackUrls[0]);
  const logoutPath = options.logoutPath ?? profile.logoutPath ?? pathFromHttpsUrl(profile.logoutUrls[0]);
  const loginPath = options.loginPath ?? profile.loginPath;
  if (!isSafeSameOriginPath(redirectPath) || !isSafeSameOriginPath(logoutPath)) {
    throw new Error('Public auth runtime paths must be same-origin paths');
  }
  if (loginPath !== undefined && !isSafeSameOriginPath(loginPath)) {
    throw new Error('loginPath must be a same-origin path');
  }
  if (options.postLoginPath !== undefined && !isSafeSameOriginPath(options.postLoginPath)) {
    throw new Error('postLoginPath must be a same-origin path');
  }
  if (options.postLogoutPath !== undefined && !isSafeSameOriginPath(options.postLogoutPath)) {
    throw new Error('postLogoutPath must be a same-origin path');
  }

  const runtime = {
    enabled: profile.status === 'active' && options.enabled !== false,
    authProfileId: profile.authProfileId,
    provider: 'cognito',
    issuer: profile.issuer,
    clientId: profile.clientId,
    hostedUiDomain: profile.hostedUiDomain,
    scopes: uniqueStrings(options.scopes ?? DEFAULT_SCOPES),
    redirectPath,
    logoutPath,
    ...(loginPath ? { loginPath } : {}),
    ...(options.loginPageId ? { loginPageId: options.loginPageId } : {}),
    ...(options.logoutPageId ? { logoutPageId: options.logoutPageId } : {}),
    ...(options.callbackPageId ? { callbackPageId: options.callbackPageId } : {}),
    ...(options.accountPageId ? { accountPageId: options.accountPageId } : {}),
    ...(options.postLoginPath ? { postLoginPath: options.postLoginPath } : {}),
    ...(options.postLogoutPath ? { postLogoutPath: options.postLogoutPath } : {}),
    groupsClaim: profile.groupClaim ?? DEFAULT_GROUPS_CLAIM,
    allowedGroups: uniqueStrings(profile.allowedGroups ?? []),
  };

  const session = publicAuthSessionMetadata(profile.session);
  if (session) runtime.session = session;
  const admin = publicAuthAdminMetadata(profile.admin);
  if (admin) runtime.admin = admin;

  return runtime;
}

function publicAuthSessionMetadata(session) {
  if (!session || typeof session !== 'object' || Array.isArray(session)) return null;
  return {
    mode: 'server-cookie',
    ...(session.signinPath ? { signinPath: session.signinPath } : {}),
    ...(session.mePath ? { mePath: session.mePath } : {}),
    ...(session.logoutPath ? { logoutPath: session.logoutPath } : {}),
    ...(session.challengeRespondPath ? { challengeRespondPath: session.challengeRespondPath } : {}),
    ...(session.mfaSetupPath ? { mfaSetupPath: session.mfaSetupPath } : {}),
    ...(session.mfaVerifyPath ? { mfaVerifyPath: session.mfaVerifyPath } : {}),
    ...(session.csrfCookieName ? { csrfCookieName: session.csrfCookieName } : {}),
    ...(session.challengeCsrfCookieName ? { challengeCsrfCookieName: session.challengeCsrfCookieName } : {}),
    ...(session.csrfHeaderName ? { csrfHeaderName: session.csrfHeaderName } : {}),
  };
}

function publicAuthAdminMetadata(admin) {
  if (!admin || typeof admin !== 'object' || Array.isArray(admin)) return null;
  return Object.fromEntries(
    [...AUTH_ADMIN_KEYS]
      .filter(key => typeof admin[key] === 'string' && admin[key].length > 0)
      .map(key => [key, admin[key]]),
  );
}

export function buildCognitoProvisioningPlan(profile) {
  if (!profile) return null;
  const validation = validateAuthProfileRegistry({ version: 1, profiles: [profile] });
  if (!validation.valid) {
    throw new Error(`Invalid auth profile: ${validation.errors.join('; ')}`);
  }

  const tenantBoundary = {
    tenantId: profile.tenantId,
    authProfileId: profile.authProfileId,
  };

  const operations = [
    {
      action: 'createOrUpdateUserPool',
      provider: 'cognito',
      tenantBoundary,
    },
    {
      action: 'createOrUpdateUserPoolClient',
      provider: 'cognito',
      clientId: profile.clientId,
      audiences: [...profile.audiences],
      callbackUrls: [...profile.callbackUrls],
      logoutUrls: [...profile.logoutUrls],
      tenantBoundary,
    },
    {
      action: 'configureHostedUiDomain',
      provider: 'cognito',
      hostedUiDomain: profile.hostedUiDomain,
      tenantBoundary,
    },
  ];

  for (const [provider, refs] of Object.entries(profile.socialIdpSecretRefs ?? {})) {
    operations.push({
      action: 'configureHostedUiSocialProvider',
      provider,
      secretRefs: typeof refs === 'string' ? { credentialRef: refs } : { ...refs },
      tenantBoundary,
    });
  }
  if (profile.mfa?.mode && profile.mfa.mode !== 'off') {
    operations.push({
      action: 'configureTotpMfa',
      provider: 'cognito',
      mfa: {
        mode: profile.mfa.mode,
        totp: {
          enabled: profile.mfa.totp?.enabled !== false,
        },
      },
      tenantBoundary,
    });
  }

  return {
    applyMode: 'plan-only',
    profileKey: tenantBoundary.authProfileId,
    operations,
  };
}

export function buildJwtVerificationConfig(profile) {
  if (!profile) return null;
  const validation = validateAuthProfileRegistry({ version: 1, profiles: [profile] });
  if (!validation.valid) {
    throw new Error(`Invalid auth profile: ${validation.errors.join('; ')}`);
  }

  const issuer = profile.issuer.replace(/\/+$/, '');
  return {
    issuer: profile.issuer,
    audience: profile.clientId,
    audiences: uniqueStrings(profile.audiences ?? [profile.clientId]),
    jwksUri: `${issuer}/.well-known/jwks.json`,
    groupsClaim: profile.groupClaim ?? DEFAULT_GROUPS_CLAIM,
    ...(profile.environmentClaim ? { environmentClaim: profile.environmentClaim } : {}),
    tenantClaim: profile.tenantClaim,
    tenantBoundary: {
      tenantId: profile.tenantId,
      authProfileId: profile.authProfileId,
    },
  };
}

export function authPolicyFromJwtClaims(profile, claims, options = {}) {
  if (!profile || !claims || typeof claims !== 'object') {
    return { authorized: false, subject: null, groups: [], reason: 'missing_profile_or_claims' };
  }

  const groupsClaim = profile.groupClaim ?? DEFAULT_GROUPS_CLAIM;
  const groups = readClaimArray(claims[groupsClaim]);
  const expectedGroups = uniqueStrings(profile.allowedGroups ?? []);
  const subject = typeof claims.sub === 'string' && claims.sub.length > 0 ? claims.sub : null;
  const tokenUse = typeof claims.token_use === 'string' ? claims.token_use : '';
  const expectedTokenUses = uniqueStrings(profile.allowedTokenUses ?? DEFAULT_JWT_TOKEN_USES);

  if (claims.iss !== profile.issuer) {
    return { authorized: false, subject, groups, reason: 'issuer_mismatch' };
  }
  const expectedAudiences = uniqueStrings(profile.audiences ?? [profile.clientId]);
  const audienceMatches = expectedAudiences.includes(claims.aud)
    || (Array.isArray(claims.aud) && claims.aud.some(audience => expectedAudiences.includes(audience)))
    || expectedAudiences.includes(claims.client_id);
  if (!audienceMatches) {
    return { authorized: false, subject, groups, reason: 'audience_mismatch' };
  }
  if (!subject) {
    return { authorized: false, subject, groups, reason: 'missing_subject' };
  }
  if (!expectedTokenUses.includes(tokenUse)) {
    return { authorized: false, subject, groups, reason: 'token_use_mismatch' };
  }
  if (profile.tenantClaim && claims[profile.tenantClaim] !== profile.tenantId) {
    return { authorized: false, subject, groups, reason: 'tenant_mismatch' };
  }
  if (profile.environmentClaim) {
    const actualEnvironment = typeof claims[profile.environmentClaim] === 'string' ? claims[profile.environmentClaim] : '';
    const expectedEnvironment = typeof options.runtimeEnvironment === 'string' ? options.runtimeEnvironment : '';
    if (!actualEnvironment) {
      return { authorized: false, subject, groups, reason: 'environment_missing' };
    }
    if (expectedEnvironment && actualEnvironment !== expectedEnvironment) {
      return { authorized: false, subject, groups, reason: 'environment_mismatch' };
    }
  }
  if (expectedGroups.length > 0 && !groups.some(group => expectedGroups.includes(group))) {
    return { authorized: false, subject, groups, reason: 'group_mismatch' };
  }

  return { authorized: true, subject, groups, reason: 'authorized' };
}

function validateAccessPolicy(access, prefix, errors) {
  if (access === undefined) return;
  if (!access || typeof access !== 'object' || Array.isArray(access)) {
    errors.push(`${prefix}.access must be an object when present`);
    return;
  }
  if (access.required !== undefined && typeof access.required !== 'boolean') {
    errors.push(`${prefix}.access.required must be boolean when present`);
  }
  if (access.required === true && (typeof access.authProfileId !== 'string' || !SAFE_ID.test(access.authProfileId))) {
    errors.push(`${prefix}.access.authProfileId is required when access.required is true`);
  }
  if (access.authProfileId !== undefined && (typeof access.authProfileId !== 'string' || !SAFE_ID.test(access.authProfileId))) {
    errors.push(`${prefix}.access.authProfileId must be stable when present`);
  }
  if (access.allowedGroups !== undefined && !isNonEmptyStringArray(access.allowedGroups)) {
    errors.push(`${prefix}.access.allowedGroups must be a non-empty string array when present`);
  }
}

function validateUpstreamAuth(auth, prefix, errors) {
  if (auth === undefined) return;
  if (!auth || typeof auth !== 'object' || Array.isArray(auth)) {
    errors.push(`${prefix}.auth must be an object for upstream credentials`);
    return;
  }
  if ('required' in auth || 'authProfileId' in auth || 'allowedGroups' in auth) {
    errors.push(`${prefix}.auth must describe upstream credentials only; put user authorization in access`);
  }
  if ('credentialRef' in auth) {
    errors.push(`${prefix}.auth.credentialRef is not supported; put credentialRef at the integration root`);
  }
  if (!UPSTREAM_AUTH_TYPES.has(auth.type)) {
    errors.push(`${prefix}.auth.type must be bearer, api-key-header, or oauth2-client-credentials`);
  }
  for (const secretKey of ['token', 'apiKey', 'clientSecret', 'password', 'secret', 'value']) {
    if (secretKey in auth) {
      errors.push(`${prefix}.auth.${secretKey} must not store raw credential material`);
    }
  }
}

function validateIntegrationEntry(entry, kind, index, errors) {
  const prefix = `${kind}[${index}]`;
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    errors.push(`${prefix} must be an object`);
    return;
  }
  pushIf(typeof entry.id !== 'string' || !SAFE_ID.test(entry.id), errors, `${prefix}.id is required and must be stable`);
  pushIf(!INTEGRATION_METHODS.has(entry.method), errors, `${prefix}.method is invalid`);
  pushIf(entry.url !== undefined && !isHttpsAbsoluteUrl(entry.url), errors, `${prefix}.url must be an HTTPS absolute URL`);
  pushIf(entry.urlTemplate !== undefined && typeof entry.urlTemplate !== 'string', errors, `${prefix}.urlTemplate must be a string when present`);
  pushIf(entry.url === undefined && entry.urlTemplate === undefined, errors, `${prefix}.url or urlTemplate is required`);
  pushIf(entry.allowedInputFields !== undefined && !isNonEmptyStringArray(entry.allowedInputFields), errors, `${prefix}.allowedInputFields must be a string array when present`);
  pushIf(entry.credentialRef !== undefined && (typeof entry.credentialRef !== 'string' || !SECRET_REF.test(entry.credentialRef)), errors, `${prefix}.credentialRef must be an SSM or Secrets Manager reference`);
  pushIf(entry.auth !== undefined && entry.credentialRef === undefined, errors, `${prefix}.credentialRef is required when auth is present`);
  pushIf(entry.credentialRef !== undefined && entry.auth === undefined, errors, `${prefix}.auth is required when credentialRef is present`);

  if (entry.headers !== undefined) {
    if (!entry.headers || typeof entry.headers !== 'object' || Array.isArray(entry.headers)) {
      errors.push(`${prefix}.headers must be an object when present`);
    } else {
      for (const [key, value] of Object.entries(entry.headers)) {
        if (typeof value !== 'string' || /authorization|api[-_]?key|token|secret/i.test(key)) {
          errors.push(`${prefix}.headers must not contain credential material`);
        }
      }
    }
  }

  if (entry.response !== undefined) {
    if (!entry.response || typeof entry.response !== 'object' || Array.isArray(entry.response)) {
      errors.push(`${prefix}.response must be an object when present`);
    } else {
      pushIf(entry.response.allowedFields !== undefined && !isNonEmptyStringArray(entry.response.allowedFields), errors, `${prefix}.response.allowedFields must be a string array when present`);
      pushIf(entry.response.maxBytes !== undefined && (typeof entry.response.maxBytes !== 'number' || !Number.isFinite(entry.response.maxBytes) || entry.response.maxBytes <= 0), errors, `${prefix}.response.maxBytes must be a positive number when present`);
    }
  }

  validateAccessPolicy(entry.access, prefix, errors);
  validateUpstreamAuth(entry.auth, prefix, errors);
}

export function validateServerIntegrations(integrations) {
  const errors = [];
  if (!integrations || typeof integrations !== 'object' || Array.isArray(integrations)) {
    return { valid: false, errors: ['integrations must be an object'] };
  }
  pushIf(integrations.version !== 1, errors, 'integrations.version must be 1');
  pushIf(!Array.isArray(integrations.sources), errors, 'integrations.sources must be an array');
  pushIf(!Array.isArray(integrations.actions), errors, 'integrations.actions must be an array');
  if (Array.isArray(integrations.sources)) {
    integrations.sources.forEach((entry, index) => validateIntegrationEntry(entry, 'sources', index, errors));
  }
  if (Array.isArray(integrations.actions)) {
    integrations.actions.forEach((entry, index) => validateIntegrationEntry(entry, 'actions', index, errors));
  }
  return { valid: errors.length === 0, errors };
}
