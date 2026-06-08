#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_ZONE = 'zoolandingpage.com.mx';
const DEFAULT_REGISTRY_PATH = 'docs/drafts-registry.json';
const DEFAULT_DRAFTS_ROOT = 'drafts';
const DEFAULT_TTL_SECONDS = 300;
const DEFAULT_AWS_REGION = 'us-east-1';
const DEFAULT_SERVICE_NAME = 'zlp-managed-zoolandingpage-ssr';
const DEFAULT_ROUTER_PREFIX = 'zlp-managed';
const DEFAULT_CERT_RESOLVER = 'letsencrypt';
const DEFAULT_ENTRYPOINT = 'websecure';
const DEFAULT_HTTP_ENTRYPOINT = 'web';
const DEFAULT_HTTPS_REDIRECT_MIDDLEWARE = 'zlp-https-redirect';
const DEFAULT_BLOCK_LABEL = 'managed aliases';
const DEFAULT_TIME_ZONE = 'America/Mexico_City';

function parseArgs(rawArgs) {
  const args = {
    config: [],
    domain: [],
    entrypoint: [],
  };

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    const value = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';

    if (key === 'config' || key === 'domain' || key === 'entrypoint') {
      args[key].push(...splitList(value));
      continue;
    }

    args[key] = value;
  }

  if (args.apply === 'true') {
    args['dry-run'] = 'false';
  }

  return args;
}

