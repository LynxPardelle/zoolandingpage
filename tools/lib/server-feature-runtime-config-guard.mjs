const MAX_ISSUES = 64;
const NEW_RUNTIME_KINDS = new Set(['data-space', 'commerce', 'integrations']);
const SAFE_SERVER_FEATURE_ID = /^[a-z0-9][a-z0-9._-]{0,63}$/;

const DATA_SPACE_READS = new Set(['collectionList', 'collectionSchema', 'recordList', 'recordDetail']);
const DATA_SPACE_PUBLIC_READS = new Set(['recordList', 'recordDetail']);
const DATA_SPACE_ACTIONS = new Set([
  'createCollection', 'updateCollection', 'createRecord', 'updateRecord', 'publishRecord', 'unpublishRecord',
]);
const COMMERCE_READS = new Set(['itemList', 'itemDetail', 'offerList', 'offerDetail', 'discountList', 'discountDetail']);
const COMMERCE_PUBLIC_READS = new Set(['offerList', 'offerDetail']);
const COMMERCE_ACTIONS = new Set([
  'createItem', 'createOfferVersion', 'createDiscountVersion', 'advanceOfferLifecycle',
  'updateOfferPresentation', 'advanceDiscountLifecycle', 'updateDiscountPresentation', 'adjustStock',
  'changePlan', 'applyDiscount', 'removeDiscount', 'pause', 'resume', 'openPortal',
  'migrationPreview', 'migrationExecute', 'migrationPause', 'migrationResume', 'migrationCancel',
  'migrationStatus', 'admitCheckout',
]);
const INTEGRATION_READS = new Set(['connectionList']);
const INTEGRATION_ACTIONS = new Set([
  'disable', 'requestReconnect', 'stripeOnboardingStart', 'stripeOnboardingReturn', 'stripeOnboardingDeauthorize',
]);
const USER_GESTURE_ACTIONS = new Set([
  'openPortal', 'admitCheckout', 'stripeOnboardingStart', 'stripeOnboardingDeauthorize',
]);

