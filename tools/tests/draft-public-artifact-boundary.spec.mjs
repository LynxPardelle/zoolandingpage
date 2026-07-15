import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(new URL('../..', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)));
const forbiddenSegments = new Set([
  '.git', '.github', '_repos', 'server', 'ai_notes', 'findings', 'errors-reports',
  'cvs_n_photos', 'tools', 'output', 'logs', 'reports', 'devonly', '.superpowers',
  '.agent-coordination',
]);
const forbiddenFileNames = new Set(['draft-repo.config.json']);
const expectedPublicGlob = '{*/site-config.json,*/components.json,*/variables.json,*/angora-combos.json,*/i18n/*.json,*/*/page-config.json,*/*/components.json,*/*/variables.json,*/*/angora-combos.json,*/*/i18n/*.json,**/*.png,**/*.jpg,**/*.jpeg,**/*.webp,**/*.svg,**/*.gif,**/*.avif,**/*.ico}';
const publicRootJson = new Set(['site-config.json', 'components.json', 'variables.json', 'angora-combos.json']);
const publicPageJson = new Set(['page-config.json', 'components.json', 'variables.json', 'angora-combos.json']);
const publicMediaExtension = /\.(?:png|jpe?g|webp|svg|gif|avif|ico)$/i;

async function listFiles(root, current = root) {
  if (!existsSync(current)) return [];
  const entries = await readdir(current, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(root, entryPath));
    if (entry.isFile()) files.push(path.relative(root, entryPath).replace(/\\/g, '/'));
  }
  return files;
}

function assertPublicProjection(files, label) {
  const forbiddenCount = files.filter(file => {
    const segments = file.split('/');
    const relative = segments.slice(1);
    const fileName = relative.at(-1)?.toLowerCase() ?? '';
    const isAllowed = publicMediaExtension.test(fileName)
      || (relative.length === 1 && publicRootJson.has(fileName))
      || (relative.length === 2 && (
        (relative[0].toLowerCase() === 'i18n' && fileName.endsWith('.json'))
        || publicPageJson.has(fileName)
      ))
      || (relative.length === 3 && relative[1].toLowerCase() === 'i18n' && fileName.endsWith('.json'));
    return !isAllowed
      || segments.some(segment => (
        !segment
        || segment === '.'
        || segment === '..'
        || segment.includes('%')
        || segment.includes('\\')
        || /[\u0000-\u001f\u007f]/.test(segment)
      ))
      || segments.some(segment => forbiddenSegments.has(segment.toLowerCase()))
      || forbiddenFileNames.has(fileName);
  }).length;
  assert.equal(forbiddenCount, 0, `${label} contains ${forbiddenCount} non-public draft files`);
}

test('artifact projection rejects encoded or traversal-shaped private segments', () => {
  for (const candidate of [
    'example.com/%73erver/private.png',
    'example.com/%2573erver/private.png',
    'example.com/%2e%2e/private.png',
    'example.com/../private.png',
  ]) {
    assert.throws(
      () => assertPublicProjection([candidate], 'synthetic artifact'),
      /contains 1 non-public draft files/,
      candidate,
    );
  }
});

test('Angular draft assets use an allowlisted public projection', async () => {
  const angular = JSON.parse(await readFile(path.join(repoRoot, 'angular.json'), 'utf8'));
  for (const target of ['build', 'test']) {
    const assets = angular.projects.zoolandingpage.architect[target].options.assets;
    const draftAssets = assets.filter(asset => typeof asset === 'object' && asset.input === 'drafts');
    assert.equal(draftAssets.length, 1, `${target} needs one auditable draft projection`);
    const projection = draftAssets[0];
    assert.equal(projection.glob, expectedPublicGlob);
    for (const requiredPattern of [
      '*/site-config.json', '*/*/page-config.json', '*/*/components.json',
      '*/*/variables.json', '*/*/angora-combos.json', '*/*/i18n/*.json', '**/*.png', '**/*.svg',
    ]) {
      assert.equal(projection.glob.includes(requiredPattern), true, `${target} missing ${requiredPattern}`);
    }
    for (const requiredIgnore of ['**/server/**', '_repos/**', '**/.git/**', '**/tools/**', '**/draft-repo.config.json']) {
      assert.equal(projection.ignore.includes(requiredIgnore), true, `${target} missing ${requiredIgnore}`);
    }
  }
});

test('generated browser and SSR staging artifacts contain no private draft paths', async () => {
  const browserFiles = await listFiles(path.join(repoRoot, 'dist', 'zoolandingpage', 'browser', 'drafts'));
  const stagingFiles = await listFiles(path.join(repoRoot, 'dist', 'ssr-lambda', 'staging', 'browser', 'drafts'));
  assertPublicProjection(browserFiles, 'browser artifact');
  assertPublicProjection(stagingFiles, 'SSR staging artifact');
});

test('SSR publishing validates the public projection before obtaining AWS credentials', async () => {
  const workflow = await readFile(path.join(repoRoot, '.github', 'workflows', 'publish-ssr-artifact.yml'), 'utf8');
  const jobsIndex = workflow.indexOf('\njobs:');
  const topLevelPermissions = workflow.slice(workflow.indexOf('\npermissions:'), jobsIndex);
  const validateJobIndex = workflow.indexOf('\n  validate:');
  const publishJobIndex = workflow.indexOf('\n  publish:');
  const boundaryIndex = workflow.indexOf('npm run test:draft-public-artifact-boundary');
  const artifactUploadIndex = workflow.indexOf('actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a');
  const artifactDownloadIndex = workflow.indexOf('actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c');
  const coordinateIndex = workflow.indexOf('Validate artifact coordinates');
  const packageIndex = workflow.indexOf('npm run package:ssr:lambda');
  const credentialsIndex = workflow.indexOf('aws-actions/configure-aws-credentials');
  assert.notEqual(boundaryIndex, -1);
  assert.notEqual(credentialsIndex, -1);
  assert.notEqual(coordinateIndex, -1);
  assert.notEqual(validateJobIndex, -1);
  assert.notEqual(publishJobIndex, -1);
  assert.notEqual(artifactUploadIndex, -1);
  assert.notEqual(artifactDownloadIndex, -1);
  assert.doesNotMatch(topLevelPermissions, /id-token:\s*write/);
  assert.match(workflow.slice(publishJobIndex), /permissions:[\s\S]*?id-token:\s*write/);
  assert.match(workflow.slice(publishJobIndex), /needs:\s*validate/);
  assert.equal(coordinateIndex < packageIndex, true);
  assert.equal(validateJobIndex < boundaryIndex, true);
  assert.equal(boundaryIndex < artifactUploadIndex, true);
  assert.equal(artifactUploadIndex < publishJobIndex, true);
  assert.equal(publishJobIndex < artifactDownloadIndex, true);
  assert.equal(artifactDownloadIndex < credentialsIndex, true);
  assert.doesNotMatch(workflow.slice(publishJobIndex), /npm (?:ci|run package:ssr:lambda)/);
  assert.match(workflow, /refs\/heads\/test/);
  assert.match(workflow, /refs\/heads\/main/);
});

test('SSR packaging rejects unsafe release coordinates before changing artifacts', () => {
  const result = spawnSync(process.execPath, ['tools/package-ssr-lambda.mjs'], {
    cwd: repoRoot,
    env: { ...process.env, RELEASE_ID: '../outside', DEPLOY_ENV: 'test' },
    encoding: 'utf8',
    windowsHide: true,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RELEASE_ID must be a bounded opaque identifier/);
});
