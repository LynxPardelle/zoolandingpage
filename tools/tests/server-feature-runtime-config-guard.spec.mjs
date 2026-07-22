import assert from 'node:assert/strict';
import test from 'node:test';

import {
  validateServerFeatureRuntimeConfig,
} from '../lib/server-feature-runtime-config-guard.mjs';
import {
  validateServerFeatureRuntimeConfig as validateTemplateServerFeatureRuntimeConfig,
} from '../templates/draft-repo/tools/lib/server-feature-runtime-config-guard.mjs';

const DOMAIN = 'example.com';

function draftPackage(siteConfig, extraFiles = []) {
  return {
    version: 1,
    domain: DOMAIN,
    stage: 'draft',
    files: [
      {
        path: `${DOMAIN}/site-config.json`,
        kind: 'site-config',
        content: siteConfig,
      },
      ...extraFiles,
    ],
  };
}

function baseSiteConfig(runtime = {}) {
  return {
    version: 1,
    domain: DOMAIN,
    routes: [],
    runtime,
  };
}

function issueCodes(result) {
  return result.issues.map(issue => issue.code);
}

function assertGuardParity(packageValue) {
  const canonical = validateServerFeatureRuntimeConfig(packageValue);
  const template = validateTemplateServerFeatureRuntimeConfig(packageValue);
  assert.deepEqual(template, canonical);
  return canonical;
}

const dataSpaceReads = {
  collectionList: { required: [], allowed: ['limit', 'cursor'] },
  collectionSchema: { required: ['collectionId'], allowed: ['collectionId'] },
  recordList: { required: ['collectionId'], allowed: ['collectionId', 'limit', 'cursor'] },
  recordDetail: { required: ['collectionId', 'recordId'], allowed: ['collectionId', 'recordId'] },
};

const commerceReads = {
  itemList: { required: [], allowed: ['limit', 'cursor'] },
  itemDetail: { required: ['resourceId'], allowed: ['resourceId'] },
  offerList: { required: [], allowed: ['limit', 'cursor'] },
  offerDetail: { required: ['resourceId'], allowed: ['resourceId'] },
  discountList: { required: [], allowed: ['limit', 'cursor'] },
  discountDetail: { required: ['resourceId'], allowed: ['resourceId'] },
};

const actionInputs = {
  createCollection: ['collectionId', 'schema'],
  updateCollection: ['collectionId', 'schema', 'expectedRevision'],
  createRecord: ['collectionId', 'recordId', 'data'],
  updateRecord: ['collectionId', 'recordId', 'data', 'expectedRevision'],
  publishRecord: ['collectionId', 'recordId', 'expectedRevision'],
  unpublishRecord: ['collectionId', 'recordId', 'expectedRevision'],
  createItem: ['itemId', 'sellableType'],
  createOfferVersion: ['versionId', 'catalogItemId', 'revision', 'sellableType', 'unitPrice', 'taxBehavior'],
  createDiscountVersion: ['versionId', 'revision', 'duration', 'percentageBasisPoints'],
  advanceOfferLifecycle: ['versionId', 'targetState', 'expectedRevision'],
  updateOfferPresentation: ['versionId', 'expectedRevision'],
  advanceDiscountLifecycle: ['versionId', 'targetState', 'expectedRevision'],
  updateDiscountPresentation: ['versionId', 'expectedRevision'],
  adjustStock: ['stockId', 'delta', 'expectedRevision'],
  changePlan: ['subscriptionId', 'targetOfferVersionId', 'expectedRevision'],
  applyDiscount: ['subscriptionId', 'discountVersionId', 'expectedRevision'],
  removeDiscount: ['subscriptionId', 'expectedRevision'],
  pause: ['subscriptionId', 'expectedRevision'],
  resume: ['subscriptionId', 'expectedRevision'],
  openPortal: ['subscriptionId'],
  migrationPreview: ['sourceOfferVersionId', 'targetOfferVersionId'],
  migrationExecute: ['commercialRequestId', 'dryRunRevision', 'dryRunHash', 'confirmation'],
  migrationPause: ['commercialRequestId', 'expectedRevision'],
  migrationResume: ['commercialRequestId', 'expectedRevision'],
  migrationCancel: ['commercialRequestId', 'expectedRevision'],
  migrationStatus: ['commercialRequestId'],
  admitCheckout: ['lines'],
  disable: ['connectionId', 'expectedRevision'],
  requestReconnect: ['connectionId', 'expectedRevision'],
  stripeOnboardingStart: [],
  stripeOnboardingReturn: [],
  stripeOnboardingDeauthorize: [],
};

