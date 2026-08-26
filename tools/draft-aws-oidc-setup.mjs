import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual, promisify } from 'node:util';

import { assertScopedApply, readDraftRegistry, selectRegisteredDrafts } from './draft-repo-preflight.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_AUTHORING_STACK_NAMES = {
  test: 'zoolanding-config-authoring-test',
  production: 'zoolanding-config-authoring',
};
const GITHUB_OIDC_HOST = 'token.actions.githubusercontent.com';
const GITHUB_OIDC_THUMBPRINTS = [
  '6938fd4d98bab03faadb97b34396831e3780aea1',
  '1c58a3a8518e8759bf075b76b750d4f2df264fcd',
];
const GITHUB_API_VERSION = '2026-03-10';
const GITHUB_IMMUTABLE_SUBJECT_CUTOFF = Date.parse('2026-07-15T00:00:00Z');
const DEPLOY_ACTIONS = ['createSite', 'upsertDraft', 'publishDraft', 'getSite'];

function parseArgs(rawArgs) {
  const args = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    args[rawKey.trim()] = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
  }
  return args;
}

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function resolveApplyEnvironment({ apply, environment }) {
  if (!apply) return undefined;
  if (!environment) throw new Error('apply_requires_explicit_environment');
  if (!['test', 'production'].includes(environment)) {
    throw new Error('unsupported_apply_environment');
  }
  return environment;
}

function resolveAuthoringStackNames(args) {
  if ('authoring-test-stack-name' in args || 'authoring-production-stack-name' in args) {
    throw new Error('authoring_stack_override_forbidden');
  }
  if ('authoring-api-id' in args || 'authoring-function-name' in args) {
    throw new Error('legacy_authoring_target_override_forbidden');
  }
  return { ...DEFAULT_AUTHORING_STACK_NAMES };
}

function normalizeDomain(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split(':', 1)[0]
    .replace(/^\/+|\/+$/g, '');
}

