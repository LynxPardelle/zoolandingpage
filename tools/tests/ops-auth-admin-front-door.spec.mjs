import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildRemoteUpdateScript,
  parseApiEndpoint,
  renderAuthAdminFrontDoorConfig,
  routeRule,
} from '../ops/sync-auth-admin-front-door.mjs';

test('parseApiEndpoint splits execute-api origin from stage prefix', () => {
  assert.deepEqual(
    parseApiEndpoint('https://example.execute-api.us-east-1.amazonaws.com/test', '--test-api-endpoint'),
    {
      originUrl: 'https://example.execute-api.us-east-1.amazonaws.com',
      stagePrefix: '/test',
    },
  );
});

test('parseApiEndpoint rejects non-HTTPS and userinfo', () => {
  assert.throws(() => parseApiEndpoint('http://example.test/test', '--endpoint'), /HTTPS/);
  assert.throws(() => parseApiEndpoint('https://user:pass@example.test/test', '--endpoint'), /without userinfo/);
});

test('routeRule scopes auth-admin routes without stealing auth callback', () => {
  const rule = routeRule(['zoositioweb.com.mx']);

  assert.match(rule, /Host\(`zoositioweb\.com\.mx`\)/);
  assert.match(rule, /Path\(`\/auth\/session`\)/);
  assert.match(rule, /PathPrefix\(`\/auth\/admin\/`\)/);
  assert.doesNotMatch(rule, /PathPrefix\(`\/auth\/`\)/);
  assert.doesNotMatch(rule, /auth\/callback/);
});

test('renderAuthAdminFrontDoorConfig emits test and prod stage middlewares and services', () => {
  const yaml = renderAuthAdminFrontDoorConfig({
    testApiEndpoint: 'https://test-id.execute-api.us-east-1.amazonaws.com/test',
    prodApiEndpoint: 'https://prod-id.execute-api.us-east-1.amazonaws.com/prod',
    testHosts: ['test.zoolandingpage.com.mx'],
    prodHosts: ['zoositioweb.com.mx', 'zoositioweb.com'],
    generatedAtCentral: '2026-06-17 16:00:00 CT (GMT-6)',
  });

  assert.match(yaml, /zlp-auth-admin-test-secure:/);
  assert.match(yaml, /zlp-auth-admin-prod-secure:/);
  assert.match(yaml, /prefix: "\/test"/);
  assert.match(yaml, /prefix: "\/prod"/);
  assert.match(yaml, /passHostHeader: false/);
  assert.match(yaml, /url: "https:\/\/test-id\.execute-api\.us-east-1\.amazonaws\.com"/);
  assert.match(yaml, /url: "https:\/\/prod-id\.execute-api\.us-east-1\.amazonaws\.com"/);
  assert.doesNotMatch(yaml, /PathPrefix\(`\/auth\/`\)/);
});

test('buildRemoteUpdateScript backs up before writing the auth-admin dynamic file', () => {
  const script = buildRemoteUpdateScript({
    remoteFile: '/etc/dokploy/traefik/dynamic/zoolanding-auth-admin.yml',
    yamlContent: 'http:\n',
  });

  assert.match(script, /cp -p "\$target" "\$backup_path"/);
  assert.match(script, /ZLP_AUTH_ADMIN_TRAEFIK_YAML/);
  assert.match(script, /mv "\$tmp" "\$target"/);
});

test('CLI dry run writes generated config to a requested output file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-auth-admin-front-door-'));
  const outputPath = path.join(root, 'logs', 'ops', 'auth-admin.yml');
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [
    path.resolve(import.meta.dirname, '../ops/sync-auth-admin-front-door.mjs'),
    '--test-api-endpoint=https://test-id.execute-api.us-east-1.amazonaws.com/test',
    '--prod-api-endpoint=https://prod-id.execute-api.us-east-1.amazonaws.com/prod',
    `--output=${outputPath}`,
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(outputPath, 'utf8'), /zlp-auth-admin-test-secure/);
});
