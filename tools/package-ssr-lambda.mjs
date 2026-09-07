import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const appName = 'zoolandingpage';
const distRoot = path.join(root, 'dist', 'zoolandingpage');
const browserDir = path.join(distRoot, 'browser');
const serverDir = path.join(distRoot, 'server');
const outputRoot = path.join(root, 'dist', 'ssr-lambda');
const stagingDir = path.join(outputRoot, 'staging');
const zipPath = path.join(outputRoot, 'ssr-handler.zip');
const manifestPath = path.join(outputRoot, 'manifest.json');
const releaseId = process.env.RELEASE_ID || gitValue(['rev-parse', '--short=12', 'HEAD']);
const environmentName = process.env.DEPLOY_ENV || 'test';
const apiBaseUrl = process.env.CONFIG_API_URL || 'https://api.zoolandingpage.com.mx';
const artifactBasePrefix = `frontend/angular-ssr/${environmentName}`;
const serverlessHttpDir = path.join(root, 'node_modules', 'serverless-http');

assertSafeReleaseCoordinates(releaseId, environmentName);
await assertDirectory(browserDir, 'Run `npm run build` before packaging; browser output is missing.');
await assertDirectory(serverDir, 'Run `npm run build` before packaging; server output is missing.');
await assertDirectory(serverlessHttpDir, 'Run `npm install` before packaging; serverless-http is missing.');

await rm(outputRoot, { force: true, recursive: true });
await mkdir(stagingDir, { recursive: true });

await cp(browserDir, path.join(stagingDir, 'browser'), { recursive: true });
await cp(serverDir, path.join(stagingDir, 'server'), { recursive: true });
await cp(serverlessHttpDir, path.join(stagingDir, 'node_modules', 'serverless-http'), { recursive: true });

await writeFile(path.join(stagingDir, 'index.mjs'), lambdaHandlerSource());

await writeFile(
  path.join(stagingDir, 'package.json'),
  `${JSON.stringify({
    type: 'module',
    dependencies: {
      'serverless-http': '^4.0.0',
    },
  }, null, 2)}\n`,
);

await createZip(stagingDir, zipPath);

const sha256 = await hashFile(zipPath);
const sourceCommit = gitValue(['rev-parse', 'HEAD']);
const manifest = {
  schemaVersion: 1,
  app: appName,
  environment: environmentName,
  releaseId,
  sourceCommit,
  apiBaseUrl,
  nodeRuntime: 'nodejs22.x',
  browserPrefix: `${artifactBasePrefix}/releases/${releaseId}/browser`,
  serverBundleKey: `${artifactBasePrefix}/releases/${releaseId}/server/ssr-handler.zip`,
  checksums: {
    'server/ssr-handler.zip': sha256,
  },
  createdAt: new Date().toISOString(),
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({ zipPath, manifestPath, releaseId, sha256 }, null, 2));

function assertSafeReleaseCoordinates(candidateReleaseId, candidateEnvironment) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(candidateReleaseId)) {
    throw new Error('RELEASE_ID must be a bounded opaque identifier.');
  }
  if (!['test', 'production'].includes(candidateEnvironment)) {
    throw new Error('DEPLOY_ENV must be test or production.');
  }
}