function domainSlug(domain) {
  return normalizeDomain(domain).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function roleNameFor(domain, environment) {
  return `draft-${domainSlug(domain)}-${environment}-deploy`;
}

async function awsJson(args, options = {}) {
  const result = await execFileAsync('aws', [...args, '--output', 'json'], { windowsHide: true, ...options });
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

async function awsText(args, options = {}) {
  const result = await execFileAsync('aws', args, { windowsHide: true, ...options });
  return result.stdout.trim();
}

async function ghJson(args, options = {}) {
  const result = await execFileAsync('gh', args, { windowsHide: true, ...options });
  return result.stdout.trim() ? JSON.parse(result.stdout) : {};
}

async function readRegisteredDraftInventory(registryPath) {
  const registry = await readDraftRegistry(registryPath);
  return {
    owner: registry.owner,
    drafts: registry.drafts
      .map(draft => ({
        domain: draft.domain,
        owner: draft.owner ?? registry.owner,
        repo: draft.repo,
        deploymentEnvironments: draft.deploymentEnvironments,
      }))
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}

async function readRegisteredDrafts(registryPath) {
  return (await readRegisteredDraftInventory(registryPath)).drafts;
}

function resolveSelectedDraftOwners(drafts, requestedOwner) {
  const owners = [...new Set(drafts.map(draft => draft.owner))].sort();
  if (owners.length === 0 || owners.some(owner => typeof owner !== 'string' || owner.length === 0)) {
    throw new Error('selected_draft_owner_missing');
  }
  if (requestedOwner && (owners.length !== 1 || owners[0] !== requestedOwner)) {
    throw new Error('selected_draft_owner_mismatch');
  }
  return owners;
}

function buildDeploymentRoleInventory(drafts) {
  const inventory = [];
  const seenRoleNames = new Set();
  for (const draft of drafts) {
    for (const environment of draft.deploymentEnvironments ?? ['test', 'production']) {
      const roleName = roleNameFor(draft.domain, environment);
      if (roleName.length > 64 || !/^[a-z0-9-]+$/.test(roleName)) {
        throw new Error(`invalid_deployment_role_name:${roleName}`);
      }
      if (seenRoleNames.has(roleName)) {
        throw new Error(`duplicate_deployment_role_name:${roleName}`);
      }
      seenRoleNames.add(roleName);
      inventory.push({ ...draft, environment, roleName });
    }
  }
  return inventory;
}

async function getAccountId() {
  const identity = await awsJson(['sts', 'get-caller-identity']);
  return String(identity.Account || '').trim();
}

function oidcProviderArn(accountId) {
  return `arn:aws:iam::${accountId}:oidc-provider/${GITHUB_OIDC_HOST}`;
}

async function readOidcProvider({ accountId, awsJsonFn = awsJson }) {
  const providerArn = oidcProviderArn(accountId);
  const providers = await awsJsonFn(['iam', 'list-open-id-connect-providers']);
  const exists = Array.isArray(providers.OpenIDConnectProviderList)
    && providers.OpenIDConnectProviderList.some(provider => provider.Arn === providerArn);
  if (!exists) throw new Error('github_oidc_provider_missing');
  const provider = await awsJsonFn([
    'iam',
    'get-open-id-connect-provider',
    '--open-id-connect-provider-arn',
    providerArn,
  ]);
  const clientIds = provider.ClientIDList;
  const thumbprints = provider.ThumbprintList;
  if (
    provider.Url !== GITHUB_OIDC_HOST
    || !Array.isArray(clientIds)
    || clientIds.length !== 1
    || clientIds[0] !== 'sts.amazonaws.com'
    || !Array.isArray(thumbprints)
    || thumbprints.length !== GITHUB_OIDC_THUMBPRINTS.length
    || !GITHUB_OIDC_THUMBPRINTS.every(thumbprint => thumbprints.includes(thumbprint))
  ) {
    throw new Error('unsafe_github_oidc_provider');
  }
  return { arn: providerArn, created: false, exists: true };
}

function assertGitHubRepositoryCoordinates(owner, repo) {
  if (
    typeof owner !== 'string'
    || owner.trim() !== owner
    || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)
  ) {
    throw new Error('invalid_github_owner');
  }
  if (
    typeof repo !== 'string'
    || repo.trim() !== repo
    || repo.length > 100
    || !/^[A-Za-z0-9._-]+$/.test(repo)
    || repo === '.'
    || repo === '..'
  ) {
    throw new Error('invalid_github_repository');
  }
}

function parseGitHubOidcSubjectPrefix(subjectPrefix, owner, repo) {
  assertGitHubRepositoryCoordinates(owner, repo);
  if (
    typeof subjectPrefix !== 'string'
    || subjectPrefix.trim() !== subjectPrefix
    || subjectPrefix.includes('*')
    || subjectPrefix.includes('?')
  ) {
    throw new Error('invalid_github_oidc_subject_prefix');
  }
  const immutable = subjectPrefix.match(
    /^repo:([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))@([1-9][0-9]*)\/([A-Za-z0-9._-]+)@([1-9][0-9]*)$/,
  );
  const legacy = subjectPrefix.match(
    /^repo:([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+)$/,
  );
  if (!immutable && !legacy) throw new Error('invalid_github_oidc_subject_prefix');
  const prefixOwner = immutable?.[1] ?? legacy[1];
  const prefixRepo = immutable?.[3] ?? legacy[2];
  if (
    prefixOwner.toLowerCase() !== owner.toLowerCase()
    || prefixRepo.toLowerCase() !== repo.toLowerCase()
  ) {
    throw new Error('github_oidc_subject_repository_mismatch');
  }
  return { immutable: Boolean(immutable), subjectPrefix };
}

function githubApiHeaders() {
  return [
    '-H',
    'Accept: application/vnd.github+json',
    '-H',
    `X-GitHub-Api-Version: ${GITHUB_API_VERSION}`,
  ];
}

function parseCanonicalGitHubTimestamp(value) {
  if (
    typeof value !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)
  ) {
    return Number.NaN;
  }
  return Date.parse(value);
}

async function readRepositoryOidcSubject({
  owner,
  repo,
  environment,
  ghJsonFn = ghJson,
}) {
  assertGitHubRepositoryCoordinates(owner, repo);
  if (!['test', 'production'].includes(environment)) {
    throw new Error('unsupported_deployment_environment');
  }
  const customization = await ghJsonFn([
    'api',
    `/repos/${owner}/${repo}/actions/oidc/customization/sub`,
    ...githubApiHeaders(),
  ]);
  if (!customization || typeof customization !== 'object' || Array.isArray(customization)) {
    throw new Error('invalid_github_oidc_customization');
  }
  if (customization.use_default !== true) {
    throw new Error('unsupported_github_oidc_customization');
  }
  if (
    'use_immutable_subject' in customization
    && typeof customization.use_immutable_subject !== 'boolean'
  ) {
    throw new Error('invalid_github_oidc_customization');
  }

  const suppliedPrefix = customization.sub_claim_prefix;
  if (suppliedPrefix !== undefined && suppliedPrefix !== null) {
    const parsed = parseGitHubOidcSubjectPrefix(suppliedPrefix, owner, repo);
    if (customization.use_immutable_subject === true && !parsed.immutable) {
      throw new Error('github_oidc_subject_mode_mismatch');
    }
    return {
      subject: `${parsed.subjectPrefix}:environment:${environment}`,
      subjectPrefix: parsed.subjectPrefix,
      source: parsed.immutable ? 'github-immutable-prefix' : 'github-default-prefix',
      evidence: { useDefault: true, immutable: parsed.immutable },
    };
  }
  if (customization.use_immutable_subject === true) {
    throw new Error('github_oidc_immutable_prefix_missing');
  }

  const repository = await ghJsonFn([
    'api',
    `/repos/${owner}/${repo}`,
    ...githubApiHeaders(),
  ]);
  const canonicalOwner = repository?.owner?.login;
  const canonicalRepo = repository?.name;
  const fullName = repository?.full_name;
  if (
    !Number.isSafeInteger(repository?.id)
    || repository.id <= 0
    || !Number.isSafeInteger(repository?.owner?.id)
    || repository.owner.id <= 0
    || typeof canonicalOwner !== 'string'
    || typeof canonicalRepo !== 'string'
    || typeof fullName !== 'string'
    || canonicalOwner.toLowerCase() !== owner.toLowerCase()
    || canonicalRepo.toLowerCase() !== repo.toLowerCase()
    || fullName.toLowerCase() !== `${owner}/${repo}`.toLowerCase()
  ) {
    throw new Error('github_oidc_repository_mismatch');
  }
  assertGitHubRepositoryCoordinates(canonicalOwner, canonicalRepo);
  const createdAt = repository.created_at;
  const createdAtMs = parseCanonicalGitHubTimestamp(createdAt);
  const explicitLegacy = customization.use_immutable_subject === false;
  if (!Number.isFinite(createdAtMs) || (!explicitLegacy && createdAtMs >= GITHUB_IMMUTABLE_SUBJECT_CUTOFF)) {
    throw new Error('github_oidc_legacy_evidence_missing');
  }
  const subjectPrefix = `repo:${canonicalOwner}/${canonicalRepo}`;
  return {
    subject: `${subjectPrefix}:environment:${environment}`,
    subjectPrefix,
    source: 'github-legacy-default',
    evidence: {
      useDefault: true,
      immutable: false,
      repositoryCreatedAt: createdAt,
    },
  };
}

function assertResolvedRepositoryOidcSubject(identity, owner, repo, environment) {
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
    throw new Error('invalid_resolved_github_oidc_subject');
  }
  const parsed = parseGitHubOidcSubjectPrefix(identity.subjectPrefix, owner, repo);
  if (identity.subject !== `${identity.subjectPrefix}:environment:${environment}`) {
    throw new Error('invalid_resolved_github_oidc_subject');
  }
  const expectedSources = parsed.immutable
    ? ['github-immutable-prefix']
    : ['github-default-prefix', 'github-legacy-default'];
  if (
    !expectedSources.includes(identity.source)
    || identity.evidence?.useDefault !== true
    || identity.evidence?.immutable !== parsed.immutable
  ) {
    throw new Error('invalid_resolved_github_oidc_subject');
  }
  if (
    identity.source === 'github-legacy-default'
    && (
      typeof identity.evidence.repositoryCreatedAt !== 'string'
      || !Number.isFinite(parseCanonicalGitHubTimestamp(identity.evidence.repositoryCreatedAt))
    )
  ) {
    throw new Error('invalid_resolved_github_oidc_subject');
  }
}

function trustPolicy({ providerArn, subject, environment }) {
  const branch = environment === 'test'
    ? 'test'
    : environment === 'production'
      ? 'main'
      : undefined;
  if (!branch) throw new Error('unsupported_deployment_environment');
  const suffix = `:environment:${environment}`;
  if (typeof subject !== 'string' || !subject.endsWith(suffix)) {
    throw new Error('invalid_github_oidc_subject');
  }
  const subjectPrefix = subject.slice(0, -suffix.length);
  const immutable = subjectPrefix.match(
    /^repo:([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))@[1-9][0-9]*\/([A-Za-z0-9._-]+)@[1-9][0-9]*$/,
  );
  const legacy = subjectPrefix.match(
    /^repo:([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]+)$/,
  );
  const subjectOwner = immutable?.[1] ?? legacy?.[1];
  const subjectRepo = immutable?.[2] ?? legacy?.[2];
  if (!subjectOwner || !subjectRepo) throw new Error('invalid_github_oidc_subject');
  parseGitHubOidcSubjectPrefix(subjectPrefix, subjectOwner, subjectRepo);
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { Federated: providerArn },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          StringEquals: {
            [`${GITHUB_OIDC_HOST}:aud`]: 'sts.amazonaws.com',
            [`${GITHUB_OIDC_HOST}:sub`]: subject,
            [`${GITHUB_OIDC_HOST}:ref`]: `refs/heads/${branch}`,
          },
        },
      },
    ],
  };
}

