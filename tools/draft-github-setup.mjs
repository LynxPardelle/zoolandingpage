import { execFile, spawn } from 'node:child_process';
import { constants, existsSync, readFileSync } from 'node:fs';
import { access, lstat, readFile, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { bootstrapDraftRepo } from './draft-repo-bootstrap.mjs';
import { domainSlug, roleNameFor } from './draft-aws-oidc-setup.mjs';
import {
  assertScopedApply,
  inspectRegisteredDraftRepo,
  readDraftRegistry,
  registeredDraftRepoPath,
  selectRegisteredDrafts,
} from './draft-repo-preflight.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_OWNER = 'LynxPardelle';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_AUTHORING_ENDPOINT = 'https://o4upx3fsz3d3dwfwz4lbnefjze0eetyn.lambda-url.us-east-1.on.aws/';
const DEFAULT_ACCOUNT_ID = '765932874577';
const GITHUB_ACTIONS_APP_ID = 15368;
const DRAFT_CONFIG_RELATIVE_PATH = 'draft-repo.config.json';
const PRODUCTION_WORKFLOW_RELATIVE_PATH = '.github/workflows/deploy-production.yml';
const PRODUCTION_WORKFLOW_TEMPLATE_PATH = fileURLToPath(new URL(
  './templates/draft-repo/.github/workflows/deploy-production.yml',
  import.meta.url,
));
const REVIEWED_PRODUCTION_WORKFLOW = readFileSync(
  PRODUCTION_WORKFLOW_TEMPLATE_PATH,
  'utf8',
).replaceAll('\r\n', '\n');

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

function resolveGithubSetupAccountId({ apply, accountId }) {
  const candidate = String(accountId ?? '').trim();
  if (apply && candidate === '') {
    throw new Error('apply_requires_explicit_account_id');
  }
  const resolvedAccountId = candidate || DEFAULT_ACCOUNT_ID;
  if (!/^\d{12}$/.test(resolvedAccountId)) {
    throw new Error('invalid_aws_account_id');
  }
  return resolvedAccountId;
}

function resolveGithubSetupAuthoringEndpoint({ apply, authoringEndpoint }) {
  const candidate = String(authoringEndpoint ?? '').trim();
  if (apply && candidate === '') {
    throw new Error('apply_requires_explicit_authoring_endpoint');
  }
  return candidate || DEFAULT_AUTHORING_ENDPOINT;
}

function bootstrapFlags(args) {
  const force = truthy(args.force);
  return {
    force,
    forceTemplates: force || truthy(args['force-templates']),
    forceGitignore: force || truthy(args['force-gitignore']),
  };
}

function normalizeDomain(value) {
  return String(value ?? '').trim().toLowerCase();
}

function repoNameForDomain(domain) {
  return `draft-${domainSlug(domain)}`;
}

function roleArnFor(accountId, domain, environment) {
  return `arn:aws:iam::${accountId}:role/${roleNameFor(domain, environment)}`;
}

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, options = {}) {
  const { input, ...execOptions } = options;
  if (input !== undefined) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        windowsHide: true,
        ...execOptions,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', chunk => {
        stdout += chunk;
      });
      child.stderr.on('data', chunk => {
        stderr += chunk;
      });
      child.on('error', reject);
      child.on('close', code => {
        if (code === 0) {
          resolve(stdout.trim());
          return;
        }
        const error = new Error(`Command failed: ${command} ${args.join(' ')}\n${stderr.trim()}`);
        error.code = code;
        reject(error);
      });
      child.stdin.end(input);
    });
  }
  const result = await execFileAsync(command, args, { windowsHide: true, ...execOptions });
  return result.stdout.trim();
}

async function git(cwd, args) {
  return run('git', args, { cwd });
}

async function gh(args, options = {}) {
  return run('gh', args, options);
}

async function readRegisteredDraftInventory(registryPath, cwd = process.cwd()) {
  if (!await exists(registryPath)) {
    throw new Error(`Draft registry not found: ${registryPath}`);
  }
  const registry = await readDraftRegistry(registryPath);
  if (registry.drafts.length === 0) {
    throw new Error(`Draft registry has no entries: ${registryPath}`);
  }
  return {
    owner: registry.owner,
    drafts: registry.drafts.map(draft => ({
      ...draft,
      repoPath: registeredDraftRepoPath(draft, cwd, registry.defaultBaseDir),
      registryRoot: cwd,
      defaultBaseDir: registry.defaultBaseDir,
    })).sort((a, b) => a.domain.localeCompare(b.domain)),
  };
}

async function inspectRegisteredRepo(draft, { apply = false } = {}) {
  const localDomain = String(draft.localPath ?? '').split('/').at(-1);
  if (localDomain && localDomain !== draft.domain) {
    return { repoPath: draft.repoPath, repoStatus: 'domain-transition' };
  }
  const inspected = await inspectRegisteredDraftRepo(draft, {
    cwd: draft.registryRoot ?? process.cwd(),
    defaultBaseDir: draft.defaultBaseDir ?? 'drafts',
  });
  const repoPath = inspected.repoPath;
  if (inspected.status !== 'present') {
    return { repoPath, repoStatus: inspected.status };
  }

  const status = await git(repoPath, ['status', '--porcelain']);
  if (status) return { repoPath, repoStatus: 'dirty' };
  const branch = await currentBranch(repoPath);
  if (apply) await git(repoPath, ['fetch', '--all', '--prune']);
  return { repoPath, repoStatus: 'ready', branch };
}

function productionWorkflowHasReviewedGuard(source) {
  return String(source ?? '').replaceAll('\r\n', '\n') === REVIEWED_PRODUCTION_WORKFLOW;
}

