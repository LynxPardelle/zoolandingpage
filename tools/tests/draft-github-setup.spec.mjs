import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  branchProtectionPayload,
  branchProtectionMatches,
  bootstrapFlags,
  deploymentBranchForEnvironment,
  environmentProtectionMatches,
  inspectRegisteredRepo,
  preflightDraftSetups,
  readRegisteredDraftInventory,
  repoNameForDomain,
  resolveGithubSetupAccountId,
  setupResultOk,
  testAliasesFor,
} from '../draft-github-setup.mjs';

const execFileAsync = promisify(execFile);
const setupCliPath = fileURLToPath(new URL('../draft-github-setup.mjs', import.meta.url));

async function git(cwd, args) {
  return execFileAsync('git', args, { cwd, windowsHide: true });
}

test('repoNameForDomain maps domains to draft repo names', () => {
  assert.equal(repoNameForDomain('pamelabetancourt.com'), 'draft-pamelabetancourt-com');
  assert.equal(
    repoNameForDomain('pokeapi-demo.zoolandingpage.com.mx'),
    'draft-pokeapi-demo-zoolandingpage-com-mx',
  );
});

test('testAliasesFor does not create dedicated test aliases by default', () => {
  assert.deepEqual(testAliasesFor('pamelabetancourt.com', ['pamelabetancourt.zoolandingpage.com.mx']), [
  ]);
});

test('testAliasesFor keeps only explicitly configured test aliases', () => {
  assert.deepEqual(testAliasesFor('zoolandingpage.com.mx', ['test.zoolandingpage.com.mx', 'zoolandingpage.com']), [
    'test.zoolandingpage.com.mx',
  ]);
});

test('draft setup does not overwrite existing templates without explicit flags', () => {
  assert.deepEqual(bootstrapFlags({}), {
    force: false,
    forceTemplates: false,
    forceGitignore: false,
  });
  assert.deepEqual(bootstrapFlags({ 'force-templates': 'true', 'force-gitignore': 'true' }), {
    force: false,
    forceTemplates: true,
    forceGitignore: true,
  });
});

test('GitHub setup inventory preserves each draft owner', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-github-owner-registry-'));
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

  const inventory = await readRegisteredDraftInventory(registryPath, root);

  assert.equal(inventory.owner, 'LynxPardelle');
  assert.equal(inventory.drafts[0].owner, 'Toydrum');
});

test('applied GitHub setup requires the account ID verified by AWS STS', () => {
  assert.equal(resolveGithubSetupAccountId({ apply: false }), '765932874577');
  assert.equal(resolveGithubSetupAccountId({
    apply: true,
    accountId: '123456789012',
  }), '123456789012');
  assert.throws(
    () => resolveGithubSetupAccountId({ apply: true }),
    /apply_requires_explicit_account_id/,
  );
  assert.throws(
    () => resolveGithubSetupAccountId({ apply: true, accountId: '123' }),
    /invalid_aws_account_id/,
  );
});

test('deployment environments allow only their exact protected branch', () => {
  assert.equal(deploymentBranchForEnvironment('test'), 'test');
  assert.equal(deploymentBranchForEnvironment('production'), 'main');
  assert.throws(() => deploymentBranchForEnvironment('dev'), /unsupported_deployment_environment/);

  const environment = {
    deployment_branch_policy: {
      protected_branches: false,
      custom_branch_policies: true,
    },
  };
  assert.equal(environmentProtectionMatches(environment, [
    { name: 'test', type: 'branch' },
  ], 'test'), true);
  assert.equal(environmentProtectionMatches(environment, [
    { name: 'test' },
  ], 'test'), true);
  assert.equal(environmentProtectionMatches(environment, [
    { name: 'test', type: 'tag' },
  ], 'test'), false);
  assert.equal(environmentProtectionMatches(environment, [], 'test'), false);
  assert.equal(environmentProtectionMatches(environment, [
    { name: 'test', type: 'branch' },
    { name: 'dev', type: 'branch' },
  ], 'test'), false);
  assert.equal(environmentProtectionMatches({ deployment_branch_policy: null }, [
    { name: 'test', type: 'branch' },
  ], 'test'), false);
});