const optionalActionInputs = {
  createItem: ['variants', 'dataSpaceReference'],
  createOfferVersion: ['variantId', 'recurrence', 'displayName', 'displayDescription'],
  createDiscountVersion: [
    'durationInMonths', 'eligibleOfferVersionIds', 'redemptionLimit', 'redeemByEpoch',
    'customerFacingCode', 'displayName', 'displayDescription',
  ],
  updateOfferPresentation: ['displayName', 'displayDescription'],
  updateDiscountPresentation: ['displayName', 'displayDescription'],
  migrationStatus: ['limit', 'cursor'],
  admitCheckout: ['discountVersionId'],
};

const dataSpaceActions = new Set([
  'createCollection', 'updateCollection', 'createRecord', 'updateRecord', 'publishRecord', 'unpublishRecord',
]);
const integrationActions = new Set([
  'disable', 'requestReconnect', 'stripeOnboardingStart', 'stripeOnboardingReturn', 'stripeOnboardingDeauthorize',
]);
const gestureActions = new Set(['openPortal', 'admitCheckout', 'stripeOnboardingStart', 'stripeOnboardingDeauthorize']);

function inputFor(fields) {
  return Object.fromEntries(fields.map(field => [field, 'synthetic']));
}

function actionFor(operation, fields = actionInputs[operation]) {
  const kind = dataSpaceActions.has(operation)
    ? 'data-space'
    : integrationActions.has(operation)
      ? 'integrations'
      : 'commerce';
  const bindingKey = kind === 'data-space' ? 'dataSpace' : kind;
  const onboarding = operation.startsWith('stripeOnboarding');
  return {
    id: `action-${operation.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)}`,
    kind,
    [bindingKey]: {
      action: operation,
      ...(kind === 'data-space' ? { spaceId: 'example-space' } : {}),
      ...(onboarding ? { bindingId: 'stripe-main' } : {}),
    },
    ...(fields.length ? { inputFields: fields } : {}),
    ...(gestureActions.has(operation) ? { requiresUserGesture: true } : {}),
  };
}

test('is an opt-in no-op for drafts without new runtime kinds or route-load actions', () => {
  const result = assertGuardParity(draftPackage(baseSiteConfig({
    apiActions: [
      { id: 'legacy-duplicate', proxyActionId: 'legacy-one', method: 'GET' },
      { id: 'legacy-duplicate', proxyActionId: 'legacy-two', method: 'PATCH' },
    ],
  })));

  assert.deepEqual(result, { ok: true, issues: [] });
});

test('accepts a complete generic server-feature runtime configuration', () => {
  const result = assertGuardParity(draftPackage({
    ...baseSiteConfig({
      dataSources: [
        {
          id: 'public-records',
          kind: 'data-space',
          dataSpace: { read: 'recordList', spaceId: 'example-space', access: 'public' },
          input: { collectionId: 'articles' },
          target: 'records.items',
          ssr: true,
        },
        {
          id: 'public-offer',
          kind: 'commerce',
          commerce: { read: 'offerDetail', access: 'public' },
          input: { offerVersionId: 'offer-v1' },
          target: 'commerce.offer',
          ssr: true,
        },
        {
          id: 'connections',
          kind: 'integrations',
          integrations: { read: 'connectionList' },
          target: 'integrations.items',
          ssr: false,
        },
      ],
      apiActions: [
        actionFor('createRecord'),
        actionFor('admitCheckout'),
        actionFor('stripeOnboardingStart'),
        {
          ...actionFor('stripeOnboardingReturn'),
          trigger: 'route-load',
          pageIds: ['stripe-return'],
        },
      ],
    }),
    routes: [{
      path: '/integraciones/stripe/retorno',
      pageId: 'stripe-return',
      auth: { required: true },
    }],
  }));

  assert.deepEqual(result, { ok: true, issues: [] });
});

