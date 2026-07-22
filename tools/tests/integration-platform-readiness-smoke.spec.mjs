import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  summarizeIntegrationPlatformReadiness,
} from '../integration-platform-readiness-smoke.mjs';

const scriptPath = fileURLToPath(new URL('../integration-platform-readiness-smoke.mjs', import.meta.url));
const NOW = 1_800_000_000;
const RESULT_VARIABLES = {
  dataSpaces: ['ZLP_DATA_SPACES_SMOKE_RESULT_JSON', 'classification'],
  commerce: ['ZLP_COMMERCE_SMOKE_RESULT_JSON', 'classification'],
  integrations: ['ZLP_INTEGRATIONS_SMOKE_RESULT_JSON', 'classification'],
  notifications: ['ZLP_NOTIFICATIONS_SMOKE_RESULT_JSON', 'category'],
};

const envelope = (service, classification = 'ready', options = {}) => {
  const [, classificationField] = RESULT_VARIABLES[service];
  return JSON.stringify({
    ok: classification === 'ready',
    [classificationField]: classification,
    environment: options.environment ?? 'test',
    observedAtEpoch: options.observedAtEpoch ?? NOW,
    attempts: 1,
  });
};

const resultEnvironment = (classification = 'ready') => ({
  ZLP_INTEGRATION_PLATFORM_SMOKE_ENVIRONMENT: 'test',
  ...Object.fromEntries(
    Object.entries(RESULT_VARIABLES).map(([service, [name]]) => [
      name,
      envelope(service, classification),
    ]),
  ),
});

test('reports ready only for four recent verified results from the same environment', () => {
  assert.deepEqual(
    summarizeIntegrationPlatformReadiness(resultEnvironment(), NOW),
    {
      ok: true,
      classification: 'ready',
      environment: 'test',
      evaluatedAtEpoch: NOW,
      services: {
        dataSpaces: 'ready',
        commerce: 'ready',
        integrations: 'ready',
        notifications: 'ready',
      },
    },
  );
});

test('fails closed on missing, malformed, oversized, or legacy hand-written labels', () => {
  const environment = resultEnvironment();
  delete environment.ZLP_COMMERCE_SMOKE_RESULT_JSON;
  environment.ZLP_NOTIFICATIONS_SMOKE_RESULT_JSON = '{"secret":"provider-response"';
  environment.ZLP_INTEGRATIONS_SMOKE_RESULT_JSON = 'á'.repeat(2049);
  environment.ZLP_DATA_SPACES_SMOKE_RESULT = 'ready';

  const result = summarizeIntegrationPlatformReadiness(environment, NOW);

  assert.equal(result.ok, false);
  assert.equal(result.classification, 'missing_input');
  assert.deepEqual(result.services, {
    dataSpaces: 'ready',
    commerce: 'missing_input',
    integrations: 'missing_input',
    notifications: 'missing_input',
  });
  assert.doesNotMatch(JSON.stringify(result), /secret|provider-response|xxxx/i);
});

test('rejects mixed environments and inconsistent ok claims', () => {
  const mixed = resultEnvironment();
  mixed.ZLP_COMMERCE_SMOKE_RESULT_JSON = envelope('commerce', 'ready', {
    environment: 'production',
  });
  const inconsistent = resultEnvironment();
  inconsistent.ZLP_INTEGRATIONS_SMOKE_RESULT_JSON = JSON.stringify({
    ok: true,
    classification: 'provider_failure',
    environment: 'test',
    observedAtEpoch: NOW,
  });

  assert.equal(
    summarizeIntegrationPlatformReadiness(mixed, NOW).services.commerce,
    'configuration_failure',
  );
  assert.equal(
    summarizeIntegrationPlatformReadiness(inconsistent, NOW).services.integrations,
    'configuration_failure',
  );
});

test('preserves a fresh real-service missing-input envelope with null environment', () => {
  const environment = resultEnvironment();
  environment.ZLP_DATA_SPACES_SMOKE_RESULT_JSON = JSON.stringify({
    ok: false,
    classification: 'missing_input',
    environment: null,
    observedAtEpoch: NOW,
    attempts: 0,
  });

  const result = summarizeIntegrationPlatformReadiness(environment, NOW);

  assert.equal(result.ok, false);
  assert.equal(result.classification, 'missing_input');
  assert.equal(result.services.dataSpaces, 'missing_input');
});

test('rejects stale and materially future-dated evidence', () => {
  for (const observedAtEpoch of [NOW - 901, NOW + 61]) {
    const environment = resultEnvironment();
    environment.ZLP_DATA_SPACES_SMOKE_RESULT_JSON = envelope(
      'dataSpaces',
      'ready',
      { observedAtEpoch },
    );
    const result = summarizeIntegrationPlatformReadiness(environment, NOW);
    assert.equal(result.ok, false);
    assert.equal(result.classification, 'stale_evidence');
    assert.equal(result.services.dataSpaces, 'stale_evidence');
  }
});

test('uses deterministic precedence for closed service failures', () => {
  const precedence = [
    'missing_input',
    'auth_failure',
    'configuration_failure',
    'provider_failure',
    'propagation_delay',
    'stale_evidence',
  ];
  for (const expected of precedence) {
    const environment = resultEnvironment();
    const applicable = precedence.slice(precedence.indexOf(expected));
    for (const [index, service] of Object.keys(RESULT_VARIABLES).entries()) {
      const classification = applicable[index % applicable.length] ?? 'ready';
      const [name] = RESULT_VARIABLES[service];
      environment[name] = classification === 'stale_evidence'
        ? envelope(service, 'ready', { observedAtEpoch: NOW - 901 })
        : envelope(service, classification);
    }
    assert.equal(
      summarizeIntegrationPlatformReadiness(environment, NOW).classification,
      expected,
    );
  }
});

test('CLI prints only the closed projection and never inherited credentials', () => {
  const credential = 'DO-NOT-PRINT-CREDENTIAL';
  const currentEpoch = Math.floor(Date.now() / 1000);
  const environment = {
    ZLP_INTEGRATION_PLATFORM_SMOKE_ENVIRONMENT: 'production',
    ...Object.fromEntries(
      Object.entries(RESULT_VARIABLES).map(([service, [name]]) => [
        name,
        envelope(service, 'ready', {
          environment: 'production',
          observedAtEpoch: currentEpoch,
        }),
      ]),
    ),
  };
  const execution = spawnSync(process.execPath, [scriptPath], {
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: {
      ...process.env,
      ...environment,
      AWS_SECRET_ACCESS_KEY: credential,
      SMTP_PASSWORD: credential,
    },
    encoding: 'utf8',
  });

  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(JSON.parse(execution.stdout).classification, 'ready');
  assert.doesNotMatch(`${execution.stdout}${execution.stderr}`, new RegExp(credential));
});