const contract = (required, allowed = required) => Object.freeze({ required, allowed });
const DATA_SPACE_READ_INPUTS = Object.freeze({
  collectionList: contract([], ['limit', 'cursor']),
  collectionSchema: contract(['collectionId']),
  recordList: contract(['collectionId'], ['collectionId', 'limit', 'cursor']),
  recordDetail: contract(['collectionId', 'recordId']),
});
const COMMERCE_READ_INPUTS = Object.freeze({
  itemList: contract([], ['limit', 'cursor']),
  itemDetail: contract(['resourceId']),
  offerList: contract([], ['limit', 'cursor']),
  offerDetail: contract(['resourceId']),
  discountList: contract([], ['limit', 'cursor']),
  discountDetail: contract(['resourceId']),
});
const ACTION_INPUTS = Object.freeze({
  createCollection: contract(['collectionId', 'schema']),
  updateCollection: contract(['collectionId', 'schema', 'expectedRevision']),
  createRecord: contract(['collectionId', 'recordId', 'data']),
  updateRecord: contract(['collectionId', 'recordId', 'data', 'expectedRevision']),
  publishRecord: contract(['collectionId', 'recordId', 'expectedRevision']),
  unpublishRecord: contract(['collectionId', 'recordId', 'expectedRevision']),
  createItem: contract(
    ['itemId', 'sellableType'],
    ['itemId', 'sellableType', 'variants', 'dataSpaceReference'],
  ),
  createOfferVersion: contract(
    ['versionId', 'catalogItemId', 'revision', 'sellableType', 'unitPrice', 'taxBehavior'],
    [
      'versionId', 'catalogItemId', 'revision', 'sellableType', 'unitPrice', 'taxBehavior',
      'variantId', 'recurrence', 'displayName', 'displayDescription',
    ],
  ),
  createDiscountVersion: contract(
    ['versionId', 'revision', 'duration'],
    [
      'versionId', 'revision', 'duration', 'percentageBasisPoints', 'fixedAmount',
      'durationInMonths', 'eligibleOfferVersionIds', 'redemptionLimit', 'redeemByEpoch',
      'customerFacingCode', 'displayName', 'displayDescription',
    ],
  ),
  advanceOfferLifecycle: contract(['versionId', 'targetState', 'expectedRevision']),
  updateOfferPresentation: contract(
    ['versionId', 'expectedRevision'],
    ['versionId', 'expectedRevision', 'displayName', 'displayDescription'],
  ),
  advanceDiscountLifecycle: contract(['versionId', 'targetState', 'expectedRevision']),
  updateDiscountPresentation: contract(
    ['versionId', 'expectedRevision'],
    ['versionId', 'expectedRevision', 'displayName', 'displayDescription'],
  ),
  adjustStock: contract(['stockId', 'delta', 'expectedRevision']),
  changePlan: contract(['subscriptionId', 'targetOfferVersionId', 'expectedRevision']),
  applyDiscount: contract(['subscriptionId', 'discountVersionId', 'expectedRevision']),
  removeDiscount: contract(['subscriptionId', 'expectedRevision']),
  pause: contract(['subscriptionId', 'expectedRevision']),
  resume: contract(['subscriptionId', 'expectedRevision']),
  openPortal: contract(['subscriptionId']),
  migrationPreview: contract(['sourceOfferVersionId', 'targetOfferVersionId']),
  migrationExecute: contract(['commercialRequestId', 'dryRunRevision', 'dryRunHash', 'confirmation']),
  migrationPause: contract(['commercialRequestId', 'expectedRevision']),
  migrationResume: contract(['commercialRequestId', 'expectedRevision']),
  migrationCancel: contract(['commercialRequestId', 'expectedRevision']),
  migrationStatus: contract(['commercialRequestId'], ['commercialRequestId', 'limit', 'cursor']),
  admitCheckout: contract(['lines'], ['lines', 'discountVersionId']),
  disable: contract(['connectionId', 'expectedRevision']),
  requestReconnect: contract(['connectionId', 'expectedRevision']),
  stripeOnboardingStart: contract([]),
  stripeOnboardingReturn: contract([]),
  stripeOnboardingDeauthorize: contract([]),
});

