import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildDeploymentRoleInventory,
  deployAuthzConfig,
  domainSlug,
  readRegisteredDraftInventory,
  readRegisteredDrafts,
  resolveSelectedDraftOwners,
  roleNameFor,
  trustPolicy,
} from '../draft-aws-oidc-setup.mjs';
import * as oidcSetup from '../draft-aws-oidc-setup.mjs';

const oidcSetupPath = new URL('../draft-aws-oidc-setup.mjs', import.meta.url);

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

test('trustPolicy scopes GitHub OIDC to repo, environment, and exact deployment branch', () => {
  const policy = trustPolicy({
    providerArn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
    subject: 'repo:LynxPardelle/draft-pamelabetancourt-com:environment:test',
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
    subject: 'repo:LynxPardelle/draft-pamelabetancourt-com:environment:production',
    environment: 'production',
  });
  assert.equal(
    production.Statement[0].Condition.StringEquals['token.actions.githubusercontent.com:ref'],
    'refs/heads/main',
  );
  assert.throws(
    () => trustPolicy({
      providerArn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
      subject: 'repo:LynxPardelle/draft-pamelabetancourt-com:environment:*',
      environment: 'test',
    }),
    /invalid_github_oidc_subject/,
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
      owner: 'LynxPardelle',
      repo: 'draft-registered-example-com',
    }],
  });
  assert.deepEqual(await readRegisteredDrafts(registryPath), [{
    domain: 'registered.example.com',
    owner: 'LynxPardelle',
    repo: 'draft-registered-example-com',
  }]);
});

test('per-draft owner flows from registry inventory into the final role trust', async () => {
  const [role] = buildDeploymentRoleInventory([{
    domain: 'thehairnarrative.com',
    owner: 'Toydrum',
    repo: 'draft-thehairnarrative-com',
  }]);
  const plan = await oidcSetup.planRole({
    ...role,
    accountId: '123456789012',
    providerArn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
    authoringFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:authoring-test',
    readRepositoryOidcSubjectFn: async ({ owner, repo, environment }) => {
      assert.deepEqual({ owner, repo, environment }, {
        owner: 'Toydrum',
        repo: 'draft-thehairnarrative-com',
        environment: 'test',
      });
      const subjectPrefix = 'repo:Toydrum@123456/draft-thehairnarrative-com@789012';
      return {
        subjectPrefix,
        subject: `${subjectPrefix}:environment:test`,
        source: 'github-immutable-prefix',
        evidence: { useDefault: true, immutable: true },
      };
    },
    readRoleStateFn: async () => ({ exists: false, trust: null, policy: null }),
  });

  assert.equal(plan.owner, 'Toydrum');
  assert.equal(
    plan.targetTrust.Statement[0].Condition.StringEquals['token.actions.githubusercontent.com:sub'],
    'repo:Toydrum@123456/draft-thehairnarrative-com@789012:environment:test',
  );
  assert.equal(plan.oidcSubject.source, 'github-immutable-prefix');
});