function invokePolicy({ authoringFunctionArn }) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: 'lambda:InvokeFunctionUrl',
        Resource: authoringFunctionArn,
        Condition: {
          StringEquals: {
            'lambda:FunctionUrlAuthType': 'AWS_IAM',
          },
        },
      },
      {
        Effect: 'Allow',
        Action: 'lambda:InvokeFunction',
        Resource: authoringFunctionArn,
        Condition: {
          Bool: {
            'lambda:InvokedViaFunctionUrl': 'true',
          },
        },
      },
    ],
  };
}

async function resolveAuthoringTarget({
  accountId,
  environment,
  region,
  stackName,
  awsJsonFn = awsJson,
}) {
  const stackDescription = await awsJsonFn([
    'cloudformation',
    'describe-stacks',
    '--region',
    region,
    '--stack-name',
    stackName,
  ]);
  const stacks = stackDescription.Stacks;
  if (!Array.isArray(stacks) || stacks.length !== 1) {
    throw new Error('invalid_authoring_stack');
  }
  if (!['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'IMPORT_COMPLETE'].includes(stacks[0].StackStatus)) {
    throw new Error('authoring_stack_not_stable');
  }
  const environmentParameters = (stacks[0].Parameters || [])
    .filter(parameter => parameter.ParameterKey === 'EnvironmentName')
    .map(parameter => parameter.ParameterValue);
  const expectedEnvironmentName = { test: 'test', production: 'production' }[environment];
  if (!expectedEnvironmentName) throw new Error('unsupported_authoring_environment');
  if (environmentParameters.length !== 1 || environmentParameters[0] !== expectedEnvironmentName) {
    throw new Error('authoring_stack_environment_mismatch');
  }
  const functionArnOutputs = (stacks[0].Outputs || [])
    .filter(output => output.OutputKey === 'FunctionArn')
    .map(output => String(output.OutputValue || '').trim())
    .filter(Boolean);
  if (functionArnOutputs.length > 1) {
    throw new Error('ambiguous_authoring_function_arn_output');
  }

  const stackResource = await awsJsonFn([
    'cloudformation',
    'describe-stack-resource',
    '--region',
    region,
    '--stack-name',
    stackName,
    '--logical-resource-id',
    'ConfigAuthoringFunction',
  ]);
  const resource = stackResource.StackResourceDetail;
  if (
    resource?.LogicalResourceId !== 'ConfigAuthoringFunction'
    || resource?.ResourceType !== 'AWS::Lambda::Function'
    || !String(resource?.PhysicalResourceId || '').trim()
  ) {
    throw new Error('invalid_authoring_function_resource');
  }

  const liveFunction = await awsJsonFn([
    'lambda',
    'get-function',
    '--region',
    region,
    '--function-name',
    resource.PhysicalResourceId,
  ]);
  const liveFunctionArn = String(liveFunction.Configuration?.FunctionArn || '').trim();
  const expectedPrefix = `arn:aws:lambda:${region}:${accountId}:function:`;
  const functionName = liveFunctionArn.slice(expectedPrefix.length);
  if (!liveFunctionArn.startsWith(expectedPrefix) || !/^[A-Za-z0-9-_]+$/.test(functionName)) {
    throw new Error('invalid_authoring_function_arn');
  }
  if (functionArnOutputs.length === 1 && functionArnOutputs[0] !== liveFunctionArn) {
    throw new Error('authoring_function_arn_mismatch');
  }

  const functionUrlConfig = await awsJsonFn([
    'lambda',
    'get-function-url-config',
    '--region',
    region,
    '--function-name',
    liveFunctionArn,
  ]);
  if (
    functionUrlConfig.FunctionArn !== liveFunctionArn
    || functionUrlConfig.AuthType !== 'AWS_IAM'
    || functionUrlConfig.InvokeMode !== 'BUFFERED'
  ) {
    throw new Error('unsafe_authoring_function_url_config');
  }

  return {
    environment,
    stackName,
    functionArn: liveFunctionArn,
    source: functionArnOutputs.length === 1 ? 'stack-output' : 'stack-resource-readback',
  };
}

function isNoSuchEntity(error) {
  return String(error?.stderr || error?.message || error).includes('NoSuchEntity');
}

async function readRoleState(roleName, awsJsonFn = awsJson) {
  let role;
  try {
    role = await awsJsonFn(['iam', 'get-role', '--role-name', roleName]);
  } catch (error) {
    if (!isNoSuchEntity(error)) throw error;
    return { exists: false, trust: undefined, policy: undefined };
  }

  const [inlinePolicies, managedPolicies] = await Promise.all([
    awsJsonFn(['iam', 'list-role-policies', '--role-name', roleName]),
    awsJsonFn(['iam', 'list-attached-role-policies', '--role-name', roleName]),
  ]);
  if (
    !Array.isArray(inlinePolicies.PolicyNames)
    || inlinePolicies.PolicyNames.length !== 1
    || inlinePolicies.PolicyNames[0] !== 'InvokeConfigAuthoring'
  ) {
    throw new Error(`unexpected_inline_role_policies:${roleName}`);
  }
  if (!Array.isArray(managedPolicies.AttachedPolicies) || managedPolicies.AttachedPolicies.length !== 0) {
    throw new Error(`unexpected_managed_role_policies:${roleName}`);
  }
  const policy = await awsJsonFn([
    'iam',
    'get-role-policy',
    '--role-name',
    roleName,
    '--policy-name',
    'InvokeConfigAuthoring',
  ]);
  return {
    exists: true,
    trust: role.Role?.AssumeRolePolicyDocument,
    policy: policy.PolicyDocument,
  };
}

function deploymentRoleChanges({ currentTrust, currentPolicy, targetTrust, targetPolicy }) {
  return {
    trust: !isDeepStrictEqual(currentTrust, targetTrust),
    policy: !isDeepStrictEqual(currentPolicy, targetPolicy),
  };
}

async function planRole({
  accountId,
  providerArn,
  owner,
  authoringFunctionArn,
  domain,
  repo,
  environment,
  readRepositoryOidcSubjectFn = readRepositoryOidcSubject,
  readRoleStateFn = readRoleState,
}) {
  const roleName = roleNameFor(domain, environment);
  const oidcSubject = await readRepositoryOidcSubjectFn({ owner, repo, environment });
  assertResolvedRepositoryOidcSubject(oidcSubject, owner, repo, environment);
  const trust = trustPolicy({ providerArn, subject: oidcSubject.subject, environment });
  const policy = invokePolicy({ authoringFunctionArn });
  const current = await readRoleStateFn(roleName);
  const changes = deploymentRoleChanges({
    currentTrust: current.trust,
    currentPolicy: current.policy,
    targetTrust: trust,
    targetPolicy: policy,
  });

  return {
    roleName,
    roleArn: `arn:aws:iam::${accountId}:role/${roleName}`,
    owner,
    repo,
    domain,
    environment,
    oidcSubject,
    existed: current.exists,
    wouldChange: changes.trust || changes.policy,
    changed: false,
    changes,
    current,
    targetTrust: trust,
    targetPolicy: policy,
  };
}

function roleMutationOrder({ exists, changes }) {
  if (!exists) return ['create', 'policy'];
  return ['policy', 'trust'].filter(operation => changes[operation]);
}

async function applyRolePlan(plan, {
  cwd = process.cwd(),
  readRepositoryOidcSubjectFn = readRepositoryOidcSubject,
  readRoleStateFn = readRoleState,
  awsTextFn = awsText,
} = {}) {
  const readAndVerifyOidcSubject = async () => {
    const latestOidcSubject = await readRepositoryOidcSubjectFn({
      owner: plan.owner,
      repo: plan.repo,
      environment: plan.environment,
    });
    assertResolvedRepositoryOidcSubject(
      latestOidcSubject,
      plan.owner,
      plan.repo,
      plan.environment,
    );
    if (!isDeepStrictEqual(latestOidcSubject, plan.oidcSubject)) {
      throw new Error(`deployment_oidc_subject_changed_after_preflight:${plan.roleName}`);
    }
  };
  await readAndVerifyOidcSubject();
  const latest = await readRoleStateFn(plan.roleName);
  if (!isDeepStrictEqual(latest, plan.current)) {
    throw new Error(`deployment_role_changed_after_preflight:${plan.roleName}`);
  }
  if (!plan.wouldChange) return false;

  const trustFile = path.join(cwd, `.tmp-${plan.roleName}-trust.json`);
  const policyFile = path.join(cwd, `.tmp-${plan.roleName}-policy.json`);
  await writeFile(trustFile, JSON.stringify(plan.targetTrust, null, 2), 'utf8');
  await writeFile(policyFile, JSON.stringify(plan.targetPolicy, null, 2), 'utf8');
  try {
    for (const operation of roleMutationOrder({ exists: plan.current.exists, changes: plan.changes })) {
      if (operation === 'create') {
        await awsTextFn([
          'iam',
          'create-role',
          '--role-name',
          plan.roleName,
          '--assume-role-policy-document',
          `file://${trustFile}`,
        ]);
      } else if (operation === 'policy') {
        await awsTextFn([
          'iam',
          'put-role-policy',
          '--role-name',
          plan.roleName,
          '--policy-name',
          'InvokeConfigAuthoring',
          '--policy-document',
          `file://${policyFile}`,
        ]);
      } else {
        await awsTextFn([
          'iam',
          'update-assume-role-policy',
          '--role-name',
          plan.roleName,
          '--policy-document',
          `file://${trustFile}`,
        ]);
      }
    }
  } finally {
    const { rm } = await import('node:fs/promises');
    await rm(trustFile, { force: true });
    await rm(policyFile, { force: true });
  }

  const updated = await readRoleStateFn(plan.roleName);
  if (
    !updated.exists
    || !isDeepStrictEqual(updated.trust, plan.targetTrust)
    || !isDeepStrictEqual(updated.policy, plan.targetPolicy)
  ) {
    throw new Error(`deployment_role_readback_mismatch:${plan.roleName}`);
  }
  await readAndVerifyOidcSubject();
  return true;
}

async function planThenApplyRoles({
  apply,
  applyEnvironment,
  roleInventory,
  planRoleFn,
  applyRolePlanFn,
}) {
  const plans = [];
  for (const role of roleInventory) plans.push(await planRoleFn(role));
  if (apply) {
    for (const plan of plans.filter(role => role.environment === applyEnvironment)) {
      plan.changed = await applyRolePlanFn(plan);
    }
  }
  return plans;
}

function deployAuthzConfig(roles) {
  return roles.map(role => ({
    roleName: role.roleName,
    domains: [role.domain],
    environments: [role.environment],
    actions: DEPLOY_ACTIONS,
  }));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = truthy(args.apply);
  const requestedDomain = assertScopedApply(apply, args.domain);
  const applyEnvironment = resolveApplyEnvironment({ apply, environment: args.environment });
  const region = args.region || DEFAULT_REGION;
  const authoringStackNames = resolveAuthoringStackNames(args);
  const registryPath = path.resolve(args.registry || 'docs/drafts-registry.json');
  const registeredInventory = await readRegisteredDraftInventory(registryPath);
  const selectedDrafts = selectRegisteredDrafts(registeredInventory.drafts, requestedDomain);
  const selectedOwners = resolveSelectedDraftOwners(selectedDrafts, args.owner);
  const roleInventory = buildDeploymentRoleInventory(selectedDrafts);
  if (apply && !roleInventory.some(role => role.environment === applyEnvironment)) {
    throw new Error(`selected_draft_deployment_environment_not_allowed:${applyEnvironment}`);
  }
  const accountId = await getAccountId();
  const authoringTargets = {};
  const selectedEnvironments = [...new Set(roleInventory.map(role => role.environment))];
  for (const environment of selectedEnvironments) {
    authoringTargets[environment] = await resolveAuthoringTarget({
      accountId,
      environment,
      region,
      stackName: authoringStackNames[environment],
    });
  }
  const provider = await readOidcProvider({ accountId });
  const rolePlans = await planThenApplyRoles({
    apply,
    applyEnvironment,
    roleInventory,
    planRoleFn: role => planRole({
      accountId,
      providerArn: provider.arn,
      owner: role.owner,
      authoringFunctionArn: authoringTargets[role.environment].functionArn,
      domain: role.domain,
      repo: role.repo,
      environment: role.environment,
    }),
    applyRolePlanFn: applyRolePlan,
  });
  const roles = rolePlans.map(({ current, targetTrust, targetPolicy, ...summary }) => summary);

  const result = {
    ok: true,
    apply,
    applyEnvironment,
    accountId,
    owner: selectedOwners.length === 1 ? selectedOwners[0] : registeredInventory.owner,
    selectedOwners,
    region,
    authoringTargets: Object.fromEntries(Object.entries(authoringTargets).map(([environment, target]) => [environment, {
      stackName: target.stackName,
      source: target.source,
    }])),
    registryPath,
    oidcProvider: provider,
    roles,
    deployAuthzConfig: deployAuthzConfig(roles),
  };
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  applyRolePlan,
  buildDeploymentRoleInventory,
  deploymentRoleChanges,
  deployAuthzConfig,
  domainSlug,
  invokePolicy,
  planRole,
  readOidcProvider,
  readRepositoryOidcSubject,
  readRoleState,
  readRegisteredDraftInventory,
  readRegisteredDrafts,
  resolveSelectedDraftOwners,
  resolveApplyEnvironment,
  resolveAuthoringStackNames,
  resolveAuthoringTarget,
  roleMutationOrder,
  roleNameFor,
  planThenApplyRoles,
  trustPolicy,
};