const BINDING_KEYS = ['authAdminSource', 'contentHub', 'comboCatalog', 'dataSpace', 'commerce', 'integrations'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOnlyKeys(value, allowed) {
  return isRecord(value) && Object.keys(value).every(key => allowed.has(key));
}

function addIssue(issues, code, path) {
  if (issues.length < MAX_ISSUES) issues.push({ code, path });
}

function packageFiles(draftPackage) {
  return Array.isArray(draftPackage?.files) ? draftPackage.files : [];
}

function siteConfigFromPackage(draftPackage) {
  return packageFiles(draftPackage)
    .find(file => file?.kind === 'site-config' || String(file?.path ?? '').endsWith('/site-config.json'))
    ?.content;
}

function guardIsEnabled(siteConfig) {
  const runtime = isRecord(siteConfig?.runtime) ? siteConfig.runtime : {};
  const dataSources = Array.isArray(runtime.dataSources) ? runtime.dataSources : [];
  const apiActions = Array.isArray(runtime.apiActions) ? runtime.apiActions : [];
  return dataSources.some(source => isRecord(source) && NEW_RUNTIME_KINDS.has(String(source.kind ?? '')))
    || apiActions.some(action => isRecord(action)
      && (NEW_RUNTIME_KINDS.has(String(action.kind ?? '')) || action.trigger === 'route-load'));
}

function expectedBindingKey(kind) {
  return kind === 'data-space' ? 'dataSpace' : kind;
}

function exactBinding(value, kind) {
  const expected = expectedBindingKey(kind);
  const present = BINDING_KEYS.filter(key => value[key] !== undefined);
  return present.length === 1 && present[0] === expected && isRecord(value[expected])
    ? value[expected]
    : null;
}

function validInputKeys(value, inputContract) {
  if (!inputContract) return false;
  if (value !== undefined && !isRecord(value)) return false;
  const keys = isRecord(value) ? Object.keys(value) : [];
  return inputContract.required.every(key => keys.includes(key))
    && keys.every(key => inputContract.allowed.includes(key));
}

function validActionFields(value, inputContract) {
  if (!inputContract) return false;
  if (value !== undefined && !Array.isArray(value)) return false;
  const fields = Array.isArray(value) ? value : [];
  if (!fields.every(field => typeof field === 'string' && field.trim().length > 0)) return false;
  if (new Set(fields).size !== fields.length) return false;
  return inputContract.required.every(key => fields.includes(key))
    && fields.every(key => inputContract.allowed.includes(key));
}

function validateReadBinding(kind, binding) {
  if (kind === 'data-space') {
    const allowed = new Set(['read', 'action', 'spaceId', 'access']);
    if (!hasOnlyKeys(binding, allowed)
      || !DATA_SPACE_READS.has(String(binding.read ?? ''))
      || binding.action !== undefined
      || !SAFE_SERVER_FEATURE_ID.test(String(binding.spaceId ?? ''))
      || (binding.access !== undefined && !['protected', 'public'].includes(String(binding.access)))) return null;
    if (binding.access === 'public' && !DATA_SPACE_PUBLIC_READS.has(binding.read)) return null;
    return { operation: binding.read, access: binding.access ?? 'protected' };
  }

  if (kind === 'commerce') {
    const allowed = new Set(['read', 'action', 'access']);
    if (!hasOnlyKeys(binding, allowed)
      || !COMMERCE_READS.has(String(binding.read ?? ''))
      || binding.action !== undefined
      || (binding.access !== undefined && !['protected', 'public'].includes(String(binding.access)))) return null;
    if (binding.access === 'public' && !COMMERCE_PUBLIC_READS.has(binding.read)) return null;
    return { operation: binding.read, access: binding.access ?? 'protected' };
  }

  const allowed = new Set(['read', 'action', 'bindingId']);
  if (!hasOnlyKeys(binding, allowed)
    || !INTEGRATION_READS.has(String(binding.read ?? ''))
    || binding.action !== undefined
    || binding.bindingId !== undefined) return null;
  return { operation: binding.read, access: 'protected' };
}

function validateActionBinding(kind, binding) {
  if (kind === 'data-space') {
    const allowed = new Set(['read', 'action', 'spaceId', 'access']);
    if (!hasOnlyKeys(binding, allowed)
      || !DATA_SPACE_ACTIONS.has(String(binding.action ?? ''))
      || binding.read !== undefined
      || binding.access !== undefined
      || !SAFE_SERVER_FEATURE_ID.test(String(binding.spaceId ?? ''))) return null;
    return { operation: binding.action };
  }

  if (kind === 'commerce') {
    const allowed = new Set(['read', 'action', 'access']);
    if (!hasOnlyKeys(binding, allowed)
      || !COMMERCE_ACTIONS.has(String(binding.action ?? ''))
      || binding.read !== undefined
      || binding.access !== undefined) return null;
    return { operation: binding.action };
  }

  const allowed = new Set(['read', 'action', 'bindingId']);
  const operation = String(binding.action ?? '');
  if (!hasOnlyKeys(binding, allowed)
    || !INTEGRATION_ACTIONS.has(operation)
    || binding.read !== undefined) return null;
  const onboarding = operation.startsWith('stripeOnboarding');
  if (onboarding !== SAFE_SERVER_FEATURE_ID.test(String(binding.bindingId ?? ''))) return null;
  if (!onboarding && binding.bindingId !== undefined) return null;
  return { operation };
}

function readInputContract(kind, bindingResult) {
  if (kind === 'data-space') return DATA_SPACE_READ_INPUTS[bindingResult.operation];
  if (kind === 'integrations') return contract([]);
  if (bindingResult.operation === 'offerDetail' && bindingResult.access === 'public') {
    return contract(['offerVersionId']);
  }
  return COMMERCE_READ_INPUTS[bindingResult.operation];
}

function validateDataSource(source, index, issues) {
  const path = `site-config.runtime.dataSources[${index}]`;
  if (!isRecord(source)) {
    addIssue(issues, 'data_source_binding_invalid', path);
    return;
  }
  const kind = String(source.kind ?? '');
  if (!NEW_RUNTIME_KINDS.has(kind)) return;

  if (typeof source.id !== 'string' || source.id.trim().length === 0) {
    addIssue(issues, 'data_source_id_invalid', `${path}.id`);
  }
  if (source.proxySourceId !== undefined) {
    addIssue(issues, 'data_source_proxy_alias_forbidden', `${path}.proxySourceId`);
  }

  const binding = exactBinding(source, kind);
  const bindingResult = binding ? validateReadBinding(kind, binding) : null;
  if (!bindingResult) {
    addIssue(issues, 'data_source_binding_invalid', `${path}.${expectedBindingKey(kind)}`);
    return;
  }

  if (typeof source.target !== 'string' || source.target.trim().length === 0) {
    addIssue(issues, 'data_source_target_invalid', `${path}.target`);
  }
  if (!validInputKeys(source.input, readInputContract(kind, bindingResult))) {
    addIssue(issues, 'data_source_input_contract_invalid', `${path}.input`);
  }
  if (source.ssr !== undefined && typeof source.ssr !== 'boolean') {
    addIssue(issues, 'data_source_ssr_invalid', `${path}.ssr`);
  }
  if (source.ssr === true && (kind === 'integrations' || bindingResult.access !== 'public')) {
    addIssue(issues, 'data_source_ssr_forbidden', `${path}.ssr`);
  }
}

function validatePageIds(value) {
  return Array.isArray(value)
    && value.length > 0
    && new Set(value).size === value.length
    && value.every(pageId => typeof pageId === 'string' && pageId.trim().length > 0);
}

function validateAction(action, index, issues) {
  const path = `site-config.runtime.apiActions[${index}]`;
  if (!isRecord(action)) {
    addIssue(issues, 'action_binding_invalid', path);
    return;
  }
  const kind = String(action.kind ?? '');
  const routeLoad = action.trigger === 'route-load';
  if (!NEW_RUNTIME_KINDS.has(kind)) {
    if (routeLoad) addIssue(issues, 'route_load_action_invalid', path);
    return;
  }

  if (typeof action.id !== 'string' || action.id.trim().length === 0) {
    addIssue(issues, 'runtime_action_id_invalid', `${path}.id`);
  }
  if (action.proxyActionId !== undefined) {
    addIssue(issues, 'action_proxy_alias_forbidden', `${path}.proxyActionId`);
  }
  if (action.method !== undefined && action.method !== 'POST') {
    addIssue(issues, 'action_method_invalid', `${path}.method`);
  }

  const binding = exactBinding(action, kind);
  const bindingResult = binding ? validateActionBinding(kind, binding) : null;
  if (!bindingResult) {
    addIssue(issues, 'action_binding_invalid', `${path}.${expectedBindingKey(kind)}`);
    return;
  }

  const operation = bindingResult.operation;
  if (!validActionFields(action.inputFields, ACTION_INPUTS[operation])
    || (operation === 'createDiscountVersion'
      && Number(action.inputFields?.includes('percentageBasisPoints'))
        + Number(action.inputFields?.includes('fixedAmount')) !== 1)
    || (operation === 'stripeOnboardingReturn' && action.inputFields !== undefined)) {
    addIssue(issues, 'action_input_contract_invalid', `${path}.inputFields`);
  }

  if (action.requiresUserGesture !== undefined && typeof action.requiresUserGesture !== 'boolean') {
    addIssue(issues, 'action_user_gesture_required', `${path}.requiresUserGesture`);
  }
  if (USER_GESTURE_ACTIONS.has(operation) && action.requiresUserGesture !== true) {
    addIssue(issues, 'action_user_gesture_required', `${path}.requiresUserGesture`);
  }
  if (action.pageIds !== undefined && !validatePageIds(action.pageIds)) {
    addIssue(issues, routeLoad ? 'route_load_target_invalid' : 'action_page_ids_invalid', `${path}.pageIds`);
  }
  if (action.trigger !== undefined && action.trigger !== 'route-load') {
    addIssue(issues, 'route_load_action_invalid', `${path}.trigger`);
  }
  if (routeLoad && (
    kind !== 'integrations'
    || operation !== 'stripeOnboardingReturn'
    || action.requiresUserGesture !== undefined
    || action.inputFields !== undefined
    || !validatePageIds(action.pageIds)
    || action.pageIds.length !== 1
  )) {
    addIssue(issues, 'route_load_action_invalid', path);
    if (!validatePageIds(action.pageIds) || action.pageIds?.length !== 1) {
      addIssue(issues, 'route_load_target_invalid', `${path}.pageIds`);
    }
  }
}

function normalizeRoutePath(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '/';
  const withoutHash = raw.split('#')[0] ?? '';
  const withoutQuery = withoutHash.split('?')[0] ?? '';
  let normalized = withoutQuery || '/';
  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    normalized = withoutQuery || '/';
  }
  normalized = normalized.replace(/\\+/g, '/');
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  normalized = normalized.replace(/\/+/g, '/');
  if (normalized.length > 1) normalized = normalized.replace(/\/+$/g, '');
  return normalized || '/';
}

