import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const deployScript = path.join(repoRoot, 'tools', 'templates', 'draft-repo', 'tools', 'deploy-draft.mjs');
const jqExecutable = process.env.JQ_PATH?.trim() || 'jq';
const jqAvailable = spawnSync(jqExecutable, ['--version'], { encoding: 'utf8' }).status === 0;

function extractPlanFilter(workflow) {
  const startMarker = '            --arg version "$EXPECTED_VERSION_ID" \'';
  const endMarker = '\n            \' "$PLAN_PATH"';
  const start = workflow.indexOf(startMarker);
  assert.notEqual(start, -1, 'deployment-plan jq start marker must exist');
  const filterStart = start + startMarker.length;
  const end = workflow.indexOf(endMarker, filterStart);
  assert.notEqual(end, -1, 'deployment-plan jq end marker must exist');
  return workflow.slice(filterStart, end);
}

test('template packages only known server descriptors with exact kinds', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-kinds-'));
  try {
    const draftRoot = path.join(tempRoot, 'example.com');
    const serverRoot = path.join(draftRoot, 'server');
    await mkdir(serverRoot, { recursive: true });
    await mkdir(path.join(tempRoot, 'tools', 'schemas'), { recursive: true });
    const expectedKinds = {
      'auth-profile-registry.json': 'server-auth-profile-registry',
      'integrations.json': 'server-integrations',
      'data-spaces.json': 'server-data-spaces',
      'commerce.json': 'server-commerce',
      'integration-bindings.json': 'server-integration-bindings',
      'notification-policies.json': 'server-notification-policies',
    };
    for (const name of Object.keys(expectedKinds)) await writeFile(path.join(serverRoot, name), '{}');
    await writeFile(path.join(draftRoot, 'draft-repo.config.json'), '{}');
    await writeFile(path.join(tempRoot, 'package.json'), '{"private":true}');
    await writeFile(path.join(tempRoot, 'package-lock.json'), '{"lockfileVersion":3}');
    await writeFile(path.join(tempRoot, 'tools', 'schemas', 'commerce.schema.json'), '{}');

    const { collectJsonFiles } = await import(pathToFileURL(deployScript).href);
    const files = await collectJsonFiles(tempRoot, 'example.com');
    assert.equal(files.some(file => file.path.endsWith('/draft-repo.config.json')), false);
    assert.equal(files.some(file => file.path.endsWith('/package.json')), false);
    assert.equal(files.some(file => file.path.endsWith('/package-lock.json')), false);
    assert.equal(files.some(file => file.path.includes('/tools/')), false);
    assert.deepEqual(Object.fromEntries(files.map(file => [path.basename(file.path), file.kind])), expectedKinds);

    await writeFile(path.join(serverRoot, 'unknown.json'), '{}');
    await assert.rejects(() => collectJsonFiles(tempRoot, 'example.com'), /unknown_server_descriptor/);
    await rm(path.join(serverRoot, 'unknown.json'), { force: true });

    await writeFile(path.join(tempRoot, 'unknown-root.json'), '{}');
    await assert.rejects(() => collectJsonFiles(tempRoot, 'example.com'), /unknown_draft_json_path/);
    await rm(path.join(tempRoot, 'unknown-root.json'), { force: true });

    const pageRoot = path.join(tempRoot, 'default');
    await mkdir(pageRoot, { recursive: true });
    await writeFile(path.join(pageRoot, 'unknown.json'), '{}');
    await assert.rejects(() => collectJsonFiles(tempRoot, 'example.com'), /unknown_draft_json_path/);
    await rm(path.join(pageRoot, 'unknown.json'), { force: true });

    const nestedSharedI18n = path.join(tempRoot, 'i18n', 'i18n');
    await mkdir(nestedSharedI18n, { recursive: true });
    await writeFile(path.join(nestedSharedI18n, 'en.json'), '{}');
    await assert.rejects(() => collectJsonFiles(tempRoot, 'example.com'), /unknown_draft_json_path/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template server kind map stays synchronized with the canonical map', async () => {
  const canonical = await import('../lib/server-descriptor-kinds.mjs');
  const template = await import('../templates/draft-repo/tools/lib/server-descriptor-kinds.mjs');
  assert.deepEqual(template.SERVER_DESCRIPTOR_KINDS, canonical.SERVER_DESCRIPTOR_KINDS);
  assert.equal(canonical.isLocalOnlyDraftDirectoryName('.DRAFT-DEPLOY'), true);
  assert.equal(template.isLocalOnlyDraftDirectoryName('.DRAFT-DEPLOY'), true);
  for (const candidate of [
    'example.com/SERVER/commerce.json',
    'example.com/%73erver/commerce.json',
    'example.com/%2573erver/commerce.json',
    'example.com/nested/server/commerce.json',
  ]) {
    assert.throws(() => canonical.inferServerDescriptorKind('example.com', candidate), /invalid_server_descriptor_path/);
    assert.throws(() => template.inferServerDescriptorKind('example.com', candidate), /invalid_server_descriptor_path/);
  }
});

test('template secret-reference matching stays synchronized without weakening ARN validation', async () => {
  const canonical = await import('../lib/sensitive-value-patterns.mjs');
  const template = await import('../templates/draft-repo/tools/lib/sensitive-value-patterns.mjs');
  const reference = [
    'arn:aws:secretsmanager:us-east-1:123456789012:secret',
    'example/path-AbCdEf',
  ].join(':');

  assert.equal(template.OPAQUE_SECRET_REFERENCE_PATTERN.source, canonical.OPAQUE_SECRET_REFERENCE_PATTERN.source);
  assert.equal(canonical.isOpaqueSecretReference(reference), true);
  assert.equal(template.isOpaqueSecretReference(reference), true);
  assert.equal(canonical.isOpaqueSecretReference('synthetic-placeholder-value'), false);
  assert.equal(template.isOpaqueSecretReference('synthetic-placeholder-value'), false);
});

test('new protected binding kinds require a bounded capability', async () => {
  const schema = JSON.parse(await readFile(path.join(repoRoot, 'docs', 'api-driven-config', 'schemas', 'protected-features.schema.json'), 'utf8'));
  for (const binding of [schema.definitions.runtimeDataSourceBinding, schema.definitions.runtimeApiActionBinding]) {
    assert.deepEqual(binding.allOf[0].then.required, ['capability']);
    assert.equal(binding.properties.capability.$ref, '#/definitions/capability');
  }
  assert.equal(schema.definitions.capability.maxLength, 128);
});

test('template validation fails closed without echoing secret-looking values', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-readiness-'));
  try {
    const serverRoot = path.join(tempRoot, 'example.com', 'server');
    await mkdir(serverRoot, { recursive: true });
    const sentinel = ['sk', 'live', 'template-do-not-echo'].join('_');
    await writeFile(path.join(serverRoot, 'integration-bindings.json'), JSON.stringify({ version: 1, unexpected: sentinel }));
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--validate-only=true',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
    assert.match(result.stderr, /draft_feature_readiness_failed/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template scans legacy server descriptors without echoing values', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-legacy-readiness-'));
  try {
    const serverRoot = path.join(tempRoot, 'example.com', 'server');
    await mkdir(serverRoot, { recursive: true });
    const sentinel = ['sk', 'live', 'legacy-template-do-not-echo'].join('_');
    await writeFile(path.join(serverRoot, 'integrations.json'), JSON.stringify({
      version: 1,
      sources: [{ id: 'source', method: 'GET', url: 'https://example.invalid', headers: { Authorization: sentinel } }],
      actions: [],
    }));
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--validate-only=true',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
    assert.match(result.stderr, /draft_feature_readiness_failed/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template never echoes malformed JSON or upstream error text', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-malformed-'));
  try {
    const serverRoot = path.join(tempRoot, 'example.com', 'server');
    await mkdir(serverRoot, { recursive: true });
    const sentinel = ['sk', 'live', 'malformed-do-not-echo'].join('_');
    await writeFile(
      path.join(serverRoot, 'integration-bindings.json'),
      `{"version":1,"unexpected":"${sentinel}`,
    );
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--validate-only=true',
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
    assert.match(result.stderr, /draft_deploy_failed/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template writes a closed deterministic deployment plan without privileged or private runtime values', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-plan-'));
  try {
    const draftRoot = path.join(tempRoot, 'example.com');
    const artifactRoot = path.join(draftRoot, '.draft-deploy');
    const targetSha = 'a'.repeat(40);
    await mkdir(draftRoot, { recursive: true });
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(path.join(draftRoot, 'site-config.json'), '{"domain":"example.com"}\n');

    const sentinels = [
      'https://authoring.invalid/do-not-copy',
      'AKIA-DO-NOT-COPY',
      'secret-do-not-copy',
      'token-do-not-copy',
      'fiscal-pii-do-not-copy',
      'raw-provider-payload-do-not-copy',
    ];
    const env = {
      ...process.env,
      GITHUB_SHA: targetSha,
      GITHUB_RUN_ID: '1234567890',
      GITHUB_RUN_ATTEMPT: '1',
      AUTHORING_ENDPOINT: sentinels[0],
      AWS_ACCESS_KEY_ID: sentinels[1],
      AWS_SECRET_ACCESS_KEY: sentinels[2],
      GITHUB_TOKEN: sentinels[3],
      FISCAL_PII: sentinels[4],
      RAW_PROVIDER_PAYLOAD: sentinels[5],
    };
    const planPaths = [path.join(artifactRoot, 'plan-a.json'), path.join(artifactRoot, 'plan-b.json')];
    for (const planPath of planPaths) {
      const result = spawnSync(process.execPath, [
        deployScript,
        '--domain=example.com',
        `--draft-root=${draftRoot}`,
        '--environment=test',
        `--plan-output=.draft-deploy/${path.basename(planPath)}`,
      ], { encoding: 'utf8', env });
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    }

    const rawPlans = await Promise.all(planPaths.map(planPath => readFile(planPath, 'utf8')));
    assert.equal(rawPlans[0], rawPlans[1]);
    const plan = JSON.parse(rawPlans[0]);
    assert.deepEqual(Object.keys(plan).sort(), [
      'actions',
      'domain',
      'environment',
      'files',
      'schemaVersion',
      'targetSha',
      'versionId',
    ]);
    assert.equal(plan.schemaVersion, 1);
    assert.equal(plan.targetSha, targetSha);
    assert.equal(plan.domain, 'example.com');
    assert.equal(plan.environment, 'test');
    assert.equal(plan.versionId, `test-${targetSha}-1234567890-1`);
    assert.deepEqual(plan.actions, ['upsertDraft', 'publishDraft']);
    assert.deepEqual(plan.files.map(file => file.path), ['example.com/site-config.json']);
    assert.equal(plan.files[0].kind, 'site-config');
    assert.equal(plan.files[0].content.domain, 'example.com');
    for (const sentinel of sentinels) assert.equal(rawPlans[0].includes(sentinel), false);
    assert.doesNotMatch(
      rawPlans[0],
      /authoringEndpoint|credential|accessKey|secretAccessKey|sessionToken|githubToken|response|fiscalPii|rawProviderPayload/i,
    );

    const retryPlanPath = path.join(artifactRoot, 'plan-retry.json');
    const retryResult = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${draftRoot}`,
      '--environment=test',
      `--plan-output=.draft-deploy/${path.basename(retryPlanPath)}`,
    ], { encoding: 'utf8', env: { ...env, GITHUB_RUN_ATTEMPT: '2' } });
    assert.equal(retryResult.status, 0, `${retryResult.stdout}${retryResult.stderr}`);
    const retryPlan = JSON.parse(await readFile(retryPlanPath, 'utf8'));
    assert.equal(retryPlan.versionId, `test-${targetSha}-1234567890-2`);
    assert.notEqual(retryPlan.versionId, plan.versionId);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('plan mode requires official run metadata or an explicit bounded version ID', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-local-plan-'));
  try {
    const draftRoot = path.join(tempRoot, 'example.com');
    const planRoot = path.join(draftRoot, '.draft-deploy');
    const targetSha = 'b'.repeat(40);
    await mkdir(draftRoot, { recursive: true });
    await mkdir(planRoot, { recursive: true });
    await writeFile(path.join(draftRoot, 'site-config.json'), '{"domain":"example.com"}\n');
    const env = { ...process.env, GITHUB_SHA: targetSha };
    delete env.GITHUB_RUN_ID;
    delete env.GITHUB_RUN_ATTEMPT;
    const missingContextPath = path.join(planRoot, 'missing-context.json');
    const missingContext = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${draftRoot}`,
      '--environment=test',
      '--plan-output=.draft-deploy/missing-context.json',
    ], { encoding: 'utf8', env });
    assert.equal(missingContext.status, 1);
    await assert.rejects(readFile(missingContextPath), error => error?.code === 'ENOENT');

    const explicitPath = path.join(planRoot, 'explicit.json');
    const explicit = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${draftRoot}`,
      '--environment=test',
      '--version-id=local-test-bounded',
      '--plan-output=.draft-deploy/explicit.json',
    ], { encoding: 'utf8', env });
    assert.equal(explicit.status, 0, `${explicit.stdout}${explicit.stderr}`);
    assert.equal(JSON.parse(await readFile(explicitPath, 'utf8')).versionId, 'local-test-bounded');

    const invalidExplicitPath = path.join(planRoot, 'invalid-explicit.json');
    const invalidExplicit = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${draftRoot}`,
      '--environment=test',
      '--version-id=.invalid-leading-character',
      '--plan-output=.draft-deploy/invalid-explicit.json',
    ], { encoding: 'utf8', env });
    assert.equal(invalidExplicit.status, 1);
    await assert.rejects(readFile(invalidExplicitPath), error => error?.code === 'ENOENT');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('plan output rejects absolute, traversal, parent-link, and target-link paths without touching external files', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-plan-path-'));
  try {
    const draftRoot = path.join(tempRoot, 'draft');
    const outsideRoot = path.join(tempRoot, 'outside');
    const planParent = path.join(draftRoot, '.draft-deploy');
    const sentinelPath = path.join(outsideRoot, 'sentinel.txt');
    await mkdir(draftRoot, { recursive: true });
    await mkdir(outsideRoot, { recursive: true });
    await writeFile(path.join(draftRoot, 'site-config.json'), '{"domain":"example.com"}\n');
    await writeFile(sentinelPath, 'do-not-touch');
    const env = {
      ...process.env,
      GITHUB_SHA: 'c'.repeat(40),
      GITHUB_RUN_ID: '1234567890',
      GITHUB_RUN_ATTEMPT: '1',
    };
    const runPlan = planOutput => spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${draftRoot}`,
      '--environment=test',
      `--plan-output=${planOutput}`,
    ], { encoding: 'utf8', env });
    const assertRejected = async planOutput => {
      const result = runPlan(planOutput);
      assert.equal(result.status, 1, `${result.stdout}${result.stderr}`);
      assert.equal(await readFile(sentinelPath, 'utf8'), 'do-not-touch');
      assert.equal(`${result.stdout}${result.stderr}`.includes(outsideRoot), false);
    };

    await assertRejected(path.join(outsideRoot, 'absolute-plan.json'));
    await assertRejected('../outside/traversal-plan.json');

    await symlink(outsideRoot, planParent, process.platform === 'win32' ? 'junction' : 'dir');
    await assertRejected('.draft-deploy/deployment-plan.json');
    await assert.rejects(readFile(path.join(outsideRoot, 'deployment-plan.json')), error => error?.code === 'ENOENT');
    await rm(planParent, { force: true });

    await mkdir(planParent, { recursive: true });
    const linkedTarget = path.join(planParent, 'deployment-plan.json');
    await symlink(outsideRoot, linkedTarget, process.platform === 'win32' ? 'junction' : 'dir');
    await assertRejected('.draft-deploy/deployment-plan.json');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template refuses to materialize a plan containing fiscal PII or raw provider payload fields', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-sensitive-plan-'));
  try {
    const serverRoot = path.join(tempRoot, 'example.com', 'server');
    const planRoot = path.join(tempRoot, '.draft-deploy');
    await mkdir(serverRoot, { recursive: true });
    await mkdir(planRoot, { recursive: true });
    for (const [name, content, sentinel] of [
      ['integration-bindings.json', { version: 1, rfc: 'FISCAL-PII-DO-NOT-COPY' }, 'FISCAL-PII-DO-NOT-COPY'],
      ['data-spaces.json', { version: 1, rawProviderPayload: 'cus_PROVIDER-PAYLOAD-DO-NOT-COPY' }, 'PROVIDER-PAYLOAD-DO-NOT-COPY'],
    ]) {
      const descriptorPath = path.join(serverRoot, name);
      const planPath = path.join(planRoot, `${name}.plan.json`);
      await writeFile(descriptorPath, JSON.stringify(content));
      const result = spawnSync(process.execPath, [
        deployScript,
        '--domain=example.com',
        `--draft-root=${tempRoot}`,
        '--environment=test',
        `--plan-output=.draft-deploy/${name}.plan.json`,
      ], {
        encoding: 'utf8',
        env: {
          ...process.env,
          GITHUB_SHA: 'a'.repeat(40),
          GITHUB_RUN_ID: '1234567890',
          GITHUB_RUN_ATTEMPT: '1',
        },
      });
      assert.equal(result.status, 1);
      assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
      await assert.rejects(readFile(planPath), error => error?.code === 'ENOENT');
      await rm(descriptorPath, { force: true });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template refuses to materialize a plan containing a secret in public draft JSON', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-public-secret-'));
  try {
    const planRoot = path.join(tempRoot, '.draft-deploy');
    const sentinel = 'PUBLIC-DRAFT-SECRET-DO-NOT-COPY';
    await mkdir(planRoot, { recursive: true });
    await writeFile(path.join(tempRoot, 'site-config.json'), '{"domain":"example.com"}\n');
    await writeFile(path.join(tempRoot, 'variables.json'), JSON.stringify({ apiKey: sentinel }));
    const planPath = path.join(planRoot, 'deployment-plan.json');
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--plan-output=.draft-deploy/deployment-plan.json',
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_SHA: 'a'.repeat(40),
        GITHUB_RUN_ID: '1234567890',
        GITHUB_RUN_ATTEMPT: '1',
      },
    });
    assert.equal(result.status, 1);
    assert.equal(`${result.stdout}${result.stderr}`.includes(sentinel), false);
    await assert.rejects(readFile(planPath), error => error?.code === 'ENOENT');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('template permits intentional public contact fields outside server descriptors', async () => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'zlp-template-public-contact-'));
  try {
    const planRoot = path.join(tempRoot, '.draft-deploy');
    await mkdir(planRoot, { recursive: true });
    await writeFile(path.join(tempRoot, 'site-config.json'), JSON.stringify({
      domain: 'example.com',
      contact: { email: 'contact@example.com', phone: '+52 55 1234 5678' },
    }));
    const planPath = path.join(planRoot, 'deployment-plan.json');
    const result = spawnSync(process.execPath, [
      deployScript,
      '--domain=example.com',
      `--draft-root=${tempRoot}`,
      '--environment=test',
      '--plan-output=.draft-deploy/deployment-plan.json',
    ], {
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_SHA: 'a'.repeat(40),
        GITHUB_RUN_ID: '1234567890',
        GITHUB_RUN_ATTEMPT: '1',
      },
    });
    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    assert.equal(plan.files[0].content.contact.email, 'contact@example.com');
    assert.equal(plan.files[0].content.contact.phone, '+52 55 1234 5678');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('PR validation reads its non-secret domain without environment-scoped variables', async () => {
  const workflow = await readFile(path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', 'guard-pr-source.yml'), 'utf8');
  assert.match(workflow, /draft-repo\.config\.json/);
  assert.doesNotMatch(workflow, /vars\.DRAFT_DOMAIN/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name/);
  assert.match(workflow, /github\.repository/);
});

test('manual template deploys enforce the protected branch and promotion ancestry', async () => {
  for (const [name, branch] of [['deploy-test.yml', 'test'], ['deploy-production.yml', 'main']]) {
    const workflow = await readFile(
      path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', name),
      'utf8',
    );
    assert.match(workflow, new RegExp(`refs/heads/${branch}`));
    assert.match(workflow, /github\.ref/);
    assert.doesNotMatch(workflow, /if:\s*github\.event_name == 'push'/);
    assert.match(workflow, /node tools\/verify-promotion-commit\.mjs/);
    assert.match(workflow, /pull-requests:\s*read/);
    const topLevelPermissions = workflow.slice(
      workflow.indexOf('permissions:'),
      workflow.indexOf('\njobs:'),
    );
    assert.doesNotMatch(topLevelPermissions, /id-token:\s*write/);
    assert.match(workflow, /validate:[\s\S]*deploy:/);
    assert.match(workflow, /deploy:[\s\S]*needs:\s*validate/);
    assert.match(workflow, /deploy:[\s\S]*permissions:[\s\S]*id-token:\s*write/);
    assert.match(workflow, /--plan-output=\.draft-deploy\/deployment-plan\.json/);
    assert.match(workflow, /if \[\[ -L "\$artifact_dir" \]\]/);
    assert.match(workflow, /rm -f -- "\$artifact_dir"/);
    assert.match(workflow, /include-hidden-files:\s*true/);
    assert.match(workflow, /EXPECTED_DOMAIN:\s*\$\{\{ vars\.DRAFT_DOMAIN \}\}/);
  }
});

test('deployment plan outputs use one grouped GitHub output redirect', async () => {
  for (const name of ['deploy-test.yml', 'deploy-production.yml']) {
    const workflow = await readFile(
      path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', name),
      'utf8',
    );
    const planStep = workflow.slice(
      workflow.indexOf('      - name: Prepare deterministic deployment plan'),
      workflow.indexOf('      - name: Upload validated deployment plan'),
    );
    assert.equal((planStep.match(/>> "\$GITHUB_OUTPUT"/g) ?? []).length, 1);
    assert.match(planStep, /\{[\s\S]*\}\s*>> "\$GITHUB_OUTPUT"/);
  }
});

test('template builds the AWS session header without inline or echoed secret text', async () => {
  for (const name of ['deploy-test.yml', 'deploy-production.yml']) {
    const workflow = await readFile(
      path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', name),
      'utf8',
    );
    const deployJob = workflow.slice(workflow.indexOf('\n  deploy:'));
    assert.doesNotMatch(deployJob, /x-amz-security-token:\s*\$\{AWS_SESSION_TOKEN\}/);
    assert.match(deployJob, /local session_token_header\s+session_token_header="\$\(printf '%s: %s' 'x-amz-security-token' "\$AWS_SESSION_TOKEN"\)"/);
    assert.match(deployJob, /--header "\$session_token_header"/);
    assert.doesNotMatch(deployJob, /^\s*(?:echo|printf)\b[^\n]*(?:AWS_SESSION_TOKEN|session_token_header)/m);
  }
});

test('privileged template jobs validate the closed plan before OIDC and never print HTTP bodies', async () => {
  for (const [name, environment] of [['deploy-test.yml', 'test'], ['deploy-production.yml', 'production']]) {
    const workflow = await readFile(
      path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows', name),
      'utf8',
    );
    const deployJob = workflow.slice(workflow.indexOf('\n  deploy:'));
    assert.match(deployJob, /EXPECTED_ENVIRONMENT:[^\n]*\b(?:test|production)\b/);
    assert.match(deployJob, /EXPECTED_DOMAIN:[^\n]*vars\.DRAFT_DOMAIN/);
    assert.match(deployJob, /EXPECTED_ROLE_ARN:[^\n]*vars\.AWS_ROLE_ARN/);
    assert.match(deployJob, /EXPECTED_VERSION_ID:[^\n]*needs\.validate\.outputs\.version_id/);
    assert.doesNotMatch(deployJob, /github\.run_attempt/);
    assert.doesNotMatch(deployJob, /run:[\s\S]*\$\{\{ vars\.AWS_ROLE_ARN \}\}/);
    assert.match(deployJob, /keys_unsorted/);
    assert.match(deployJob, /\["upsertDraft",\s*"publishDraft"\]/);
    assert.match(deployJob, /all\(\.files\[\]/);
    assert.match(deployJob, /\$parts\[0\] == \$domain/);
    assert.match(deployJob, /unique/);
    assert.match(deployJob, /mktemp -d/);
    assert.match(deployJob, /trap ['"]rm -rf/);
    assert.match(deployJob, /--output\s+"\$response_file"/);
    assert.match(deployJob, /jq\s+-e[^\n]*\.ok/);
    assert.doesNotMatch(deployJob, /cat\s+[^\n]*(?:response|payload)|echo\s+[^\n]*\$(?:response|payload)/);
    assert.match(workflow, new RegExp(`--environment=${environment}`));
  }
});

test('privileged jq validator accepts the generated closed schema and rejects boundary mutations', {
  skip: jqAvailable ? false : 'jq executable unavailable',
}, async () => {
  const workflowRoot = path.join(repoRoot, 'tools', 'templates', 'draft-repo', '.github', 'workflows');
  const filters = await Promise.all(['deploy-test.yml', 'deploy-production.yml'].map(async name => (
    extractPlanFilter(await readFile(path.join(workflowRoot, name), 'utf8'))
  )));
  assert.equal(filters[0], filters[1]);

  const targetSha = 'a'.repeat(40);
  const versionId = `test-${targetSha}-1234567890-1`;
  const plan = {
    schemaVersion: 1,
    targetSha,
    domain: 'example.com',
    environment: 'test',
    versionId,
    actions: ['upsertDraft', 'publishDraft'],
    files: [
      { path: 'example.com/site-config.json', kind: 'site-config', content: { domain: 'example.com' } },
      { path: 'example.com/i18n/en.json', kind: 'shared-i18n', lang: 'en', content: { hello: 'Hello' } },
      { path: 'example.com/default/page-config.json', kind: 'page-config', pageId: 'default', content: { id: 'default' } },
      { path: 'example.com/default/i18n/es.json', kind: 'i18n', pageId: 'default', lang: 'es', content: { hello: 'Hola' } },
      { path: 'example.com/server/commerce.json', kind: 'server-commerce', content: { version: 1 } },
    ],
  };
  const validate = candidate => spawnSync(jqExecutable, [
    '-e',
    '--arg', 'domain', 'example.com',
    '--arg', 'environment', 'test',
    '--arg', 'sha', targetSha,
    '--arg', 'version', versionId,
    filters[0],
  ], { encoding: 'utf8', input: JSON.stringify(candidate) });

  assert.equal(validate(plan).status, 0);
  const mutations = [
    candidate => { candidate.actions.reverse(); },
    candidate => { candidate.authoringEndpoint = 'https://private.invalid'; },
    candidate => { candidate.files[2].path = 'example.com/tools/page-config.json'; candidate.files[2].pageId = 'tools'; },
    candidate => { candidate.files[2].pageId = 'other'; },
    candidate => { candidate.files[0].content = ['not', 'an', 'object']; },
    candidate => { candidate.files[0].credential = 'do-not-accept'; },
    candidate => { candidate.files[1].path = candidate.files[0].path; },
    candidate => { candidate.files[3].path = 'example.com/i18n/i18n/es.json'; candidate.files[3].pageId = 'i18n'; },
    candidate => { candidate.files[2].path = 'example.com/SERVER/page-config.json'; candidate.files[2].pageId = 'SERVER'; },
    candidate => { candidate.files[2].path = 'example.com/.draft-deploy/page-config.json'; candidate.files[2].pageId = '.draft-deploy'; },
  ];
  for (const mutate of mutations) {
    const candidate = structuredClone(plan);
    mutate(candidate);
    assert.equal(validate(candidate).status, 1);
  }
});
