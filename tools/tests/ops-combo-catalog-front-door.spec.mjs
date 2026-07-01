import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildRemoteUpdateScript,
  parseApiEndpoint,
  renderComboCatalogFrontDoorConfig,
  routeRule,
} from '../ops/sync-combo-catalog-front-door.mjs';

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

test('routeRule scopes combo-catalog routes without stealing future features', () => {
  const rule = routeRule(['zoositioweb.com.mx']);

  assert.match(rule, /Host\(`zoositioweb\.com\.mx`\)/);
  assert.match(rule, /Path\(`\/features\/combo-catalog\/read`\)/);
  assert.match(rule, /Path\(`\/features\/combo-catalog\/action`\)/);
  assert.doesNotMatch(rule, /PathPrefix\(`\/features\/combo-catalog/);
  assert.doesNotMatch(rule, /PathPrefix\(`\/features/);
});

test('renderComboCatalogFrontDoorConfig emits test and prod stage middlewares and services', () => {
  const yaml = renderComboCatalogFrontDoorConfig({
    testApiEndpoint: 'https://test-id.execute-api.us-east-1.amazonaws.com/test',
    prodApiEndpoint: 'https://prod-id.execute-api.us-east-1.amazonaws.com/prod',
    testHosts: ['test.zoolandingpage.com.mx'],
    prodHosts: ['zoositioweb.com.mx', 'zoositioweb.com'],
    generatedAtCentral: '2026-07-01 16:50:00 CT (GMT-6)',
  });

  assert.match(yaml, /zlp-combo-catalog-test-secure:/);
  assert.match(yaml, /zlp-combo-catalog-prod-secure:/);
  assert.match(yaml, /prefix: "\/test"/);
  assert.match(yaml, /prefix: "\/prod"/);
  assert.match(yaml, /passHostHeader: false/);
  assert.match(yaml, /url: "https:\/\/test-id\.execute-api\.us-east-1\.amazonaws\.com"/);
  assert.match(yaml, /url: "https:\/\/prod-id\.execute-api\.us-east-1\.amazonaws\.com"/);
  assert.doesNotMatch(yaml, /PathPrefix\(`\/features/);
});

test('buildRemoteUpdateScript backs up before writing the combo-catalog dynamic file', () => {
  const script = buildRemoteUpdateScript({
    remoteFile: '/etc/dokploy/traefik/dynamic/zoolanding-combo-catalog.yml',
    yamlContent: 'http:\n',
  });

  assert.match(script, /cp -p "\$target" "\$backup_path"/);
  assert.match(script, /ZLP_COMBO_CATALOG_TRAEFIK_YAML/);
  assert.match(script, /mv "\$tmp" "\$target"/);
});

test('CLI dry run writes generated config to a requested output file', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'zlp-combo-catalog-front-door-'));
  const outputPath = path.join(root, 'logs', 'ops', 'combo-catalog.yml');
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [
    path.resolve(import.meta.dirname, '../ops/sync-combo-catalog-front-door.mjs'),
    '--test-api-endpoint=https://test-id.execute-api.us-east-1.amazonaws.com/test',
    '--prod-api-endpoint=https://prod-id.execute-api.us-east-1.amazonaws.com/prod',
    `--output=${outputPath}`,
  ], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(await readFile(outputPath, 'utf8'), /zlp-combo-catalog-test-secure/);
});