function routeMatchesPath(routePath, requestedPath) {
  const pattern = normalizeRoutePath(routePath);
  const requested = normalizeRoutePath(requestedPath);
  if (pattern === requested) return true;
  if (!pattern.includes('/:')) return false;
  const patternSegments = pattern.split('/').filter(Boolean);
  const requestedSegments = requested.split('/').filter(Boolean);
  return patternSegments.length === requestedSegments.length
    && patternSegments.every((segment, index) => segment.startsWith(':')
      ? segment.slice(1).trim().length > 0 && requestedSegments[index]?.length > 0
      : segment === requestedSegments[index]);
}

function urlPath(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    return new URL(value).pathname;
  } catch {
    return value.startsWith('/') ? value : '';
  }
}

function authRegistryFromPackage(draftPackage) {
  return packageFiles(draftPackage)
    .find(file => file?.kind === 'server-auth-profile-registry'
      || String(file?.path ?? '').endsWith('/server/auth-profile-registry.json'))
    ?.content;
}

function resolveAuthCallbacks(draftPackage, siteConfig) {
  const runtime = isRecord(siteConfig.runtime) ? siteConfig.runtime : {};
  const pageIds = new Set();
  const paths = new Set();

  if (isRecord(runtime.auth)) {
    if (typeof runtime.auth.callbackPageId === 'string' && runtime.auth.callbackPageId.trim()) {
      pageIds.add(runtime.auth.callbackPageId);
    }
    const path = urlPath(runtime.auth.redirectPath);
    if (path) paths.add(path);
  }

  let remoteUnresolved = false;
  if (isRecord(runtime.authRemote)) {
    const profileId = String(runtime.authRemote.authProfileId ?? '').trim();
    const registry = authRegistryFromPackage(draftPackage);
    const profiles = Array.isArray(registry?.profiles)
      ? registry.profiles.filter(profile => isRecord(profile)
        && String(profile.authProfileId ?? '').trim() === profileId
        && (!profile.domain || profile.domain === siteConfig.domain))
      : [];
    if (!profileId || profiles.length !== 1) {
      remoteUnresolved = true;
    } else {
      const profile = profiles[0];
      if (typeof profile.callbackPageId === 'string' && profile.callbackPageId.trim()) {
        pageIds.add(profile.callbackPageId);
      }
      const redirectPath = urlPath(profile.redirectPath);
      if (redirectPath) paths.add(redirectPath);
      const callbackUrls = Array.isArray(profile.callbackUrls) ? profile.callbackUrls : [];
      for (const callbackUrl of callbackUrls) {
        const path = urlPath(callbackUrl);
        if (path) paths.add(path);
      }
      if (!redirectPath && callbackUrls.length === 0) remoteUnresolved = true;
    }
  }

  return { pageIds, paths, remoteUnresolved };
}