test('readRepositoryOidcSubject uses the exact immutable GitHub prefix for an environment', async () => {
  assert.equal(typeof oidcSetup.readRepositoryOidcSubject, 'function');
  const calls = [];
  const prefix = 'repo:Toydrum@123456/draft-thehairnarrative-com@789012';
  const identity = await oidcSetup.readRepositoryOidcSubject({
    owner: 'Toydrum',
    repo: 'draft-thehairnarrative-com',
    environment: 'test',
    ghJsonFn: async args => {
      calls.push(args);
      return { use_default: true, sub_claim_prefix: prefix };
    },
  });

  assert.deepEqual(identity, {
    subject: `${prefix}:environment:test`,
    subjectPrefix: prefix,
    source: 'github-immutable-prefix',
    evidence: { useDefault: true, immutable: true },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'api');
  assert.equal(calls[0][1], '/repos/Toydrum/draft-thehairnarrative-com/actions/oidc/customization/sub');
  assert.ok(calls[0].includes('X-GitHub-Api-Version: 2026-03-10'));
  assert.equal(calls[0].includes('-X'), false);
});

test('readRepositoryOidcSubject trusts an exact legacy prefix returned by the canonical API', async () => {
  const subjectPrefix = 'repo:LynxPardelle/draft-pamelabetancourt-com';
  const identity = await oidcSetup.readRepositoryOidcSubject({
    owner: 'LynxPardelle',
    repo: 'draft-pamelabetancourt-com',
    environment: 'test',
    ghJsonFn: async () => ({ use_default: true, sub_claim_prefix: subjectPrefix }),
  });

  assert.deepEqual(identity, {
    subject: `${subjectPrefix}:environment:test`,
    subjectPrefix,
    source: 'github-default-prefix',
    evidence: { useDefault: true, immutable: false },
  });
});

test('readRepositoryOidcSubject treats an exact immutable prefix as authoritative during flag transition', async () => {
  const subjectPrefix = 'repo:Toydrum@123/draft-thehairnarrative-com@456';
  const identity = await oidcSetup.readRepositoryOidcSubject({
    owner: 'Toydrum',
    repo: 'draft-thehairnarrative-com',
    environment: 'test',
    ghJsonFn: async () => ({
      use_default: true,
      use_immutable_subject: false,
      sub_claim_prefix: subjectPrefix,
    }),
  });

  assert.deepEqual(identity, {
    subject: `${subjectPrefix}:environment:test`,
    subjectPrefix,
    source: 'github-immutable-prefix',
    evidence: { useDefault: true, immutable: true },
  });
});

test('readRepositoryOidcSubject rejects ambiguous or mismatched immutable prefixes', async () => {
  const cases = [
    'repo:Toydrum@123/draft-thehairnarrative-com@456*',
    'repo:OtherOwner@123/draft-thehairnarrative-com@456',
    'repo:Toydrum@123/other-repo@456',
    'repo:Toydrum@123/draft-thehairnarrative-com@456:environment:test',
  ];

  for (const subClaimPrefix of cases) {
    await assert.rejects(
      () => oidcSetup.readRepositoryOidcSubject({
        owner: 'Toydrum',
        repo: 'draft-thehairnarrative-com',
        environment: 'test',
        ghJsonFn: async () => ({ use_default: true, sub_claim_prefix: subClaimPrefix }),
      }),
      /invalid_github_oidc_subject_prefix|github_oidc_subject_repository_mismatch/,
      subClaimPrefix,
    );
  }

  await assert.rejects(
    () => oidcSetup.readRepositoryOidcSubject({
      owner: 'Toydrum',
      repo: 'draft-thehairnarrative-com',
      environment: 'test',
      ghJsonFn: async () => ({
        use_default: true,
        use_immutable_subject: true,
        sub_claim_prefix: 'repo:Toydrum/draft-thehairnarrative-com',
      }),
    }),
    /github_oidc_subject_mode_mismatch/,
  );

  await assert.rejects(
    () => oidcSetup.readRepositoryOidcSubject({
      owner: 'Toydrum',
      repo: 'draft-thehairnarrative-com',
      environment: 'test',
      ghJsonFn: async () => ({ use_default: false, include_claim_keys: ['repo'] }),
    }),
    /unsupported_github_oidc_customization/,
  );
});

test('readRepositoryOidcSubject falls back to names only with canonical legacy evidence', async () => {
  const calls = [];
  const identity = await oidcSetup.readRepositoryOidcSubject({
    owner: 'LynxPardelle',
    repo: 'draft-pamelabetancourt-com',
    environment: 'production',
    ghJsonFn: async args => {
      calls.push(args);
      if (args[1].endsWith('/actions/oidc/customization/sub')) {
        return { use_default: true, use_immutable_subject: false };
      }
      return {
        id: 789012,
        name: 'draft-pamelabetancourt-com',
        full_name: 'LynxPardelle/draft-pamelabetancourt-com',
        created_at: '2026-07-01T12:00:00Z',
        owner: { id: 123456, login: 'LynxPardelle' },
      };
    },
  });

  assert.deepEqual(identity, {
    subject: 'repo:LynxPardelle/draft-pamelabetancourt-com:environment:production',
    subjectPrefix: 'repo:LynxPardelle/draft-pamelabetancourt-com',
    source: 'github-legacy-default',
    evidence: {
      useDefault: true,
      immutable: false,
      repositoryCreatedAt: '2026-07-01T12:00:00Z',
    },
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[1][1], '/repos/LynxPardelle/draft-pamelabetancourt-com');
});

test('readRepositoryOidcSubject refuses an unevidenced name-based fallback', async () => {
  const unsafeCases = [
    {
      customization: { use_default: true, use_immutable_subject: true },
      repository: {
        id: 2,
        name: 'draft-example-com',
        full_name: 'LynxPardelle/draft-example-com',
        created_at: '2026-07-01T12:00:00Z',
        owner: { id: 1, login: 'LynxPardelle' },
      },
    },
    {
      customization: { use_default: true },
      repository: {
        id: 2,
        name: 'draft-example-com',
        full_name: 'LynxPardelle/draft-example-com',
        created_at: '2026-07-20T12:00:00Z',
        owner: { id: 1, login: 'LynxPardelle' },
      },
    },
    {
      customization: { use_default: true, use_immutable_subject: false },
      repository: {
        id: 2,
        name: 'other-repo',
        full_name: 'LynxPardelle/other-repo',
        created_at: '2026-07-01T12:00:00Z',
        owner: { id: 1, login: 'LynxPardelle' },
      },
    },
    {
      customization: { use_default: true, use_immutable_subject: false },
      repository: {
        id: 2,
        name: 'draft-example-com',
        full_name: 'LynxPardelle/draft-example-com',
        created_at: 'July 1, 2026',
        owner: { id: 1, login: 'LynxPardelle' },
      },
    },
  ];

  for (const item of unsafeCases) {
    let call = 0;
    await assert.rejects(
      () => oidcSetup.readRepositoryOidcSubject({
        owner: 'LynxPardelle',
        repo: 'draft-example-com',
        environment: 'test',
        ghJsonFn: async () => (call++ === 0 ? item.customization : item.repository),
      }),
      /github_oidc_immutable_prefix_missing|github_oidc_legacy_evidence_missing|github_oidc_repository_mismatch/,
    );
  }
});

test('OIDC owner assertion applies to the selected draft owners', () => {
  const drafts = [{ owner: 'Toydrum' }, { owner: 'Toydrum' }];
  assert.deepEqual(resolveSelectedDraftOwners(drafts), ['Toydrum']);
  assert.deepEqual(resolveSelectedDraftOwners(drafts, 'Toydrum'), ['Toydrum']);
  assert.throws(
    () => resolveSelectedDraftOwners(drafts, 'LynxPardelle'),
    /selected_draft_owner_mismatch/,
  );
});

test('OIDC setup scopes role planning and writes to the requested draft domain', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(oidcSetupPath, 'utf8'));
  assert.match(source, /assertScopedApply\(apply, args\.domain\)/);
  assert.match(source, /selectRegisteredDrafts\(registeredInventory\.drafts, requestedDomain\)/);
  assert.match(source, /buildDeploymentRoleInventory\(selectedDrafts\)/);
  const main = source.slice(source.indexOf('async function main'), source.indexOf('\nif (import.meta.url'));
  assert.ok(main.indexOf('assertScopedApply(') < main.indexOf('readRegisteredDraftInventory('));
  assert.ok(main.indexOf('assertScopedApply(') < main.indexOf('getAccountId('));
});