function splitList(value) {
  return String(value ?? '')
    .split(/[,\s]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function truthy(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function required(value, name) {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    throw new Error(`${name} is required`);
  }
  return normalized;
}

function normalizeHost(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/', 1)[0]
    .split(':', 1)[0]
    .replace(/\.$/, '');
}

function normalizeZoneName(value) {
  return normalizeHost(value).replace(/^\*\./, '');
}

function route53RecordName(host) {
  return `${normalizeHost(host)}.`;
}

function isManagedAlias(host, zoneName = DEFAULT_ZONE) {
  const normalizedHost = normalizeHost(host);
  const normalizedZone = normalizeZoneName(zoneName);
  return normalizedHost.endsWith(`.${normalizedZone}`) && normalizedHost !== normalizedZone;
}

function normalizeEnvironment(value) {
  const normalized = String(value ?? 'all').trim().toLowerCase();
  if (['prod', 'live', 'main'].includes(normalized)) return 'production';
  if (['testing', 'stage', 'staging'].includes(normalized)) return 'test';
  if (['all', 'production', 'test'].includes(normalized)) return normalized;
  throw new Error(`Invalid --environment=${value}. Expected all, production, or test.`);
}

function shouldIncludeEnvironment(current, requested) {
  return requested === 'all' || current === requested;
}

function extractManagedAliasesFromConfig({
  config,
  source,
  zoneName = DEFAULT_ZONE,
  requestedEnvironment = 'all',
  includeDomain = false,
}) {
  const aliases = [];
  const domain = normalizeHost(config?.domain);

  if (includeDomain && domain && isManagedAlias(domain, zoneName) && shouldIncludeEnvironment('production', requestedEnvironment)) {
    aliases.push({
      host: domain,
      canonicalDomain: domain,
      environment: 'production',
      source,
    });
  }

  if (shouldIncludeEnvironment('production', requestedEnvironment)) {
    for (const alias of Array.isArray(config?.aliases) ? config.aliases : []) {
      const host = normalizeHost(alias);
      if (host && isManagedAlias(host, zoneName)) {
        aliases.push({
          host,
          canonicalDomain: domain || null,
          environment: 'production',
          source,
        });
      }
    }
  }

  const environments = config?.environments && typeof config.environments === 'object'
    ? config.environments
    : {};
  for (const [environmentName, environmentConfig] of Object.entries(environments)) {
    const environment = normalizeEnvironment(environmentName);
    if (!shouldIncludeEnvironment(environment, requestedEnvironment)) continue;
    for (const alias of Array.isArray(environmentConfig?.aliases) ? environmentConfig.aliases : []) {
      const host = normalizeHost(alias);
      if (host && isManagedAlias(host, zoneName)) {
        aliases.push({
          host,
          canonicalDomain: domain || null,
          environment,
          source,
        });
      }
    }
  }

  return aliases;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function writeTextFile(filePath, contents) {
  const resolved = path.resolve(filePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, contents, 'utf8');
}

async function readDraftRegistry(registryPath) {
  if (!registryPath || !existsSync(registryPath)) {
    return { registryPath, drafts: [] };
  }

  const raw = await readJson(registryPath);
  return {
    registryPath,
    defaultBaseDir: raw.defaultBaseDir || 'drafts',
    drafts: Array.isArray(raw.drafts) ? raw.drafts : [],
  };
}

async function findSiteConfigFiles({
  cwd = process.cwd(),
  registryPath = DEFAULT_REGISTRY_PATH,
  draftsRoot = DEFAULT_DRAFTS_ROOT,
  explicitConfigs = [],
  includeRegistry = true,
  includeDraftsRoot = true,
}) {
  const candidates = [];

  for (const configPath of explicitConfigs) {
    candidates.push({
      filePath: path.resolve(cwd, configPath),
      sourceKind: 'explicit',
      registryDomain: null,
    });
  }

  if (includeRegistry) {
    const registry = await readDraftRegistry(path.resolve(cwd, registryPath));
    for (const draft of registry.drafts) {
      const repoPath = draft.localPath
        ? path.resolve(cwd, draft.localPath)
        : path.resolve(cwd, registry.defaultBaseDir, draft.repo);
      const rootConfig = path.join(repoPath, 'site-config.json');
      const nestedConfig = path.join(repoPath, String(draft.domain ?? ''), 'site-config.json');
      if (existsSync(rootConfig)) {
        candidates.push({
          filePath: rootConfig,
          sourceKind: 'registry',
          registryDomain: String(draft.domain ?? '').trim() || null,
        });
      } else if (existsSync(nestedConfig)) {
        candidates.push({
          filePath: nestedConfig,
          sourceKind: 'registry',
          registryDomain: String(draft.domain ?? '').trim() || null,
        });
      }
    }
  }

  if (includeDraftsRoot) {
    const root = path.resolve(cwd, draftsRoot);
    if (existsSync(root)) {
      const entries = await readdir(root, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('_')) continue;
        const configPath = path.join(root, entry.name, 'site-config.json');
        if (existsSync(configPath)) {
          candidates.push({
            filePath: configPath,
            sourceKind: 'drafts-root',
            registryDomain: entry.name,
          });
        }
      }
    }
  }

  const seen = new Set();
  return candidates
    .filter(candidate => {
      const key = path.resolve(candidate.filePath).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => left.filePath.localeCompare(right.filePath));
}

async function collectManagedAliases(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const zoneName = normalizeZoneName(options.zoneName ?? DEFAULT_ZONE);
  const requestedEnvironment = normalizeEnvironment(options.environment ?? 'all');
  const includeDomain = Boolean(options.includeDomain);
  const domainFilter = new Set((options.domains ?? []).map(normalizeHost).filter(Boolean));

  const files = await findSiteConfigFiles({
    cwd,
    registryPath: options.registryPath ?? DEFAULT_REGISTRY_PATH,
    draftsRoot: options.draftsRoot ?? DEFAULT_DRAFTS_ROOT,
    explicitConfigs: options.explicitConfigs ?? [],
    includeRegistry: options.includeRegistry ?? true,
    includeDraftsRoot: options.includeDraftsRoot ?? false,
  });
  const aliasesByHost = new Map();
  const scanned = [];

  for (const file of files) {
    const config = await readJson(file.filePath);
    const canonicalDomain = normalizeHost(config?.domain || file.registryDomain);
    if (domainFilter.size > 0 && !domainFilter.has(canonicalDomain)) {
      continue;
    }

    scanned.push({
      domain: canonicalDomain || null,
      filePath: file.filePath,
      sourceKind: file.sourceKind,
    });

    for (const alias of extractManagedAliasesFromConfig({
      config,
      source: file.filePath,
      zoneName,
      requestedEnvironment,
      includeDomain,
    })) {
      const existing = aliasesByHost.get(alias.host);
      if (!existing || alias.environment === 'production') {
        aliasesByHost.set(alias.host, alias);
      }
    }
  }

  return {
    zoneName,
    environment: requestedEnvironment,
    scanned,
    aliases: [...aliasesByHost.values()].sort((left, right) => left.host.localeCompare(right.host)),
  };
}

function sanitizeTraefikName(value) {
  return normalizeHost(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

function renderTraefikDynamicConfig({
  aliases,
  upstreamUrl,
  serviceName = DEFAULT_SERVICE_NAME,
  routerPrefix = DEFAULT_ROUTER_PREFIX,
  certResolver = DEFAULT_CERT_RESOLVER,
  entrypoints = [DEFAULT_HTTP_ENTRYPOINT, DEFAULT_ENTRYPOINT],
  generatedAtCentral = centralTimestamp(),
  httpsRedirectMiddleware = DEFAULT_HTTPS_REDIRECT_MIDDLEWARE,
}) {
  const normalizedAliases = [...new Set(aliases.map(alias => normalizeHost(alias.host ?? alias)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const normalizedEntrypoints = entrypoints.map(String).filter(Boolean);
  const hasHttpEntrypoint = normalizedEntrypoints.includes(DEFAULT_HTTP_ENTRYPOINT);
  const lines = [
    '# Generated by tools/ops/sync-managed-alias-front-door.mjs',
    `# Generated at ${generatedAtCentral} Central Time`,
    '# Do not edit this file manually; rerun the sync tool instead.',
    'http:',
    '  routers:',
  ];

  for (const host of normalizedAliases) {
    const baseRouterName = `${routerPrefix}-${sanitizeTraefikName(host)}`;
    for (const entrypoint of normalizedEntrypoints) {
      const suffix = entrypoint === DEFAULT_ENTRYPOINT ? '-secure' : entrypoint === DEFAULT_HTTP_ENTRYPOINT ? '' : `-${sanitizeTraefikName(entrypoint)}`;
      lines.push(`    ${baseRouterName}${suffix}:`);
      lines.push(`      rule: ${yamlString(`Host(\`${host}\`)`)}`);
      if (entrypoint === DEFAULT_HTTP_ENTRYPOINT) {
        lines.push('      middlewares:');
        lines.push(`        - ${yamlString(`${httpsRedirectMiddleware}@file`)}`);
      }
      lines.push('      entryPoints:');
      lines.push(`        - ${yamlString(entrypoint)}`);
      lines.push(`      service: ${yamlString(serviceName)}`);
      if (entrypoint !== DEFAULT_HTTP_ENTRYPOINT) {
        lines.push('      tls:');
        lines.push(`        certResolver: ${yamlString(certResolver)}`);
      }
    }
  }

  lines.push('  services:');
  lines.push(`    ${serviceName}:`);
  lines.push('      loadBalancer:');
  lines.push('        servers:');
  lines.push(`          - url: ${yamlString(upstreamUrl)}`);
  if (hasHttpEntrypoint) {
    lines.push('  middlewares:');
    lines.push(`    ${httpsRedirectMiddleware}:`);
    lines.push('      redirectScheme:');
    lines.push('        scheme: https');
    lines.push('        permanent: true');
  }
  lines.push('');
  return lines.join('\n');
}

function markerFor(label, edge) {
  return `    # Managed by Codex: ${label} ${edge}`;
}

function renderTraefikRouterBlock({
  aliases,
  serviceName,
  routerName = `${DEFAULT_ROUTER_PREFIX}-aliases`,
  certResolver = DEFAULT_CERT_RESOLVER,
  entrypoints = ['web', 'websecure'],
  blockLabel = DEFAULT_BLOCK_LABEL,
  httpsRedirectMiddleware = DEFAULT_HTTPS_REDIRECT_MIDDLEWARE,
}) {
  const normalizedAliases = [...new Set(aliases.map(alias => normalizeHost(alias.host ?? alias)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  const rule = normalizedAliases.map(host => `Host(\`${host}\`)`).join(' || ');
  const lines = [markerFor(blockLabel, 'begin')];

  for (const entrypoint of entrypoints) {
    const suffix = entrypoint === 'websecure' ? '-secure' : entrypoint === 'web' ? '' : `-${sanitizeTraefikName(entrypoint)}`;
    lines.push(`    ${routerName}${suffix}:`);
    lines.push(`      rule: ${rule}`);
    lines.push(`      service: ${serviceName}`);
    if (entrypoint === 'web') {
      lines.push('      middlewares:');
      lines.push(`        - ${httpsRedirectMiddleware}@file`);
    } else {
      lines.push('      middlewares: []');
    }
    lines.push('      entryPoints:');
    lines.push(`        - ${entrypoint}`);
    if (entrypoint === 'websecure') {
      lines.push('      tls:');
      lines.push(`        certResolver: ${certResolver}`);
    }
  }

  lines.push(markerFor(blockLabel, 'end'));
  return lines.join('\n');
}

function buildRoute53ChangeBatch({ aliases, targetIp, ttlSeconds = DEFAULT_TTL_SECONDS, comment }) {
  const changes = [...new Set(aliases.map(alias => normalizeHost(alias.host ?? alias)).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right))
    .map(host => ({
      Action: 'UPSERT',
      ResourceRecordSet: {
        Name: route53RecordName(host),
        Type: 'A',
        TTL: ttlSeconds,
        ResourceRecords: [{ Value: targetIp }],
      },
    }));

  return {
    Comment: comment || `zoolanding managed alias sync ${centralTimestamp()}`,
    Changes: changes,
  };
}

function centralTimestamp(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset',
  }).formatToParts(date);
  const get = type => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} CT (${get('timeZoneName')})`;
}

async function runAws(args, { profile, region, input } = {}) {
  const fullArgs = [];
  if (profile) fullArgs.push('--profile', profile);
  if (region) fullArgs.push('--region', region);
  fullArgs.push(...args);

  const result = await execFileAsync('aws', fullArgs, {
    input,
    maxBuffer: 1024 * 1024 * 20,
    windowsHide: true,
  });
  return result.stdout.trim();
}

async function runAwsJson(args, options = {}) {
  const output = await runAws([...args, '--output', 'json'], options);
  return output ? JSON.parse(output) : {};
}

async function resolveHostedZoneId({ zoneName, hostedZoneId, awsProfile }) {
  if (hostedZoneId) {
    return hostedZoneId.replace(/^\/hostedzone\//, '');
  }

  const normalized = `${normalizeZoneName(zoneName)}.`;
  const result = await runAwsJson(
    ['route53', 'list-hosted-zones-by-name', '--dns-name', normalized, '--max-items', '1'],
    { profile: awsProfile },
  );
  const zone = result.HostedZones?.find(entry => entry.Name === normalized);
  if (!zone?.Id) {
    throw new Error(`Hosted zone not found for ${normalized}`);
  }
  return String(zone.Id).replace(/^\/hostedzone\//, '');
}

async function upsertRoute53Records({ aliases, targetIp, ttlSeconds, zoneName, hostedZoneId, awsProfile }) {
  const zoneId = await resolveHostedZoneId({ zoneName, hostedZoneId, awsProfile });
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zlp-route53-'));
  const batchPath = path.join(tempDir, 'change-batch.json');

  try {
    const batch = buildRoute53ChangeBatch({ aliases, targetIp, ttlSeconds });
    await writeFile(batchPath, JSON.stringify(batch, null, 2), 'utf8');
    const result = await runAwsJson(
      [
        'route53',
        'change-resource-record-sets',
        '--hosted-zone-id',
        zoneId,
        '--change-batch',
        `file://${batchPath}`,
      ],
      { profile: awsProfile },
    );
    return {
      hostedZoneId: zoneId,
      changeId: result.ChangeInfo?.Id ?? null,
      status: result.ChangeInfo?.Status ?? null,
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildRemoteUpdateScript({ remoteFile, yamlContent, routerBlock, blockLabel = DEFAULT_BLOCK_LABEL, mode = 'full-file' }) {
  if (mode === 'router-block') {
    return buildRemoteRouterBlockPatchScript({ remoteFile, routerBlock, blockLabel });
  }

  const encoded = Buffer.from(yamlContent, 'utf8').toString('base64');
  return [
    'set -eu',
    `target=${shellSingleQuote(remoteFile)}`,
    'timestamp="$(date -u +%Y%m%dT%H%M%SZ)"',
    'backup_dir="$(dirname "$target")/backups"',
    'mkdir -p "$(dirname "$target")" "$backup_dir"',
    'if [ -f "$target" ]; then',
    '  backup_path="$backup_dir/$(basename "$target").$timestamp.bak"',
    '  cp -p "$target" "$backup_path"',
    '  echo "backup=$backup_path"',
    'else',
    '  echo "backup=none"',
    'fi',
    'tmp="$(mktemp "${target}.XXXXXX")"',
    "base64 -d > \"$tmp\" <<'ZLP_TRAEFIK_DYNAMIC_YAML'",
    encoded,
    'ZLP_TRAEFIK_DYNAMIC_YAML',
    'chmod 0644 "$tmp"',
    'mv "$tmp" "$target"',
    'echo "updated=$target"',
  ].join('\n');
}

function buildRemoteRouterBlockPatchScript({ remoteFile, routerBlock, blockLabel = DEFAULT_BLOCK_LABEL }) {
  const encoded = Buffer.from(routerBlock, 'utf8').toString('base64');
  return [
    'set -eu',
    `target=${shellSingleQuote(remoteFile)}`,
    `start_marker=${shellSingleQuote(markerFor(blockLabel, 'begin'))}`,
    `end_marker=${shellSingleQuote(markerFor(blockLabel, 'end'))}`,
    `block_b64=${shellSingleQuote(encoded)}`,
    'timestamp="$(date -u +%Y%m%dT%H%M%SZ)"',
    'backup_dir="$(dirname "$target")/backups"',
    'mkdir -p "$backup_dir"',
    'if [ ! -f "$target" ]; then',
    '  echo "missing=$target" >&2',
    '  exit 1',
    'fi',
    'backup_path="$backup_dir/$(basename "$target").$timestamp.bak"',
    'cp -p "$target" "$backup_path"',
    'echo "backup=$backup_path"',
    'tmp="$(mktemp "${target}.XXXXXX")"',
    'cp -p "$target" "$tmp"',
    "python3 - \"$tmp\" \"$start_marker\" \"$end_marker\" \"$block_b64\" <<'PY'",
    'import base64',
    'import sys',
    'from pathlib import Path',
    '',
    'target = Path(sys.argv[1])',
    'start_marker = sys.argv[2]',
    'end_marker = sys.argv[3]',
    'block = base64.b64decode(sys.argv[4]).decode("utf-8").splitlines()',
    'lines = target.read_text(encoding="utf-8").splitlines()',
    '',
    'if start_marker in lines and end_marker in lines:',
    '    start = lines.index(start_marker)',
    '    end = lines.index(end_marker, start)',
    '    lines = lines[:start] + block + lines[end + 1:]',
    'else:',
    '    insert_at = None',
    '    for index, line in enumerate(lines):',
    '        if line.rstrip() == "  routers:":',
    '            insert_at = index + 1',
    '            break',
    '    if insert_at is None:',
    '        raise SystemExit("could not find top-level http routers section")',
    '    lines = lines[:insert_at] + block + lines[insert_at:]',
    '',
    'target.write_text("\\n".join(lines) + "\\n", encoding="utf-8")',
    'PY',
    'chmod 0644 "$tmp"',
    'mv "$tmp" "$target"',
    'echo "updated=$target"',
  ].join('\n');
}

async function findSsmInstanceIdsByName({ instanceName, awsProfile, awsRegion }) {
  const result = await runAwsJson(
    ['ssm', 'describe-instance-information', '--filters', `Key=tag:Name,Values=${instanceName}`],
    { profile: awsProfile, region: awsRegion },
  );
  return (result.InstanceInformationList ?? [])
    .map(instance => instance.InstanceId)
    .filter(Boolean)
    .sort();
}

async function sendSsmShellScript({ instanceIds, script, awsProfile, awsRegion }) {
  if (!instanceIds.length) {
    throw new Error('No SSM instance IDs provided');
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zlp-ssm-'));
  const parametersPath = path.join(tempDir, 'parameters.json');

  try {
    await writeFile(parametersPath, JSON.stringify({
      commands: [script],
      executionTimeout: ['120'],
    }), 'utf8');
    const sendResult = await runAwsJson(
      [
        'ssm',
        'send-command',
        '--instance-ids',
        ...instanceIds,
        '--document-name',
        'AWS-RunShellScript',
        '--comment',
        'zoolanding managed alias Traefik dynamic config sync',
        '--parameters',
        `file://${parametersPath}`,
      ],
      { profile: awsProfile, region: awsRegion },
    );
    const commandId = sendResult.Command?.CommandId;
    if (!commandId) {
      throw new Error('SSM send-command did not return a CommandId');
    }

    const invocations = [];
    for (const instanceId of instanceIds) {
      invocations.push(await waitForSsmInvocation({ commandId, instanceId, awsProfile, awsRegion }));
    }

    return { commandId, invocations };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function waitForSsmInvocation({ commandId, instanceId, awsProfile, awsRegion }) {
  const terminalStatuses = new Set(['Success', 'Cancelled', 'TimedOut', 'Failed', 'Cancelling']);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const result = await runAwsJson(
        ['ssm', 'get-command-invocation', '--command-id', commandId, '--instance-id', instanceId],
        { profile: awsProfile, region: awsRegion },
      );
      if (terminalStatuses.has(result.Status)) {
        return {
          instanceId,
          status: result.Status,
          stdout: result.StandardOutputContent ?? '',
          stderr: result.StandardErrorContent ?? '',
        };
      }
    } catch (error) {
      if (!String(error.message ?? '').includes('InvocationDoesNotExist')) {
        throw error;
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`SSM command ${commandId} did not finish for ${instanceId}`);
}

function buildPlan({ collected, targetIp, upstreamUrl, options }) {
  const aliases = collected.aliases;
  const route53ChangeBatch = targetIp
    ? buildRoute53ChangeBatch({
      aliases,
      targetIp,
      ttlSeconds: options.ttlSeconds,
    })
    : null;
  const traefikConfig = upstreamUrl
    ? renderTraefikDynamicConfig({
      aliases,
      upstreamUrl,
      serviceName: options.serviceName,
      routerPrefix: options.routerPrefix,
      certResolver: options.certResolver,
      entrypoints: options.entrypoints,
      httpsRedirectMiddleware: options.httpsRedirectMiddleware,
    })
    : null;
  const traefikRouterBlock = options.traefikMode === 'router-block'
    ? renderTraefikRouterBlock({
      aliases,
      serviceName: options.serviceName,
      routerName: `${options.routerPrefix}-aliases`,
      certResolver: options.certResolver,
      entrypoints: options.entrypoints,
      blockLabel: options.blockLabel,
      httpsRedirectMiddleware: options.httpsRedirectMiddleware,
    })
    : null;

  return {
    generatedAtCentral: centralTimestamp(),
    zoneName: collected.zoneName,
    environment: collected.environment,
    aliasCount: aliases.length,
    aliases,
    scanned: collected.scanned,
    route53ChangeBatch,
    traefikConfig,
    traefikRouterBlock,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = process.env ?? {};
  const zoneName = normalizeZoneName(args.zone ?? env.ZOOLANDING_MANAGED_ALIAS_ZONE ?? env.npm_config_zone ?? DEFAULT_ZONE);
  const dryRun = truthy(args['dry-run'] ?? env.npm_config_dry_run, true);
  const skipRoute53 = truthy(args['skip-route53'] ?? env.npm_config_skip_route53);
  const skipTraefik = truthy(args['skip-traefik'] ?? env.npm_config_skip_traefik);
  const targetIp = args['target-ip'] ?? env.ZOOLANDING_FRONT_DOOR_IPV4 ?? env.npm_config_target_ip;
  const upstreamUrl = args['upstream-url'] ?? env.ZOOLANDING_TRAEFIK_UPSTREAM_URL ?? env.npm_config_upstream_url;
  const awsProfile = args.profile ?? env.AWS_PROFILE ?? env.npm_config_profile;
  const awsRegion = args.region ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.npm_config_region ?? DEFAULT_AWS_REGION;
  const remoteFile = args['remote-traefik-file'] ?? env.ZOOLANDING_TRAEFIK_DYNAMIC_FILE ?? env.npm_config_remote_traefik_file;
  const ssmInstanceName = args['ssm-instance-name'] ?? env.ZOOLANDING_SSM_INSTANCE_NAME ?? env.npm_config_ssm_instance_name;
  const ttlSeconds = Number.parseInt(args.ttl ?? env.npm_config_ttl ?? DEFAULT_TTL_SECONDS, 10);

  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('--ttl must be a positive integer');
  }
  if (!skipRoute53 && !targetIp) {
    throw new Error('--target-ip or ZOOLANDING_FRONT_DOOR_IPV4 is required unless --skip-route53 is set');
  }
  if (!skipTraefik && !upstreamUrl) {
    throw new Error('--upstream-url or ZOOLANDING_TRAEFIK_UPSTREAM_URL is required unless --skip-traefik is set');
  }
  if (!dryRun && !skipTraefik && !remoteFile) {
    throw new Error('--remote-traefik-file or ZOOLANDING_TRAEFIK_DYNAMIC_FILE is required for Traefik apply');
  }
  if (!dryRun && !skipTraefik && !ssmInstanceName) {
    throw new Error('--ssm-instance-name or ZOOLANDING_SSM_INSTANCE_NAME is required for Traefik apply');
  }

  const collected = await collectManagedAliases({
    cwd: process.cwd(),
    zoneName,
    registryPath: args.registry ?? env.npm_config_registry ?? DEFAULT_REGISTRY_PATH,
    draftsRoot: args['drafts-root'] ?? env.npm_config_drafts_root ?? DEFAULT_DRAFTS_ROOT,
    explicitConfigs: args.config.length ? args.config : splitList(env.npm_config_config),
    domains: args.domain.length ? args.domain : splitList(env.npm_config_domain),
    environment: args.environment ?? env.npm_config_environment ?? 'all',
    includeDomain: truthy(args['include-domain'] ?? env.npm_config_include_domain),
    includeRegistry: args.registry !== 'false',
    includeDraftsRoot: args['drafts-root']
      ? args['drafts-root'] !== 'false'
      : truthy(args['include-drafts-root'] ?? env.npm_config_include_drafts_root),
  });

  if (collected.aliases.length === 0) {
    throw new Error(`No managed aliases found for *.${zoneName}`);
  }

  const options = {
    ttlSeconds,
    serviceName: args['service-name'] ?? env.npm_config_service_name ?? DEFAULT_SERVICE_NAME,
    routerPrefix: args['router-prefix'] ?? env.npm_config_router_prefix ?? DEFAULT_ROUTER_PREFIX,
    certResolver: args['cert-resolver'] ?? env.npm_config_cert_resolver ?? DEFAULT_CERT_RESOLVER,
    httpsRedirectMiddleware: args['https-redirect-middleware'] ?? env.npm_config_https_redirect_middleware ?? DEFAULT_HTTPS_REDIRECT_MIDDLEWARE,
    traefikMode: args['traefik-mode'] ?? env.npm_config_traefik_mode ?? 'full-file',
    blockLabel: args['block-label'] ?? env.npm_config_block_label ?? DEFAULT_BLOCK_LABEL,
    entrypoints: args.entrypoint.length
      ? args.entrypoint
      : splitList(env.npm_config_entrypoint).length
        ? splitList(env.npm_config_entrypoint)
        : (args['traefik-mode'] ?? env.npm_config_traefik_mode) === 'router-block'
          ? ['web', 'websecure']
          : [DEFAULT_HTTP_ENTRYPOINT, DEFAULT_ENTRYPOINT],
  };
  if (!['full-file', 'router-block'].includes(options.traefikMode)) {
    throw new Error("--traefik-mode must be 'full-file' or 'router-block'");
  }
  const plan = buildPlan({ collected, targetIp, upstreamUrl, options });

  const outputPath = args.output ?? env.npm_config_output;
  const traefikOutputPath = args['traefik-output'] ?? env.npm_config_traefik_output;

  if (outputPath) {
    await writeTextFile(outputPath, JSON.stringify(plan, null, 2) + '\n');
  }
  if (traefikOutputPath) {
    await writeTextFile(
      traefikOutputPath,
      options.traefikMode === 'router-block' ? plan.traefikRouterBlock : plan.traefikConfig,
    );
  }

  const result = {
    ok: true,
    dryRun,
    generatedAtCentral: plan.generatedAtCentral,
    aliasCount: plan.aliasCount,
    aliases: plan.aliases.map(alias => ({
      host: alias.host,
      canonicalDomain: alias.canonicalDomain,
      environment: alias.environment,
    })),
    applied: {
      route53: null,
      traefik: null,
    },
  };

  if (!dryRun && !skipRoute53) {
    result.applied.route53 = await upsertRoute53Records({
      aliases: collected.aliases,
      targetIp: required(targetIp, '--target-ip'),
      ttlSeconds,
      zoneName,
      hostedZoneId: args['hosted-zone-id'] ?? env.ZOOLANDING_ROUTE53_HOSTED_ZONE_ID ?? env.npm_config_hosted_zone_id,
      awsProfile,
    });
  }

  if (!dryRun && !skipTraefik) {
    const script = buildRemoteUpdateScript({
      remoteFile: required(remoteFile, '--remote-traefik-file'),
      yamlContent: plan.traefikConfig,
      routerBlock: plan.traefikRouterBlock,
      blockLabel: options.blockLabel,
      mode: options.traefikMode,
    });
    const instanceIds = await findSsmInstanceIdsByName({
      instanceName: required(ssmInstanceName, '--ssm-instance-name'),
      awsProfile,
      awsRegion,
    });
    if (!instanceIds.length) {
      throw new Error(`No SSM managed instance found with tag Name=${ssmInstanceName}`);
    }
    result.applied.traefik = await sendSsmShellScript({
      instanceIds,
      script,
      awsProfile,
      awsRegion,
    });
    const failed = result.applied.traefik.invocations.filter(invocation => invocation.status !== 'Success');
    if (failed.length > 0) {
      result.ok = false;
      process.exitCode = 1;
    }
  }

  if (dryRun) {
    result.plan = {
      scanned: plan.scanned,
      route53ChangeCount: plan.route53ChangeBatch?.Changes.length ?? 0,
      traefikMode: options.traefikMode,
      traefikConfig: options.traefikMode === 'full-file' ? plan.traefikConfig : null,
      traefikRouterBlock: options.traefikMode === 'router-block' ? plan.traefikRouterBlock : null,
    };
  }

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  buildPlan,
  buildRemoteRouterBlockPatchScript,
  buildRemoteUpdateScript,
  buildRoute53ChangeBatch,
  centralTimestamp,
  collectManagedAliases,
  extractManagedAliasesFromConfig,
  findSiteConfigFiles,
  isManagedAlias,
  normalizeEnvironment,
  normalizeHost,
  normalizeZoneName,
  parseArgs,
  renderTraefikDynamicConfig,
  renderTraefikRouterBlock,
};
