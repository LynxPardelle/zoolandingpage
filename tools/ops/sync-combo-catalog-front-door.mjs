#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_AWS_REGION = 'us-east-1';
const DEFAULT_TIME_ZONE = 'America/Mexico_City';
const DEFAULT_REMOTE_FILE = '/etc/dokploy/traefik/dynamic/zoolanding-combo-catalog.yml';
const DEFAULT_CERT_RESOLVER = 'letsencrypt';
const DEFAULT_TEST_HOSTS = ['test.zoolandingpage.com.mx'];
const DEFAULT_PROD_HOSTS = ['zoositioweb.com.mx', 'zoositioweb.com'];
const PATH_RULE = [
  'Path(`/features/combo-catalog/read`)',
  'Path(`/features/combo-catalog/action`)',
].join(' || ');

function parseArgs(rawArgs) {
  const args = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    args[rawKey.trim()] = valueParts.length ? valueParts.join('=').trim() : 'true';
  }
  if (args.apply === 'true') args['dry-run'] = 'false';
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
  if (!normalized) throw new Error(`${name} is required`);
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

function yamlString(value) {
  return JSON.stringify(String(value));
}

function parseApiEndpoint(value, label) {
  const raw = required(value, label);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL`);
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error(`${label} must be an HTTPS URL without userinfo`);
  }
  const stagePrefix = url.pathname.replace(/\/+$/, '');
  if (stagePrefix && !/^\/[A-Za-z0-9._~!$&'()*+,;=:@/-]+$/.test(stagePrefix)) {
    throw new Error(`${label} stage path contains unsupported characters`);
  }
  return { originUrl: `${url.protocol}//${url.host}`, stagePrefix };
}

function hostRule(hosts) {
  const normalizedHosts = [...new Set(hosts.map(normalizeHost).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right));
  if (!normalizedHosts.length) throw new Error('At least one combo-catalog host is required');
  return {
    hosts: normalizedHosts,
    rule: normalizedHosts.map(host => `Host(\`${host}\`)`).join(' || '),
  };
}

function routeRule(hosts) {
  return `(${hostRule(hosts).rule}) && (${PATH_RULE})`;
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

function renderRouterSet({ name, hosts, endpoint, certResolver = DEFAULT_CERT_RESOLVER }) {
  const serviceName = `zlp-combo-catalog-${name}`;
  const stageMiddleware = endpoint.stagePrefix ? `zlp-combo-catalog-${name}-stage` : null;
  const rule = routeRule(hosts);
  return [
    `    zlp-combo-catalog-${name}:`,
    `      rule: ${yamlString(rule)}`,
    '      entryPoints:',
    '        - web',
    '      middlewares:',
    '        - redirect-to-https@file',
    `      service: ${serviceName}`,
    '      priority: 100000',
    `    zlp-combo-catalog-${name}-secure:`,
    `      rule: ${yamlString(rule)}`,
    '      entryPoints:',
    '        - websecure',
    ...(stageMiddleware ? ['      middlewares:', `        - ${stageMiddleware}`] : ['      middlewares: []']),
    `      service: ${serviceName}`,
    '      tls:',
    `        certResolver: ${certResolver}`,
    '      priority: 100000',
  ];
}

function renderMiddlewareSet({ name, endpoint }) {
  if (!endpoint.stagePrefix) return [];
  return [
    `    zlp-combo-catalog-${name}-stage:`,
    '      addPrefix:',
    `        prefix: ${yamlString(endpoint.stagePrefix)}`,
  ];
}

function renderServiceSet({ name, endpoint }) {
  return [
    `    zlp-combo-catalog-${name}:`,
    '      loadBalancer:',
    '        passHostHeader: false',
    '        servers:',
    `          - url: ${yamlString(endpoint.originUrl)}`,
  ];
}

function renderComboCatalogFrontDoorConfig({
  testApiEndpoint,
  prodApiEndpoint,
  testHosts = DEFAULT_TEST_HOSTS,
  prodHosts = DEFAULT_PROD_HOSTS,
  generatedAtCentral = centralTimestamp(),
  certResolver = DEFAULT_CERT_RESOLVER,
}) {
  const testEndpoint = parseApiEndpoint(testApiEndpoint, '--test-api-endpoint');
  const prodEndpoint = parseApiEndpoint(prodApiEndpoint, '--prod-api-endpoint');
  const normalizedTestHosts = hostRule(testHosts).hosts;
  const normalizedProdHosts = hostRule(prodHosts).hosts;
  const middlewareLines = [
    ...renderMiddlewareSet({ name: 'test', endpoint: testEndpoint }),
    ...renderMiddlewareSet({ name: 'prod', endpoint: prodEndpoint }),
  ];
  const lines = [
    '# Generated by tools/ops/sync-combo-catalog-front-door.mjs',
    `# Generated at ${generatedAtCentral}`,
    '# Routes only /features/combo-catalog/read and /features/combo-catalog/action.',
    'http:',
    '  routers:',
    ...renderRouterSet({ name: 'test', hosts: normalizedTestHosts, endpoint: testEndpoint, certResolver }),
    ...renderRouterSet({ name: 'prod', hosts: normalizedProdHosts, endpoint: prodEndpoint, certResolver }),
  ];
  if (middlewareLines.length) {
    lines.push('  middlewares:');
    lines.push(...middlewareLines);
  }
  lines.push('  services:');
  lines.push(...renderServiceSet({ name: 'test', endpoint: testEndpoint }));
  lines.push(...renderServiceSet({ name: 'prod', endpoint: prodEndpoint }));
  lines.push('');
  return lines.join('\n');
}

function shellSingleQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildRemoteUpdateScript({ remoteFile, yamlContent }) {
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
    "base64 -d > \"$tmp\" <<'ZLP_COMBO_CATALOG_TRAEFIK_YAML'",
    encoded,
    'ZLP_COMBO_CATALOG_TRAEFIK_YAML',
    'chmod 0644 "$tmp"',
    'mv "$tmp" "$target"',
    'echo "updated=$target"',
  ].join('\n');
}

