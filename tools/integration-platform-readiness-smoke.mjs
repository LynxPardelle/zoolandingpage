#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

const PLATFORM_ENVIRONMENT_VARIABLE = 'ZLP_INTEGRATION_PLATFORM_SMOKE_ENVIRONMENT';
const SERVICE_RESULTS = Object.freeze({
  dataSpaces: Object.freeze({
    variable: 'ZLP_DATA_SPACES_SMOKE_RESULT_JSON',
    classificationField: 'classification',
  }),
  commerce: Object.freeze({
    variable: 'ZLP_COMMERCE_SMOKE_RESULT_JSON',
    classificationField: 'classification',
  }),
  integrations: Object.freeze({
    variable: 'ZLP_INTEGRATIONS_SMOKE_RESULT_JSON',
    classificationField: 'classification',
  }),
  notifications: Object.freeze({
    variable: 'ZLP_NOTIFICATIONS_SMOKE_RESULT_JSON',
    classificationField: 'category',
  }),
});
const ENVIRONMENTS = new Set(['test', 'production']);
const SERVICE_CLASSIFICATIONS = new Set([
  'ready',
  'missing_input',
  'auth_failure',
  'configuration_failure',
  'provider_failure',
  'propagation_delay',
]);
const FAILURE_PRECEDENCE = [
  'missing_input',
  'auth_failure',
  'configuration_failure',
  'provider_failure',
  'propagation_delay',
  'stale_evidence',
];
const MAX_RESULT_BYTES = 4096;
const MAX_EVIDENCE_AGE_SECONDS = 900;
const MAX_FUTURE_SKEW_SECONDS = 60;

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const classifyServiceResult = (raw, descriptor, expectedEnvironment, nowEpoch) => {
  if (
    typeof raw !== 'string'
    || raw.length === 0
    || Buffer.byteLength(raw, 'utf8') > MAX_RESULT_BYTES
  ) {
    return 'missing_input';
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return 'missing_input';
  }
  if (!isPlainObject(parsed)) {
    return 'missing_input';
  }
  const classification = parsed[descriptor.classificationField];
  if (!SERVICE_CLASSIFICATIONS.has(classification)) {
    return 'missing_input';
  }
  const environmentMatches = parsed.environment === expectedEnvironment;
  const missingInputHasSafeEnvironment = (
    classification === 'missing_input'
    && (parsed.environment === null || environmentMatches)
  );
  if (!environmentMatches && !missingInputHasSafeEnvironment) {
    return 'configuration_failure';
  }
  if (!Number.isSafeInteger(parsed.observedAtEpoch) || parsed.observedAtEpoch < 0) {
    return 'missing_input';
  }
  if (
    parsed.observedAtEpoch < nowEpoch - MAX_EVIDENCE_AGE_SECONDS
    || parsed.observedAtEpoch > nowEpoch + MAX_FUTURE_SKEW_SECONDS
  ) {
    return 'stale_evidence';
  }
  if (typeof parsed.ok !== 'boolean' || parsed.ok !== (classification === 'ready')) {
    return 'configuration_failure';
  }
  return classification;
};

export function summarizeIntegrationPlatformReadiness(
  environment = process.env,
  nowEpoch = Math.floor(Date.now() / 1000),
) {
  const source = environment && typeof environment === 'object' ? environment : {};
  const safeNow = Number.isSafeInteger(nowEpoch) && nowEpoch >= 0 ? nowEpoch : 0;
  const platformEnvironment = ENVIRONMENTS.has(source[PLATFORM_ENVIRONMENT_VARIABLE])
    ? source[PLATFORM_ENVIRONMENT_VARIABLE]
    : null;
  const services = Object.fromEntries(
    Object.entries(SERVICE_RESULTS).map(([service, descriptor]) => [
      service,
      platformEnvironment === null
        ? 'missing_input'
        : classifyServiceResult(
          source[descriptor.variable],
          descriptor,
          platformEnvironment,
          safeNow,
        ),
    ]),
  );
  const classification = FAILURE_PRECEDENCE.find((candidate) =>
    Object.values(services).includes(candidate)) ?? 'ready';
  return {
    ok: classification === 'ready',
    classification,
    environment: platformEnvironment,
    evaluatedAtEpoch: safeNow,
    services,
  };
}

function main() {
  const result = summarizeIntegrationPlatformReadiness(process.env);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.ok ? 0 : 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
