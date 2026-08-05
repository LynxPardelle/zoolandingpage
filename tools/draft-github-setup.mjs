import { execFile, spawn } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
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

async function preflightDraftSetups(drafts) {
  const inspections = [];
  for (const draft of drafts) {
    inspections.push({
      draft,
      inspection: await inspectRegisteredRepo(draft, { apply: false }),
    });
  }
  const blockers = inspections.filter(item => item.inspection.repoStatus !== 'ready');
  if (blockers.length > 0) {
    throw new Error(
      `Draft setup preflight failed: ${blockers
        .map(item => `${item.draft.repo}:${item.inspection.repoStatus}`)
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

async function setupDraft({ draft, owner, accountId, region, authoringEndpoint, apply, bootstrapOptions }) {
  const inspection = await inspectRegisteredRepo(draft, { apply });
  if (!apply) {
    return { repo: draft.repo, domain: draft.domain, ...inspection, changed: false };
  }
  if (inspection.repoStatus !== 'ready') {
    throw new Error(`Registered draft repo is not safe to modify (${inspection.repoStatus}): ${inspection.repoPath}`);
  }
  const repoPath = inspection.repoPath;

  await git(repoPath, ['checkout', 'main']);
  await bootstrapDraftRepo({
    repoPath,
    domain: draft.domain,
    authoringEndpoint,
    awsRegion: region,
    ...bootstrapOptions,
  });
  await upsertTestEnvironmentAliases(repoPath, draft.domain);
  await commitAndPush(repoPath, 'Configure secure draft deployment workflow [skip ci]', apply);

  for (const branch of ['test', 'dev']) {
    await ensureBranch(repoPath, branch, 'main', apply);
    await pushBranch(repoPath, branch, apply);
  }
  await git(repoPath, ['checkout', 'dev']);

  const mergePolicy = await configureMergePolicy(owner, draft.repo, apply);
  const branchProtection = {
    test: await protectBranch(owner, draft.repo, 'test', ['guard'], apply),
    main: await protectBranch(owner, draft.repo, 'main', ['guard'], apply),
  };

  if (!branchProtection.test.protected || !branchProtection.main.protected) {
    return {
      repo: draft.repo,
      domain: draft.domain,
      repoPath,
      changed: true,
      mergePolicy,
      branchProtection,
      environmentProtection: {
        test: { protected: false, skipped: true },
        production: { protected: false, skipped: true },
      },
    };
  }

  const environmentProtection = {};
  for (const environment of ['test', 'production']) {
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
    repoPath,
    changed: true,
    mergePolicy,
    branchProtection,
    environmentProtection,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = truthy(args.apply);
  const requestedDomain = assertScopedApply(apply, args.domain);
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

  if (apply) await preflightDraftSetups(selectedDrafts);

  for (const draft of selectedDrafts) {
    results.push(await setupDraft({
      draft,
      owner: draft.owner || inventory.owner || DEFAULT_OWNER,
      accountId,
      region,
      authoringEndpoint,
      apply,
      bootstrapOptions,
    }));
  }

  const ok = results.every(result => setupResultOk(result, apply));
  console.log(JSON.stringify({ ok, apply, registryPath, results }, null, 2));
  if (!ok) process.exitCode = 1;
}

function setupResultOk(result, apply) {
  if (result.repoStatus !== undefined && result.repoStatus !== 'ready') return false;
  if (!apply) return true;
  return result.branchProtection?.test?.protected === true
    && result.branchProtection?.main?.protected === true
    && result.environmentProtection?.test?.protected === true
    && result.environmentProtection?.production?.protected === true;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  branchProtectionPayload,
  branchProtectionMatches,
  bootstrapFlags,
  deploymentBranchForEnvironment,
  environmentProtectionMatches,
  inspectRegisteredRepo,
  personalBranchRulesetMatches,
  personalBranchRulesetPayload,
  preflightDraftSetups,
  readRegisteredDraftInventory,
  requiredStatusChecksPayload,
  repoNameForDomain,
  resolveGithubSetupAccountId,
  resolveGithubSetupAuthoringEndpoint,
  setupResultOk,
  testAliasesFor,
};