async function writeTextFile(filePath, contents) {
  const resolved = path.resolve(filePath);
  await mkdir(path.dirname(resolved), { recursive: true });
  await writeFile(resolved, contents, 'utf8');
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
  if (!instanceIds.length) throw new Error('No SSM instance IDs provided');
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zlp-combo-catalog-ssm-'));
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
        'zoolanding combo-catalog Traefik route sync',
        '--parameters',
        `file://${parametersPath}`,
      ],
      { profile: awsProfile, region: awsRegion },
    );
    const commandId = sendResult.Command?.CommandId;
    if (!commandId) throw new Error('SSM send-command did not return a CommandId');
    return {
      commandId,
      invocations: await Promise.all(instanceIds.map(instanceId =>
        waitForSsmInvocation({ commandId, instanceId, awsProfile, awsRegion }),
      )),
    };
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
      if (!String(error.message ?? '').includes('InvocationDoesNotExist')) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`SSM command ${commandId} did not finish for ${instanceId}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = process.env ?? {};
  const dryRun = truthy(args['dry-run'] ?? env.npm_config_dry_run, true);
  const testApiEndpoint = args['test-api-endpoint'] ?? env.ZOOLANDING_COMBO_CATALOG_TEST_ENDPOINT ?? env.npm_config_test_api_endpoint;
  const prodApiEndpoint = args['prod-api-endpoint'] ?? env.ZOOLANDING_COMBO_CATALOG_PROD_ENDPOINT ?? env.npm_config_prod_api_endpoint;
  const testHosts = splitList(args['test-hosts'] ?? env.ZOOLANDING_COMBO_CATALOG_TEST_HOSTS ?? env.npm_config_test_hosts);
  const prodHosts = splitList(args['prod-hosts'] ?? env.ZOOLANDING_COMBO_CATALOG_PROD_HOSTS ?? env.npm_config_prod_hosts);
  const remoteFile = args['remote-traefik-file'] ?? env.ZOOLANDING_COMBO_CATALOG_TRAEFIK_FILE ?? env.npm_config_remote_traefik_file ?? DEFAULT_REMOTE_FILE;
  const awsProfile = args.profile ?? env.AWS_PROFILE ?? env.npm_config_profile;
  const awsRegion = args.region ?? env.AWS_REGION ?? env.AWS_DEFAULT_REGION ?? env.npm_config_region ?? DEFAULT_AWS_REGION;
  const ssmInstanceName = args['ssm-instance-name'] ?? env.ZOOLANDING_SSM_INSTANCE_NAME ?? env.npm_config_ssm_instance_name;
  const ssmInstanceId = args['ssm-instance-id'] ?? env.ZOOLANDING_SSM_INSTANCE_ID ?? env.npm_config_ssm_instance_id;

  const yamlContent = renderComboCatalogFrontDoorConfig({
    testApiEndpoint,
    prodApiEndpoint,
    testHosts: testHosts.length ? testHosts : DEFAULT_TEST_HOSTS,
    prodHosts: prodHosts.length ? prodHosts : DEFAULT_PROD_HOSTS,
    certResolver: args['cert-resolver'] ?? env.npm_config_cert_resolver ?? DEFAULT_CERT_RESOLVER,
  });

  const outputPath = args.output ?? env.npm_config_output;
  if (outputPath) await writeTextFile(outputPath, yamlContent);

  const result = {
    ok: true,
    dryRun,
    remoteFile,
    applied: null,
    generatedAtCentral: centralTimestamp(),
    testHosts: hostRule(testHosts.length ? testHosts : DEFAULT_TEST_HOSTS).hosts,
    prodHosts: hostRule(prodHosts.length ? prodHosts : DEFAULT_PROD_HOSTS).hosts,
  };

  if (dryRun) {
    result.traefikConfig = yamlContent;
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  let instanceIds = splitList(ssmInstanceId);
  if (!instanceIds.length) {
    instanceIds = await findSsmInstanceIdsByName({
      instanceName: required(ssmInstanceName, '--ssm-instance-name or --ssm-instance-id'),
      awsProfile,
      awsRegion,
    });
  }
  if (!instanceIds.length) throw new Error('No SSM managed instance found for combo-catalog front-door sync');

  result.applied = await sendSsmShellScript({
    instanceIds,
    script: buildRemoteUpdateScript({ remoteFile, yamlContent }),
    awsProfile,
    awsRegion,
  });
  const failed = result.applied.invocations.filter(invocation => invocation.status !== 'Success');
  if (failed.length > 0) {
    result.ok = false;
    process.exitCode = 1;
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
  buildRemoteUpdateScript,
  parseApiEndpoint,
  renderComboCatalogFrontDoorConfig,
  routeRule,
};

