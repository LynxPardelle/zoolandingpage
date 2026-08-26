import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  branchProtectionPayload,
  branchProtectionMatches,
  assertTrackedRegularFile,
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
  readProductionEnvironmentFromGithub,
  readProductionRoleFromAws,
  readRegisteredDraftInventory,
  reconcileTestOnlyProduction,
  repoNameForDomain,
  resolveGithubSetupAccountId,
  resolveGithubSetupAuthoringEndpoint,
  setupResultOk,
  testAliasesFor,
} from '../draft-github-setup.mjs';

const execFileAsync = promisify(execFile);
const setupCliPath = fileURLToPath(new URL('../draft-github-setup.mjs', import.meta.url));
const productionWorkflowTemplatePath = fileURLToPath(
  new URL('../templates/draft-repo/.github/workflows/deploy-production.yml', import.meta.url),
);
const reviewedWorkflowSource = await readFile(productionWorkflowTemplatePath, 'utf8');
const reviewedTestOnlyConfigSource = `${JSON.stringify({
  domain: 'thehairnarrative.com',
  branches: {
    dev: { deploys: false },
    test: { deploys: true, environment: 'test' },
    main: { deploys: false },
  },
  githubVariables: { test: ['DRAFT_DOMAIN'] },
}, null, 2)}\n`;

function testOnlyExternalState({
  environmentExists = false,
  roleExists = false,
  readRemoteFile,
} = {}) {
  return {
    readProductionEnvironment: async () => ({ exists: environmentExists }),
    readProductionRole: async () => ({ exists: roleExists }),
    readRemoteFile: readRemoteFile ?? (async ({ filePath }) => ({
      exists: true,
      source: filePath === 'draft-repo.config.json'
        ? reviewedTestOnlyConfigSource
        : reviewedWorkflowSource,
    })),
  };
}

async function git(cwd, args) {
  return execFileAsync('git', args, { cwd, windowsHide: true });
}

async function createTrackedTestOnlyDraft(t, {
  config,
  workflow = 'name: Deploy production draft\n',
} = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-test-only-reconcile-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const repoPath = path.join(root, 'drafts', 'thehairnarrative.com');
  await mkdir(path.join(repoPath, '.github', 'workflows'), { recursive: true });
  await git(repoPath, ['init']);
  await git(repoPath, ['config', 'user.email', 'test@example.com']);
  await git(repoPath, ['config', 'user.name', 'Test User']);
  const githubUrl = 'https://github.com/Toydrum/draft-thehairnarrative-com.git';
  await git(repoPath, ['remote', 'add', 'origin', githubUrl]);
  await writeFile(path.join(repoPath, 'draft-repo.config.json'), `${JSON.stringify(config ?? {
    domain: 'thehairnarrative.com',
    branches: {
      dev: { deploys: false },
      test: { deploys: true, environment: 'test' },
      main: { deploys: true, environment: 'production' },
    },
    githubVariables: {
      test: ['DRAFT_DOMAIN'],
      production: ['DRAFT_DOMAIN'],
    },
  }, null, 2)}\n`, 'utf8');
  await writeFile(
    path.join(repoPath, '.github', 'workflows', 'deploy-production.yml'),
    workflow,
    'utf8',
  );
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'seed']);
  await git(repoPath, ['branch', '-M', 'dev']);
  return {
    root,
    repoPath,
    draft: {
      domain: 'thehairnarrative.com',
      owner: 'Toydrum',
      repo: 'draft-thehairnarrative-com',
      githubUrl,
      localPath: 'drafts/thehairnarrative.com',
      repoPath,
      registryRoot: root,
      defaultBaseDir: 'drafts',
      deploymentEnvironments: ['test'],
    },
  };
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

