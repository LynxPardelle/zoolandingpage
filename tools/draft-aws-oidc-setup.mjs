import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual, promisify } from 'node:util';

import { readDraftRegistry } from './draft-repo-preflight.mjs';

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

async function readRegisteredDraftInventory(registryPath) {
  const registry = await readDraftRegistry(registryPath);
  return {
    owner: registry.owner,
    drafts: registry.drafts
      .map(draft => ({ domain: draft.domain, repo: draft.repo }))
      .sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}

async function readRegisteredDrafts(registryPath) {
  return (await readRegisteredDraftInventory(registryPath)).drafts;
}

function resolveRegistryOwner(registryOwner, requestedOwner) {
  if (requestedOwner && requestedOwner !== registryOwner) {
    throw new Error('registry_owner_mismatch');
  }
  return registryOwner;
}

function buildDeploymentRoleInventory(drafts) {
  const inventory = [];
  const seenRoleNames = new Set();
  for (const draft of drafts) {
    for (const environment of ['test', 'production']) {
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

function trustPolicy({ providerArn, owner, repo, environment }) {
  const branch = environment === 'test'
    ? 'test'
    : environment === 'production'
      ? 'main'
      : undefined;
  if (!branch) throw new Error('unsupported_deployment_environment');
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
            [`${GITHUB_OIDC_HOST}:sub`]: `repo:${owner}/${repo}:environment:${environment}`,
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
  readRoleStateFn = readRoleState,
}) {
  const roleName = roleNameFor(domain, environment);
  const trust = trustPolicy({ providerArn, owner, repo, environment });
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
    repo,
    domain,
    environment,
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
  readRoleStateFn = readRoleState,
  awsTextFn = awsText,
} = {}) {
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
  const applyEnvironment = resolveApplyEnvironment({ apply, environment: args.environment });
  const region = args.region || DEFAULT_REGION;
  const authoringStackNames = resolveAuthoringStackNames(args);
  const registryPath = path.resolve(args.registry || 'docs/drafts-registry.json');
  const registeredInventory = await readRegisteredDraftInventory(registryPath);
  const owner = resolveRegistryOwner(registeredInventory.owner, args.owner);
  const roleInventory = buildDeploymentRoleInventory(registeredInventory.drafts);
  const accountId = await getAccountId();
  const authoringTargets = {};
  for (const environment of ['test', 'production']) {
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
      owner,
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
    owner,
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
  readRoleState,
  readRegisteredDraftInventory,
  readRegisteredDrafts,
  resolveRegistryOwner,
  resolveApplyEnvironment,
  resolveAuthoringStackNames,
  resolveAuthoringTarget,
  roleMutationOrder,
  roleNameFor,
  planThenApplyRoles,
  trustPolicy,
};