test('OIDC inventory preserves a per-draft GitHub owner override', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-oidc-owner-registry-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const registryPath = path.join(root, 'drafts-registry.json');
  await writeFile(registryPath, JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'example.com',
      owner: 'Toydrum',
      repo: 'draft-example-com',
      githubUrl: 'https://github.com/Toydrum/draft-example-com.git',
      localPath: 'drafts/example.com',
    }],
  }), 'utf8');

  assert.deepEqual(await readRegisteredDrafts(registryPath), [{
    domain: 'example.com',
    owner: 'Toydrum',
    repo: 'draft-example-com',
  }]);
});

test('invokePolicy grants only IAM-protected Function URL invocation for the resolved Lambda', () => {
  assert.equal(typeof oidcSetup.invokePolicy, 'function');
  const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:authoring-test';
  const policy = oidcSetup.invokePolicy({ authoringFunctionArn: functionArn });

  assert.deepEqual(policy, {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'lambda:InvokeFunctionUrl',
        Resource: functionArn,
        Condition: {
          StringEquals: {
            'lambda:FunctionUrlAuthType': 'AWS_IAM',
          },
        },
      },
      {
        Effect: 'Allow',
        Action: 'lambda:InvokeFunction',
        Resource: functionArn,
        Condition: {
          Bool: {
            'lambda:InvokedViaFunctionUrl': 'true',
          },
        },
      },
    ],
  });
});

