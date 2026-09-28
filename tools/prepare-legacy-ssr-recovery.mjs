import { createHash } from 'node:crypto';
import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
const fail = reason => { throw new Error(`Legacy recovery rejected: ${reason}`); };
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const numeric = value => typeof value === 'string' && /^[1-9][0-9]{0,19}$/.test(value);
const limits = { files: 10000, fileBytes: 64 * 1024 * 1024, totalBytes: 512 * 1024 * 1024, proofBytes: 8 * 1024 * 1024 };
const privateSegments = new Set(['server', '.git', '.github', 'tools', 'node_modules', 'ai_notes', 'findings', 'errors-reports', 'devonly', 'logs', 'reports', '.superpowers']);
const baselineKeys = ['schemaVersion', 'environment', 'releaseId', 'sourceCommit', 'sourceRunId', 'sourceRunAttempt', 'manifestSha256', 'serverSha256'];
const observationKeys = ['releaseId', 'sourceCommit', 'manifestSha256', 'serverSha256', 'inventorySha256'];

function closed(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) fail('closed schema');
}

function assertBaseline(b) {
  closed(b, baselineKeys);
  if (b.schemaVersion !== 1 || b.environment !== 'test'
    || typeof b.releaseId !== 'string' || !/^[a-f0-9]{40}$/.test(b.releaseId)
    || b.sourceCommit !== b.releaseId || !numeric(b.sourceRunId) || !numeric(b.sourceRunAttempt)
    || !sha(b.manifestSha256) || !sha(b.serverSha256)) fail('TEST baseline');
}

function safeBrowserPath(value) {
  const legacyDebug = typeof value === 'string' && (value === 'browser/drafts/_debug'
    || value === 'browser/drafts/_debug/debug-workspace' || value.startsWith('browser/drafts/_debug/debug-workspace/'));
  return typeof value === 'string' && value.startsWith('browser/') && value.length < 1024
    && value.split('/').every((part, index) => (/^[A-Za-z0-9][A-Za-z0-9._~-]*$/.test(part)
      || (legacyDebug && index === 2 && part === '_debug'))
      && !part.includes('..') && !part.endsWith('.')
      && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
      && !privateSegments.has(part.toLowerCase()) && part.toLowerCase() !== 'draft-repo.config.json');
}

function safePayloadPath(value) {
  return value === 'manifest.json' || value === 'server/ssr-handler.zip' || safeBrowserPath(value);
}

async function directory(file) {
  const stat = await lstat(file);
  if (!stat.isDirectory() || stat.isSymbolicLink()) fail('linked or non-directory path');
}

async function rootDirectory(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) fail('absolute local snapshot path required');
  const resolved = path.resolve(root), parsed = path.parse(resolved);
  let current = parsed.root;
  for (const segment of resolved.slice(parsed.root.length).split(path.sep)) {
    current = path.join(current, segment);
    await directory(current);
  }
}

async function regularFile(file, max = limits.fileBytes) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > max) fail('non-regular or oversized file');
  const bytes = await readFile(file);
  if (bytes.length !== stat.size || bytes.length > max) fail('file changed during verification');
  return bytes;
}

async function assertRoot(root, receiptExpected) {
  await rootDirectory(root);
  const entries = (await readdir(root)).sort();
  const expected = receiptExpected ? ['legacy-recovery.json', 'payload'] : ['payload'];
  if (entries.join(',') !== expected.join(',')) fail('snapshot root inventory');
  await directory(path.join(root, 'payload'));
}