function validateRouteLoadTargets(draftPackage, siteConfig, actions, issues) {
  const routeLoadActions = actions.filter(action => isRecord(action) && action.trigger === 'route-load');
  if (routeLoadActions.length === 0) return;

  const targetPageIds = routeLoadActions.flatMap(action => Array.isArray(action.pageIds) ? action.pageIds : []);
  if (new Set(targetPageIds).size !== targetPageIds.length) {
    addIssue(issues, 'route_load_target_not_unique', 'site-config.runtime.apiActions');
  }

  const routes = Array.isArray(siteConfig.routes) ? siteConfig.routes.filter(isRecord) : [];
  const authCallbacks = resolveAuthCallbacks(draftPackage, siteConfig);
  if (authCallbacks.remoteUnresolved) {
    addIssue(issues, 'route_load_auth_profile_unresolved', 'site-config.runtime.authRemote');
  }

  routeLoadActions.forEach((action, index) => {
    if (!validatePageIds(action.pageIds) || action.pageIds.length !== 1) return;
    const pageId = action.pageIds[0];
    const matchingRoutes = routes.filter(route => route.pageId === pageId);
    const path = `site-config.runtime.apiActions.routeLoad[${index}]`;
    if (matchingRoutes.length !== 1) {
      addIssue(issues, 'route_load_target_not_unique', path);
      return;
    }
    const route = matchingRoutes[0];
    if (!isRecord(route.auth) || route.auth.required !== true) {
      addIssue(issues, 'route_load_target_unprotected', path);
    }
    if (authCallbacks.pageIds.has(pageId)
      || [...authCallbacks.paths].some(callbackPath => routeMatchesPath(route.path, callbackPath))) {
      addIssue(issues, 'route_load_auth_callback_collision', path);
    }
  });
}