test('resolveApplyEnvironment requires one explicit environment for mutations', () => {
  assert.equal(typeof oidcSetup.resolveApplyEnvironment, 'function');
  assert.equal(oidcSetup.resolveApplyEnvironment({ apply: false }), undefined);
  assert.equal(oidcSetup.resolveApplyEnvironment({ apply: true, environment: 'test' }), 'test');
  assert.equal(oidcSetup.resolveApplyEnvironment({ apply: true, environment: 'production' }), 'production');
  assert.throws(
    () => oidcSetup.resolveApplyEnvironment({ apply: true }),
    /apply_requires_explicit_environment/,
  );
  assert.throws(
    () => oidcSetup.resolveApplyEnvironment({ apply: true, environment: 'all' }),
    /unsupported_apply_environment/,
  );
});

test('resolveAuthoringStackNames rejects every runtime stack override', () => {
  assert.equal(typeof oidcSetup.resolveAuthoringStackNames, 'function');
  assert.deepEqual(oidcSetup.resolveAuthoringStackNames({}), {
    test: 'zoolanding-config-authoring-test',
    production: 'zoolanding-config-authoring',
  });
  assert.throws(
    () => oidcSetup.resolveAuthoringStackNames({
      'authoring-test-stack-name': 'zoolanding-config-authoring',
    }),
    /authoring_stack_override_forbidden/,
  );
  assert.throws(
    () => oidcSetup.resolveAuthoringStackNames({
      'authoring-production-stack-name': 'zoolanding-config-authoring-test',
    }),
    /authoring_stack_override_forbidden/,
  );
  assert.throws(
    () => oidcSetup.resolveAuthoringStackNames({ 'authoring-api-id': 'legacy' }),
    /legacy_authoring_target_override_forbidden/,
  );
  assert.throws(
    () => oidcSetup.resolveAuthoringStackNames({ 'authoring-function-name': 'legacy' }),
    /legacy_authoring_target_override_forbidden/,
  );
});

test('readOidcProvider is read-only and fails closed when the account provider is absent', async () => {
  assert.equal(typeof oidcSetup.readOidcProvider, 'function');
  const accountId = '123456789012';
  const providerArn = `arn:aws:iam::${accountId}:oidc-provider/token.actions.githubusercontent.com`;
  const calls = [];
  const provider = await oidcSetup.readOidcProvider({
    accountId,
    awsJsonFn: async args => {
      calls.push(args);
      if (args[1] === 'list-open-id-connect-providers') {
        return { OpenIDConnectProviderList: [{ Arn: providerArn }] };
      }
      return {
        Url: 'token.actions.githubusercontent.com',
        ClientIDList: ['sts.amazonaws.com'],
        ThumbprintList: [
          '6938fd4d98bab03faadb97b34396831e3780aea1',
          '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
        ],
      };
    },
  });
  assert.deepEqual(provider, { arn: providerArn, created: false, exists: true });
  assert.deepEqual(calls, [
    ['iam', 'list-open-id-connect-providers'],
    ['iam', 'get-open-id-connect-provider', '--open-id-connect-provider-arn', providerArn],
  ]);
  await assert.rejects(
    () => oidcSetup.readOidcProvider({
      accountId,
      awsJsonFn: async () => ({ OpenIDConnectProviderList: [] }),
    }),
    /github_oidc_provider_missing/,
  );
  await assert.rejects(
    () => oidcSetup.readOidcProvider({
      accountId,
      awsJsonFn: async args => args[1] === 'list-open-id-connect-providers'
        ? { OpenIDConnectProviderList: [{ Arn: providerArn }] }
        : {
            Url: 'token.actions.githubusercontent.com',
            ClientIDList: ['sts.amazonaws.com', 'unexpected.example'],
            ThumbprintList: [
              '6938fd4d98bab03faadb97b34396831e3780aea1',
              '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
            ],
          },
    }),
    /unsafe_github_oidc_provider/,
  );
});

