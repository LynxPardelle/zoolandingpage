#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { resolveAuthProfile, validateAuthProfileRegistry } from './auth-profile-registry.mjs';
import {
  readDraftPackageForValidation,
  validateRuntimeDataSourceConditionReferences,
} from './runtime-data-source-condition-guard.mjs';

const DEFAULT_DOMAIN = 'zoositioweb.com.mx';
const DEFAULT_AUTH_PROFILE_ID = 'staff';
const DEFAULT_CLIENT_GROUP = 'zoosite-client';
const DEFAULT_ADMIN_GROUP = 'zoosite-admin';
const DEFAULT_LOGIN_PATH = '/acceso';
const DEFAULT_ACCOUNT_PATH = '/mi-cuenta';
const DEFAULT_ADMIN_PATH = '/admin/usuarios';

const LOCAL_ONLY_FOLDERS = new Set([
  '.git',
  '.github',
  'ai_notes',
  'findings',
  'errors-reports',
  'CVs_N_photos',
  'node_modules',
  'Output',
  'reports',
  'logs',
  'devonly',
  'server',
]);

const DEFAULT_PUBLIC_AUTH_ROUTES = Object.freeze([
  Object.freeze({ path: '/acceso', actions: ['authFormAction:signin'] }),
  Object.freeze({ path: '/registro', actions: ['authFormAction:signup'] }),
  Object.freeze({
    path: '/confirmar-cuenta',
    actions: ['authFormAction:confirmSignup', 'authFormAction:resendConfirmation'],
  }),
  Object.freeze({ path: '/recuperar-contrasena', actions: ['authFormAction:forgotPassword'] }),
  Object.freeze({ path: '/cambiar-contrasena', actions: ['authFormAction:confirmForgotPassword'] }),
  Object.freeze({ path: '/verificar-acceso', actions: ['authFormAction:respondMfaChallenge'] }),
  Object.freeze({
    path: '/configurar-mfa',
    actions: ['authFormAction:startMfaSetup', 'authFormAction:verifyMfaSetup'],
    requiresQrCode: true,
  }),
  Object.freeze({ path: '/auth/callback', actions: ['authAction:login'] }),
]);

const PUBLIC_AUTH_SECRET_KEYS = new Set([
  'accessToken',
  'access_token',
  'apiKey',
  'api_key',
  'authorization',
  'clientSecret',
  'client_secret',
  'credentialRef',
  'credential_ref',
  'idToken',
  'id_token',
  'refreshToken',
  'refresh_token',
  'secretRef',
  'secret_ref',
  'signedUrl',
  'signed_url',
  'socialIdpSecretRefs',
  'upstreamCredential',
  'upstream_credential',
]);

const PUBLIC_SECRET_VALUE_PATTERNS = Object.freeze([
  { name: 'pem-private-key', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/i },
  { name: 'jwt-like-token', pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'aws-access-key', pattern: /\bA(?:KIA|SIA)[A-Z0-9]{16}\b/ },
  { name: 'raw-otpauth-uri', pattern: /otpauth:\/\//i },
]);

function parseArgs(rawArgs) {
  const parsed = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
    const previous = parsed[key];
    parsed[key] = previous === undefined ? value : Array.isArray(previous) ? previous.concat(value) : [previous, value];
  }
  return parsed;
}

