#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_UPLOAD_API_URL = 'https://api.zoolandingpage.com.mx/image-upload/presign';
const DEFAULT_DIRECT_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

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

function sanitizeAssetId(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^-+|-+$/g, '');
}

function contentTypeForFile(filePath, explicitType = '') {
  const normalized = String(explicitType ?? '').trim().toLowerCase();
  if (normalized) return normalized === 'image/jpg' ? 'image/jpeg' : normalized;

  const ext = path.extname(filePath).toLowerCase();
  const map = new Map([
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.webp', 'image/webp'],
    ['.gif', 'image/gif'],
    ['.avif', 'image/avif'],
    ['.svg', 'image/svg+xml'],
  ]);
  const found = map.get(ext);
  if (!found) {
    throw new Error(`Unsupported image extension for ${filePath}`);
  }
  return found;
}

function parseEnvContent(raw) {
  const values = {};
  for (const line of String(raw ?? '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

async function loadEnvFile(filePath) {
  if (!filePath) return {};
  const raw = await readFile(path.resolve(filePath), 'utf8');
  return parseEnvContent(raw);
}

async function loadGrant(args, env = process.env) {
  const envFileValues = await loadEnvFile(args['env-file']);
  const inlineGrant = args.grant ?? env.ZLP_UPLOAD_GRANT ?? envFileValues.ZLP_UPLOAD_GRANT;
  if (inlineGrant) return String(inlineGrant).trim();

  const grantFile = args['grant-file'] ?? env.ZLP_UPLOAD_GRANT_FILE ?? envFileValues.ZLP_UPLOAD_GRANT_FILE;
  if (grantFile) {
    return (await readFile(path.resolve(grantFile), 'utf8')).trim();
  }

  throw new Error('Upload grant is required. Set ZLP_UPLOAD_GRANT, ZLP_UPLOAD_GRANT_FILE, --grant, or --grant-file.');
}

async function buildUploadRequest(args, env = process.env) {
  const filePath = path.resolve(required(args.file, '--file'));
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    throw new Error(`--file must point to a file: ${filePath}`);
  }

  const directMaxBytes = Number.parseInt(String(args['direct-max-bytes'] ?? env.ZLP_DIRECT_UPLOAD_MAX_BYTES ?? DEFAULT_DIRECT_UPLOAD_MAX_BYTES), 10);
  const contentType = contentTypeForFile(filePath, args['content-type']);
  const preferPresigned = truthy(args.presigned, false);
  const useDirect = !preferPresigned && fileStat.size <= directMaxBytes;
  const payload = {
    domain: normalizeDomain(required(args.domain, '--domain')),
    pageId: sanitizeAssetId(args.page ?? args.pageId ?? 'shared') || 'shared',
    assetKind: sanitizeAssetId(args.kind ?? args.assetKind ?? 'images') || 'images',
    assetId: sanitizeAssetId(required(args.id ?? args.assetId, '--id')),
    fileName: path.basename(filePath),
    contentType,
    contentLength: fileStat.size,
  };

  for (const [argName, fieldName] of [
    ['max-width', 'maxWidth'],
    ['max-height', 'maxHeight'],
    ['quality', 'quality'],
    ['png-compress-level', 'pngCompressLevel'],
  ]) {
    if (args[argName] !== undefined) {
      payload[fieldName] = Number(args[argName]);
    }
  }
  if (truthy(args.overwrite, false)) {
    payload.overwrite = true;
  }
  if (useDirect) {
    payload.imageBase64 = (await readFile(filePath)).toString('base64');
  }

  return {
    filePath,
    fileSize: fileStat.size,
    payload,
    useDirect,
    endpoint: args.endpoint ?? env.ZLP_UPLOAD_API_URL ?? DEFAULT_UPLOAD_API_URL,
    grant: await loadGrant(args, env),
  };
}

async function parseJsonResponse(response) {
  const raw = await response.text();
  return raw ? JSON.parse(raw) : {};
}

async function uploadDraftAsset(args = parseArgs(process.argv.slice(2)), env = process.env) {
  const request = await buildUploadRequest(args, env);
  const presignResponse = await fetch(request.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${request.grant}`,
    },
    body: JSON.stringify(request.payload),
  });
  const body = await parseJsonResponse(presignResponse);
  if (!presignResponse.ok) {
    throw new Error(String(body.error ?? `Upload request failed with status ${presignResponse.status}`));
  }

  if (body.uploadStrategy === 'presigned-put') {
    const headers = new Headers(body.headers ?? {});
    if (!headers.has('Content-Type')) headers.set('Content-Type', request.payload.contentType);
    const putResponse = await fetch(body.uploadUrl, {
      method: 'PUT',
      headers,
      body: await readFile(request.filePath),
    });
    if (!putResponse.ok) {
      throw new Error(`S3 upload failed with status ${putResponse.status}`);
    }
  }

  return {
    ok: true,
    domain: request.payload.domain,
    pageId: request.payload.pageId,
    assetKind: request.payload.assetKind,
    assetId: request.payload.assetId,
    fileName: request.payload.fileName,
    fileSize: request.fileSize,
    directUpload: request.useDirect,
    publicUrl: body.publicUrl,
    key: body.key,
    contentType: body.contentType,
    uploadStrategy: body.uploadStrategy,
    compression: body.compression,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = await uploadDraftAsset(args);
  if (truthy(args.json, false)) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`Uploaded ${result.fileName}\n`);
  process.stdout.write(`publicUrl: ${result.publicUrl}\n`);
  process.stdout.write(`key: ${result.key}\n`);
  process.stdout.write(`strategy: ${result.uploadStrategy}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  buildUploadRequest,
  contentTypeForFile,
  loadGrant,
  normalizeDomain,
  parseArgs,
  parseEnvContent,
  sanitizeAssetId,
  uploadDraftAsset,
};