test('readRoleState accepts only the canonical inline policy and no managed policies', async () => {
  assert.equal(typeof oidcSetup.readRoleState, 'function');
  const trust = { Version: '2012-10-17', Statement: [] };
  const policy = { Version: '2012-10-17', Statement: [] };
  const read = ({ policyNames = ['InvokeConfigAuthoring'], attachedPolicies = [] } = {}) => (
    oidcSetup.readRoleState('draft-example-com-test-deploy', async args => {
      if (args[1] === 'get-role') return { Role: { AssumeRolePolicyDocument: trust } };
      if (args[1] === 'list-role-policies') return { PolicyNames: policyNames };
      if (args[1] === 'list-attached-role-policies') return { AttachedPolicies: attachedPolicies };
      if (args[1] === 'get-role-policy') return { PolicyDocument: policy };
      throw new Error(`unexpected_call:${args.join(':')}`);
    })
  );

  assert.deepEqual(await read(), { exists: true, trust, policy });
  await assert.rejects(
    () => read({ policyNames: ['InvokeConfigAuthoring', 'Unexpected'] }),
    /unexpected_inline_role_policies/,
  );
  await assert.rejects(
    () => read({ attachedPolicies: [{ PolicyName: 'Unexpected', PolicyArn: 'redacted' }] }),
    /unexpected_managed_role_policies/,
  );
});

test('roleMutationOrder narrows an existing role policy before changing its trust', () => {
  assert.equal(typeof oidcSetup.roleMutationOrder, 'function');
  assert.deepEqual(oidcSetup.roleMutationOrder({ exists: true, changes: { policy: true, trust: true } }), [
    'policy',
    'trust',
  ]);
  assert.deepEqual(oidcSetup.roleMutationOrder({ exists: false, changes: { policy: true, trust: true } }), [
    'create',
    'policy',
  ]);
});

test('planThenApplyRoles completes every preflight before the first selected write', async () => {
  assert.equal(typeof oidcSetup.planThenApplyRoles, 'function');
  const events = [];
  await assert.rejects(
    () => oidcSetup.planThenApplyRoles({
      apply: true,
      applyEnvironment: 'test',
      roleInventory: [
        { roleName: 'first', environment: 'test' },
        { roleName: 'second', environment: 'production' },
        { roleName: 'late-invalid', environment: 'test' },
      ],
      planRoleFn: async role => {
        events.push(`plan:${role.roleName}`);
        if (role.roleName === 'late-invalid') throw new Error('unexpected_role_policy');
        return role;
      },
      applyRolePlanFn: async role => events.push(`write:${role.roleName}`),
    }),
    /unexpected_role_policy/,
  );
  assert.deepEqual(events, ['plan:first', 'plan:second', 'plan:late-invalid']);

  events.length = 0;
  await oidcSetup.planThenApplyRoles({
    apply: true,
    applyEnvironment: 'test',
    roleInventory: [
      { roleName: 'test-role', environment: 'test' },
      { roleName: 'production-role', environment: 'production' },
    ],
    planRoleFn: async role => {
      events.push(`plan:${role.roleName}`);
      return role;
    },
    applyRolePlanFn: async role => events.push(`write:${role.roleName}`),
  });
  assert.deepEqual(events, ['plan:test-role', 'plan:production-role', 'write:test-role']);
});

test('planRole builds the exact environment target policy from the preflight snapshot', async () => {
  assert.equal(typeof oidcSetup.planRole, 'function');
  const current = {
    exists: true,
    trust: { Version: '2012-10-17', Statement: [] },
    policy: { Version: '2012-10-17', Statement: [] },
  };
  const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:authoring-test';
  const plan = await oidcSetup.planRole({
    accountId: '123456789012',
    providerArn: 'arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com',
    owner: 'LynxPardelle',
    authoringFunctionArn: functionArn,
    domain: 'example.com',
    repo: 'draft-example-com',
    environment: 'test',
    readRepositoryOidcSubjectFn: async () => ({
      subjectPrefix: 'repo:LynxPardelle/draft-example-com',
      subject: 'repo:LynxPardelle/draft-example-com:environment:test',
      source: 'github-default-prefix',
      evidence: { useDefault: true, immutable: false },
    }),
    readRoleStateFn: async roleName => {
      assert.equal(roleName, 'draft-example-com-test-deploy');
      return current;
    },
  });
  assert.equal(plan.targetPolicy.Statement.length, 2);
  assert.ok(plan.targetPolicy.Statement.every(statement => statement.Resource === functionArn));
  assert.equal(plan.current, current);
  assert.equal(
    plan.targetTrust.Statement[0].Condition.StringEquals['token.actions.githubusercontent.com:sub'],
    'repo:LynxPardelle/draft-example-com:environment:test',
  );
  assert.deepEqual(plan.changes, { trust: true, policy: true });
});