for (const [read, contract] of Object.entries(dataSpaceReads)) {
  test(`enforces the Data Spaces ${read} read input matrix`, () => {
    const valid = {
      id: `read-${read}`,
      kind: 'data-space',
      dataSpace: { read, spaceId: 'example-space' },
      input: inputFor(contract.required),
      target: 'result',
    };
    assert.equal(assertGuardParity(draftPackage(baseSiteConfig({ dataSources: [valid] }))).ok, true);
    assert.equal(assertGuardParity(draftPackage(baseSiteConfig({
      dataSources: [{ ...valid, input: inputFor(contract.allowed) }],
    }))).ok, true);

    const invalidInput = contract.required.length
      ? inputFor(contract.required.slice(1))
      : { unexpected: 'value' };
    const invalid = assertGuardParity(draftPackage(baseSiteConfig({
      dataSources: [{ ...valid, input: invalidInput }],
    })));
    assert.equal(invalid.ok, false);
    assert.ok(issueCodes(invalid).includes('data_source_input_contract_invalid'));
  });
}

for (const [read, contract] of Object.entries(commerceReads)) {
  test(`enforces the Commerce ${read} protected-read input matrix`, () => {
    const valid = {
      id: `read-${read}`,
      kind: 'commerce',
      commerce: { read },
      input: inputFor(contract.required),
      target: 'result',
    };
    assert.equal(assertGuardParity(draftPackage(baseSiteConfig({ dataSources: [valid] }))).ok, true);
    assert.equal(assertGuardParity(draftPackage(baseSiteConfig({
      dataSources: [{ ...valid, input: inputFor(contract.allowed) }],
    }))).ok, true);

    const invalidInput = contract.required.length
      ? inputFor(contract.required.slice(1))
      : { unexpected: 'value' };
    const invalid = assertGuardParity(draftPackage(baseSiteConfig({
      dataSources: [{ ...valid, input: invalidInput }],
    })));
    assert.equal(invalid.ok, false);
    assert.ok(issueCodes(invalid).includes('data_source_input_contract_invalid'));
  });
}

test('uses offerVersionId rather than resourceId for a public offer detail read', () => {
  const valid = {
    id: 'public-offer',
    kind: 'commerce',
    commerce: { read: 'offerDetail', access: 'public' },
    input: { offerVersionId: 'offer-v1' },
    target: 'offer',
    ssr: true,
  };
  assert.equal(assertGuardParity(draftPackage(baseSiteConfig({ dataSources: [valid] }))).ok, true);

  const invalid = assertGuardParity(draftPackage(baseSiteConfig({
    dataSources: [{ ...valid, input: { resourceId: 'offer-v1' } }],
  })));
  assert.ok(issueCodes(invalid).includes('data_source_input_contract_invalid'));
});

for (const [operation, fields] of Object.entries(actionInputs)) {
  test(`enforces the ${operation} action input matrix`, () => {
    const valid = actionFor(operation, fields);
    assert.equal(assertGuardParity(draftPackage(baseSiteConfig({ apiActions: [valid] }))).ok, true);
    const allAllowed = [...fields, ...(optionalActionInputs[operation] ?? [])];
    assert.equal(assertGuardParity(draftPackage(baseSiteConfig({
      apiActions: [actionFor(operation, allAllowed)],
    }))).ok, true);

    const invalidFields = fields.length ? fields.slice(1) : ['unexpected'];
    const invalid = assertGuardParity(draftPackage(baseSiteConfig({
      apiActions: [{ ...valid, inputFields: invalidFields }],
    })));
    assert.equal(invalid.ok, false);
    assert.ok(issueCodes(invalid).includes('action_input_contract_invalid'));
  });
}

