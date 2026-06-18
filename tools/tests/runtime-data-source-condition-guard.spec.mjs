import assert from 'node:assert/strict';
import test from 'node:test';

import { validateRuntimeDataSourceConditionReferences } from '../runtime-data-source-condition-guard.mjs';

function packageWith(files) {
  return {
    version: 1,
    domain: 'example.com',
    stage: 'draft',
    files,
  };
}

const siteConfig = {
  runtime: {
    dataSources: [
      {
        id: 'auth-account',
        target: 'remote.auth.account',
        statusTarget: 'remoteStatus.authAccount',
        mapper: {
          singleItem: true,
          fields: {
            mfaStatus: 'mfa.softwareToken.status',
            email: 'email',
          },
          metaFields: {
            requestId: 'requestId',
          },
          prependItems: [
            {
              mfaStatus: 'unknown',
              label: 'Fallback',
            },
          ],
        },
      },
    ],
  },
};

test('rejects draft conditions that read fields hidden by mapped data-source fields', () => {
  const result = validateRuntimeDataSourceConditionReferences(packageWith([
    {
      path: 'example.com/site-config.json',
      kind: 'site-config',
      content: siteConfig,
    },
    {
      path: 'example.com/account/components.json',
      kind: 'page-components',
      pageId: 'account',
      content: {
        components: [
          {
            id: 'badMfaCondition',
            type: 'generic-text',
            condition: 'all:varEq,remote.auth.account.items.0.mfa.softwareToken.enabled,true',
          },
        ],
      },
    },
  ]));

  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0].message, /mfa/);
  assert.equal(result.issues[0].missingKey, 'mfa');
  assert.equal(result.issues[0].dataSourceId, 'auth-account');
});

test('allows references to mapped item fields, metadata fields, status fields, and raw-shape targets', () => {
  const result = validateRuntimeDataSourceConditionReferences(packageWith([
    {
      path: 'example.com/site-config.json',
      kind: 'site-config',
      content: {
        runtime: {
          dataSources: [
            ...siteConfig.runtime.dataSources,
            {
              id: 'raw-feed',
              target: 'remote.raw.feed',
              mapper: {
                itemsPath: 'items',
              },
            },
          ],
        },
      },
    },
    {
      path: 'example.com/account/components.json',
      kind: 'page-components',
      pageId: 'account',
      content: {
        components: [
          {
            id: 'mappedMfaCondition',
            type: 'generic-text',
            condition: 'all:varEq,remote.auth.account.items.0.mfaStatus,enabled',
          },
          {
            id: 'metadataCondition',
            type: 'generic-text',
            condition: 'all:var,remote.auth.account.requestId',
          },
          {
            id: 'statusCondition',
            type: 'generic-text',
            condition: 'all:varEq,remoteStatus.authAccount.state,loading',
          },
          {
            id: 'rawCondition',
            type: 'generic-text',
            condition: 'all:varEq,remote.raw.feed.items.0.deep.unmapped.value,true',
          },
        ],
      },
    },
  ]));

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
});

test('validates condition strings embedded in valueInstruction when resolvers', () => {
  const result = validateRuntimeDataSourceConditionReferences(packageWith([
    {
      path: 'example.com/site-config.json',
      kind: 'site-config',
      content: siteConfig,
    },
    {
      path: 'example.com/account/components.json',
      kind: 'page-components',
      pageId: 'account',
      content: {
        components: [
          {
            id: 'badValueInstruction',
            type: 'generic-button',
            valueInstructions: 'set:config.disabled,when,"all:varEq,remote.auth.account.items.0.mfa.enabled,true",true,false',
          },
        ],
      },
    },
  ]));

  assert.equal(result.ok, false);
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].source, 'valueInstructions');
  assert.equal(result.issues[0].missingKey, 'mfa');
});