test('applyRolePlan revalidates before writes, narrows policy first, cleans files, and verifies readback', async t => {
  assert.equal(typeof oidcSetup.applyRolePlan, 'function');
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-role-apply-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const roleName = 'draft-example-com-test-deploy';
  const current = {
    exists: true,
    trust: { Version: '2012-10-17', Statement: [{ Sid: 'old-trust' }] },
    policy: { Version: '2012-10-17', Statement: [{ Sid: 'old-policy' }] },
  };
  const targetTrust = { Version: '2012-10-17', Statement: [{ Sid: 'new-trust' }] };
  const targetPolicy = { Version: '2012-10-17', Statement: [{ Sid: 'new-policy' }] };
  const oidcSubject = {
    subjectPrefix: 'repo:LynxPardelle@123456/draft-example-com@789012',
    subject: 'repo:LynxPardelle@123456/draft-example-com@789012:environment:test',
    source: 'github-immutable-prefix',
    evidence: { useDefault: true, immutable: true },
  };
  const plan = {
    roleName,
    owner: 'LynxPardelle',
    repo: 'draft-example-com',
    environment: 'test',
    oidcSubject,
    current,
    targetTrust,
    targetPolicy,
    changes: { policy: true, trust: true },
    wouldChange: true,
  };

  const noWrites = [];
  await assert.rejects(
    () => oidcSetup.applyRolePlan(plan, {
      cwd: root,
      readRepositoryOidcSubjectFn: async () => structuredClone(oidcSubject),
      readRoleStateFn: async () => ({ ...current, policy: { changed: true } }),
      awsTextFn: async args => noWrites.push(args),
    }),
    /deployment_role_changed_after_preflight/,
  );
  assert.deepEqual(noWrites, []);

  const commands = [];
  let oidcReadbacks = 0;
  const snapshots = [current, { exists: true, trust: targetTrust, policy: targetPolicy }];
  assert.equal(await oidcSetup.applyRolePlan(plan, {
    cwd: root,
    readRepositoryOidcSubjectFn: async args => {
      oidcReadbacks += 1;
      assert.deepEqual(args, {
        owner: 'LynxPardelle',
        repo: 'draft-example-com',
        environment: 'test',
      });
      return structuredClone(oidcSubject);
    },
    readRoleStateFn: async () => snapshots.shift(),
    awsTextFn: async args => commands.push(args),
  }), true);
  assert.equal(commands[0][1], 'put-role-policy');
  assert.equal(commands[1][1], 'update-assume-role-policy');
  assert.equal(commands[0][commands[0].indexOf('--role-name') + 1], roleName);
  assert.equal(commands[1][commands[1].indexOf('--role-name') + 1], roleName);
  assert.equal(oidcReadbacks, 2);
  assert.deepEqual(await readdir(root), []);

  const mismatchSnapshots = [current, { exists: true, trust: targetTrust, policy: current.policy }];
  await assert.rejects(
    () => oidcSetup.applyRolePlan(plan, {
      cwd: root,
      readRepositoryOidcSubjectFn: async () => structuredClone(oidcSubject),
      readRoleStateFn: async () => mismatchSnapshots.shift(),
      awsTextFn: async () => {},
    }),
    /deployment_role_readback_mismatch/,
  );
  assert.deepEqual(await readdir(root), []);
});

test('applyRolePlan refuses changed GitHub OIDC identity before any AWS read or write', async () => {
  const plannedIdentity = {
    subjectPrefix: 'repo:Toydrum@123456/draft-thehairnarrative-com@789012',
    subject: 'repo:Toydrum@123456/draft-thehairnarrative-com@789012:environment:test',
    source: 'github-immutable-prefix',
    evidence: { useDefault: true, immutable: true },
  };
  const changedIdentity = {
    ...plannedIdentity,
    subjectPrefix: 'repo:Toydrum@123456/draft-thehairnarrative-com@999999',
    subject: 'repo:Toydrum@123456/draft-thehairnarrative-com@999999:environment:test',
  };
  const events = [];

  await assert.rejects(
    () => oidcSetup.applyRolePlan({
      roleName: 'draft-thehairnarrative-com-test-deploy',
      owner: 'Toydrum',
      repo: 'draft-thehairnarrative-com',
      environment: 'test',
      oidcSubject: plannedIdentity,
      current: { exists: false, trust: undefined, policy: undefined },
      targetTrust: { Version: '2012-10-17', Statement: [] },
      targetPolicy: { Version: '2012-10-17', Statement: [] },
      changes: { trust: true, policy: true },
      wouldChange: true,
    }, {
      readRepositoryOidcSubjectFn: async () => changedIdentity,
      readRoleStateFn: async () => events.push('aws-read'),
      awsTextFn: async () => events.push('aws-write'),
    }),
    /deployment_oidc_subject_changed_after_preflight/,
  );
  assert.deepEqual(events, []);
});

