#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_STACK_NAME = 'zoolanding-image-upload';
const DEFAULT_EXPIRES_SECONDS = 8 * 60 * 60;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_USAGE_LIMIT = 25;
const DEFAULT_ASSET_KINDS = ['images', 'hero-images', 'logos', 'seo-images', 'draft-assets'];
const DEFAULT_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

function parseArgs(rawArgs) {
  const args = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    args[rawKey.trim()] = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
  }
  return args;
}

function truthy(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function splitList(value, fallback) {
  if (value === undefined || value === null || value === '') return [...fallback];
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

function required(value, name) {
  const normalized = String(value ?? '').trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function normalizeDomain(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  try {
    const parsed = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return parsed.hostname;
  } catch {
    return raw.replace(/^https?:\/\//, '').split(/[/:?#]/, 1)[0].replace(/^\/+|\/+$/g, '');
  }
}

function domainSlug(domain) {
  return normalizeDomain(domain).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function fileStamp(date = new Date()) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}

function defaultIssuedBy() {
  return process.env.USERPROFILE
    ? `${process.env.USERDOMAIN ?? 'windows'}\\${process.env.USERNAME ?? 'user'}`
    : process.env.USER ?? 'local-user';
}

function intArg(args, key, fallback, minimum = 1) {
  const parsed = Number.parseInt(String(args[key] ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`--${key} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function buildGrantRequest(args, env = process.env) {
  const domain = normalizeDomain(required(args.domain, '--domain'));
  return {
    action: 'issueUploadGrant',
    domain,
    expiresInSeconds: intArg(args, 'expires-seconds', env.ZLP_UPLOAD_GRANT_EXPIRES_SECONDS ?? DEFAULT_EXPIRES_SECONDS, 60),
    maxBytes: intArg(args, 'max-bytes', env.ZLP_UPLOAD_GRANT_MAX_BYTES ?? DEFAULT_MAX_BYTES, 1),
    usageLimit: intArg(args, 'usage-limit', env.ZLP_UPLOAD_GRANT_USAGE_LIMIT ?? DEFAULT_USAGE_LIMIT, 1),
    allowedAssetKinds: splitList(args.kinds ?? args['asset-kinds'], DEFAULT_ASSET_KINDS),
    allowedPageIds: splitList(args.pages ?? args['page-ids'], ['*']),
    allowedContentTypes: splitList(args['content-types'], DEFAULT_CONTENT_TYPES),
    allowOverwrite: truthy(args['allow-overwrite'], false),
    allowPresignedPut: truthy(args['allow-presigned-put'], false),
    issuedBy: args['issued-by'] ?? env.ZLP_UPLOAD_GRANT_ISSUED_BY ?? defaultIssuedBy(),
  };
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      ...options,
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
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}: ${stderr || stdout}`));
    });
  });
}

async function awsText(args, options = {}) {
  const { stdout } = await runCommand('aws', [...args, '--output', 'text'], options);
  return stdout.trim();
}

async function pathExists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveFunctionName(args, env = process.env) {
  const explicit = args['function-name'] ?? env.ZLP_IMAGE_UPLOAD_FUNCTION_NAME;
  if (explicit) return String(explicit).trim();

  const region = args.region ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? DEFAULT_REGION;
  const stackName = args.stack ?? env.ZLP_IMAGE_UPLOAD_STACK_NAME ?? DEFAULT_STACK_NAME;
  return awsText([
    'cloudformation',
    'describe-stacks',
    '--region',
    region,
    '--stack-name',
    stackName,
    '--query',
    "Stacks[0].Outputs[?OutputKey=='FunctionName'].OutputValue | [0]",
  ]);
}

async function invokeGrantIssuer({ functionName, request, region, profile }) {
  const tempDir = path.join(os.tmpdir(), `zlp-upload-grant-${process.pid}-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  const payloadPath = path.join(tempDir, 'payload.json');
  const responsePath = path.join(tempDir, 'response.json');
  await writeFile(payloadPath, `${JSON.stringify(request)}\n`, { encoding: 'utf8', mode: 0o600 });
  try {
    const args = [
      'lambda',
      'invoke',
      '--function-name',
      functionName,
      '--payload',
      `fileb://${path.resolve(payloadPath).replace(/\\/g, '/')}`,
      '--cli-binary-format',
      'raw-in-base64-out',
      responsePath,
    ];
    if (region) args.splice(2, 0, '--region', region);
    if (profile) args.splice(2, 0, '--profile', profile);
    await runCommand('aws', args);
    const lambdaResponse = JSON.parse(await readFile(responsePath, 'utf8'));
    const body = typeof lambdaResponse.body === 'string'
      ? JSON.parse(lambdaResponse.body)
      : lambdaResponse.body ?? lambdaResponse;
    if (lambdaResponse.statusCode && lambdaResponse.statusCode >= 400) {
      throw new Error(String(body.error ?? `Grant issue failed with status ${lambdaResponse.statusCode}`));
    }
    if (!body.token) {
      throw new Error('Grant issuer did not return a token');
    }
    return body;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function writeGrantFiles({ body, tokenFile, metadataFile }) {
  await mkdir(path.dirname(tokenFile), { recursive: true });
  await writeFile(tokenFile, `${body.token}\n`, { encoding: 'utf8', mode: 0o600 });
  const metadata = { ...body };
  delete metadata.token;
  await writeFile(metadataFile, `${JSON.stringify(metadata, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
}

async function issueUploadGrant(args = parseArgs(process.argv.slice(2)), env = process.env) {
  const request = buildGrantRequest(args, env);
  const region = args.region ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? DEFAULT_REGION;
  const profile = args.profile ?? env.AWS_PROFILE;
  const functionName = await resolveFunctionName(args, env);
  const body = await invokeGrantIssuer({ functionName, request, region, profile });
  const outputDir = path.resolve(args['output-dir'] ?? '.zlp/upload-grants');
  const stamp = fileStamp();
  const slug = domainSlug(request.domain);
  const tokenFile = path.resolve(args['token-file'] ?? path.join(outputDir, `${slug}-${stamp}.token`));
  const metadataFile = path.resolve(args['metadata-file'] ?? path.join(outputDir, `${slug}-${stamp}.json`));
  if (await pathExists(tokenFile) && !truthy(args.force, false)) {
    throw new Error(`Token file already exists: ${tokenFile}`);
  }
  await writeGrantFiles({ body, tokenFile, metadataFile });
  return {
    ok: true,
    functionName,
    domain: body.domain,
    grantId: body.grantId,
    expiresAt: body.expiresAt,
    tokenFile,
    metadataFile,
    maxBytes: body.maxBytes,
    usageLimit: body.usageLimit,
    allowedAssetKinds: body.allowedAssetKinds,
    allowedPageIds: body.allowedPageIds,
    allowedContentTypes: body.allowedContentTypes,
    allowOverwrite: body.allowOverwrite,
    allowPresignedPut: body.allowPresignedPut,
  };
}

async function main() {
  const result = await issueUploadGrant();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write('Token value was written to tokenFile and was not printed.\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  buildGrantRequest,
  defaultIssuedBy,
  domainSlug,
  issueUploadGrant,
  normalizeDomain,
  parseArgs,
  resolveFunctionName,
  splitList,
};