test('branch protection readback must match the complete release policy', () => {
  const protection = {
    required_status_checks: {
      strict: true,
      contexts: ['guard'],
      checks: [{ context: 'guard', app_id: 15368 }],
    },
    enforce_admins: { enabled: true },
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
    required_linear_history: { enabled: false },
    allow_force_pushes: { enabled: false },
    allow_deletions: { enabled: false },
  };

  assert.equal(branchProtectionMatches(protection, ['guard']), true);
  assert.equal(branchProtectionMatches({
    ...protection,
    required_status_checks: { strict: false, contexts: ['guard'] },
  }, ['guard']), false);
  assert.equal(branchProtectionMatches({
    ...protection,
    required_status_checks: {
      strict: true,
      contexts: ['guard', 'extra'],
      checks: [{ context: 'guard', app_id: 15368 }],
    },
  }, ['guard']), false);
  assert.equal(branchProtectionMatches({
    ...protection,
    required_status_checks: {
      strict: true,
      contexts: ['guard'],
      checks: [{ context: 'guard', app_id: -1 }],
    },
  }, ['guard']), false);
  assert.equal(branchProtectionMatches({
    ...protection,
    enforce_admins: { enabled: false },
  }, ['guard']), false);
  assert.equal(branchProtectionMatches({
    ...protection,
    required_pull_request_reviews: null,
  }, ['guard']), false);
  assert.equal(branchProtectionMatches({
    ...protection,
    required_pull_request_reviews: {
      ...protection.required_pull_request_reviews,
      bypass_pull_request_allowances: {
        users: [{ login: 'bypass-user' }],
        teams: [],
        apps: [],
      },
    },
  }, ['guard']), false);
  assert.equal(branchProtectionMatches({
    ...protection,
    allow_force_pushes: { enabled: true },
  }, ['guard']), false);
  assert.equal(branchProtectionMatches({
    ...protection,
    allow_deletions: { enabled: true },
  }, ['guard']), false);
});

test('full branch protection payload preserves the legacy status-check context and clears PR bypasses', () => {
  const payload = branchProtectionPayload(['guard']);
  assert.deepEqual(payload.required_status_checks, {
    strict: true,
    contexts: ['guard'],
  });
  assert.equal(Object.hasOwn(payload.required_status_checks, 'checks'), false);
  assert.deepEqual(payload.required_pull_request_reviews.bypass_pull_request_allowances, {
    users: [],
    teams: [],
    apps: [],
  });
});

test('status check subresource payload pins guard to GitHub Actions', async () => {
  const setupModule = await import('../draft-github-setup.mjs');
  assert.equal(typeof setupModule.requiredStatusChecksPayload, 'function');
  assert.deepEqual(setupModule.requiredStatusChecksPayload(['guard']), {
    strict: true,
    checks: [{ context: 'guard', app_id: 15368 }],
  });
});

test('applied setup fails closed when either protected branch was not configured', () => {
  const protectedResult = {
    repoStatus: 'ready',
    branchProtection: {
      test: { protected: true },
      main: { protected: true },
    },
    environmentProtection: {
      test: { protected: true },
      production: { protected: true },
    },
  };
  assert.equal(setupResultOk(protectedResult, true), true);
  assert.equal(setupResultOk({
    ...protectedResult,
    branchProtection: {
      test: { protected: false, blockedByPlan: true },
      main: { protected: true },
    },
  }, true), false);
  assert.equal(setupResultOk({
    ...protectedResult,
    branchProtection: {
      test: { protected: true },
      main: { protected: false, blockedByPlan: true },
    },
  }, true), false);
  assert.equal(setupResultOk({
    ...protectedResult,
    environmentProtection: {
      test: { protected: true },
      production: { protected: false },
    },
  }, true), false);
  assert.equal(setupResultOk({
    repoStatus: 'ready',
    branchProtection: protectedResult.branchProtection,
  }, true), false);
  assert.equal(setupResultOk({ repoStatus: 'ready' }, false), true);
});

test('setup configures branch protection before deployment environments and variables', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(setupCliPath, 'utf8'));
  const setupStart = source.indexOf('async function setupDraft');
  const setupEnd = source.indexOf('\nasync function main', setupStart);
  const setup = source.slice(setupStart, setupEnd);
  assert.ok(setup.indexOf('protectBranch(') < setup.indexOf('ensureEnvironment('));
  assert.ok(setup.indexOf('ensureEnvironment(') < setup.indexOf('setVariable('));
});