test('deploymentRoleChanges identifies only drifted trust or invocation policy documents', () => {
  assert.equal(typeof oidcSetup.deploymentRoleChanges, 'function');
  const trust = { Version: '2012-10-17', Statement: [{ Effect: 'Allow' }] };
  const policy = { Version: '2012-10-17', Statement: [{ Action: 'lambda:InvokeFunctionUrl' }] };

  assert.deepEqual(oidcSetup.deploymentRoleChanges({
    currentTrust: trust,
    currentPolicy: policy,
    targetTrust: structuredClone(trust),
    targetPolicy: structuredClone(policy),
  }), { trust: false, policy: false });
  assert.deepEqual(oidcSetup.deploymentRoleChanges({
    currentTrust: trust,
    currentPolicy: { ...policy, Statement: [...policy.Statement, { Action: 'execute-api:Invoke' }] },
    targetTrust: trust,
    targetPolicy: policy,
  }), { trust: false, policy: true });
});

test('resolveAuthoringTarget binds stack output to one live AWS_IAM buffered Function URL', async () => {
  assert.equal(typeof oidcSetup.resolveAuthoringTarget, 'function');
  const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:authoring-test';
  const calls = [];
  const awsJsonFn = async args => {
    calls.push(args);
    if (args[0] === 'cloudformation' && args[1] === 'describe-stacks') {
      return {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'test' }],
          Outputs: [{ OutputKey: 'FunctionArn', OutputValue: functionArn }],
        }],
      };
    }
    if (args[0] === 'cloudformation' && args[1] === 'describe-stack-resource') {
      return {
        StackResourceDetail: {
          LogicalResourceId: 'ConfigAuthoringFunction',
          PhysicalResourceId: 'authoring-test',
          ResourceType: 'AWS::Lambda::Function',
        },
      };
    }
    if (args[0] === 'lambda' && args[1] === 'get-function') {
      return { Configuration: { FunctionArn: functionArn } };
    }
    if (args[0] === 'lambda' && args[1] === 'get-function-url-config') {
      return { FunctionArn: functionArn, AuthType: 'AWS_IAM', InvokeMode: 'BUFFERED' };
    }
    throw new Error(`unexpected_call:${args.join(':')}`);
  };

  assert.deepEqual(await oidcSetup.resolveAuthoringTarget({
    accountId: '123456789012',
    environment: 'test',
    region: 'us-east-1',
    stackName: 'authoring-test-stack',
    awsJsonFn,
  }), {
    environment: 'test',
    stackName: 'authoring-test-stack',
    functionArn,
    source: 'stack-output',
  });
  assert.deepEqual(calls.map(args => args.slice(0, 2)), [
    ['cloudformation', 'describe-stacks'],
    ['cloudformation', 'describe-stack-resource'],
    ['lambda', 'get-function'],
    ['lambda', 'get-function-url-config'],
  ]);
});

test('resolveAuthoringTarget falls back to the exact logical resource when the output is absent', async () => {
  const functionArn = 'arn:aws:lambda:us-east-1:123456789012:function:authoring-production';
  const awsJsonFn = async args => {
    if (args[0] === 'cloudformation' && args[1] === 'describe-stacks') {
      return {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'production' }],
          Outputs: [],
        }],
      };
    }
    if (args[0] === 'cloudformation' && args[1] === 'describe-stack-resource') {
      return {
        StackResourceDetail: {
          LogicalResourceId: 'ConfigAuthoringFunction',
          PhysicalResourceId: 'authoring-production',
          ResourceType: 'AWS::Lambda::Function',
        },
      };
    }
    if (args[0] === 'lambda' && args[1] === 'get-function') {
      return { Configuration: { FunctionArn: functionArn } };
    }
    return { FunctionArn: functionArn, AuthType: 'AWS_IAM', InvokeMode: 'BUFFERED' };
  };

  const target = await oidcSetup.resolveAuthoringTarget({
    accountId: '123456789012',
    environment: 'production',
    region: 'us-east-1',
    stackName: 'authoring-production-stack',
    awsJsonFn,
  });
  assert.equal(target.functionArn, functionArn);
  assert.equal(target.source, 'stack-resource-readback');
});