function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function getBooleanArg(args, key, fallback = false) {
  const raw = String(args[key] ?? (fallback ? 'true' : 'false')).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function normalizeRoutePath(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '/') return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isSameOriginPath(value) {
  return typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && !/[\s\u0000-\u001F\u007F]/.test(value);
}

function hasNoindexRobots(pageConfig) {
  const robots = pageConfig?.seo?.robots;
  if (typeof robots === 'string') return /\bnoindex\b/i.test(robots);
  if (isObject(robots)) {
    return Object.values(robots).some(value => typeof value === 'string' && /\bnoindex\b/i.test(value));
  }
  return false;
}

function issue(code, message, details = {}) {
  return {
    code,
    message,
    ...details,
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readOptionalJson(filePath) {
  if (!existsSync(filePath)) return null;
  return readJson(filePath);
}

function routesByPath(siteConfig) {
  const routes = Array.isArray(siteConfig?.routes) ? siteConfig.routes : [];
  return new Map(routes.map(route => [normalizeRoutePath(route?.path), route]));
}

function sitemapExcludeSet(siteConfig) {
  return new Set((siteConfig?.sitemap?.excludePaths ?? []).map(normalizeRoutePath));
}

function jsonIncludes(payload, text) {
  return JSON.stringify(payload).includes(text);
}

function findComponentsByType(payload, type) {
  const matches = [];
  walkJson(payload, (value) => {
    if (isObject(value) && value.type === type) matches.push(value);
  });
  return matches;
}

function walkJson(value, visitor, pointer = '$') {
  visitor(value, pointer);
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkJson(entry, visitor, `${pointer}[${index}]`));
    return;
  }
  if (!isObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    walkJson(entry, visitor, `${pointer}.${key}`);
  }
}

function collectMapperFieldKeys(dataSource) {
  return new Set(Object.keys(dataSource?.mapper?.fields ?? {}));
}

function fieldMappingContainsAction(fieldMapping, actionName) {
  if (typeof fieldMapping === 'string') return fieldMapping.includes(`authAdminAction:${actionName}`);
  if (!isObject(fieldMapping)) return false;
  return Object.values(fieldMapping).some(value => typeof value === 'string' && value.includes(`authAdminAction:${actionName}`));
}

function dataSourceFor(siteConfig, source) {
  return (siteConfig?.runtime?.dataSources ?? []).find(dataSource =>
    dataSource?.kind === 'auth-admin' && dataSource?.authAdminSource === source
  );
}

function validatePublicRuntimeAuth(siteConfig, authProfileId, issues) {
  const runtime = siteConfig?.runtime ?? {};
  const hasStaticAuth = runtime.auth !== undefined;
  const hasAuthRemote = runtime.authRemote !== undefined;

  if (hasStaticAuth && hasAuthRemote) {
    issues.push(issue('runtime-auth-mode', 'runtime.auth and runtime.authRemote must not both be present.'));
  }
  if (!hasStaticAuth && !hasAuthRemote) {
    issues.push(issue('runtime-auth-mode', 'Auth draft requires runtime.authRemote or runtime.auth.'));
    return { runtimeMode: 'missing' };
  }

  if (hasAuthRemote) {
    const remote = runtime.authRemote;
    if (!isObject(remote)) {
      issues.push(issue('runtime-auth-remote', 'runtime.authRemote must be an object.'));
      return { runtimeMode: 'authRemote' };
    }
    for (const key of Object.keys(remote)) {
      if (PUBLIC_AUTH_SECRET_KEYS.has(key)) {
        issues.push(issue('public-auth-secret', `runtime.authRemote.${key} must not be shipped in public draft config.`, {
          path: 'runtime.authRemote',
          key,
        }));
      }
    }
    if (remote.enabled !== true) {
      issues.push(issue('runtime-auth-remote', 'runtime.authRemote.enabled must be true for an active auth draft.'));
    }
    if (remote.authProfileId !== authProfileId) {
      issues.push(issue('runtime-auth-remote', `runtime.authRemote.authProfileId must be '${authProfileId}'.`, {
        actual: remote.authProfileId,
      }));
    }
    if (!isSameOriginPath(remote.endpoint)) {
      issues.push(issue('runtime-auth-remote', 'runtime.authRemote.endpoint must be a same-origin path.'));
    }
    return { runtimeMode: 'authRemote' };
  }

  const auth = runtime.auth;
  if (!isObject(auth)) {
    issues.push(issue('runtime-auth-static', 'runtime.auth must be an object.'));
    return { runtimeMode: 'auth' };
  }
  for (const key of Object.keys(auth)) {
    if (PUBLIC_AUTH_SECRET_KEYS.has(key)) {
      issues.push(issue('public-auth-secret', `runtime.auth.${key} must not be shipped in public draft config.`, {
        path: 'runtime.auth',
        key,
      }));
    }
  }
  if (auth.authProfileId !== authProfileId) {
    issues.push(issue('runtime-auth-static', `runtime.auth.authProfileId must be '${authProfileId}'.`, {
      actual: auth.authProfileId,
    }));
  }
  return { runtimeMode: 'auth' };
}

function validateRoutePage({
  draftRoot,
  domain,
  route,
  routePath,
  pageConfig,
  components,
  sitemapExcludes,
  expectedActions = [],
  requiresQrCode = false,
  routeKind,
  issues,
}) {
  if (!route) {
    issues.push(issue('route-missing', `Missing auth route '${routePath}'.`, { routePath, routeKind }));
    return;
  }
  if (!route.pageId || typeof route.pageId !== 'string') {
    issues.push(issue('route-page', `Auth route '${routePath}' must define pageId.`, { routePath }));
    return;
  }

  const pageId = route.pageId;
  const pageConfigPath = path.join(draftRoot, pageId, 'page-config.json');
  const componentsPath = path.join(draftRoot, pageId, 'components.json');

  if (!pageConfig) {
    issues.push(issue('route-page-config', `Missing page config for auth route '${routePath}'.`, {
      routePath,
      pageId,
      filePath: pageConfigPath,
    }));
  } else {
    if (pageConfig.domain !== domain) {
      issues.push(issue('route-page-config', `Page config for '${routePath}' must use domain '${domain}'.`, {
        routePath,
        pageId,
        filePath: pageConfigPath,
        actual: pageConfig.domain,
      }));
    }
    if (pageConfig.pageId !== pageId) {
      issues.push(issue('route-page-config', `Page config for '${routePath}' must use pageId '${pageId}'.`, {
        routePath,
        pageId,
        filePath: pageConfigPath,
        actual: pageConfig.pageId,
      }));
    }
    if (!hasNoindexRobots(pageConfig)) {
      issues.push(issue('route-robots', `Auth route '${routePath}' must render noindex robots metadata.`, {
        routePath,
        pageId,
        filePath: pageConfigPath,
      }));
    }
  }

  if (!sitemapExcludes.has(routePath)) {
    issues.push(issue('route-sitemap', `Auth route '${routePath}' must be excluded from sitemap.`, {
      routePath,
      pageId,
    }));
  }

  if (!components) {
    issues.push(issue('route-components', `Missing components for auth route '${routePath}'.`, {
      routePath,
      pageId,
      filePath: componentsPath,
    }));
    return;
  }

  for (const action of expectedActions) {
    if (!jsonIncludes(components, action)) {
      issues.push(issue('route-action', `Auth route '${routePath}' is missing '${action}'.`, {
        routePath,
        pageId,
        action,
        filePath: componentsPath,
      }));
    }
  }

  if (requiresQrCode && findComponentsByType(components, 'qr-code').length === 0) {
    issues.push(issue('route-component-type', `Auth route '${routePath}' must include a qr-code component.`, {
      routePath,
      pageId,
      filePath: componentsPath,
    }));
  }
}

async function loadPageFiles(draftRoot, pageId) {
  return {
    pageConfig: await readOptionalJson(path.join(draftRoot, pageId, 'page-config.json')),
    components: await readOptionalJson(path.join(draftRoot, pageId, 'components.json')),
  };
}

async function validateAuthRoutes({ draftRoot, domain, siteConfig, routes, sitemapExcludes, expectedAuthRoutes, issues }) {
  for (const expectedRoute of expectedAuthRoutes) {
    const routePath = normalizeRoutePath(expectedRoute.path);
    const route = routes.get(routePath);
    const pageFiles = route?.pageId ? await loadPageFiles(draftRoot, route.pageId) : {};
    validateRoutePage({
      draftRoot,
      domain,
      route,
      routePath,
      pageConfig: pageFiles.pageConfig,
      components: pageFiles.components,
      sitemapExcludes,
      expectedActions: expectedRoute.actions ?? [],
      requiresQrCode: expectedRoute.requiresQrCode === true,
      routeKind: 'public-auth',
      issues,
    });
    if (route?.auth?.required === true) {
      issues.push(issue('public-auth-route', `Public auth route '${routePath}' must not require route auth.`, {
        routePath,
        pageId: route.pageId,
      }));
    }
  }
}

async function validateProtectedRoutes({
  draftRoot,
  domain,
  routes,
  sitemapExcludes,
  accountPath,
  adminPath,
  loginPath,
  clientGroup,
  adminGroup,
  issues,
}) {
  const accountRoute = routes.get(accountPath);
  const accountFiles = accountRoute?.pageId ? await loadPageFiles(draftRoot, accountRoute.pageId) : {};
  validateRoutePage({
    draftRoot,
    domain,
    route: accountRoute,
    routePath: accountPath,
    pageConfig: accountFiles.pageConfig,
    components: accountFiles.components,
    sitemapExcludes,
    routeKind: 'account',
    issues,
  });

  if (accountRoute) {
    if (accountRoute.auth?.required !== true) {
      issues.push(issue('account-route-auth', `Account route '${accountPath}' must require auth.`, { routePath: accountPath }));
    }
    if (accountRoute.auth?.redirectTo !== loginPath) {
      issues.push(issue('account-route-auth', `Account route '${accountPath}' must redirect to '${loginPath}'.`, {
        routePath: accountPath,
        actual: accountRoute.auth?.redirectTo,
      }));
    }
    const groups = accountRoute.auth?.allowedGroups ?? [];
    for (const group of [clientGroup, adminGroup]) {
      if (!groups.includes(group)) {
        issues.push(issue('account-route-groups', `Account route '${accountPath}' must allow '${group}'.`, {
          routePath: accountPath,
          group,
        }));
      }
    }
  }

  if (accountFiles.components) {
    for (const requiredText of [
      'remoteStatus.authAccount.state,loading',
      'remoteStatus.authAccount.state,error',
      'remoteStatus.authAccount.state,success',
      'remote.auth.account.items.0.mfaStatus',
      'remote.auth.account.items.0.mfaSoftwareTokenEnabled',
      'authFormAction:startMfaEnrollment',
      'authFormAction:verifyMfaEnrollment',
      'authFormAction:disableMfa',
      'authFormAction:logout',
    ]) {
      if (!jsonIncludes(accountFiles.components, requiredText)) {
        issues.push(issue('account-state-ui', `Account route '${accountPath}' is missing '${requiredText}'.`, {
          routePath: accountPath,
          pageId: accountRoute?.pageId,
        }));
      }
    }
    if (!jsonIncludes(accountFiles.components, 'authForm.startMfaEnrollment.data.setup.otpauthUri')) {
      issues.push(issue('account-mfa-ui', `Account route '${accountPath}' must bind voluntary MFA setup to sanitized otpauthUri data.`, {
        routePath: accountPath,
        pageId: accountRoute?.pageId,
      }));
    }
  }

  const adminRoute = routes.get(adminPath);
  const adminFiles = adminRoute?.pageId ? await loadPageFiles(draftRoot, adminRoute.pageId) : {};
  validateRoutePage({
    draftRoot,
    domain,
    route: adminRoute,
    routePath: adminPath,
    pageConfig: adminFiles.pageConfig,
    components: adminFiles.components,
    sitemapExcludes,
    routeKind: 'admin',
    issues,
  });

  if (adminRoute) {
    if (adminRoute.auth?.required !== true) {
      issues.push(issue('admin-route-auth', `Admin route '${adminPath}' must require auth.`, { routePath: adminPath }));
    }
    if (adminRoute.auth?.redirectTo !== loginPath) {
      issues.push(issue('admin-route-auth', `Admin route '${adminPath}' must redirect to '${loginPath}'.`, {
        routePath: adminPath,
        actual: adminRoute.auth?.redirectTo,
      }));
    }
    const groups = adminRoute.auth?.allowedGroups ?? [];
    if (groups.length !== 1 || groups[0] !== adminGroup) {
      issues.push(issue('admin-route-groups', `Admin route '${adminPath}' must allow only '${adminGroup}'.`, {
        routePath: adminPath,
        actual: groups,
      }));
    }
  }

  if (adminFiles.components) {
    for (const requiredText of [
      'remoteStatus.adminUsers.state,loading',
      'remoteStatus.adminUsers.state,error',
      'remoteStatus.adminUsers.state,empty',
      'remoteStatus.adminUsers.state,success',
      'remoteStatus.adminUsersAction.state,loading',
      'remote.auth.adminUsers.items',
      'authFormAction:logout',
    ]) {
      if (!jsonIncludes(adminFiles.components, requiredText)) {
        issues.push(issue('admin-state-ui', `Admin route '${adminPath}' is missing '${requiredText}'.`, {
          routePath: adminPath,
          pageId: adminRoute?.pageId,
        }));
      }
    }
  }
}

function validateDataSources(siteConfig, accountPageId, adminPageId, clientGroup, adminGroup, issues) {
  const accountSource = dataSourceFor(siteConfig, 'account');
  if (!accountSource) {
    issues.push(issue('data-source-account', 'Missing auth-admin account data source.'));
  } else {
    if (!accountSource.pageIds?.includes(accountPageId)) {
      issues.push(issue('data-source-account', `Account data source must target pageId '${accountPageId}'.`, {
        actual: accountSource.pageIds,
      }));
    }
    if (accountSource.target !== 'remote.auth.account') {
      issues.push(issue('data-source-account', "Account data source target must be 'remote.auth.account'.", {
        actual: accountSource.target,
      }));
    }
    if (accountSource.statusTarget !== 'remoteStatus.authAccount') {
      issues.push(issue('data-source-account', "Account data source statusTarget must be 'remoteStatus.authAccount'.", {
        actual: accountSource.statusTarget,
      }));
    }
    const fields = collectMapperFieldKeys(accountSource);
    for (const key of ['email', 'approvalStatus', 'isAdminText', 'environment', 'mfaStatus', 'mfaSoftwareTokenEnabled']) {
      if (!fields.has(key)) {
        issues.push(issue('data-source-account', `Account mapper must expose '${key}'.`, {
          dataSourceId: accountSource.id,
          missingKey: key,
        }));
      }
    }
  }

  const adminSource = dataSourceFor(siteConfig, 'adminUsers');
  if (!adminSource) {
    issues.push(issue('data-source-admin', 'Missing auth-admin users data source.'));
  } else {
    if (!adminSource.pageIds?.includes(adminPageId)) {
      issues.push(issue('data-source-admin', `Admin data source must target pageId '${adminPageId}'.`, {
        actual: adminSource.pageIds,
      }));
    }
    if (adminSource.target !== 'remote.auth.adminUsers') {
      issues.push(issue('data-source-admin', "Admin data source target must be 'remote.auth.adminUsers'.", {
        actual: adminSource.target,
      }));
    }
    if (adminSource.statusTarget !== 'remoteStatus.adminUsers') {
      issues.push(issue('data-source-admin', "Admin data source statusTarget must be 'remoteStatus.adminUsers'.", {
        actual: adminSource.statusTarget,
      }));
    }
    const fields = collectMapperFieldKeys(adminSource);
    for (const key of [
      'email',
      'subject',
      'rolesText',
      'statusLabel',
      'enabledLabel',
      'clientApproveInstructions',
      'adminApproveInstructions',
      'suspendInstructions',
      'reactivateInstructions',
      'resetMfaInstructions',
    ]) {
      if (!fields.has(key)) {
        issues.push(issue('data-source-admin', `Admin users mapper must expose '${key}'.`, {
          dataSourceId: adminSource.id,
          missingKey: key,
        }));
      }
    }

    const fieldMappings = adminSource.mapper?.fields ?? {};
    const expectedActions = ['approveUser', 'suspendUser', 'reactivateUser', 'resetUserMfa'];
    for (const actionName of expectedActions) {
      if (!Object.values(fieldMappings).some(fieldMapping => fieldMappingContainsAction(fieldMapping, actionName))) {
        issues.push(issue('data-source-admin-action', `Admin users mapper must expose authAdminAction:${actionName}.`, {
          dataSourceId: adminSource.id,
          actionName,
        }));
      }
    }
    const adminApprove = fieldMappings.adminApproveInstructions;
    if (!JSON.stringify(adminApprove ?? '').includes(`${clientGroup}|${adminGroup}`)) {
      issues.push(issue('data-source-admin-action', `Admin approval mapper must be able to assign '${clientGroup}|${adminGroup}'.`, {
        dataSourceId: adminSource.id,
      }));
    }
  }
}

function validateRegistryContract({ registry, profile, domain, authProfileId, loginPath, accountPath, clientGroup, adminGroup, issues }) {
  if (!registry) {
    issues.push(issue('registry-missing', 'Missing server/auth-profile-registry.json for authRemote draft.'));
    return {};
  }

  const registryValidation = validateAuthProfileRegistry(registry);
  if (!registryValidation.valid) {
    for (const error of registryValidation.errors) {
      issues.push(issue('registry-invalid', error));
    }
  }

  if (!profile) {
    issues.push(issue('registry-profile', `Missing auth profile '${authProfileId}' for domain '${domain}'.`));
    return {};
  }

  if (profile.status !== 'active') {
    issues.push(issue('registry-profile', `Auth profile '${authProfileId}' must be active for browser auth.`, {
      actual: profile.status,
    }));
  }
  if (profile.loginPath !== loginPath) {
    issues.push(issue('registry-profile', `Auth profile loginPath must be '${loginPath}'.`, { actual: profile.loginPath }));
  }
  if (profile.postLoginPath !== accountPath) {
    issues.push(issue('registry-profile', `Auth profile postLoginPath must be '${accountPath}'.`, {
      actual: profile.postLoginPath,
    }));
  }
  for (const group of [clientGroup, adminGroup]) {
    if (!profile.allowedGroups?.includes(group)) {
      issues.push(issue('registry-groups', `Auth profile allowedGroups must include '${group}'.`, { group }));
    }
    if (!profile.manageableGroups?.includes(group)) {
      issues.push(issue('registry-groups', `Auth profile manageableGroups must include '${group}'.`, { group }));
    }
  }
  if (!profile.adminGroups?.includes(adminGroup) || profile.adminGroups?.includes(clientGroup)) {
    issues.push(issue('registry-admin-groups', `Auth profile adminGroups must include only admin-capable group '${adminGroup}'.`, {
      actual: profile.adminGroups ?? [],
    }));
  }
  if (profile.defaultUserStatus !== 'pending') {
    issues.push(issue('registry-user-state', "Auth profile defaultUserStatus must be 'pending'.", {
      actual: profile.defaultUserStatus,
    }));
  }
  if (profile.customAuth?.signin?.enabled !== true) {
    issues.push(issue('registry-custom-auth', 'Custom signin must be enabled.'));
  }
  if (profile.customAuth?.signup?.enabled !== true) {
    issues.push(issue('registry-custom-auth', 'Custom signup must be enabled.'));
  }
  if (!profile.customAuth?.signup?.defaultGroups?.includes(clientGroup)) {
    issues.push(issue('registry-custom-auth', `Custom signup defaultGroups must include '${clientGroup}'.`, {
      actual: profile.customAuth?.signup?.defaultGroups ?? [],
    }));
  }
  if (profile.customAuth?.passwordRecovery?.enabled !== true) {
    issues.push(issue('registry-custom-auth', 'Custom password recovery must be enabled.'));
  }

  const mfaMode = profile.mfa?.mode ?? 'missing';
  if (!['optional', 'required'].includes(mfaMode) || profile.mfa?.totp?.enabled !== true) {
    issues.push(issue('mfa-profile', 'TOTP MFA must be enabled with mode optional or required for this auth contract.', {
      actual: profile.mfa ?? null,
    }));
  }

  const session = profile.session ?? {};
  if (session.mode !== 'server-cookie') {
    issues.push(issue('session-metadata', "Auth profile session.mode must be 'server-cookie'.", { actual: session.mode }));
  }
  for (const key of [
    'signinPath',
    'mePath',
    'logoutPath',
    'challengeRespondPath',
    'mfaSetupPath',
    'mfaVerifyPath',
    'mfaEnrollStartPath',
    'mfaEnrollVerifyPath',
    'mfaDisablePath',
  ]) {
    if (!isSameOriginPath(session[key])) {
      issues.push(issue('session-metadata', `Auth profile session.${key} must be a same-origin path.`, {
        key,
        actual: session[key],
      }));
    }
  }
  for (const key of ['csrfCookieName', 'challengeCsrfCookieName', 'mfaEnrollCsrfCookieName', 'csrfHeaderName']) {
    if (typeof session[key] !== 'string' || !session[key]) {
      issues.push(issue('session-metadata', `Auth profile session.${key} must be present.`, { key }));
    }
  }

  const admin = profile.admin ?? {};
  for (const key of [
    'usersPath',
    'approveUserPathTemplate',
    'groupsPathTemplate',
    'suspendUserPathTemplate',
    'reactivateUserPathTemplate',
    'resetUserMfaPathTemplate',
  ]) {
    if (!isSameOriginPath(admin[key])) {
      issues.push(issue('admin-metadata', `Auth profile admin.${key} must be a same-origin path.`, {
        key,
        actual: admin[key],
      }));
    }
  }

  return {
    sessionMode: session.mode ?? 'missing',
    mfaMode,
  };
}

async function walkPublicJsonFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      if (LOCAL_ONLY_FOLDERS.has(entry.name)) continue;
      files.push(...(await walkPublicJsonFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(absolutePath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function validatePublicPayloadSecrets(draftRoot, issues) {
  const files = await walkPublicJsonFiles(draftRoot);
  for (const filePath of files) {
    const payload = await readJson(filePath);
    walkJson(payload, (value, pointer) => {
      const key = pointer.split('.').pop()?.replace(/\[\d+\]$/, '') ?? '';
      if (PUBLIC_AUTH_SECRET_KEYS.has(key)) {
        issues.push(issue('public-auth-secret', `Public draft payload contains forbidden key '${key}'.`, {
          filePath,
          pointer,
          key,
        }));
      }
      if (typeof value === 'string') {
        for (const pattern of PUBLIC_SECRET_VALUE_PATTERNS) {
          if (pattern.pattern.test(value)) {
            issues.push(issue(pattern.name === 'raw-otpauth-uri' ? 'public-otpauth-uri' : 'public-secret-value', `Public draft payload contains ${pattern.name}.`, {
              filePath,
              pointer,
            }));
          }
        }
      }
    });
  }
}

async function validateRuntimeDataSourceConditions(draftRoot, domain, issues) {
  const draftPackage = await readDraftPackageForValidation({ draftRoot, domain });
  const result = validateRuntimeDataSourceConditionReferences(draftPackage);
  if (result.ok) return;
  for (const conditionIssue of result.issues) {
    issues.push(issue('data-source-condition', conditionIssue.message, {
      filePath: conditionIssue.filePath,
      componentId: conditionIssue.componentId,
      dataSourceId: conditionIssue.dataSourceId,
      variablePath: conditionIssue.variablePath,
      missingKey: conditionIssue.missingKey,
      source: conditionIssue.source,
    }));
  }
}

function buildExpectedAuthRoutes(options) {
  if (!Array.isArray(options.expectedAuthRoutes) || options.expectedAuthRoutes.length === 0) {
    return DEFAULT_PUBLIC_AUTH_ROUTES.map(route => ({ ...route }));
  }

  return options.expectedAuthRoutes.map(route => {
    if (typeof route === 'string') return { path: normalizeRoutePath(route), actions: [] };
    return {
      ...route,
      path: normalizeRoutePath(route.path),
      actions: Array.isArray(route.actions) ? route.actions : [],
    };
  });
}

export async function auditDraftAuthContract(options = {}) {
  const draftRoot = path.resolve(String(options.draftRoot ?? path.join('drafts', DEFAULT_DOMAIN)));
  const domain = String(options.domain ?? DEFAULT_DOMAIN).trim();
  const authProfileId = String(options.authProfileId ?? DEFAULT_AUTH_PROFILE_ID).trim();
  const clientGroup = String(options.clientGroup ?? DEFAULT_CLIENT_GROUP).trim();
  const adminGroup = String(options.adminGroup ?? DEFAULT_ADMIN_GROUP).trim();
  const loginPath = normalizeRoutePath(options.loginPath ?? DEFAULT_LOGIN_PATH);
  const accountPath = normalizeRoutePath(options.accountPath ?? DEFAULT_ACCOUNT_PATH);
  const adminPath = normalizeRoutePath(options.adminPath ?? DEFAULT_ADMIN_PATH);
  const expectedAuthRoutes = buildExpectedAuthRoutes(options);
  const issues = [];

  if (!existsSync(draftRoot)) {
    return {
      ok: false,
      issues: [issue('draft-root-missing', `Draft root does not exist: ${draftRoot}`, { draftRoot })],
      summary: {
        domain,
        authProfileId,
        draftRoot,
        authRouteCount: 0,
        runtimeMode: 'missing',
        sessionMode: 'missing',
        mfaMode: 'missing',
      },
    };
  }

  const siteConfigPath = path.join(draftRoot, 'site-config.json');
  const siteConfig = await readOptionalJson(siteConfigPath);
  if (!siteConfig) {
    return {
      ok: false,
      issues: [issue('site-config-missing', `Missing site-config.json in ${draftRoot}`, { draftRoot })],
      summary: {
        domain,
        authProfileId,
        draftRoot,
        authRouteCount: 0,
        runtimeMode: 'missing',
        sessionMode: 'missing',
        mfaMode: 'missing',
      },
    };
  }

  if (siteConfig.domain !== domain) {
    issues.push(issue('site-domain', `site-config domain must be '${domain}'.`, {
      filePath: siteConfigPath,
      actual: siteConfig.domain,
    }));
  }

  const { runtimeMode } = validatePublicRuntimeAuth(siteConfig, authProfileId, issues);
  const routes = routesByPath(siteConfig);
  const sitemapExcludes = sitemapExcludeSet(siteConfig);

  await validateAuthRoutes({
    draftRoot,
    domain,
    siteConfig,
    routes,
    sitemapExcludes,
    expectedAuthRoutes,
    issues,
  });

  await validateProtectedRoutes({
    draftRoot,
    domain,
    routes,
    sitemapExcludes,
    accountPath,
    adminPath,
    loginPath,
    clientGroup,
    adminGroup,
    issues,
  });

  validateDataSources(
    siteConfig,
    routes.get(accountPath)?.pageId ?? accountPath.slice(1),
    routes.get(adminPath)?.pageId ?? adminPath.slice(1).replace(/\//g, '-'),
    clientGroup,
    adminGroup,
    issues,
  );

  const registryPath = path.join(draftRoot, 'server', 'auth-profile-registry.json');
  const registry = await readOptionalJson(registryPath);
  const profile = registry ? resolveAuthProfile(registry, domain, authProfileId) : null;
  const { sessionMode = 'missing', mfaMode = 'missing' } = validateRegistryContract({
    registry,
    profile,
    domain,
    authProfileId,
    loginPath,
    accountPath,
    clientGroup,
    adminGroup,
    issues,
  });

  await validatePublicPayloadSecrets(draftRoot, issues);
  await validateRuntimeDataSourceConditions(draftRoot, domain, issues);

  return {
    ok: issues.length === 0,
    issues,
    summary: {
      domain,
      authProfileId,
      draftRoot,
      authRouteCount: expectedAuthRoutes.length + 2,
      runtimeMode,
      sessionMode,
      mfaMode,
      clientGroup,
      adminGroup,
      manualBrowserQaRequired: true,
    },
    manualChecks: [
      'Browser credential/session QA still requires controlled users or a manual session.',
      'Check sign-in, MFA challenge/setup, account, admin, and storage/log surfaces before publishing.',
    ],
  };
}

export function formatDraftAuthAuditReport(result) {
  const lines = [];
  lines.push(`Draft auth audit: ${result.ok ? 'OK' : 'FAIL'}`);
  lines.push(`domain: ${result.summary.domain}`);
  lines.push(`authProfileId: ${result.summary.authProfileId}`);
  lines.push(`auth routes: ${result.summary.authRouteCount}`);
  lines.push(`runtime: ${result.summary.runtimeMode}`);
  lines.push(`session: ${result.summary.sessionMode}`);
  lines.push(`mfa: ${result.summary.mfaMode}`);
  if (result.issues.length > 0) {
    lines.push('issues:');
    for (const entry of result.issues) {
      lines.push(`- [${entry.code}] ${entry.message}`);
    }
  }
  lines.push('manual: Browser credential/session QA still required for signin, MFA challenge/setup, account/admin states, and browser storage/log inspection.');
  return lines.join('\n');
}

async function runFromCli(rawArgs = process.argv.slice(2)) {
  const args = parseArgs(rawArgs);
  const authRoutes = toArray(args['auth-route']).map(normalizeRoutePath).filter(Boolean);
  const result = await auditDraftAuthContract({
    draftRoot: String(args['draft-root'] ?? args.draftRoot ?? path.join('drafts', DEFAULT_DOMAIN)),
    domain: String(args.domain ?? DEFAULT_DOMAIN),
    authProfileId: String(args['auth-profile-id'] ?? args.authProfileId ?? DEFAULT_AUTH_PROFILE_ID),
    clientGroup: String(args['client-group'] ?? DEFAULT_CLIENT_GROUP),
    adminGroup: String(args['admin-group'] ?? DEFAULT_ADMIN_GROUP),
    loginPath: String(args['login-path'] ?? DEFAULT_LOGIN_PATH),
    accountPath: String(args['account-path'] ?? DEFAULT_ACCOUNT_PATH),
    adminPath: String(args['admin-path'] ?? DEFAULT_ADMIN_PATH),
    expectedAuthRoutes: authRoutes.length > 0 ? authRoutes : undefined,
  });

  if (getBooleanArg(args, 'json', false)) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatDraftAuthAuditReport(result)}\n`);
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';

if (invokedPath && import.meta.url === invokedPath) {
  runFromCli().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export { DEFAULT_PUBLIC_AUTH_ROUTES, runFromCli };
