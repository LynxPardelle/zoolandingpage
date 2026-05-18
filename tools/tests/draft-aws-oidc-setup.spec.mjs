import assert from 'node:assert/strict';
import test from 'node:test';

import { deployAuthzConfig, domainSlug, roleNameFor, trustPolicy } from '../draft-aws-oidc-setup.mjs';

test('domainSlug and roleNameFor create stable draft role names', () => {
  assert.equal(domainSlug('PokeAPI-Demo.zoolandingpage.com.mx'), 'pokeapi-demo-zoolandingpage-com-mx');
  assert.equal(
    roleNameFor('pamelabetancourt.com', 'production'),
    'draft-pamelabetancourt-com-production-deploy',
  );
});

test('trustPolicy scopes GitHub OIDC to repo and environment', () => {
  const policy = trustPolicy({
    providerArn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
    owner: 'LynxPardelle',
    repo: 'draft-pamelabetancourt-com',
    environment: 'test',
  });

  assert.equal(
    policy.Statement[0].Condition.StringEquals['token.actions.githubusercontent.com:sub'],
    'repo:LynxPardelle/draft-pamelabetancourt-com:environment:test',
  );
  assert.equal(policy.Statement[0].Condition.StringEquals['token.actions.githubusercontent.com:aud'], 'sts.amazonaws.com');
});

test('deployAuthzConfig mirrors role domain and environment', () => {
  const config = deployAuthzConfig([
    {
      roleName: 'draft-example-com-test-deploy',
      domain: 'example.com',
      environment: 'test',
    },
  ]);

  assert.deepEqual(config, [
    {
      roleName: 'draft-example-com-test-deploy',
      domains: ['example.com'],
      environments: ['test'],
      actions: ['createSite', 'upsertDraft', 'publishDraft', 'getSite'],
    },
  ]);
});