test('resolveAuthoringTarget rejects the retired prod environment parameter', async () => {
  await assert.rejects(async () => oidcSetup.resolveAuthoringTarget({
    accountId: '123456789012',
    environment: 'production',
    region: 'us-east-1',
    stackName: 'authoring-production-stack',
    awsJsonFn: async args => {
      if (args[0] === 'cloudformation' && args[1] === 'describe-stacks') {
        return {
          Stacks: [{
            StackStatus: 'UPDATE_COMPLETE',
            Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'prod' }],
            Outputs: [],
          }],
        };
      }
      throw new Error(`unexpected_call:${args.join(':')}`);
    },
  }), /authoring_stack_environment_mismatch/);
});

test('resolveAuthoringTarget fails closed on missing, ambiguous, mismatched, or unsafe resources', async () => {
  const baseArn = 'arn:aws:lambda:us-east-1:123456789012:function:authoring-test';
  const cases = [
    {
      name: 'missing environment parameter',
      stack: {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [],
          Outputs: [{ OutputKey: 'FunctionArn', OutputValue: baseArn }],
        }],
      },
      error: /authoring_stack_environment_mismatch/,
    },
    {
      name: 'duplicate environment parameter',
      stack: {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [
            { ParameterKey: 'EnvironmentName', ParameterValue: 'test' },
            { ParameterKey: 'EnvironmentName', ParameterValue: 'test' },
          ],
          Outputs: [{ OutputKey: 'FunctionArn', OutputValue: baseArn }],
        }],
      },
      error: /authoring_stack_environment_mismatch/,
    },
    {
      name: 'ambiguous output',
      stack: {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'test' }],
          Outputs: [
            { OutputKey: 'FunctionArn', OutputValue: baseArn },
            { OutputKey: 'FunctionArn', OutputValue: baseArn },
          ],
        }],
      },
      error: /ambiguous_authoring_function_arn_output/,
    },
    {
      name: 'missing logical resource',
      stack: {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'test' }],
          Outputs: [],
        }],
      },
      resource: {},
      error: /invalid_authoring_function_resource/,
    },
    {
      name: 'output mismatch',
      stack: {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'test' }],
          Outputs: [{ OutputKey: 'FunctionArn', OutputValue: `${baseArn}-other` }],
        }],
      },
      error: /authoring_function_arn_mismatch/,
    },
    {
      name: 'unsafe function URL',
      stack: {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'test' }],
          Outputs: [{ OutputKey: 'FunctionArn', OutputValue: baseArn }],
        }],
      },
      urlConfig: { FunctionArn: baseArn, AuthType: 'NONE', InvokeMode: 'BUFFERED' },
      error: /unsafe_authoring_function_url_config/,
    },
    {
      name: 'cross-environment stack',
      stack: {
        Stacks: [{
          StackStatus: 'UPDATE_COMPLETE',
          Parameters: [{ ParameterKey: 'EnvironmentName', ParameterValue: 'production' }],
          Outputs: [{ OutputKey: 'FunctionArn', OutputValue: baseArn }],
        }],
      },
      error: /authoring_stack_environment_mismatch/,
    },
  ];

  for (const item of cases) {
    await assert.rejects(async () => oidcSetup.resolveAuthoringTarget({
      accountId: '123456789012',
      environment: 'test',
      region: 'us-east-1',
      stackName: `stack-${item.name}`,
      awsJsonFn: async args => {
        if (args[0] === 'cloudformation' && args[1] === 'describe-stacks') return item.stack;
        if (args[0] === 'cloudformation' && args[1] === 'describe-stack-resource') {
          return item.resource ?? {
            StackResourceDetail: {
              LogicalResourceId: 'ConfigAuthoringFunction',
              PhysicalResourceId: 'authoring-test',
              ResourceType: 'AWS::Lambda::Function',
            },
          };
        }
        if (args[0] === 'lambda' && args[1] === 'get-function') {
          return { Configuration: { FunctionArn: baseArn } };
        }
        return item.urlConfig ?? { FunctionArn: baseArn, AuthType: 'AWS_IAM', InvokeMode: 'BUFFERED' };
      },
    }), item.error, item.name);
  }
});