test('setup result requires only the deployment environments declared by the draft', () => {
  const common = {
    repoStatus: 'ready',
    branchProtection: {
      test: { protected: true },
      main: { protected: true },
    },
  };

  assert.equal(setupResultOk({
    ...common,
    deploymentEnvironments: ['test'],
    environmentProtection: { test: { protected: true } },
  }, true), true);
  assert.equal(setupResultOk({
    ...common,
    deploymentEnvironments: ['test', 'production'],
    environmentProtection: { test: { protected: true } },
  }, true), false);
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

test('applied GitHub setup requires an explicitly verified authoring endpoint', () => {
  assert.throws(
    () => resolveGithubSetupAuthoringEndpoint({ apply: true }),
    /apply_requires_explicit_authoring_endpoint/,
  );
  assert.equal(
    resolveGithubSetupAuthoringEndpoint({
      apply: true,
      authoringEndpoint: 'https://verified.example.test/',
    }),
    'https://verified.example.test/',
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

test('personal repository ruleset enforces PRs, pinned checks, deletion, and force-push protection', () => {
  const payload = personalBranchRulesetPayload('test', ['guard']);
  assert.equal(payload.name, 'zoolanding-test-protection');
  assert.deepEqual(payload.bypass_actors, []);
  assert.deepEqual(payload.conditions.ref_name, {
    include: ['refs/heads/test'],
    exclude: [],
  });
  assert.deepEqual(payload.rules.map(rule => rule.type), [
    'deletion',
    'non_fast_forward',
    'pull_request',
    'required_status_checks',
  ]);
  assert.deepEqual(payload.rules.at(-1).parameters.required_status_checks, [
    { context: 'guard', integration_id: 15368 },
  ]);
});

test('personal repository ruleset readback rejects bypasses and unpinned checks', () => {
  const payload = personalBranchRulesetPayload('main', ['guard']);
  const readback = {
    ...payload,
    source_type: 'Repository',
  };
  assert.equal(personalBranchRulesetMatches(readback, 'main', ['guard']), true);
  assert.equal(personalBranchRulesetMatches({
    ...readback,
    bypass_actors: [{ actor_id: 1, actor_type: 'User', bypass_mode: 'always' }],
  }, 'main', ['guard']), false);
  assert.equal(personalBranchRulesetMatches({
    ...readback,
    rules: readback.rules.map(rule => rule.type === 'required_status_checks'
      ? {
          ...rule,
          parameters: {
            ...rule.parameters,
            required_status_checks: [{ context: 'guard', integration_id: -1 }],
          },
        }
      : rule),
  }, 'main', ['guard']), false);
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

test('test-only setup audit reports every local and remote production drift surface', async t => {
  const { draft } = await createTrackedTestOnlyDraft(t);

  const drift = await inspectTestOnlyProductionDrift({
    draft,
    owner: draft.owner,
    ...testOnlyExternalState({ environmentExists: true, roleExists: true }),
  });

  assert.equal(drift.applicable, true);
  assert.equal(drift.ok, false);
  assert.deepEqual(drift.issues.map(issue => issue.code), [
    'draft_repo_config_main_deploys_production',
    'draft_repo_config_main_environment_production',
    'draft_repo_config_production_variables_declared',
    'production_workflow_guard_not_reviewed',
    'github_production_environment_present',
    'aws_production_role_present',
  ]);
  assert.deepEqual(drift.decommissionPending.map(item => item.surface), [
    'github_environment',
    'github_environment_variables',
    'aws_oidc_role',
  ]);
  assert.equal(setupResultOk({ repoStatus: 'ready', productionDrift: drift }, false), false);
});

test('test-only setup audit accepts reviewed local and remote state when production surfaces are absent', async t => {
  const reviewedWorkflow = reviewedWorkflowSource;
  const { draft } = await createTrackedTestOnlyDraft(t, {
    config: {
      domain: 'thehairnarrative.com',
      branches: {
        dev: { deploys: false },
        test: { deploys: true, environment: 'test' },
        main: { deploys: false },
      },
      githubVariables: { test: ['DRAFT_DOMAIN'] },
    },
    workflow: reviewedWorkflow,
  });

  assert.equal(productionWorkflowHasReviewedGuard(reviewedWorkflow), true);
  assert.equal(productionWorkflowHasReviewedGuard('name: Deploy production draft\n'), false);
  assert.equal(productionWorkflowHasReviewedGuard(`${reviewedWorkflow}# unreviewed change\n`), false);
  assert.equal(productionWorkflowHasReviewedGuard(`
# name: Verify production deployment is enabled
# config?.branches?.main?.deploys !== true
# config?.branches?.main?.environment !== 'production'
# Production deployment is disabled for this draft.
# name: Prepare deterministic deployment plan
# id-token: write
`), false);
  const drift = await inspectTestOnlyProductionDrift({
    draft,
    owner: draft.owner,
    ...testOnlyExternalState(),
  });

  assert.equal(drift.ok, true);
  assert.deepEqual(drift.issues, []);
  assert.deepEqual(drift.decommissionPending, []);
  assert.equal(setupResultOk({ repoStatus: 'ready', productionDrift: drift }, false), true);
});

test('test-only setup audit redacts GitHub inspection failures and fails closed', async t => {
  const reviewedWorkflow = reviewedWorkflowSource;
  const { draft } = await createTrackedTestOnlyDraft(t, {
    config: {
      domain: 'thehairnarrative.com',
      branches: { main: { deploys: false } },
      githubVariables: { test: ['DRAFT_DOMAIN'] },
    },
    workflow: reviewedWorkflow,
  });

  const drift = await inspectTestOnlyProductionDrift({
    draft,
    owner: draft.owner,
    ...testOnlyExternalState(),
    readProductionEnvironment: async () => {
      throw new Error('sensitive_remote_detail');
    },
  });

  assert.equal(drift.ok, false);
  assert.deepEqual(drift.issues.map(issue => issue.code), [
    'github_production_environment_inspection_failed',
  ]);
  assert.doesNotMatch(JSON.stringify(drift), /sensitive_remote_detail/);
});

test('GitHub production Environment absence requires a complete authoritative listing', async () => {
  await assert.rejects(
    readProductionEnvironmentFromGithub({
      owner: 'Toydrum',
      repo: 'draft-thehairnarrative-com',
      requestJson: async () => {
        throw new Error('resource hidden (HTTP 404)');
      },
    }),
    /github_production_environment_inspection_failed/,
  );

  const pages = [];
  const present = await readProductionEnvironmentFromGithub({
    owner: 'Toydrum',
    repo: 'draft-thehairnarrative-com',
    requestJson: async args => {
      pages.push(args.at(-1));
      if (pages.length === 1) {
        return {
          total_count: 101,
          environments: Array.from({ length: 100 }, (_, index) => ({ name: `env-${index}` })),
        };
      }
      return { total_count: 101, environments: [{ name: 'Production' }] };
    },
  });
  assert.deepEqual(present, { exists: true });
  assert.equal(pages.length, 2);

  const absent = await readProductionEnvironmentFromGithub({
    owner: 'Toydrum',
    repo: 'draft-thehairnarrative-com',
    requestJson: async () => ({ total_count: 1, environments: [{ name: 'test' }] }),
  });
  assert.deepEqual(absent, { exists: false });
});

test('AWS production role audit verifies the account and distinguishes authoritative absence', async () => {
  const commands = [];
  const absent = await readProductionRoleFromAws({
    accountId: '123456789012',
    roleName: 'draft-thehairnarrative-com-production-deploy',
    runCommand: async (_command, args) => {
      commands.push(args);
      if (args[0] === 'sts') return JSON.stringify({ Account: '123456789012' });
      throw new Error('NoSuchEntity: role does not exist');
    },
  });
  assert.deepEqual(absent, { exists: false });
  assert.deepEqual(commands.map(args => args[0]), ['sts', 'iam']);

  await assert.rejects(
    readProductionRoleFromAws({
      accountId: '123456789012',
      roleName: 'draft-thehairnarrative-com-production-deploy',
      runCommand: async () => JSON.stringify({ Account: '999999999999' }),
    }),
    /aws_production_role_account_mismatch/,
  );
});

test('test-only audit fails while remote main retains production config or an old workflow', async t => {
  const { draft } = await createTrackedTestOnlyDraft(t, {
    config: JSON.parse(reviewedTestOnlyConfigSource),
    workflow: reviewedWorkflowSource,
  });
  const staleConfig = `${JSON.stringify({
    domain: draft.domain,
    branches: { main: { deploys: true, environment: 'production' } },
    githubVariables: { test: ['DRAFT_DOMAIN'], production: ['DRAFT_DOMAIN'] },
  }, null, 2)}\n`;
  const drift = await inspectTestOnlyProductionDrift({
    draft,
    owner: draft.owner,
    ...testOnlyExternalState({
      readRemoteFile: async ({ branch, filePath }) => ({
        exists: true,
        source: branch === 'main'
          ? (filePath === 'draft-repo.config.json' ? staleConfig : 'name: old production deploy\n')
          : (filePath === 'draft-repo.config.json'
              ? reviewedTestOnlyConfigSource
              : reviewedWorkflowSource),
      }),
    }),
  });

  assert.equal(drift.ok, false);
  assert.deepEqual(drift.issues.map(issue => issue.code), [
    'remote_main_draft_repo_config_main_deploys_production',
    'remote_main_draft_repo_config_main_environment_production',
    'remote_main_draft_repo_config_production_variables_declared',
    'remote_main_production_workflow_guard_not_reviewed',
  ]);
  assert.equal(setupResultOk({ repoStatus: 'ready', productionDrift: drift }, false), false);
});

test('test-only audit keeps an unverifiable production role explicitly pending', async t => {
  const { draft } = await createTrackedTestOnlyDraft(t, {
    config: JSON.parse(reviewedTestOnlyConfigSource),
    workflow: reviewedWorkflowSource,
  });
  const drift = await inspectTestOnlyProductionDrift({
    draft,
    owner: draft.owner,
    ...testOnlyExternalState(),
    readProductionRole: async () => {
      throw new Error('access denied with sensitive details');
    },
  });

  assert.deepEqual(drift.issues.map(issue => issue.code), [
    'aws_production_role_inspection_failed',
  ]);
  assert.deepEqual(drift.decommissionPending, [{
    surface: 'aws_oidc_role',
    environment: 'production',
    roleName: 'draft-thehairnarrative-com-production-deploy',
    status: 'verification_pending',
  }]);
  assert.doesNotMatch(JSON.stringify(drift), /sensitive details/);
});

test('setup planning audits all selected drafts before callers can perform setup writes', async t => {
  const first = await createTrackedTestOnlyDraft(t);
  const second = {
    draft: {
      ...first.draft,
      repo: 'draft-second-example-com',
    },
  };
  const inspected = [];

  const plans = await inspectDraftSetupPlans([first.draft, second.draft], {
    ...testOnlyExternalState(),
    readProductionEnvironment: async ({ repo }) => {
      inspected.push(repo);
      return { exists: repo === first.draft.repo };
    },
  });

  assert.deepEqual(inspected, [first.draft.repo, second.draft.repo]);
  assert.equal(plans.length, 2);
  assert.equal(plans[0].productionDrift.ok, false);
  assert.equal(plans[1].productionDrift.ok, false);
});

test('explicit test-only reconciliation changes only tracked managed files and preserves unmanaged config', async t => {
  const { draft, repoPath } = await createTrackedTestOnlyDraft(t, {
    config: {
      domain: 'thehairnarrative.com',
      customTopLevel: { retained: true },
      branches: {
        dev: { deploys: false, retained: 'dev' },
        test: { deploys: true, environment: 'test' },
        main: { deploys: true, environment: 'production', retained: 'main' },
      },
      githubVariables: {
        test: ['DRAFT_DOMAIN'],
        production: ['DRAFT_DOMAIN'],
        custom: ['RETAINED'],
      },
    },
  });
  const beforeHead = (await git(repoPath, ['rev-parse', 'HEAD'])).stdout.trim();

  const result = await reconcileTestOnlyProduction({
    draft,
    owner: draft.owner,
    ...testOnlyExternalState({ environmentExists: true, roleExists: true }),
  });

  assert.deepEqual(result.changedFiles, [
    'draft-repo.config.json',
    '.github/workflows/deploy-production.yml',
  ]);
  assert.equal(result.committed, false);
  assert.equal(result.pushed, false);
  assert.equal(result.requiresProtectedPromotion, true);
  assert.equal(result.ok, false);
  assert.deepEqual(result.decommissionPending.map(item => item.surface), [
    'github_environment',
    'github_environment_variables',
    'aws_oidc_role',
  ]);

  const config = JSON.parse(await readFile(path.join(repoPath, 'draft-repo.config.json'), 'utf8'));
  assert.deepEqual(config.customTopLevel, { retained: true });
  assert.equal(config.branches.dev.retained, 'dev');
  assert.equal(config.branches.main.retained, 'main');
  assert.equal(config.branches.main.deploys, false);
  assert.equal(Object.hasOwn(config.branches.main, 'environment'), false);
  assert.deepEqual(config.githubVariables, {
    test: ['DRAFT_DOMAIN'],
    custom: ['RETAINED'],
  });
  assert.equal(
    await readFile(path.join(repoPath, '.github', 'workflows', 'deploy-production.yml'), 'utf8'),
    await readFile(productionWorkflowTemplatePath, 'utf8'),
  );
  assert.deepEqual(
    (await git(repoPath, ['diff', '--name-only'])).stdout.trim().split(/\r?\n/).sort(),
    [
      '.github/workflows/deploy-production.yml',
      'draft-repo.config.json',
    ].sort(),
  );
  assert.equal((await git(repoPath, ['rev-parse', 'HEAD'])).stdout.trim(), beforeHead);
});

test('test-only reconciliation remains fail-closed until remote main receives the reviewed bytes', async t => {
  const { draft } = await createTrackedTestOnlyDraft(t);
  const result = await reconcileTestOnlyProduction({
    draft,
    owner: draft.owner,
    ...testOnlyExternalState({
      readRemoteFile: async ({ branch, filePath }) => ({
        exists: true,
        source: branch === 'main'
          ? (filePath === 'draft-repo.config.json'
              ? '{"branches":{"main":{"deploys":true,"environment":"production"}}}\n'
              : 'name: old production deploy\n')
          : (filePath === 'draft-repo.config.json'
              ? reviewedTestOnlyConfigSource
              : reviewedWorkflowSource),
      }),
    }),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.issues.map(issue => issue.code), [
    'remote_main_draft_repo_config_main_deploys_production',
    'remote_main_draft_repo_config_main_environment_production',
    'remote_main_production_workflow_guard_not_reviewed',
  ]);
  assert.equal(result.requiresProtectedPromotion, true);
});

test('test-only reconciliation refuses a dirty repo before changing either managed file', async t => {
  const { draft, repoPath } = await createTrackedTestOnlyDraft(t);
  const configPath = path.join(repoPath, 'draft-repo.config.json');
  const workflowPath = path.join(repoPath, '.github', 'workflows', 'deploy-production.yml');
  const beforeConfig = await readFile(configPath, 'utf8');
  const beforeWorkflow = await readFile(workflowPath, 'utf8');
  await writeFile(path.join(repoPath, 'unrelated.txt'), 'user work\n', 'utf8');

  await assert.rejects(
    reconcileTestOnlyProduction({
      draft,
      owner: draft.owner,
      readProductionEnvironment: async () => ({ exists: false }),
    }),
    /reconcile_requires_clean_repo/,
  );
  assert.equal(await readFile(configPath, 'utf8'), beforeConfig);
  assert.equal(await readFile(workflowPath, 'utf8'), beforeWorkflow);
});

test('test-only reconciliation detects remote inspection failure before any local write', async t => {
  const { draft, repoPath } = await createTrackedTestOnlyDraft(t);
  const configPath = path.join(repoPath, 'draft-repo.config.json');
  const workflowPath = path.join(repoPath, '.github', 'workflows', 'deploy-production.yml');
  const beforeConfig = await readFile(configPath, 'utf8');
  const beforeWorkflow = await readFile(workflowPath, 'utf8');

  await assert.rejects(
    reconcileTestOnlyProduction({
      draft,
      owner: draft.owner,
      ...testOnlyExternalState(),
      readProductionEnvironment: async () => {
        throw new Error('untrusted remote error');
      },
    }),
    /github_production_environment_inspection_failed/,
  );
  assert.equal(await readFile(configPath, 'utf8'), beforeConfig);
  assert.equal(await readFile(workflowPath, 'utf8'), beforeWorkflow);
});

test('test-only reconciliation refuses main and test so changes require protected promotion', async t => {
  const { draft, repoPath } = await createTrackedTestOnlyDraft(t);
  const configPath = path.join(repoPath, 'draft-repo.config.json');
  const workflowPath = path.join(repoPath, '.github', 'workflows', 'deploy-production.yml');
  const beforeConfig = await readFile(configPath, 'utf8');
  const beforeWorkflow = await readFile(workflowPath, 'utf8');
  await git(repoPath, ['branch', '-M', 'main']);

  await assert.rejects(
    reconcileTestOnlyProduction({
      draft,
      owner: draft.owner,
      readProductionEnvironment: async () => ({ exists: false }),
    }),
    /reconcile_requires_non_production_branch/,
  );
  assert.equal(await readFile(configPath, 'utf8'), beforeConfig);
  assert.equal(await readFile(workflowPath, 'utf8'), beforeWorkflow);
});

test('test-only reconciliation rejects a tracked file reached through an escaping junction', async t => {
  const { root, repoPath } = await createTrackedTestOnlyDraft(t);
  const workflowsPath = path.join(repoPath, '.github', 'workflows');
  const outsidePath = path.join(root, 'outside-workflows');
  await rename(workflowsPath, outsidePath);
  try {
    await symlink(outsidePath, workflowsPath, 'junction');
  } catch (error) {
    if (error?.code === 'EPERM') {
      t.skip('junction creation is unavailable on this host');
      return;
    }
    throw error;
  }

  await assert.rejects(
    assertTrackedRegularFile(repoPath, '.github/workflows/deploy-production.yml'),
    /reconcile_requires_tracked_regular_file/,
  );
});

test('setup configures branch protection before deployment environments and variables', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(setupCliPath, 'utf8'));
  const setupStart = source.indexOf('async function setupDraft');
  const setupEnd = source.indexOf('\nasync function main', setupStart);
  const setup = source.slice(setupStart, setupEnd);
  assert.ok(setup.indexOf('protectBranch(') < setup.indexOf('ensureEnvironment('));
  assert.ok(setup.indexOf('ensureEnvironment(') < setup.indexOf('setVariable('));
  const productionOnlyWrites = setup.slice(
    setup.indexOf("if (productionEnabled)"),
    setup.indexOf('const mergePolicy'),
  );
  assert.match(productionOnlyWrites, /checkout', 'main'/);
  assert.match(productionOnlyWrites, /bootstrapDraftRepo/);
  assert.match(productionOnlyWrites, /commitAndPush/);
  assert.equal(setup.indexOf("checkout', 'main'"), setup.indexOf("checkout', 'main'", setup.indexOf('if (productionEnabled)')));

  const reconcileStart = source.indexOf('async function reconcileTestOnlyProduction');
  const reconcileEnd = source.indexOf('\nasync function ensureEnvironment', reconcileStart);
  const reconcile = source.slice(reconcileStart, reconcileEnd);
  assert.doesNotMatch(reconcile, /ensureEnvironment|setVariable|commitAndPush|pushBranch|checkout', 'main'|delete-role/);
});

test('GitHub setup scopes preflight and mutations to the requested draft domain', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) => readFile(setupCliPath, 'utf8'));
  assert.match(source, /assertScopedApply\(apply \|\| reconcileTestOnly, args\.domain\)/);
  assert.match(source, /selectRegisteredDrafts\(inventory\.drafts, requestedDomain\)/);
  assert.match(source, /preflightDraftSetups\(selectedDrafts, \{ plans \}\)/);
  assert.match(source, /for \(const \[index, draft\] of selectedDrafts\.entries\(\)\)/);
  const main = source.slice(source.indexOf('async function main'), source.indexOf('\nfunction setupResultOk'));
  assert.ok(main.indexOf('assertScopedApply(') < main.indexOf('readRegisteredDraftInventory('));
  assert.ok(main.indexOf('assertScopedApply(') < main.indexOf('preflightDraftSetups('));
  assert.ok(main.indexOf('inspectDraftSetupPlans(') < main.indexOf('setupDraft('));
  assert.match(main, /reconcile-test-only-production/);
  assert.match(source, /inspectRegisteredRepo\(draft, \{ apply: Boolean\(options\.apply\) \}\)/);
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