export function validateServerFeatureRuntimeConfig(draftPackage) {
  const siteConfig = siteConfigFromPackage(draftPackage);
  if (!isRecord(siteConfig) || !guardIsEnabled(siteConfig)) {
    return { ok: true, issues: [] };
  }

  const issues = [];
  const runtime = isRecord(siteConfig.runtime) ? siteConfig.runtime : {};
  const dataSources = Array.isArray(runtime.dataSources) ? runtime.dataSources : [];
  const actions = Array.isArray(runtime.apiActions) ? runtime.apiActions : [];

  dataSources.forEach((source, index) => validateDataSource(source, index, issues));
  actions.forEach((action, index) => validateAction(action, index, issues));

  const actionIds = actions.map(action => isRecord(action) && typeof action.id === 'string' ? action.id.trim() : '');
  const seenActionIds = new Set();
  for (const actionId of actionIds) {
    if (!actionId) continue;
    if (seenActionIds.has(actionId)) {
      addIssue(issues, 'runtime_action_id_duplicate', 'site-config.runtime.apiActions');
      break;
    }
    seenActionIds.add(actionId);
  }

  validateRouteLoadTargets(draftPackage, siteConfig, actions, issues);
  return { ok: issues.length === 0, issues };
}

export function assertValidServerFeatureRuntimeConfig(draftPackage) {
  const result = validateServerFeatureRuntimeConfig(draftPackage);
  if (!result.ok) {
    throw new Error(`server_feature_runtime_config_failed:${result.issues.length}`);
  }
  return result;
}