test('requires exactly one configured discount amount shape', () => {
  const percentage = actionFor('createDiscountVersion');
  const fixed = actionFor('createDiscountVersion', ['versionId', 'revision', 'duration', 'fixedAmount']);
  assert.equal(assertGuardParity(draftPackage(baseSiteConfig({ apiActions: [percentage] }))).ok, true);
  assert.equal(assertGuardParity(draftPackage(baseSiteConfig({ apiActions: [fixed] }))).ok, true);

  for (const inputFields of [
    ['versionId', 'revision', 'duration'],
    ['versionId', 'revision', 'duration', 'percentageBasisPoints', 'fixedAmount'],
  ]) {
    const result = assertGuardParity(draftPackage(baseSiteConfig({
      apiActions: [actionFor('createDiscountVersion', inputFields)],
    })));
    assert.ok(issueCodes(result).includes('action_input_contract_invalid'));
  }
});

test('rejects proxy aliases, wrong methods, unsafe SSR, binding mismatches, and missing gestures', () => {
  const cases = [
    {
      expected: 'data_source_proxy_alias_forbidden',
      runtime: { dataSources: [{
        id: 'records', kind: 'data-space', proxySourceId: 'legacy',
        dataSpace: { read: 'recordList', spaceId: 'example-space' },
        input: { collectionId: 'articles' }, target: 'records',
      }] },
    },
    {
      expected: 'data_source_binding_invalid',
      runtime: { dataSources: [{
        id: 'records', kind: 'data-space', dataSpace: { read: 'recordList', spaceId: 'example-space' },
        commerce: { read: 'offerList' }, input: { collectionId: 'articles' }, target: 'records',
      }] },
    },
    {
      expected: 'data_source_ssr_forbidden',
      runtime: { dataSources: [{
        id: 'records', kind: 'data-space', dataSpace: { read: 'recordList', spaceId: 'example-space' },
        input: { collectionId: 'articles' }, target: 'records', ssr: true,
      }] },
    },
    {
      expected: 'data_source_binding_invalid',
      runtime: { dataSources: [{
        id: 'public-items', kind: 'commerce', commerce: { read: 'itemList', access: 'public' }, target: 'items',
      }] },
    },
    {
      expected: 'data_source_input_contract_invalid',
      runtime: { dataSources: [{
        id: 'connections', kind: 'integrations', integrations: { read: 'connectionList' },
        input: { connectionId: 'browser-scope' }, target: 'connections',
      }] },
    },
    {
      expected: 'data_source_ssr_forbidden',
      runtime: { dataSources: [{
        id: 'connections', kind: 'integrations', integrations: { read: 'connectionList' }, target: 'connections', ssr: true,
      }] },
    },
    {
      expected: 'action_proxy_alias_forbidden',
      runtime: { apiActions: [{ ...actionFor('createRecord'), proxyActionId: 'legacy' }] },
    },
    {
      expected: 'action_method_invalid',
      runtime: { apiActions: [{ ...actionFor('createRecord'), method: 'PATCH' }] },
    },
    {
      expected: 'action_binding_invalid',
      runtime: { apiActions: [{ ...actionFor('createRecord'), commerce: { action: 'createItem' } }] },
    },
    {
      expected: 'action_user_gesture_required',
      runtime: { apiActions: [{ ...actionFor('admitCheckout'), requiresUserGesture: false }] },
    },
    {
      expected: 'action_input_contract_invalid',
      runtime: { apiActions: [{
        ...actionFor('changePlan'),
        inputFields: [...actionInputs.changePlan, 'tenantId'],
      }] },
    },
  ];

  for (const { expected, runtime } of cases) {
    const result = assertGuardParity(draftPackage(baseSiteConfig(runtime)));
    assert.equal(result.ok, false, expected);
    assert.ok(issueCodes(result).includes(expected), `${expected}: ${JSON.stringify(result)}`);
  }
});

test('requires globally unique runtime action ids after the guard opts in', () => {
  const result = assertGuardParity(draftPackage(baseSiteConfig({
    apiActions: [
      { id: 'duplicate', proxyActionId: 'legacy' },
      { ...actionFor('createRecord'), id: 'duplicate' },
    ],
  })));

  assert.ok(issueCodes(result).includes('runtime_action_id_duplicate'));
});