function lambdaHandlerSource() {
  return `import serverless from 'serverless-http';
import { reqHandler } from './server/server.mjs';

const angularHandler = serverless(reqHandler, {
  provider: 'aws',
});

export const handler = async (event, context) => angularHandler(normalizeLambdaFunctionUrlHost(event), context);

function normalizeLambdaFunctionUrlHost(event) {
  const headers = event && typeof event === 'object' && event.headers && typeof event.headers === 'object'
    ? event.headers
    : null;
  if (!headers) {
    return event;
  }

  const host = firstHeaderValue(headers.host ?? headers.Host);
  const forwardedHost = firstHeaderValue(headers['x-forwarded-host'] ?? headers['X-Forwarded-Host']);
  if (!isLambdaFunctionUrlHost(host) || !isPlainHost(forwardedHost)) {
    return event;
  }

  headers.host = forwardedHost;
  headers.Host = forwardedHost;
  headers['x-forwarded-host'] = forwardedHost;
  headers['X-Forwarded-Host'] = forwardedHost;

  const forwardedProto = firstHeaderValue(headers['cloudfront-forwarded-proto'] ?? headers['CloudFront-Forwarded-Proto']) || 'https';
  if (!firstHeaderValue(headers['x-forwarded-proto'] ?? headers['X-Forwarded-Proto'])) {
    headers['x-forwarded-proto'] = forwardedProto;
    headers['X-Forwarded-Proto'] = forwardedProto;
  }

  return event;
}

function firstHeaderValue(value) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? '').split(',')[0].trim();
}

function isLambdaFunctionUrlHost(value) {
  return /^[-a-z0-9]+\\.lambda-url\\.[-a-z0-9]+\\.on\\.aws$/i.test(firstHeaderValue(value));
}

function isPlainHost(value) {
  const host = firstHeaderValue(value);
  return host.length > 0
    && host.length <= 253
    && !/[\\s/@?#]/.test(host)
    && !host.includes('..')
    && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(host);
}
`;
}

async function assertDirectory(directory, message) {
  try {
    const current = await stat(directory);
    if (current.isDirectory()) {
      return;
    }
  } catch {
    // Fall through to the shared error below.
  }
  throw new Error(message);
}

async function createZip(sourceDir, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  if (process.platform === 'win32') {
    const source = quotePowerShellPath(sourceDir);
    const target = quotePowerShellPath(destination);
    const result = spawnSync('powershell', [
      '-NoProfile',
      '-Command',
      `$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$sourcePrefix = [System.IO.Path]::GetFullPath(${source}).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$archive = [System.IO.Compression.ZipFile]::Open(${target}, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in (Get-ChildItem -LiteralPath ${source} -File -Recurse -Force | Sort-Object FullName)) {
    if (-not $file.FullName.StartsWith($sourcePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
      throw 'ZIP source escaped its staging directory.'
    }
    # Windows PowerShell's CreateFromDirectory emits backslashes; Lambda imports require POSIX names.
    $entryName = $file.FullName.Substring($sourcePrefix.Length).Replace([char]92, [char]47)
    $entry = $archive.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)
    $entry.LastWriteTime = [DateTimeOffset]::new(1980, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
    $inputStream = [System.IO.File]::OpenRead($file.FullName)
    try {
      $outputStream = $entry.Open()
      try { $inputStream.CopyTo($outputStream) } finally { $outputStream.Dispose() }
    } finally { $inputStream.Dispose() }
  }
} finally {
  $archive.Dispose()
}`,
    ], { stdio: 'inherit' });
    if (result.status !== 0) {
      throw new Error(`Zip creation failed with exit code ${result.status}.`);
    }
    return;
  }

  // Normalize only our staging copy; source/build timestamps remain untouched.
  const entries = await zipFileInventory(sourceDir);
  const epoch = new Date('1980-01-01T00:00:00Z');
  for (const entry of entries) await utimes(path.join(sourceDir, entry), epoch, epoch);
  const result = spawnSync('zip', ['-Xq', destination, '-@'], {
    cwd: sourceDir,
    input: `${entries.join('\n')}\n`,
    stdio: ['pipe', 'inherit', 'inherit'],
    env: { ...process.env, TZ: 'UTC', LC_ALL: 'C' },
  });
  if (result.status !== 0) {
    throw new Error('The `zip` command is required to package the Lambda SSR artifact.');
  }
}

async function zipFileInventory(directory, prefix = '') {
  const entries = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (/[\r\n]/.test(name)) throw new Error('ZIP entry names cannot contain line breaks.');
    if (entry.isDirectory()) entries.push(...await zipFileInventory(path.join(directory, entry.name), name));
    else entries.push(name);
  }
  return entries.sort();
}

async function hashFile(filePath) {
  const contents = await readFile(filePath);
  return createHash('sha256').update(contents).digest('hex');
}

function gitValue(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function quotePowerShellPath(value) {
  return `'${value.replace(/'/g, "''")}'`;
}
