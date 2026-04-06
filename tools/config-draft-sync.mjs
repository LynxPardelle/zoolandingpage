import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_DRAFTS_ROOT = path.resolve('public', 'assets', 'drafts');

function parseArgs(rawArgs) {
  const parsed = {};

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
    parsed[key] = value;
  }

  return parsed;
}

function getRequiredArg(args, key) {
  const value = String(args[key] ?? '').trim();
  if (!value) {
    throw new Error(`Missing required argument --${key}`);
  }
  return value;
}

function normalizeStage(stage) {
  const normalized = String(stage ?? 'draft')
    .trim()
    .toLowerCase();
  if (!['draft', 'published'].includes(normalized)) {
    throw new Error(`Invalid stage '${stage}'. Expected 'draft' or 'published'.`);
  }
  return normalized;
}

async function readJson(filePath) {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, payload) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function walkJsonFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function inferKind(domain, relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (normalized === `${domain}/site-config.json`) return 'site-config';
  if (normalized === `${domain}/components.json`) return 'shared-components';
  if (normalized === `${domain}/variables.json`) return 'shared-variables';
  if (normalized === `${domain}/angora-combos.json`) return 'shared-angora-combos';
  if (normalized.startsWith(`${domain}/i18n/`) && normalized.endsWith('.json')) return 'shared-i18n';
  if (normalized.endsWith('/page-config.json')) return 'page-config';
  if (normalized.endsWith('/components.json')) return 'page-components';
  if (normalized.endsWith('/variables.json')) return 'variables';
  if (normalized.endsWith('/angora-combos.json')) return 'angora-combos';
  if (normalized.includes('/i18n/') && normalized.endsWith('.json')) return 'i18n';
  return 'page-components';
}

function inferPageId(domain, relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  if (parts[0] !== domain) return undefined;
  if (parts.length >= 3 && parts[1] !== 'i18n') return parts[1];
  return undefined;
}

function inferLang(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  if (!normalized.includes('/i18n/')) return undefined;
  const fileName = normalized.split('/').at(-1) ?? '';
  return fileName.endsWith('.json') ? fileName.slice(0, -5) : undefined;
}

async function buildDraftPackage({ domain, draftsRoot, stage }) {
  const domainRoot = path.resolve(draftsRoot, domain);
  if (!existsSync(domainRoot)) {
    throw new Error(`Draft folder not found: ${domainRoot}`);
  }

  const files = await walkJsonFiles(domainRoot);
  const packageFiles = [];

  for (const filePath of files) {
    const relativePath = path.relative(draftsRoot, filePath).replace(/\\/g, '/');
    packageFiles.push({
      path: relativePath,
      kind: inferKind(domain, relativePath),
      pageId: inferPageId(domain, relativePath),
      lang: inferLang(relativePath),
      content: await readJson(filePath),
    });
  }

  return {
    version: 1,
    domain,
    stage,
    files: packageFiles,
  };
}

async function unpackDraftPackage(draftPackage, draftsRoot, { cleanDomain = false } = {}) {
  const domain = String(draftPackage?.domain ?? '').trim();
  if (!domain) {
    throw new Error('Draft package is missing domain');
  }
  if (!Array.isArray(draftPackage.files)) {
    throw new Error('Draft package is missing files');
  }

  const domainRoot = path.resolve(draftsRoot, domain);
  if (cleanDomain && existsSync(domainRoot)) {
    await rm(domainRoot, { recursive: true, force: true });
  }

  for (const entry of draftPackage.files) {
    const relativePath = String(entry?.path ?? '').trim();
    if (!relativePath.startsWith(`${domain}/`)) {
      throw new Error(`Refusing to write unexpected path '${relativePath}'`);
    }
    if (!entry?.content || typeof entry.content !== 'object' || Array.isArray(entry.content)) {
      throw new Error(`File '${relativePath}' does not contain a JSON object`);
    }

    await writeJson(path.resolve(draftsRoot, relativePath), entry.content);
  }
}

async function callAuthoringEndpoint(endpoint, body) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  const parsed = rawText ? JSON.parse(rawText) : {};
  const normalized =
    parsed && typeof parsed === 'object' && 'statusCode' in parsed && 'body' in parsed
      ? { ...parsed, body: typeof parsed.body === 'string' ? JSON.parse(parsed.body) : parsed.body }
      : { statusCode: response.status, body: parsed };

  if (normalized.statusCode >= 400) {
    const message = normalized.body?.error || `Request failed with status ${normalized.statusCode}`;
    throw new Error(message);
  }

  return normalized.body;
}