test('requires one protected route on one page for a route-load callback', () => {
  const callback = {
    ...actionFor('stripeOnboardingReturn'),
    trigger: 'route-load',
    pageIds: ['stripe-return'],
  };
  const cases = [
    {
      expected: 'route_load_target_invalid',
      site: { ...baseSiteConfig({ apiActions: [{ ...callback, pageIds: ['one', 'two'] }] }), routes: [] },
    },
    {
      expected: 'route_load_target_not_unique',
      site: {
        ...baseSiteConfig({ apiActions: [callback] }),
        routes: [
          { path: '/return-one', pageId: 'stripe-return', auth: { required: true } },
          { path: '/return-two', pageId: 'stripe-return', auth: { required: true } },
        ],
      },
    },
    {
      expected: 'route_load_target_unprotected',
      site: {
        ...baseSiteConfig({ apiActions: [callback] }),
        routes: [{ path: '/return', pageId: 'stripe-return' }],
      },
    },
  ];

  for (const { expected, site } of cases) {
    const result = assertGuardParity(draftPackage(site));
    assert.ok(issueCodes(result).includes(expected), `${expected}: ${JSON.stringify(result)}`);
  }
});

test('allows only one route-load callback consumer for a target page', () => {
  const callback = {
    ...actionFor('stripeOnboardingReturn'),
    trigger: 'route-load',
    pageIds: ['stripe-return'],
  };
  const site = {
    ...baseSiteConfig({
      apiActions: [callback, { ...callback, id: 'second-return-consumer' }],
    }),
    routes: [{ path: '/return', pageId: 'stripe-return', auth: { required: true } }],
  };

  const result = assertGuardParity(draftPackage(site));
  assert.ok(issueCodes(result).includes('route_load_target_not_unique'));
});

test('separates route-load callbacks from static and remote auth callbacks', () => {
  const callback = {
    ...actionFor('stripeOnboardingReturn'),
    trigger: 'route-load',
    pageIds: ['stripe-return'],
  };
  const route = { path: '/auth/provider-return', pageId: 'stripe-return', auth: { required: true } };
  const staticByPage = {
    ...baseSiteConfig({
      auth: { callbackPageId: 'stripe-return', redirectPath: '/auth/callback' },
      apiActions: [callback],
    }),
    routes: [route],
  };
  const staticByDynamicPath = {
    ...baseSiteConfig({
      auth: { callbackPageId: 'auth-callback', redirectPath: '/auth/callback' },
      apiActions: [callback],
    }),
    routes: [{ ...route, path: '/auth/:provider' }],
  };
  const remote = {
    ...baseSiteConfig({
      authRemote: { authProfileId: 'staff', endpoint: '/auth/runtime' },
      apiActions: [callback],
    }),
    routes: [route],
  };
  const authRegistry = {
    path: `${DOMAIN}/server/auth-profile-registry.json`,
    kind: 'server-auth-profile-registry',
    content: {
      version: 1,
      profiles: [{
        domain: DOMAIN,
        authProfileId: 'staff',
        callbackPageId: 'auth-callback',
        callbackUrls: [`https://${DOMAIN}/auth/provider-return`],
      }],
    },
  };

  for (const packageValue of [
    draftPackage(staticByPage),
    draftPackage(staticByDynamicPath),
    draftPackage(remote, [authRegistry]),
  ]) {
    const result = assertGuardParity(packageValue);
    assert.ok(issueCodes(result).includes('route_load_auth_callback_collision'), JSON.stringify(result));
  }
});

test('fails closed when remote auth callback separation cannot be proven', () => {
  const site = {
    ...baseSiteConfig({
      authRemote: { authProfileId: 'missing', endpoint: '/auth/runtime' },
      apiActions: [{
        ...actionFor('stripeOnboardingReturn'),
        trigger: 'route-load',
        pageIds: ['stripe-return'],
      }],
    }),
    routes: [{ path: '/provider-return', pageId: 'stripe-return', auth: { required: true } }],
  };

  const result = assertGuardParity(draftPackage(site));
  assert.ok(issueCodes(result).includes('route_load_auth_profile_unresolved'));
});
