import {
  authPolicyFromJwtClaims,
  buildCognitoProvisioningPlan,
  buildJwtVerificationConfig,
  buildPublicAuthRuntimeConfig,
  resolveAuthProfile,
  validateAuthProfileRegistry,
} from './auth-profile-registry.mjs';

const RUNTIME_AUTH_PATH = '/auth/runtime-config';
const PROVISIONING_PLAN_PATH = '/auth/provisioning-plan';

const REQUEST_ID_KEYS = new Set(['domain', 'authProfileId']);
const RUNTIME_OPTION_KEYS = new Set([
  'enabled',
  'scopes',
  'redirectPath',
  'logoutPath',
  'loginPath',
  'loginPageId',
  'logoutPageId',
  'callbackPageId',
  'accountPageId',
  'postLoginPath',
  'postLogoutPath',
]);

function lowerCaseHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => [String(key).toLowerCase(), value])
  );
}

function methodOf(event) {
  return String(event?.requestContext?.http?.method ?? event?.httpMethod ?? 'GET').toUpperCase();
}

function pathOf(event) {
  return String(event?.rawPath ?? event?.requestContext?.http?.path ?? event?.path ?? '/').split('?')[0];
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event?.body) return {};
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('request_body_must_be_object');
  }
  return parsed;
}

function readRequest(event) {
  const query = event?.queryStringParameters && typeof event.queryStringParameters === 'object'
    ? event.queryStringParameters
    : {};
  return {
    ...query,
    ...parseBody(event),
  };
}

function extractRuntimeOptions(request) {
  const options = {};
  for (const [key, value] of Object.entries(request)) {
    if (REQUEST_ID_KEYS.has(key)) continue;
    if (!RUNTIME_OPTION_KEYS.has(key)) {
      throw new Error('unsupported_runtime_auth_option');
    }
    options[key] = value;
  }
  return options;
}

function validateRegistryOrThrow(registry) {
  const validation = validateAuthProfileRegistry(registry);
  if (!validation.valid) {
    throw new Error('auth_registry_invalid');
  }
}

async function loadProfile(loadRegistry, domain, authProfileId) {
  if (typeof loadRegistry !== 'function') {
    throw new Error('auth_registry_loader_missing');
  }
  const registry = await loadRegistry();
  validateRegistryOrThrow(registry);
  return resolveAuthProfile(registry, domain, authProfileId);
}

function missingRef(domain, authProfileId) {
  return !domain || !authProfileId;
}

function deny(reason, extraContext = {}) {
  return {
    isAuthorized: false,
    context: {
      reason,
      ...extraContext,
    },
  };
}

function allow(profile, policy) {
  return {
    isAuthorized: true,
    context: {
      reason: policy.reason,
      subject: policy.subject,
      groups: policy.groups.join(','),
      domain: profile.domain,
      tenantId: profile.tenantId,
      authProfileId: profile.authProfileId,
    },
  };
}

function bearerTokenFrom(event) {
  const headers = lowerCaseHeaders(event?.headers);
  const value = String(headers.authorization ?? '');
  const match = /^Bearer\s+(.+)$/i.exec(value);
  return match?.[1]?.trim() || null;
}

function refFromEvent(event) {
  const headers = lowerCaseHeaders(event?.headers);
  const request = readRequest(event);
  return {
    domain: headers['x-zlp-domain'] ?? request.domain,
    authProfileId: headers['x-zlp-auth-profile-id'] ?? request.authProfileId,
  };
}

export function createAuthServiceHandlers({
  loadRegistry,
  verifyJwt,
  isTrustedServerRequest = () => false,
} = {}) {
  async function runtimeAuthHandler(event) {
    let request;
    try {
      request = readRequest(event);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON request body.' });
    }

    if (missingRef(request.domain, request.authProfileId)) {
      return jsonResponse(400, { error: 'domain and authProfileId are required.' });
    }

    let options;
    try {
      options = extractRuntimeOptions(request);
    } catch {
      return jsonResponse(400, { error: 'Unsupported runtime auth option.' });
    }

    let profile;
    try {
      profile = await loadProfile(loadRegistry, request.domain, request.authProfileId);
    } catch {
      return jsonResponse(500, { error: 'Auth registry is unavailable.' });
    }

    if (!profile) {
      return jsonResponse(404, { error: 'Auth profile not found.' });
    }

    try {
      return jsonResponse(200, {
        runtimeAuth: buildPublicAuthRuntimeConfig(profile, options),
      });
    } catch {
      return jsonResponse(400, { error: 'Invalid public auth runtime request.' });
    }
  }

  async function provisioningPlanHandler(event) {
    if (!isTrustedServerRequest(event)) {
      return jsonResponse(403, { error: 'Provisioning plans require a trusted server-side caller.' });
    }

    let request;
    try {
      request = readRequest(event);
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON request body.' });
    }

    if (missingRef(request.domain, request.authProfileId)) {
      return jsonResponse(400, { error: 'domain and authProfileId are required.' });
    }

    let profile;
    try {
      profile = await loadProfile(loadRegistry, request.domain, request.authProfileId);
    } catch {
      return jsonResponse(500, { error: 'Auth registry is unavailable.' });
    }

    if (!profile) {
      return jsonResponse(404, { error: 'Auth profile not found.' });
    }

    return jsonResponse(200, {
      plan: buildCognitoProvisioningPlan(profile),
    });
  }

  async function jwtAuthorizerHandler(event) {
    const token = bearerTokenFrom(event);
    if (!token) return deny('missing_bearer_token');
    if (typeof verifyJwt !== 'function') return deny('jwt_verifier_not_configured');

    let ref;
    try {
      ref = refFromEvent(event);
    } catch {
      return deny('invalid_authorizer_request');
    }

    if (missingRef(ref.domain, ref.authProfileId)) {
      return deny('missing_auth_profile_ref');
    }

    let profile;
    try {
      profile = await loadProfile(loadRegistry, ref.domain, ref.authProfileId);
    } catch {
      return deny('auth_registry_unavailable');
    }

    if (!profile) return deny('auth_profile_not_found');

    let claims;
    try {
      claims = await verifyJwt(token, buildJwtVerificationConfig(profile));
    } catch {
      return deny('jwt_verification_failed');
    }

    const policy = authPolicyFromJwtClaims(profile, claims);
    if (!policy.authorized) {
      return deny(policy.reason, {
        subject: policy.subject,
        groups: policy.groups.join(','),
        domain: profile.domain,
        tenantId: profile.tenantId,
        authProfileId: profile.authProfileId,
      });
    }

    return allow(profile, policy);
  }

  async function handler(event) {
    const method = methodOf(event);
    const path = pathOf(event);

    if (path === RUNTIME_AUTH_PATH && (method === 'GET' || method === 'POST')) {
      return runtimeAuthHandler(event);
    }
    if (path === PROVISIONING_PLAN_PATH && method === 'POST') {
      return provisioningPlanHandler(event);
    }
    if (path === PROVISIONING_PLAN_PATH || path === RUNTIME_AUTH_PATH) {
      return jsonResponse(405, { error: 'Method not allowed.' });
    }

    return jsonResponse(404, { error: 'Auth service route not found.' });
  }

  return {
    handler,
    jwtAuthorizerHandler,
    provisioningPlanHandler,
    runtimeAuthHandler,
  };
}