async function writeOutput(outputPath, payload) {
  if (!outputPath) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }
  await writeJson(path.resolve(outputPath), payload);
}

async function ensureFile(inputPath) {
  const resolved = path.resolve(inputPath);
  if (!existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }
  const fileStats = await stat(resolved);
  if (!fileStats.isFile()) {
    throw new Error(`Expected a file: ${resolved}`);
  }
  return resolved;
}

async function main() {
  const [command = 'help', ...rawArgs] = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  if (command === 'help') {
    process.stdout.write(
      [
        'Usage: node tools/config-draft-sync.mjs <command> [--key=value]',
        'Commands:',
        '  pack    --domain=example.com [--drafts-root=public/assets/drafts] [--stage=draft] [--output=package.json]',
        '  unpack  --input=package.json [--drafts-root=public/assets/drafts] [--clean-domain=true]',
        '  pull    --endpoint=https://... --domain=example.com [--stage=draft] [--drafts-root=public/assets/drafts] [--clean-domain=true]',
        '  push    --endpoint=https://... --domain=example.com [--drafts-root=public/assets/drafts] [--updated-by=name]',
        '  create  --endpoint=https://... --domain=example.com [--drafts-root=public/assets/drafts] [--publish-on-create=true]',
        '  publish --endpoint=https://... --domain=example.com [--version-id=...]',
      ].join('\n') + '\n'
    );
    return;
  }

  if (command === 'pack') {
    const domain = getRequiredArg(args, 'domain');
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const stage = normalizeStage(args.stage);
    const draftPackage = await buildDraftPackage({ domain, draftsRoot, stage });
    await writeOutput(args.output, draftPackage);
    return;
  }

  if (command === 'unpack') {
    const inputPath = await ensureFile(getRequiredArg(args, 'input'));
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const draftPackage = await readJson(inputPath);
    await unpackDraftPackage(draftPackage, draftsRoot, {
      cleanDomain: String(args['clean-domain'] ?? 'false') === 'true',
    });
    process.stdout.write(`Unpacked ${draftPackage.files.length} files into ${draftsRoot}\n`);
    return;
  }

  if (command === 'pull') {
    const endpoint = getRequiredArg(args, 'endpoint');
    const domain = getRequiredArg(args, 'domain');
    const stage = normalizeStage(args.stage);
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const response = await callAuthoringEndpoint(endpoint, { action: 'getSite', domain, stage });
    await unpackDraftPackage(response, draftsRoot, { cleanDomain: String(args['clean-domain'] ?? 'true') === 'true' });
    process.stdout.write(`Pulled ${response.files.length} files for ${domain} (${stage}) into ${draftsRoot}\n`);
    return;
  }

  if (command === 'push' || command === 'create') {
    const endpoint = getRequiredArg(args, 'endpoint');
    const domain = getRequiredArg(args, 'domain');
    const draftsRoot = path.resolve(args['drafts-root'] ?? DEFAULT_DRAFTS_ROOT);
    const stage = normalizeStage(args.stage);
    const draftPackage = await buildDraftPackage({ domain, draftsRoot, stage });
    const action = command === 'create' ? 'createSite' : 'upsertDraft';
    const response = await callAuthoringEndpoint(endpoint, {
      action,
      domain,
      files: draftPackage.files,
      updatedBy: args['updated-by'],
      publishOnCreate: String(args['publish-on-create'] ?? 'false') === 'true',
      allowOverwrite: String(args['allow-overwrite'] ?? 'false') === 'true',
    });
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  if (command === 'publish') {
    const endpoint = getRequiredArg(args, 'endpoint');
    const domain = getRequiredArg(args, 'domain');
    const response = await callAuthoringEndpoint(endpoint, {
      action: 'publishDraft',
      domain,
      versionId: args['version-id'],
      updatedBy: args['updated-by'],
    });
    process.stdout.write(`${JSON.stringify(response, null, 2)}\n`);
    return;
  }

  throw new Error(`Unknown command '${command}'. Run with 'help' for usage.`);
}

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