test('GitHub setup scopes preflight and mutations to the requested draft domain', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(setupCliPath, 'utf8'));
  assert.match(source, /assertScopedApply\(apply, args\.domain\)/);
  assert.match(source, /selectRegisteredDrafts\(inventory\.drafts, requestedDomain\)/);
  assert.match(source, /preflightDraftSetups\(selectedDrafts\)/);
  assert.match(source, /for \(const draft of selectedDrafts\)/);
  const main = source.slice(source.indexOf('async function main'), source.indexOf('\nfunction setupResultOk'));
  assert.ok(main.indexOf('assertScopedApply(') < main.indexOf('readRegisteredDraftInventory('));
  assert.ok(main.indexOf('assertScopedApply(') < main.indexOf('preflightDraftSetups('));
});

test('branch setup pins status checks through the dedicated API before readback', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(setupCliPath, 'utf8'));
  const protectStart = source.indexOf('async function protectBranch');
  const protectEnd = source.indexOf('\nasync function setupDraft', protectStart);
  const protect = source.slice(protectStart, protectEnd);
  const fullProtection = protect.indexOf("'PUT'");
  const statusPatch = protect.indexOf("'PATCH'", fullProtection);
  const statusChecks = protect.indexOf('/required_status_checks', statusPatch);
  const readback = protect.indexOf('branchProtectionMatches');
  assert.ok(fullProtection >= 0);
  assert.ok(statusPatch > fullProtection);
  assert.ok(statusChecks > statusPatch);
  assert.ok(readback > statusChecks);
});

test('draft setup blocks unresolved domain-to-local-path transitions', async () => {
  const result = await inspectRegisteredRepo({
    domain: 'old.example.com',
    localPath: 'drafts/new.example.com',
    repoPath: path.resolve('drafts/new.example.com'),
  });

  assert.equal(result.repoStatus, 'domain-transition');
});

test('apply preflight reports every unsafe repo before setup can mutate any repo', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-setup-preflight-'));
  const drafts = [
    {
      domain: 'missing.example.com',
      repo: 'draft-missing-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-missing-example-com.git',
      localPath: 'drafts/missing.example.com',
      repoPath: path.join(root, 'drafts', 'missing.example.com'),
      registryRoot: root,
      defaultBaseDir: 'drafts',
    },
    {
      domain: 'old.example.com',
      repo: 'draft-new-example-com',
      githubUrl: 'https://github.com/LynxPardelle/draft-new-example-com.git',
      localPath: 'drafts/new.example.com',
      repoPath: path.join(root, 'drafts', 'new.example.com'),
      registryRoot: root,
      defaultBaseDir: 'drafts',
    },
  ];

  await assert.rejects(
    preflightDraftSetups(drafts),
    /draft-missing-example-com:missing.*draft-new-example-com:domain-transition/s
  );
});

test('default dry run uses registered localPath and never creates drafts/_repos', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-draft-github-setup-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repoPath = path.join(root, 'drafts', 'example.com');
  const registryPath = path.join(root, 'docs', 'drafts-registry.json');
  const githubUrl = 'https://github.com/LynxPardelle/draft-example-com.git';
  await mkdir(path.dirname(registryPath), { recursive: true });
  await mkdir(repoPath, { recursive: true });
  await git(repoPath, ['init']);
  await git(repoPath, ['config', 'user.email', 'test@example.com']);
  await git(repoPath, ['config', 'user.name', 'Test User']);
  await git(repoPath, ['remote', 'add', 'origin', githubUrl]);
  await writeFile(path.join(repoPath, 'site-config.json'), '{"domain":"example.com"}\n', 'utf8');
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'seed']);
  await writeFile(registryPath, JSON.stringify({
    version: 1,
    owner: 'LynxPardelle',
    defaultBaseDir: 'drafts',
    drafts: [{
      domain: 'example.com',
      repo: 'draft-example-com',
      githubUrl,
      localPath: 'drafts/example.com',
    }],
  }), 'utf8');

  const { stdout } = await execFileAsync(
    process.execPath,
    [setupCliPath, `--registry=${registryPath}`],
    { cwd: root, windowsHide: true }
  );
  const report = JSON.parse(stdout);

  assert.equal(report.results.length, 1);
  assert.equal(path.resolve(report.results[0].repoPath), path.resolve(repoPath));
  assert.equal(report.results[0].repoStatus, 'ready');
  assert.equal(existsSync(path.join(root, 'drafts', '_repos')), false);
});
