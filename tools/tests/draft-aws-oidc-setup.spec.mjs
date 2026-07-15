import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildDeploymentRoleInventory,
  deployAuthzConfig,
  domainSlug,
  readRegisteredDraftInventory,
  readRegisteredDrafts,
  resolveRegistryOwner,
  roleNameFor,
  trustPolicy,
} from '../draft-aws-oidc-setup.mjs';

test('domainSlug and roleNameFor create stable draft role names', () => {
  assert.equal(domainSlug('PokeAPI-Demo.zoolandingpage.com.mx'), 'pokeapi-demo-zoolandingpage-com-mx');
  assert.equal(
    roleNameFor('pamelabetancourt.com', 'production'),
    'draft-pamelabetancourt-com-production-deploy',
  );
});

test('deployment role inventory rejects slug collisions and overlong names', () => {
  assert.throws(() => buildDeploymentRoleInventory([
    { domain: 'a-b.example.com', repo: 'draft-a-b-example-com' },
    { domain: 'a.b-example.com', repo: 'draft-a-b-example-com-2' },
  ]), /duplicate_deployment_role_name/);

  assert.throws(() => buildDeploymentRoleInventory([
    { domain: `${'a'.repeat(63)}.${'b'.repeat(63)}.com`, repo: 'draft-long-domain' },
  ]), /invalid_deployment_role_name/);
});

test('OIDC owner is anchored to the canonical draft registry owner', () => {
  assert.equal(resolveRegistryOwner('LynxPardelle'), 'LynxPardelle');
  assert.equal(resolveRegistryOwner('LynxPardelle', 'LynxPardelle'), 'LynxPardelle');
  assert.throws(
    () => resolveRegistryOwner('LynxPardelle', 'different-owner'),
    /registry_owner_mismatch/,
  );
});

test('trustPolicy scopes GitHub OIDC to repo, environment, and exact deployment branch', () => {
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
  assert.equal(
    policy.Statement[0].Condition.StringEquals['token.actions.githubusercontent.com:ref'],
    'refs/heads/test',
  );

  const production = trustPolicy({
    providerArn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
    owner: 'LynxPardelle',
    repo: 'draft-pamelabetancourt-com',
    environment: 'production',
  });
  assert.equal(
    production.Statement[0].Condition.StringEquals['token.actions.githubusercontent.com:ref'],
    'refs/heads/main',
  );
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

test('OIDC setup provisions only drafts explicitly present in the registry', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-oidc-registry-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const registryPath = path.join(root, 'docs', 'drafts-registry.json');
  await mkdir(path.dirname(registryPath), { recursive: true });
  await writeFile(registryPath, JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'registered.example.com',
      repo: 'draft-registered-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-registered-example-com.git',
      localPath: 'drafts/registered.example.com',
    }],
  }), 'utf8');
  await mkdir(path.join(root, 'drafts', 'unregistered.example.com'), { recursive: true });
  await writeFile(
    path.join(root, 'drafts', 'unregistered.example.com', 'site-config.json'),
    '{"domain":"unregistered.example.com"}',
    'utf8',
  );

  assert.deepEqual(await readRegisteredDraftInventory(registryPath), {
    owner: 'LynxPardelle',
    drafts: [{
      domain: 'registered.example.com',
      repo: 'draft-registered-example-com',
    }],
  });
  assert.deepEqual(await readRegisteredDrafts(registryPath), [{
    domain: 'registered.example.com',
    repo: 'draft-registered-example-com',
  }]);
});