async function payloadFiles(root) {
  const files = [];
  async function walk(prefix = '') {
    for (const entry of await readdir(path.join(root, 'payload', prefix), { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) fail('linked payload entry');
      if (entry.isDirectory()) {
        if (!['browser', 'server'].includes(relative) && !safeBrowserPath(relative)) fail('private payload directory');
        await directory(path.join(root, 'payload', relative));
        await walk(relative);
      } else {
        if (!entry.isFile() || !safePayloadPath(relative)) fail('private or non-regular payload file');
        files.push(relative);
        if (files.length > limits.files) fail('inventory limit');
      }
    }
  }
  await walk();
  return files.sort();
}

function assertCapture(capture, baseline) {
  closed(capture, ['schemaVersion', 'mode', 'capturedAt', 'sourceRun', 'before', 'after', 'objects']);
  if (capture.schemaVersion !== 1 || capture.mode !== 'read-only'
    || typeof capture.capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(capture.capturedAt)
    || !Number.isFinite(Date.parse(capture.capturedAt))
    || new Date(capture.capturedAt).toISOString().replace('.000Z', 'Z') !== capture.capturedAt) fail('capture metadata');
  const run = capture.sourceRun;
  closed(run, ['repository', 'id', 'attempt', 'path', 'headSha', 'headBranch', 'event', 'status', 'conclusion']);
  if (run.repository !== 'LynxPardelle/zoolandingpage' || run.id !== baseline.sourceRunId
    || run.attempt !== baseline.sourceRunAttempt || run.path !== '.github/workflows/publish-ssr-artifact.yml'
    || run.headSha !== baseline.sourceCommit || run.headBranch !== 'test' || run.event !== 'push'
    || run.status !== 'completed' || run.conclusion !== 'success') fail('historical source run');
  for (const observation of [capture.before, capture.after]) {
    closed(observation, observationKeys);
    for (const key of observationKeys) {
      if (key === 'inventorySha256' ? !sha(observation[key]) : observation[key] !== baseline[key]) fail('baseline or capture drift');
      if (observation[key] !== capture.before[key]) fail('capture drift');
    }
  }
  if (!Array.isArray(capture.objects) || capture.objects.length < 3 || capture.objects.length > limits.files) fail('inventory count');
  let total = 0, previous = '';
  const unique = new Set();
  for (const object of capture.objects) {
    closed(object, ['path', 'bytes', 'sha256', 'etagSha256', 'contentType', 'cacheControl', 'contentEncoding']);
    if (!safePayloadPath(object.path) || object.path <= previous || unique.has(object.path.toLowerCase())) fail('inventory paths');
    unique.add(object.path.toLowerCase()); previous = object.path;
    if (!Number.isSafeInteger(object.bytes) || object.bytes < 0 || object.bytes > limits.fileBytes
      || !sha(object.sha256) || !sha(object.etagSha256)) fail('object metadata');
    total += object.bytes;
    if (total > limits.totalBytes) fail('total size limit');
    for (const field of ['contentType', 'cacheControl', 'contentEncoding']) {
      if (typeof object[field] !== 'string' || object[field].length > 1024 || /[^\x20-\x7e]/.test(object[field])) fail('unsafe header');
    }
  }
  const inventory = capture.objects.map(({ path, bytes, etagSha256 }) => ({ path, bytes, etagSha256 }));
  if (hash(JSON.stringify(inventory)) !== capture.before.inventorySha256) fail('inventory proof');
}

async function verifyPayload(root, baseline, capture) {
  assertBaseline(baseline);
  assertCapture(capture, baseline);
  const paths = await payloadFiles(root);
  if (JSON.stringify(paths) !== JSON.stringify(capture.objects.map(object => object.path))
    || !paths.includes('manifest.json') || !paths.includes('server/ssr-handler.zip')
    || !paths.some(file => file.startsWith('browser/'))) fail('complete payload inventory');
  for (const object of capture.objects) {
    const bytes = await regularFile(path.join(root, 'payload', object.path));
    if (bytes.length !== object.bytes || hash(bytes) !== object.sha256) fail('payload bytes');
  }
  const originalManifest = await regularFile(path.join(root, 'payload/manifest.json'), 65536);
  const originalServer = await regularFile(path.join(root, 'payload/server/ssr-handler.zip'));
  if (hash(originalManifest) !== baseline.manifestSha256 || hash(originalServer) !== baseline.serverSha256) fail('original hashes');
  const manifest = JSON.parse(originalManifest);
  const prefix = `frontend/angular-ssr/test/releases/${baseline.releaseId}`;
  if (manifest.schemaVersion !== 1 || manifest.app !== 'zoolandingpage' || manifest.environment !== 'test'
    || manifest.releaseId !== baseline.releaseId || manifest.sourceCommit !== baseline.sourceCommit
    || manifest.browserPrefix !== `${prefix}/browser` || manifest.serverBundleKey !== `${prefix}/server/ssr-handler.zip`
    || manifest.checksums?.['server/ssr-handler.zip'] !== baseline.serverSha256) fail('original manifest');
}

function selection(baseline, digest) {
  return { mode: 'selection-only', activationAllowed: false, deployed: false, sourceClass: 'deployed-legacy-snapshot',
    ciArtifactId: null, environment: 'test', releaseId: baseline.releaseId, sourceCommit: baseline.sourceCommit, receiptSha256: digest };
}

// The caller supplies a trusted baseline for offline fixtures. The CLI below always uses the checked-in TEST baseline.
export async function prepareLegacyRecovery({ root, baseline, capture }) {
  try {
    await assertRoot(root, false);
    await verifyPayload(root, baseline, capture);
    const receipt = { schemaVersion: 1, ...selection(baseline), capture };
    delete receipt.receiptSha256;
    const bytes = `${JSON.stringify(receipt, null, 2)}\n`;
    if (Buffer.byteLength(bytes) > limits.proofBytes) fail('receipt size');
    await writeFile(path.join(root, 'legacy-recovery.json'), bytes, { flag: 'wx' });
    return { digest: hash(bytes) };
  } catch { fail('preparation did not satisfy the TEST snapshot contract'); }
}

export async function verifyLegacyRecovery({ root, baseline, digest }) {
  try {
    await assertRoot(root, true);
    const bytes = await regularFile(path.join(root, 'legacy-recovery.json'), limits.proofBytes);
    if (!sha(digest) || hash(bytes) !== digest) fail('external receipt digest');
    const receipt = JSON.parse(bytes);
    closed(receipt, ['schemaVersion', 'mode', 'activationAllowed', 'deployed', 'sourceClass', 'ciArtifactId', 'environment', 'releaseId', 'sourceCommit', 'capture']);
    const expected = selection(baseline);
    if (receipt.schemaVersion !== 1) fail('receipt schema');
    for (const key of Object.keys(expected).filter(key => key !== 'receiptSha256')) {
      if (receipt[key] !== expected[key]) fail('selection-only receipt');
    }
    await verifyPayload(root, baseline, receipt.capture);
    return selection(baseline, digest);
  } catch { fail('verification did not satisfy the TEST snapshot contract'); }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    if (process.argv.length !== 3 || !['--prepare', '--verify'].includes(process.argv[2])) fail('use exactly --prepare or --verify; no deployment mode exists');
    const baseline = JSON.parse(await readFile(new URL('./ops/legacy-test-frontend-baseline.json', import.meta.url), 'utf8'));
    const root = process.env.LEGACY_RECOVERY_ROOT;
    const result = process.argv[2] === '--prepare'
      ? await prepareLegacyRecovery({ root, baseline, capture: JSON.parse(await regularFile(process.env.LEGACY_RECOVERY_CAPTURE, limits.proofBytes)) })
      : await verifyLegacyRecovery({ root, baseline, digest: process.env.LEGACY_RECOVERY_DIGEST });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch {
    process.stderr.write('Legacy recovery rejected: check the selection-only TEST contract and local inputs.\n');
    process.exitCode = 1;
  }
}