async function readProductionEnvironmentFromGithub({ owner, repo, requestJson = ghJson }) {
  try {
    const names = [];
    for (let page = 1; page <= 100; page += 1) {
      const response = await requestJson([
        'api',
        `/repos/${owner}/${repo}/environments?per_page=100&page=${page}`,
      ]);
      if (
        !Number.isSafeInteger(response?.total_count)
        || response.total_count < 0
        || !Array.isArray(response.environments)
        || response.environments.length > 100
        || response.environments.some(environment => (
          typeof environment?.name !== 'string' || environment.name.trim() === ''
        ))
      ) {
        throw new Error('invalid_environment_inventory');
      }
      names.push(...response.environments.map(environment => environment.name.toLowerCase()));
      if (new Set(names).size !== names.length) throw new Error('invalid_environment_inventory');
      if (names.length > response.total_count) throw new Error('invalid_environment_inventory');
      if (names.length === response.total_count) {
        return { exists: names.includes('production') };
      }
      if (response.environments.length === 0) throw new Error('incomplete_environment_inventory');
    }
    throw new Error('incomplete_environment_inventory');
  } catch {
    throw new Error('github_production_environment_inspection_failed');
  }
}

async function readRepositoryFileFromGithub({
  owner,
  repo,
  branch,
  filePath,
  requestJson = ghJson,
}) {
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
  try {
    const response = await requestJson([
      'api',
      `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
    ]);
    if (response?.type !== 'file' || response.encoding !== 'base64' || typeof response.content !== 'string') {
      throw new Error('invalid_repository_file');
    }
    const encoded = response.content.replace(/\s/g, '');
    if (
      encoded.length % 4 !== 0
      || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
    ) {
      throw new Error('invalid_repository_file');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.toString('base64') !== encoded) throw new Error('invalid_repository_file');
    return { exists: true, source: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('(HTTP 404)')) return { exists: false };
    throw new Error('github_repository_file_inspection_failed');
  }
}

async function readProductionRoleFromAws({
  accountId,
  roleName,
  profile,
  runCommand = run,
}) {
  const profileArgs = profile ? ['--profile', profile] : [];
  let identity;
  try {
    identity = JSON.parse(await runCommand('aws', [
      'sts',
      'get-caller-identity',
      '--output',
      'json',
      ...profileArgs,
    ]));
  } catch {
    throw new Error('aws_production_role_inspection_failed');
  }
  if (identity?.Account !== accountId) {
    throw new Error('aws_production_role_account_mismatch');
  }
  try {
    const response = JSON.parse(await runCommand('aws', [
      'iam',
      'get-role',
      '--role-name',
      roleName,
      '--output',
      'json',
      ...profileArgs,
    ]));
    if (response?.Role?.RoleName !== roleName) {
      throw new Error('invalid_role_inventory');
    }
    return { exists: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('NoSuchEntity')) return { exists: false };
    throw new Error('aws_production_role_inspection_failed');
  }
}

function driftIssue(code, file = undefined) {
  return file ? { code, file } : { code };
}

function pendingProductionDecommission(draft, githubEnvironmentStatus, awsRoleStatus) {
  const pending = [];
  if (githubEnvironmentStatus !== 'absent') {
    pending.push({
      surface: 'github_environment',
      environment: 'production',
      status: githubEnvironmentStatus === 'present'
        ? 'manual_decommission_required'
        : 'verification_pending',
    });
    pending.push({
      surface: 'github_environment_variables',
      environment: 'production',
      status: githubEnvironmentStatus === 'present'
        ? 'manual_review_required'
        : 'verification_pending',
    });
  }
  if (awsRoleStatus !== 'absent') {
    pending.push({
      surface: 'aws_oidc_role',
      environment: 'production',
      roleName: roleNameFor(draft.domain, 'production'),
      status: awsRoleStatus === 'present'
        ? 'manual_decommission_required'
        : 'verification_pending',
    });
  }
  return pending;
}

function inspectTestOnlyConfigSource(source, { codePrefix = '', file }) {
  const issues = [];
  let config;
  try {
    config = JSON.parse(source);
  } catch {
    return [driftIssue(`${codePrefix}draft_repo_config_unreadable`, file)];
  }
  const mainBranch = config?.branches?.main;
  if (mainBranch?.deploys !== false) {
    issues.push(driftIssue(`${codePrefix}draft_repo_config_main_deploys_production`, file));
  }
  if (mainBranch && Object.hasOwn(mainBranch, 'environment')) {
    issues.push(driftIssue(`${codePrefix}draft_repo_config_main_environment_production`, file));
  }
  if (config?.githubVariables && Object.hasOwn(config.githubVariables, 'production')) {
    issues.push(driftIssue(`${codePrefix}draft_repo_config_production_variables_declared`, file));
  }
  return issues;
}

async function inspectTestOnlyProductionDrift({
  draft,
  owner = draft.owner || DEFAULT_OWNER,
  accountId = DEFAULT_ACCOUNT_ID,
  awsProfile,
  readProductionEnvironment = readProductionEnvironmentFromGithub,
  readProductionRole = readProductionRoleFromAws,
  readRemoteFile = readRepositoryFileFromGithub,
}) {
  const deploymentEnvironments = draft.deploymentEnvironments ?? ['test', 'production'];
  if (deploymentEnvironments.includes('production')) {
    return {
      applicable: false,
      ok: true,
      issues: [],
      decommissionPending: [],
      githubProductionEnvironment: 'not-applicable',
      awsProductionRole: 'not-applicable',
    };
  }

  const issues = [];
  const configPath = path.join(draft.repoPath, DRAFT_CONFIG_RELATIVE_PATH);
  const workflowPath = path.join(draft.repoPath, ...PRODUCTION_WORKFLOW_RELATIVE_PATH.split('/'));
  try {
    issues.push(...inspectTestOnlyConfigSource(await readFile(configPath, 'utf8'), {
      file: DRAFT_CONFIG_RELATIVE_PATH,
    }));
  } catch {
    issues.push(driftIssue('draft_repo_config_unreadable', DRAFT_CONFIG_RELATIVE_PATH));
  }

  for (const branch of ['test', 'main']) {
    const codePrefix = `remote_${branch}_`;
    try {
      const remoteConfig = await readRemoteFile({
        owner,
        repo: draft.repo,
        branch,
        filePath: DRAFT_CONFIG_RELATIVE_PATH,
      });
      if (!remoteConfig?.exists || typeof remoteConfig.source !== 'string') {
        issues.push(driftIssue(
          `${codePrefix}draft_repo_config_unreadable`,
          `${branch}:${DRAFT_CONFIG_RELATIVE_PATH}`,
        ));
      } else {
        issues.push(...inspectTestOnlyConfigSource(remoteConfig.source, {
          codePrefix,
          file: `${branch}:${DRAFT_CONFIG_RELATIVE_PATH}`,
        }));
      }
    } catch {
      issues.push(driftIssue(
        `${codePrefix}draft_repo_config_inspection_failed`,
        `${branch}:${DRAFT_CONFIG_RELATIVE_PATH}`,
      ));
    }

    try {
      const remoteWorkflow = await readRemoteFile({
        owner,
        repo: draft.repo,
        branch,
        filePath: PRODUCTION_WORKFLOW_RELATIVE_PATH,
      });
      if (
        !remoteWorkflow?.exists
        || typeof remoteWorkflow.source !== 'string'
        || !productionWorkflowHasReviewedGuard(remoteWorkflow.source)
      ) {
        issues.push(driftIssue(
          `${codePrefix}production_workflow_guard_not_reviewed`,
          `${branch}:${PRODUCTION_WORKFLOW_RELATIVE_PATH}`,
        ));
      }
    } catch {
      issues.push(driftIssue(
        `${codePrefix}production_workflow_inspection_failed`,
        `${branch}:${PRODUCTION_WORKFLOW_RELATIVE_PATH}`,
      ));
    }
  }

  try {
    const workflow = await readFile(workflowPath, 'utf8');
    if (!productionWorkflowHasReviewedGuard(workflow)) {
      issues.push(driftIssue(
        'production_workflow_guard_not_reviewed',
        PRODUCTION_WORKFLOW_RELATIVE_PATH,
      ));
    }
  } catch {
    issues.push(driftIssue(
      'production_workflow_guard_not_reviewed',
      PRODUCTION_WORKFLOW_RELATIVE_PATH,
    ));
  }

  let githubProductionEnvironment = 'unknown';
  try {
    const inspected = await readProductionEnvironment({ owner, repo: draft.repo, environment: 'production' });
    if (typeof inspected?.exists !== 'boolean') {
      throw new Error('github_production_environment_inspection_failed');
    }
    githubProductionEnvironment = inspected.exists ? 'present' : 'absent';
    if (inspected.exists) {
      issues.push(driftIssue('github_production_environment_present'));
    }
  } catch {
    issues.push(driftIssue('github_production_environment_inspection_failed'));
  }

  let awsProductionRole = 'unknown';
  try {
    const inspected = await readProductionRole({
      accountId,
      roleName: roleNameFor(draft.domain, 'production'),
      profile: awsProfile,
    });
    if (typeof inspected?.exists !== 'boolean') {
      throw new Error('aws_production_role_inspection_failed');
    }
    awsProductionRole = inspected.exists ? 'present' : 'absent';
    if (inspected.exists) issues.push(driftIssue('aws_production_role_present'));
  } catch {
    issues.push(driftIssue('aws_production_role_inspection_failed'));
  }

  const decommissionPending = pendingProductionDecommission(
    draft,
    githubProductionEnvironment,
    awsProductionRole,
  );
  return {
    applicable: true,
    ok: issues.length === 0 && decommissionPending.length === 0,
    issues,
    decommissionPending,
    githubProductionEnvironment,
    awsProductionRole,
  };
}

async function inspectDraftSetupPlans(drafts, options = {}) {
  const plans = [];
  for (const draft of drafts) {
    plans.push({
      draft,
      inspection: await inspectRegisteredRepo(draft, { apply: Boolean(options.apply) }),
    });
  }
  for (const plan of plans) {
    if (plan.inspection.repoStatus !== 'ready') continue;
    plan.productionDrift = await inspectTestOnlyProductionDrift({
      draft: plan.draft,
      owner: plan.draft.owner || options.owner || DEFAULT_OWNER,
      accountId: options.accountId,
      awsProfile: options.awsProfile,
      readProductionEnvironment: options.readProductionEnvironment,
      readProductionRole: options.readProductionRole,
      readRemoteFile: options.readRemoteFile,
    });
  }
  return plans;
}

async function preflightDraftSetups(drafts, options = {}) {
  const inspections = options.plans ?? await inspectDraftSetupPlans(drafts, options);
  const blockers = inspections.filter(item => (
    item.inspection.repoStatus !== 'ready'
    || item.productionDrift?.ok === false
  ));
  if (blockers.length > 0) {
    throw new Error(
      `Draft setup preflight failed: ${blockers
        .map(item => item.inspection.repoStatus !== 'ready'
          ? `${item.draft.repo}:${item.inspection.repoStatus}`
          : `${item.draft.repo}:test-only-production-drift(${item.productionDrift.issues
              .map(issue => issue.code)
              .join('|')})`)
        .join(', ')}`
    );
  }
  return inspections;
}

async function currentBranch(repoPath) {
  return git(repoPath, ['branch', '--show-current']);
}

async function ensureBranch(repoPath, branch, fromBranch, apply) {
  if (!apply) return;
  const branches = await git(repoPath, ['branch', '--list', branch]);
  if (!branches.trim()) {
    await git(repoPath, ['checkout', '-B', branch, fromBranch]);
  } else {
    await git(repoPath, ['checkout', branch]);
    await git(repoPath, ['merge', '--ff-only', fromBranch]);
  }
}

function testAliasesFor(domain, aliases = []) {
  void domain;
  const normalizedAliases = aliases.map(normalizeDomain).filter(Boolean);
  const names = new Set();
  for (const host of normalizedAliases) {
    if (host.startsWith('test.')) {
      names.add(host);
    }
  }
  return [...names].sort();
}

async function upsertTestEnvironmentAliases(repoPath, domain) {
  const candidates = [
    path.join(repoPath, 'site-config.json'),
    path.join(repoPath, domain, 'site-config.json'),
  ];
  const siteConfigPath = candidates.find(candidate => existsSync(candidate));
  if (!siteConfigPath) return false;
  const config = JSON.parse(await readFile(siteConfigPath, 'utf8'));
  const aliases = Array.isArray(config.aliases) ? config.aliases : [];
  const productionAliases = aliases.filter(alias => !normalizeDomain(alias).startsWith('test.'));
  config.aliases = productionAliases;
  config.environments = config.environments && typeof config.environments === 'object' ? config.environments : {};
  config.environments.test = config.environments.test && typeof config.environments.test === 'object'
    ? config.environments.test
    : {};
  const existingTestAliases = Array.isArray(config.environments.test.aliases) ? config.environments.test.aliases : [];
  config.environments.test.aliases = [...new Set([...existingTestAliases, ...testAliasesFor(domain, aliases)])].sort();
  await writeFile(siteConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return true;
}

async function commitAndPush(repoPath, message, apply) {
  if (!apply) return { committed: false };
  const status = await git(repoPath, ['status', '--porcelain']);
  if (!status.trim()) {
    return { committed: false };
  }
  await git(repoPath, ['add', '.']);
  const stagedFiles = await git(repoPath, ['diff', '--cached', '--name-only']);
  if (!stagedFiles.trim()) {
    return { committed: false };
  }
  await git(repoPath, ['commit', '-m', message]);
  const branch = await currentBranch(repoPath);
  await git(repoPath, ['push', '-u', 'origin', branch]);
  return { committed: true, branch };
}

async function pushBranch(repoPath, branch, apply) {
  if (!apply) return;
  await git(repoPath, ['push', '-u', 'origin', branch]);
}

async function setVariable(owner, repo, environment, name, value, apply) {
  if (!apply) return;
  await gh(['variable', 'set', name, '--repo', `${owner}/${repo}`, '--env', environment, '--body', value]);
}

function deploymentBranchForEnvironment(environment) {
  if (environment === 'test') return 'test';
  if (environment === 'production') return 'main';
  throw new Error('unsupported_deployment_environment');
}

function environmentProtectionMatches(environment, policies, expectedBranch) {
  return environment?.deployment_branch_policy?.protected_branches === false
    && environment.deployment_branch_policy.custom_branch_policies === true
    && Array.isArray(policies)
    && policies.length === 1
    && policies[0]?.name === expectedBranch
    && (policies[0]?.type === undefined || policies[0]?.type === 'branch');
}

function branchProtectionMatches(protection, requiredContexts) {
  const actualContexts = protection?.required_status_checks?.contexts;
  const expectedContexts = [...requiredContexts].sort();
  const normalizedActualContexts = Array.isArray(actualContexts) ? [...actualContexts].sort() : [];
  const contextsMatch = normalizedActualContexts.length === 0 || (
    normalizedActualContexts.length === expectedContexts.length
    && normalizedActualContexts.every((context, index) => context === expectedContexts[index])
  );
  const actualChecks = protection?.required_status_checks?.checks;
  const normalizedActualChecks = Array.isArray(actualChecks)
    ? [...actualChecks].sort((a, b) => String(a?.context).localeCompare(String(b?.context)))
    : [];
  const checksMatch = normalizedActualChecks.length === expectedContexts.length
    && normalizedActualChecks.every((check, index) => (
      check?.context === expectedContexts[index]
      && check?.app_id === GITHUB_ACTIONS_APP_ID
    ));
  const reviews = protection?.required_pull_request_reviews;
  const bypasses = reviews?.bypass_pull_request_allowances;
  const noBypasses = bypasses === undefined || bypasses === null || ['users', 'teams', 'apps'].every(key => (
    bypasses[key] === undefined
    || (Array.isArray(bypasses[key]) && bypasses[key].length === 0)
  ));
  return protection?.required_status_checks?.strict === true
    && contextsMatch
    && checksMatch
    && protection?.enforce_admins?.enabled === true
    && reviews !== null
    && typeof reviews === 'object'
    && reviews.required_approving_review_count === 0
    && reviews.dismiss_stale_reviews === false
    && reviews.require_code_owner_reviews === false
    && reviews.require_last_push_approval === false
    && noBypasses
    && protection?.restrictions === null
    && protection?.required_linear_history?.enabled === false
    && protection?.allow_force_pushes?.enabled === false
    && protection?.allow_deletions?.enabled === false;
}

function branchProtectionPayload(requiredContexts) {
  return {
    required_status_checks: {
      strict: true,
      contexts: [...requiredContexts],
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 0,
      dismiss_stale_reviews: false,
      require_code_owner_reviews: false,
      require_last_push_approval: false,
      bypass_pull_request_allowances: {
        users: [],
        teams: [],
        apps: [],
      },
    },
    restrictions: null,
    required_linear_history: false,
    allow_force_pushes: false,
    allow_deletions: false,
  };
}

function requiredStatusChecksPayload(requiredContexts) {
  return {
    strict: true,
    checks: requiredContexts.map(context => ({
      context,
      app_id: GITHUB_ACTIONS_APP_ID,
    })),
  };
}

function personalBranchRulesetPayload(branch, requiredContexts) {
  return {
    name: `zoolanding-${branch}-protection`,
    target: 'branch',
    enforcement: 'active',
    bypass_actors: [],
    conditions: {
      ref_name: {
        include: [`refs/heads/${branch}`],
        exclude: [],
      },
    },
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          allowed_merge_methods: ['merge'],
          dismiss_stale_reviews_on_push: false,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_approving_review_count: 0,
          required_review_thread_resolution: false,
        },
      },
      {
        type: 'required_status_checks',
        parameters: {
          do_not_enforce_on_create: false,
          required_status_checks: requiredContexts.map(context => ({
            context,
            integration_id: GITHUB_ACTIONS_APP_ID,
          })),
          strict_required_status_checks_policy: true,
        },
      },
    ],
  };
}

function personalBranchRulesetMatches(ruleset, branch, requiredContexts) {
  const refName = ruleset?.conditions?.ref_name;
  const bypassActors = ruleset?.bypass_actors;
  const rules = Array.isArray(ruleset?.rules) ? ruleset.rules : [];
  const rulesByType = new Map(rules.map(rule => [rule?.type, rule]));
  if (rulesByType.size !== 4 || rules.length !== 4) return false;
  const pullRequest = rulesByType.get('pull_request')?.parameters;
  const statusChecks = rulesByType.get('required_status_checks')?.parameters;
  const expectedChecks = requiredContexts.map(context => ({
    context,
    integration_id: GITHUB_ACTIONS_APP_ID,
  }));
  return ruleset?.name === `zoolanding-${branch}-protection`
    && ruleset?.source_type === 'Repository'
    && ruleset?.target === 'branch'
    && ruleset?.enforcement === 'active'
    && Array.isArray(bypassActors)
    && bypassActors.length === 0
    && Array.isArray(refName?.include)
    && refName.include.length === 1
    && refName.include[0] === `refs/heads/${branch}`
    && Array.isArray(refName?.exclude)
    && refName.exclude.length === 0
    && rulesByType.has('deletion')
    && rulesByType.has('non_fast_forward')
    && Array.isArray(pullRequest?.allowed_merge_methods)
    && pullRequest.allowed_merge_methods.length === 1
    && pullRequest.allowed_merge_methods[0] === 'merge'
    && pullRequest.dismiss_stale_reviews_on_push === false
    && pullRequest.require_code_owner_review === false
    && pullRequest.require_last_push_approval === false
    && pullRequest.required_approving_review_count === 0
    && pullRequest.required_review_thread_resolution === false
    && statusChecks?.do_not_enforce_on_create === false
    && statusChecks?.strict_required_status_checks_policy === true
    && JSON.stringify(statusChecks?.required_status_checks) === JSON.stringify(expectedChecks);
}

async function ghJson(args, options = {}) {
  const output = await gh(args, options);
  try {
    return JSON.parse(output);
  } catch {
    throw new Error('github_api_invalid_response');
  }
}

async function assertTrackedRegularFile(repoPath, relativePath) {
  const filePath = path.join(repoPath, ...relativePath.split('/'));
  try {
    await git(repoPath, ['ls-files', '--error-unmatch', '--', relativePath]);
    const stat = await lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('not_regular');
    const [realRepoPath, realParentPath, realFilePath] = await Promise.all([
      realpath(repoPath),
      realpath(path.dirname(filePath)),
      realpath(filePath),
    ]);
    for (const candidate of [realParentPath, realFilePath]) {
      const relative = path.relative(realRepoPath, candidate);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('path_escape');
    }
  } catch {
    throw new Error(`reconcile_requires_tracked_regular_file:${relativePath}`);
  }
  return filePath;
}

function reconcileConfigForTestOnly(config) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('reconcile_invalid_draft_repo_config');
  }
  const branches = config.branches && typeof config.branches === 'object' && !Array.isArray(config.branches)
    ? config.branches
    : {};
  const main = branches.main && typeof branches.main === 'object' && !Array.isArray(branches.main)
    ? { ...branches.main }
    : {};
  main.deploys = false;
  delete main.environment;

  const reconciled = {
    ...config,
    branches: {
      ...branches,
      main,
    },
  };
  if (
    config.githubVariables
    && typeof config.githubVariables === 'object'
    && !Array.isArray(config.githubVariables)
  ) {
    reconciled.githubVariables = { ...config.githubVariables };
    delete reconciled.githubVariables.production;
  }
  return reconciled;
}

async function reconcileTestOnlyProduction({
  draft,
  owner = draft.owner || DEFAULT_OWNER,
  accountId = DEFAULT_ACCOUNT_ID,
  awsProfile,
  readProductionEnvironment = readProductionEnvironmentFromGithub,
  readProductionRole = readProductionRoleFromAws,
  readRemoteFile = readRepositoryFileFromGithub,
  preflightPlan,
}) {
  if ((draft.deploymentEnvironments ?? ['test', 'production']).includes('production')) {
    throw new Error('reconcile_requires_test_only_draft');
  }

  const inspection = preflightPlan?.inspection ?? await inspectRegisteredRepo(draft, { apply: false });
  if (inspection.repoStatus !== 'ready') {
    if (inspection.repoStatus === 'dirty') throw new Error('reconcile_requires_clean_repo');
    throw new Error(`reconcile_repo_not_ready:${inspection.repoStatus}`);
  }
  if (!inspection.branch || ['test', 'main'].includes(inspection.branch)) {
    throw new Error('reconcile_requires_non_production_branch');
  }

  const productionDrift = preflightPlan?.productionDrift ?? await inspectTestOnlyProductionDrift({
    draft,
    owner,
    accountId,
    awsProfile,
    readProductionEnvironment,
    readProductionRole,
    readRemoteFile,
  });
  const inspectionFailure = productionDrift.issues.find(issue => (
    issue.code.endsWith('_inspection_failed')
  ));
  if (inspectionFailure) {
    throw new Error(inspectionFailure.code);
  }

  const repoPath = inspection.repoPath;
  const configPath = await assertTrackedRegularFile(repoPath, DRAFT_CONFIG_RELATIVE_PATH);
  const workflowPath = await assertTrackedRegularFile(repoPath, PRODUCTION_WORKFLOW_RELATIVE_PATH);
  const [configSource, workflowSource, templateSource] = await Promise.all([
    readFile(configPath, 'utf8'),
    readFile(workflowPath, 'utf8'),
    readFile(PRODUCTION_WORKFLOW_TEMPLATE_PATH, 'utf8'),
  ]);
  if (!productionWorkflowHasReviewedGuard(templateSource)) {
    throw new Error('reconcile_template_guard_not_reviewed');
  }

  let config;
  try {
    config = JSON.parse(configSource);
  } catch {
    throw new Error('reconcile_invalid_draft_repo_config');
  }
  const reconciledConfigSource = `${JSON.stringify(reconcileConfigForTestOnly(config), null, 2)}\n`;
  const changedFiles = [];
  if (configSource !== reconciledConfigSource) {
    await writeFile(configPath, reconciledConfigSource, 'utf8');
    changedFiles.push(DRAFT_CONFIG_RELATIVE_PATH);
  }
  if (workflowSource !== templateSource) {
    await writeFile(workflowPath, templateSource, 'utf8');
    changedFiles.push(PRODUCTION_WORKFLOW_RELATIVE_PATH);
  }

  const allowedPaths = new Set([
    DRAFT_CONFIG_RELATIVE_PATH,
    PRODUCTION_WORKFLOW_RELATIVE_PATH,
  ]);
  const changedPaths = [
    ...String(await git(repoPath, ['diff', '--name-only'])).split(/\r?\n/),
    ...String(await git(repoPath, ['ls-files', '--others', '--exclude-standard'])).split(/\r?\n/),
  ].map(changedPath => changedPath.trim().replaceAll('\\', '/')).filter(Boolean);
  for (const changedPath of changedPaths) {
    if (!allowedPaths.has(changedPath)) {
      throw new Error('reconcile_changed_unmanaged_file');
    }
  }

  const locallyReconciledIssueCodes = new Set([
    'draft_repo_config_main_deploys_production',
    'draft_repo_config_main_environment_production',
    'draft_repo_config_production_variables_declared',
    'production_workflow_guard_not_reviewed',
  ]);
  const remainingIssues = productionDrift.issues.filter(issue => (
    !locallyReconciledIssueCodes.has(issue.code)
  ));
  return {
    repo: draft.repo,
    domain: draft.domain,
    repoPath,
    deploymentEnvironments: draft.deploymentEnvironments,
    changedFiles,
    changed: changedFiles.length > 0,
    committed: false,
    pushed: false,
    requiresProtectedPromotion: true,
    issues: remainingIssues,
    decommissionPending: productionDrift.decommissionPending,
    ok: remainingIssues.length === 0 && productionDrift.decommissionPending.length === 0,
  };
}

async function ensureEnvironment(owner, repo, environment, apply) {
  const branch = deploymentBranchForEnvironment(environment);
  if (!apply) return { protected: false, skipped: true, branch };
  const environmentPath = `/repos/${owner}/${repo}/environments/${environment}`;
  const policyPath = `${environmentPath}/deployment-branch-policies`;
  await gh([
    'api',
    '--method',
    'PUT',
    environmentPath,
    '--input',
    '-',
  ], {
    input: JSON.stringify({
      deployment_branch_policy: {
        protected_branches: false,
        custom_branch_policies: true,
      },
    }),
  });

  let policyList = await ghJson(['api', `${policyPath}?per_page=100`]);
  let policies = Array.isArray(policyList?.branch_policies) ? policyList.branch_policies : [];
  if (policyList?.total_count !== policies.length) throw new Error('github_environment_policy_list_incomplete');
  for (const policy of policies) {
    if (!Number.isSafeInteger(policy?.id)) throw new Error('github_environment_policy_invalid');
    await gh(['api', '--method', 'DELETE', `${policyPath}/${policy.id}`]);
  }
  await gh([
    'api',
    '--method',
    'POST',
    policyPath,
    '--input',
    '-',
  ], { input: JSON.stringify({ name: branch, type: 'branch' }) });

  const configuredEnvironment = await ghJson(['api', environmentPath]);
  policyList = await ghJson(['api', `${policyPath}?per_page=100`]);
  policies = Array.isArray(policyList?.branch_policies) ? policyList.branch_policies : [];
  if (policyList?.total_count !== policies.length) throw new Error('github_environment_policy_list_incomplete');
  if (!environmentProtectionMatches(configuredEnvironment, policies, branch)) {
    throw new Error('github_environment_policy_not_applied');
  }
  return { protected: true, branch };
}

async function configureMergePolicy(owner, repo, apply) {
  if (!apply) return { configured: false, skipped: true };
  const payload = {
    allow_merge_commit: true,
    allow_squash_merge: false,
    allow_rebase_merge: false,
    delete_branch_on_merge: false,
  };
  await gh([
    'api',
    '--method',
    'PATCH',
    `/repos/${owner}/${repo}`,
    '--input',
    '-',
  ], { input: JSON.stringify(payload) });
  return { configured: true };
}

async function ensurePersonalBranchRuleset(owner, repo, branch, requiredContexts) {
  const payload = personalBranchRulesetPayload(branch, requiredContexts);
  const rulesetPath = `/repos/${owner}/${repo}/rulesets`;
  const apiVersion = ['-H', 'X-GitHub-Api-Version: 2026-03-10'];
  const listed = await ghJson(['api', `${rulesetPath}?per_page=100&includes_parents=false`, ...apiVersion]);
  if (!Array.isArray(listed)) throw new Error('github_ruleset_list_invalid');
  const matches = listed.filter(ruleset => ruleset?.name === payload.name);
  if (matches.length > 1) throw new Error('github_ruleset_name_ambiguous');

  let rulesetId = matches[0]?.id;
  if (matches.length === 0) {
    const created = await ghJson([
      'api',
      '--method',
      'POST',
      rulesetPath,
      ...apiVersion,
      '--input',
      '-',
    ], { input: JSON.stringify(payload) });
    rulesetId = created?.id;
  } else {
    if (!Number.isSafeInteger(rulesetId)) throw new Error('github_ruleset_id_invalid');
    await gh([
      'api',
      '--method',
      'PUT',
      `${rulesetPath}/${rulesetId}`,
      ...apiVersion,
      '--input',
      '-',
    ], { input: JSON.stringify(payload) });
  }
  if (!Number.isSafeInteger(rulesetId)) throw new Error('github_ruleset_id_invalid');
  const configured = await ghJson(['api', `${rulesetPath}/${rulesetId}?includes_parents=false`, ...apiVersion]);
  if (!personalBranchRulesetMatches(configured, branch, requiredContexts)) {
    throw new Error('github_ruleset_not_applied');
  }
  return { protected: true, mechanism: 'ruleset' };
}

async function protectBranch(owner, repo, branch, requiredContexts, apply) {
  if (!apply) return { protected: false, skipped: true };
  const repository = await ghJson(['api', `/repos/${owner}/${repo}`]);
  if (repository?.owner?.type === 'User') {
    return ensurePersonalBranchRuleset(owner, repo, branch, requiredContexts);
  }
  if (repository?.owner?.type !== 'Organization') {
    throw new Error('github_repository_owner_type_invalid');
  }
  const payload = branchProtectionPayload(requiredContexts);
  const protectionPath = `/repos/${owner}/${repo}/branches/${branch}/protection`;
  try {
    await gh([
      'api',
      '--method',
      'PUT',
      protectionPath,
      '--input',
      '-',
    ], { input: JSON.stringify(payload) });
    await gh([
      'api',
      '--method',
      'PATCH',
      `${protectionPath}/required_status_checks`,
      '--input',
      '-',
    ], { input: JSON.stringify(requiredStatusChecksPayload(requiredContexts)) });
    const configuredProtection = await ghJson([
      'api',
      protectionPath,
    ]);
    if (!branchProtectionMatches(configuredProtection, requiredContexts)) {
      throw new Error('github_branch_protection_not_applied');
    }
    return { protected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Upgrade to GitHub Pro') || message.includes('(HTTP 403)')) {
      return { protected: false, blockedByPlan: true, error: message };
    }
    throw error;
  }
}

async function setupDraft({
  draft,
  owner,
  accountId,
  region,
  authoringEndpoint,
  apply,
  bootstrapOptions,
  preflightPlan,
}) {
  const inspection = preflightPlan?.inspection ?? await inspectRegisteredRepo(draft, { apply });
  const productionDrift = preflightPlan?.productionDrift ?? (
    inspection.repoStatus === 'ready'
      ? await inspectTestOnlyProductionDrift({ draft, owner })
      : undefined
  );
  if (!apply) {
    return {
      repo: draft.repo,
      domain: draft.domain,
      deploymentEnvironments: draft.deploymentEnvironments,
      ...inspection,
      productionDrift,
      changed: false,
    };
  }
  if (inspection.repoStatus !== 'ready') {
    throw new Error(`Registered draft repo is not safe to modify (${inspection.repoStatus}): ${inspection.repoPath}`);
  }
  if (productionDrift?.ok === false) {
    throw new Error(`test_only_production_drift:${productionDrift.issues.map(issue => issue.code).join('|')}`);
  }
  const repoPath = inspection.repoPath;

  const productionEnabled = draft.deploymentEnvironments.includes('production');
  const repositoryFiles = productionEnabled
    ? { changed: true, protectedPromotionRequired: false }
    : { changed: false, protectedPromotionRequired: true };
  if (productionEnabled) {
    await git(repoPath, ['checkout', 'main']);
    await bootstrapDraftRepo({
      repoPath,
      domain: draft.domain,
      authoringEndpoint,
      awsRegion: region,
      deploymentEnvironments: draft.deploymentEnvironments,
      ...bootstrapOptions,
    });
    await upsertTestEnvironmentAliases(repoPath, draft.domain);
    await commitAndPush(repoPath, 'Configure secure draft deployment workflow [skip ci]', apply);

    for (const branch of ['test', 'dev']) {
      await ensureBranch(repoPath, branch, 'main', apply);
      await pushBranch(repoPath, branch, apply);
    }
    await git(repoPath, ['checkout', 'dev']);
  }

  const mergePolicy = await configureMergePolicy(owner, draft.repo, apply);
  const branchProtection = {
    test: await protectBranch(owner, draft.repo, 'test', ['guard'], apply),
    main: await protectBranch(owner, draft.repo, 'main', ['guard'], apply),
  };

  if (!branchProtection.test.protected || !branchProtection.main.protected) {
    return {
      repo: draft.repo,
      domain: draft.domain,
      deploymentEnvironments: draft.deploymentEnvironments,
      repoPath,
      changed: true,
      mergePolicy,
      branchProtection,
      environmentProtection: Object.fromEntries(
        draft.deploymentEnvironments.map(environment => [environment, { protected: false, skipped: true }]),
      ),
      repositoryFiles,
    };
  }

  const environmentProtection = {};
  for (const environment of draft.deploymentEnvironments) {
    environmentProtection[environment] = await ensureEnvironment(owner, draft.repo, environment, apply);
    await setVariable(owner, draft.repo, environment, 'AWS_ROLE_ARN', roleArnFor(accountId, draft.domain, environment), apply);
    await setVariable(owner, draft.repo, environment, 'AWS_REGION', region, apply);
    await setVariable(owner, draft.repo, environment, 'DRAFT_DOMAIN', draft.domain, apply);
    await setVariable(owner, draft.repo, environment, 'DRAFT_ROOT', '.', apply);
    await setVariable(owner, draft.repo, environment, 'AUTHORING_ENDPOINT', authoringEndpoint, apply);
  }

  return {
    repo: draft.repo,
    domain: draft.domain,
    deploymentEnvironments: draft.deploymentEnvironments,
    repoPath,
    changed: true,
    mergePolicy,
    branchProtection,
    environmentProtection,
    repositoryFiles,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = truthy(args.apply);
  const reconcileTestOnly = truthy(args['reconcile-test-only-production']);
  if (apply && reconcileTestOnly) {
    throw new Error('reconcile_test_only_production_cannot_apply');
  }
  if (reconcileTestOnly && (typeof args.domain !== 'string' || args.domain.trim() === '')) {
    throw new Error('reconcile_requires_explicit_domain');
  }
  const requestedDomain = assertScopedApply(apply || reconcileTestOnly, args.domain);
  const accountId = resolveGithubSetupAccountId({ apply, accountId: args['account-id'] });
  const region = args.region || DEFAULT_REGION;
  const authoringEndpoint = resolveGithubSetupAuthoringEndpoint({
    apply,
    authoringEndpoint: args['authoring-endpoint'],
  });
  const registryPath = path.resolve(args.registry || 'docs/drafts-registry.json');
  const inventory = await readRegisteredDraftInventory(registryPath);
  const selectedDrafts = selectRegisteredDrafts(inventory.drafts, requestedDomain);
  const bootstrapOptions = bootstrapFlags(args);
  const results = [];
  const plans = await inspectDraftSetupPlans(selectedDrafts, {
    apply,
    owner: inventory.owner || DEFAULT_OWNER,
    accountId,
    awsProfile: args.profile,
  });

  if (reconcileTestOnly) {
    if (selectedDrafts.length !== 1) throw new Error('reconcile_requires_exactly_one_draft');
    const draft = selectedDrafts[0];
    const result = await reconcileTestOnlyProduction({
      draft,
      owner: draft.owner || inventory.owner || DEFAULT_OWNER,
      accountId,
      awsProfile: args.profile,
      preflightPlan: plans[0],
    });
    console.log(JSON.stringify({
      ok: result.ok,
      apply: false,
      reconcileTestOnlyProduction: true,
      registryPath,
      results: [result],
    }, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (apply) await preflightDraftSetups(selectedDrafts, { plans });

  for (const [index, draft] of selectedDrafts.entries()) {
    results.push(await setupDraft({
      draft,
      owner: draft.owner || inventory.owner || DEFAULT_OWNER,
      accountId,
      region,
      authoringEndpoint,
      apply,
      bootstrapOptions,
      preflightPlan: plans[index],
    }));
  }

  const ok = results.every(result => setupResultOk(result, apply));
  console.log(JSON.stringify({ ok, apply, registryPath, results }, null, 2));
  if (!ok) process.exitCode = 1;
}

function setupResultOk(result, apply) {
  if (result.repoStatus !== undefined && result.repoStatus !== 'ready') return false;
  if (result.productionDrift?.ok === false) return false;
  if (!apply) return true;
  const deploymentEnvironments = result.deploymentEnvironments ?? ['test', 'production'];
  return result.branchProtection?.test?.protected === true
    && result.branchProtection?.main?.protected === true
    && deploymentEnvironments.every(
      environment => result.environmentProtection?.[environment]?.protected === true,
    );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  assertTrackedRegularFile,
  branchProtectionPayload,
  branchProtectionMatches,
  bootstrapFlags,
  deploymentBranchForEnvironment,
  environmentProtectionMatches,
  inspectDraftSetupPlans,
  inspectRegisteredRepo,
  inspectTestOnlyProductionDrift,
  personalBranchRulesetMatches,
  personalBranchRulesetPayload,
  preflightDraftSetups,
  productionWorkflowHasReviewedGuard,
  readRegisteredDraftInventory,
  readProductionEnvironmentFromGithub,
  readProductionRoleFromAws,
  readRepositoryFileFromGithub,
  reconcileConfigForTestOnly,
  reconcileTestOnlyProduction,
  requiredStatusChecksPayload,
  repoNameForDomain,
  resolveGithubSetupAccountId,
  resolveGithubSetupAuthoringEndpoint,
  setupResultOk,
  testAliasesFor,
};
