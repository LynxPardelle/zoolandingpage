import { execFile, spawn } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { access, cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { bootstrapDraftRepo } from './draft-repo-bootstrap.mjs';
import { domainSlug, roleNameFor } from './draft-aws-oidc-setup.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_OWNER = 'LynxPardelle';
const DEFAULT_REGION = 'us-east-1';
const DEFAULT_AUTHORING_ENDPOINT = 'https://o4upx3fsz3d3dwfwz4lbnefjze0eetyn.lambda-url.us-east-1.on.aws/';
const DEFAULT_ACCOUNT_ID = '765932874577';
const DEFAULT_BASE_DIR = path.resolve('drafts', '_repos');

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

async function readDraftInventory(draftsRoot) {
  const entries = await readdir(draftsRoot, { withFileTypes: true });
  const drafts = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
    const filePath = path.join(draftsRoot, entry.name, 'site-config.json');
    if (!await exists(filePath)) continue;
    const config = JSON.parse(await readFile(filePath, 'utf8'));
    const domain = normalizeDomain(config.domain || entry.name);
    if (!domain) continue;
    drafts.push({
      domain,
      repo: repoNameForDomain(domain),
      sourceDraftPath: path.join(draftsRoot, entry.name),
    });
  }
  return drafts.sort((a, b) => a.domain.localeCompare(b.domain));
}

async function ensureClone({ owner, repo, baseDir, apply }) {
  const repoPath = path.join(baseDir, repo);
  if (await exists(path.join(repoPath, '.git'))) {
    if (apply) {
      await git(repoPath, ['fetch', '--all', '--prune']);
    }
    return repoPath;
  }
  if (apply) {
    await mkdir(baseDir, { recursive: true });
    await gh(['repo', 'clone', `${owner}/${repo}`, repoPath]);
  }
  return repoPath;
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
  const normalizedAliases = aliases.map(normalizeDomain).filter(Boolean);
  const names = new Set();
  for (const host of [domain, ...normalizedAliases]) {
    if (host.startsWith('test.')) {
      names.add(host);
      continue;
    }
    names.add(`test.${host}`);
  }
  const firstLabel = domain.split('.')[0];
  if (!domain.endsWith('zoolandingpage.com.mx') && firstLabel) {
    names.add(`test.${firstLabel}.zoolandingpage.com.mx`);
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

async function copyDraftIfEmpty({ sourceDraftPath, repoPath, domain }) {
  const siteConfigTargets = [
    path.join(repoPath, 'site-config.json'),
    path.join(repoPath, domain, 'site-config.json'),
  ];
  if (siteConfigTargets.some(target => existsSync(target))) return false;
  await cp(sourceDraftPath, repoPath, { recursive: true, force: false, errorOnExist: false });
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

async function setVariable(repo, environment, name, value, apply) {
  if (!apply) return;
  await gh(['variable', 'set', name, '--repo', `${DEFAULT_OWNER}/${repo}`, '--env', environment, '--body', value]);
}

async function ensureEnvironment(repo, environment, apply) {
  if (!apply) return;
  await gh(['api', '--method', 'PUT', `/repos/${DEFAULT_OWNER}/${repo}/environments/${environment}`]);
}

async function configureMergePolicy(repo, apply) {
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
    `/repos/${DEFAULT_OWNER}/${repo}`,
    '--input',
    '-',
  ], { input: JSON.stringify(payload) });
  return { configured: true };
}

async function protectBranch(repo, branch, requiredContexts, apply) {
  if (!apply) return { protected: false, skipped: true };
  const payload = {
    required_status_checks: {
      strict: true,
      contexts: requiredContexts,
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 0,
      dismiss_stale_reviews: false,
      require_code_owner_reviews: false,
      require_last_push_approval: false,
    },
    restrictions: null,
    required_linear_history: false,
    allow_force_pushes: false,
    allow_deletions: false,
  };
  try {
    await gh([
      'api',
      '--method',
      'PUT',
      `/repos/${DEFAULT_OWNER}/${repo}/branches/${branch}/protection`,
      '--input',
      '-',
    ], { input: JSON.stringify(payload) });
    return { protected: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Upgrade to GitHub Pro') || message.includes('(HTTP 403)')) {
      return { protected: false, blockedByPlan: true, error: message };
    }
    throw error;
  }
}

async function setupDraft({ draft, owner, baseDir, accountId, region, authoringEndpoint, apply }) {
  const repoPath = await ensureClone({ owner, repo: draft.repo, baseDir, apply });
  if (!apply) {
    return { repo: draft.repo, domain: draft.domain, repoPath, changed: false };
  }

  await git(repoPath, ['checkout', 'main']);
  await bootstrapDraftRepo({
    repoPath,
    domain: draft.domain,
    authoringEndpoint,
    awsRegion: region,
    force: false,
    forceTemplates: true,
    forceGitignore: true,
  });
  await copyDraftIfEmpty({ sourceDraftPath: draft.sourceDraftPath, repoPath, domain: draft.domain });
  await upsertTestEnvironmentAliases(repoPath, draft.domain);
  await commitAndPush(repoPath, 'Configure secure draft deployment workflow [skip ci]', apply);

  for (const branch of ['test', 'dev']) {
    await ensureBranch(repoPath, branch, 'main', apply);
    await pushBranch(repoPath, branch, apply);
  }
  await git(repoPath, ['checkout', 'dev']);

  for (const environment of ['test', 'production']) {
    await ensureEnvironment(draft.repo, environment, apply);
    await setVariable(draft.repo, environment, 'AWS_ROLE_ARN', roleArnFor(accountId, draft.domain, environment), apply);
    await setVariable(draft.repo, environment, 'AWS_REGION', region, apply);
    await setVariable(draft.repo, environment, 'DRAFT_DOMAIN', draft.domain, apply);
    await setVariable(draft.repo, environment, 'DRAFT_ROOT', '.', apply);
    await setVariable(draft.repo, environment, 'AUTHORING_ENDPOINT', authoringEndpoint, apply);
  }

  const mergePolicy = await configureMergePolicy(draft.repo, apply);
  const branchProtection = {
    test: await protectBranch(draft.repo, 'test', ['guard'], apply),
    main: await protectBranch(draft.repo, 'main', ['guard'], apply),
  };

  return { repo: draft.repo, domain: draft.domain, repoPath, changed: true, mergePolicy, branchProtection };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = truthy(args.apply);
  const owner = args.owner || DEFAULT_OWNER;
  const baseDir = path.resolve(args['base-dir'] || DEFAULT_BASE_DIR);
  const accountId = args['account-id'] || DEFAULT_ACCOUNT_ID;
  const region = args.region || DEFAULT_REGION;
  const authoringEndpoint = args['authoring-endpoint'] || DEFAULT_AUTHORING_ENDPOINT;
  const draftsRoot = path.resolve(args['drafts-root'] || 'drafts');
  const drafts = await readDraftInventory(draftsRoot);
  const results = [];

  for (const draft of drafts) {
    results.push(await setupDraft({ draft, owner, baseDir, accountId, region, authoringEndpoint, apply }));
  }

  console.log(JSON.stringify({ ok: true, apply, results }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { readDraftInventory, repoNameForDomain, testAliasesFor };
