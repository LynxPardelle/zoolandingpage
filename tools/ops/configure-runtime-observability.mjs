#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_REGION = 'us-east-1';
const DEFAULT_FUNCTION_NAME_PREFIX = 'zoolanding-config-runtime-ConfigRuntimeReadFunctio';
const DEFAULT_API_NAME = 'zoolanding-config-runtime-read';
const DEFAULT_API_STAGE = 'Prod';
const DEFAULT_API_DOMAIN = 'api.zoolandingpage.com.mx';
const DEFAULT_TOPIC_NAME = 'zoolanding-ops-alerts';
const DEFAULT_RESERVED_CONCURRENCY = 100;
const DEFAULT_CONCURRENCY_ALARM_THRESHOLD = 80;
const DEFAULT_BUDGET_NAME = 'zoolanding-serverless-runtime-monthly-10usd';
const DEFAULT_BUDGET_AMOUNT_USD = 10;
const DEFAULT_TIME_ZONE = 'America/Mexico_City';
const DEFAULT_TAGS = {
  Project: 'Zoolandingpage',
  Component: 'RuntimeFrontDoor',
  ManagedBy: 'Codex',
};
const DEFAULT_BUDGET_SERVICES = [
  'AWS Lambda',
  'Amazon API Gateway',
  'Amazon CloudFront',
  'Amazon DynamoDB',
  'Amazon Route 53',
  'Amazon Simple Storage Service',
];

function parseArgs(rawArgs) {
  const args = {};
  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;
    const [rawKey, ...valueParts] = arg.slice(2).split('=');
    const key = rawKey.trim();
    args[key] = valueParts.length > 0 ? valueParts.join('=').trim() : 'true';
  }
  return args;
}

function boolArg(args, key, fallback = false) {
  const raw = args[key];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function integerArg(args, key, fallback, minimum = 0) {
  const parsed = Number.parseInt(String(args[key] ?? fallback), 10);
  if (!Number.isFinite(parsed) || parsed < minimum) {
    throw new Error(`--${key} must be an integer >= ${minimum}`);
  }
  return parsed;
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
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

function fileStamp(date = new Date()) {
  return date.toISOString().replace(/\D/g, '').slice(0, 14);
}

function awsFileUri(filePath) {
  return `file://${path.resolve(filePath).replace(/\\/g, '/')}`;
}

function tagsAsMapArg(tags = DEFAULT_TAGS) {
  return Object.entries(tags)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
}

function tagsAsListArgs(tags = DEFAULT_TAGS) {
  return Object.entries(tags).map(([key, value]) => `Key=${key},Value=${value}`);
}

function buildCloudFrontTags(tags = DEFAULT_TAGS) {
  return {
    Items: Object.entries(tags).map(([Key, Value]) => ({ Key, Value })),
  };
}

function buildBudgetConfig({
  budgetName = DEFAULT_BUDGET_NAME,
  amountUsd = DEFAULT_BUDGET_AMOUNT_USD,
  services = DEFAULT_BUDGET_SERVICES,
} = {}) {
  return {
    BudgetName: budgetName,
    BudgetLimit: {
      Amount: String(amountUsd),
      Unit: 'USD',
    },
    TimeUnit: 'MONTHLY',
    BudgetType: 'COST',
    CostFilters: {
      Service: services,
    },
    CostTypes: {
      IncludeTax: true,
      IncludeSubscription: true,
      UseBlended: false,
      IncludeRefund: false,
      IncludeCredit: false,
      IncludeUpfront: true,
      IncludeRecurring: true,
      IncludeOtherSubscription: true,
      IncludeSupport: true,
      IncludeDiscount: true,
      UseAmortized: false,
    },
  };
}

function buildBudgetNotifications(alertEmail) {
  if (!alertEmail) return [];
  const subscriber = { SubscriptionType: 'EMAIL', Address: alertEmail };
  return [
    {
      Notification: {
        NotificationType: 'FORECASTED',
        ComparisonOperator: 'GREATER_THAN',
        Threshold: 80,
        ThresholdType: 'PERCENTAGE',
      },
      Subscribers: [subscriber],
    },
    {
      Notification: {
        NotificationType: 'ACTUAL',
        ComparisonOperator: 'GREATER_THAN',
        Threshold: 100,
        ThresholdType: 'PERCENTAGE',
      },
      Subscribers: [subscriber],
    },
  ];
}

function buildAlarmDefinitions({
  functionName,
  apiName = DEFAULT_API_NAME,
  apiStage = DEFAULT_API_STAGE,
  cloudFrontDistributionId,
  topicArn,
  concurrencyThreshold = DEFAULT_CONCURRENCY_ALARM_THRESHOLD,
}) {
  const common = {
    period: '300',
    evaluationPeriods: '1',
    datapointsToAlarm: '1',
    treatMissingData: 'notBreaching',
    alarmActions: topicArn ? [topicArn] : [],
    okActions: topicArn ? [topicArn] : [],
  };

  return [
    {
      name: 'zoolanding-runtime-lambda-errors',
      description: 'Zoolanding runtime-read Lambda has at least one error in 5 minutes.',
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensions: [{ Name: 'FunctionName', Value: functionName }],
      statistic: 'Sum',
      threshold: '1',
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      ...common,
    },
    {
      name: 'zoolanding-runtime-lambda-throttles',
      description: 'Zoolanding runtime-read Lambda has at least one throttle in 5 minutes.',
      namespace: 'AWS/Lambda',
      metricName: 'Throttles',
      dimensions: [{ Name: 'FunctionName', Value: functionName }],
      statistic: 'Sum',
      threshold: '1',
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      ...common,
    },
    {
      name: 'zoolanding-runtime-lambda-concurrency-high',
      description: 'Zoolanding runtime-read Lambda concurrency reached 80 percent of reserved concurrency.',
      namespace: 'AWS/Lambda',
      metricName: 'ConcurrentExecutions',
      dimensions: [{ Name: 'FunctionName', Value: functionName }],
      statistic: 'Maximum',
      threshold: String(concurrencyThreshold),
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      ...common,
    },
    {
      name: 'zoolanding-runtime-apigw-5xx',
      description: 'Zoolanding runtime-read API Gateway returned at least one 5XX in 5 minutes.',
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensions: [
        { Name: 'ApiName', Value: apiName },
        { Name: 'Stage', Value: apiStage },
      ],
      statistic: 'Sum',
      threshold: '1',
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      ...common,
    },
    {
      name: 'zoolanding-runtime-cloudfront-5xx-rate',
      description: 'api.zoolandingpage.com.mx CloudFront 5xxErrorRate reached at least 1 percent in 5 minutes.',
      namespace: 'AWS/CloudFront',
      metricName: '5xxErrorRate',
      dimensions: [
        { Name: 'DistributionId', Value: cloudFrontDistributionId },
        { Name: 'Region', Value: 'Global' },
      ],
      statistic: 'Average',
      ...common,
      evaluationPeriods: '3',
      datapointsToAlarm: '2',
      threshold: '1',
      comparisonOperator: 'GreaterThanOrEqualToThreshold',
      region: 'us-east-1',
    },
  ];
}

function alarmToAwsArgs(alarm, region) {
  const args = [
    'cloudwatch',
    'put-metric-alarm',
    '--region',
    alarm.region ?? region,
    '--alarm-name',
    alarm.name,
    '--alarm-description',
    alarm.description,
    '--namespace',
    alarm.namespace,
    '--metric-name',
    alarm.metricName,
    '--statistic',
    alarm.statistic,
    '--period',
    alarm.period,
    '--evaluation-periods',
    alarm.evaluationPeriods,
    '--datapoints-to-alarm',
    alarm.datapointsToAlarm,
    '--threshold',
    alarm.threshold,
    '--comparison-operator',
    alarm.comparisonOperator,
    '--treat-missing-data',
    alarm.treatMissingData,
  ];

  if (alarm.dimensions.length > 0) {
    args.push('--dimensions', ...alarm.dimensions.map(dimension => `Name=${dimension.Name},Value=${dimension.Value}`));
  }
  if (alarm.alarmActions.length > 0) {
    args.push('--alarm-actions', ...alarm.alarmActions);
  }
  if (alarm.okActions.length > 0) {
    args.push('--ok-actions', ...alarm.okActions);
  }
  return args;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
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

async function awsJson(args) {
  const { stdout } = await runCommand('aws', [...args, '--output', 'json']);
  const trimmed = stdout.trim();
  return trimmed ? JSON.parse(trimmed) : null;
}

async function awsText(args) {
  const { stdout } = await runCommand('aws', [...args, '--output', 'text']);
  return stdout.trim();
}

async function optionalText(command, args) {
  try {
    const { stdout } = await runCommand(command, args);
    return stdout.trim();
  } catch {
    return '';
  }
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function findRuntimeFunction(region, explicitName, prefix = DEFAULT_FUNCTION_NAME_PREFIX) {
  if (explicitName) return explicitName;
  const functions = await awsJson(['lambda', 'list-functions', '--region', region]);
  const found = (functions?.Functions ?? []).find(item => item.FunctionName?.startsWith(prefix));
  if (!found?.FunctionName) {
    throw new Error(`Runtime-read Lambda not found with prefix ${prefix}`);
  }
  return found.FunctionName;
}

async function findRuntimeApi(region, apiName = DEFAULT_API_NAME) {
  const apis = await awsJson(['apigateway', 'get-rest-apis', '--region', region]);
  const found = (apis?.items ?? []).find(item => item.name === apiName);
  if (!found?.id) {
    throw new Error(`API Gateway REST API not found: ${apiName}`);
  }
  return found;
}

async function findCloudFrontDistributionId(apiDomain = DEFAULT_API_DOMAIN) {
  const distributions = await awsJson(['cloudfront', 'list-distributions']);
  const found = (distributions?.DistributionList?.Items ?? []).find(distribution =>
    (distribution.Aliases?.Items ?? []).includes(apiDomain),
  );
  if (!found?.Id) {
    throw new Error(`CloudFront distribution not found for ${apiDomain}`);
  }
  return found.Id;
}

async function getOrCreateTopic({ region, topicName, tags, apply }) {
  if (!apply) {
    return { topicName, topicArn: null, createdOrUpdated: false };
  }

  const topicArn = await awsText([
    'sns',
    'create-topic',
    '--region',
    region,
    '--name',
    topicName,
    '--tags',
    ...tagsAsListArgs(tags),
    '--query',
    'TopicArn',
  ]);
  await runCommand('aws', ['sns', 'tag-resource', '--region', region, '--resource-arn', topicArn, '--tags', ...tagsAsListArgs(tags)]);
  return { topicName, topicArn, createdOrUpdated: true };
}

async function ensureEmailSubscription({ region, topicArn, alertEmail, apply }) {
  if (!alertEmail) {
    return { configured: false, pendingConfirmation: false, reason: 'missing alert email' };
  }
  if (!apply) {
    return { configured: true, pendingConfirmation: false, dryRun: true };
  }

  const subscriptions = await awsJson(['sns', 'list-subscriptions-by-topic', '--region', region, '--topic-arn', topicArn]);
  const existing = (subscriptions?.Subscriptions ?? []).find(
    subscription => subscription.Protocol === 'email' && subscription.Endpoint === alertEmail,
  );
  if (!existing) {
    await runCommand('aws', [
      'sns',
      'subscribe',
      '--region',
      region,
      '--topic-arn',
      topicArn,
      '--protocol',
      'email',
      '--notification-endpoint',
      alertEmail,
    ]);
    return { configured: true, pendingConfirmation: true };
  }
  return {
    configured: true,
    pendingConfirmation: existing.SubscriptionArn === 'PendingConfirmation',
  };
}

async function tagRuntimeResources({ region, accountId, functionName, apiId, cloudFrontDistributionId, workDir, tags, apply }) {
  if (!apply) return false;
  const lambdaArn = `arn:aws:lambda:${region}:${accountId}:function:${functionName}`;
  const apiArn = `arn:aws:apigateway:${region}::/restapis/${apiId}`;
  const cloudFrontArn = `arn:aws:cloudfront::${accountId}:distribution/${cloudFrontDistributionId}`;
  const cloudFrontTagsPath = path.join(workDir, 'cloudfront-tags.json');
  await writeJson(cloudFrontTagsPath, buildCloudFrontTags(tags));

  await runCommand('aws', ['lambda', 'tag-resource', '--region', region, '--resource', lambdaArn, '--tags', tagsAsMapArg(tags)]);
  await runCommand('aws', ['apigateway', 'tag-resource', '--region', region, '--resource-arn', apiArn, '--tags', tagsAsMapArg(tags)]);
  await runCommand('aws', ['cloudfront', 'tag-resource', '--resource', cloudFrontArn, '--tags', awsFileUri(cloudFrontTagsPath)]);
  return true;
}

async function ensureReservedConcurrency({ region, functionName, reservedConcurrency, apply }) {
  const current = await awsJson(['lambda', 'get-function-concurrency', '--region', region, '--function-name', functionName]);
  const currentValue = current?.ReservedConcurrentExecutions ?? null;
  if (apply && currentValue !== reservedConcurrency) {
    await runCommand('aws', [
      'lambda',
      'put-function-concurrency',
      '--region',
      region,
      '--function-name',
      functionName,
      '--reserved-concurrent-executions',
      String(reservedConcurrency),
    ]);
  }
  return { before: currentValue, target: reservedConcurrency };
}

async function putAlarms({ alarms, region, accountId, tags, apply }) {
  if (!apply) return false;
  for (const alarm of alarms) {
    await runCommand('aws', alarmToAwsArgs(alarm, region));
    const alarmRegion = alarm.region ?? region;
    const alarmArn = `arn:aws:cloudwatch:${alarmRegion}:${accountId}:alarm:${alarm.name}`;
    await runCommand('aws', ['cloudwatch', 'tag-resource', '--region', alarmRegion, '--resource-arn', alarmArn, '--tags', ...tagsAsListArgs(tags)]);
  }
  return true;
}

async function budgetExists(accountId, budgetName) {
  try {
    await awsJson(['budgets', 'describe-budget', '--account-id', accountId, '--budget-name', budgetName, '--region', 'us-east-1']);
    return true;
  } catch {
    return false;
  }
}

async function ensureBudget({ accountId, budgetName, amountUsd, services, alertEmail, workDir, apply }) {
  const exists = await budgetExists(accountId, budgetName);
  if (exists || !apply) {
    return { name: budgetName, exists, created: false, skipped: !apply ? 'dry run' : null };
  }
  if (!alertEmail) {
    return { name: budgetName, exists: false, created: false, skipped: 'missing alert email' };
  }

  const budgetPath = path.join(workDir, 'budget.json');
  const notificationsPath = path.join(workDir, 'budget-notifications.json');
  await writeJson(budgetPath, buildBudgetConfig({ budgetName, amountUsd, services }));
  await writeJson(notificationsPath, buildBudgetNotifications(alertEmail));
  await runCommand('aws', [
    'budgets',
    'create-budget',
    '--account-id',
    accountId,
    '--budget',
    awsFileUri(budgetPath),
    '--notifications-with-subscribers',
    awsFileUri(notificationsPath),
    '--region',
    'us-east-1',
  ]);
  return { name: budgetName, exists: false, created: true };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apply = boolArg(args, 'apply', false);
  const configureBudget = boolArg(args, 'budget', true);
  const region = args.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? DEFAULT_REGION;
  const topicName = args['topic-name'] ?? DEFAULT_TOPIC_NAME;
  const apiName = args['api-name'] ?? DEFAULT_API_NAME;
  const apiStage = args['api-stage'] ?? DEFAULT_API_STAGE;
  const apiDomain = args['api-domain'] ?? DEFAULT_API_DOMAIN;
  const reservedConcurrency = integerArg(args, 'reserved-concurrency', DEFAULT_RESERVED_CONCURRENCY, 1);
  const concurrencyThreshold = integerArg(args, 'concurrency-alarm-threshold', Math.floor(reservedConcurrency * 0.8), 1);
  const budgetName = args['budget-name'] ?? DEFAULT_BUDGET_NAME;
  const budgetAmountUsd = integerArg(args, 'budget-amount-usd', DEFAULT_BUDGET_AMOUNT_USD, 1);
  const services = args.services ? splitList(args.services) : DEFAULT_BUDGET_SERVICES;
  const stamp = fileStamp();
  const workDir = path.resolve(args['work-dir'] ?? path.join('logs', 'ops', `runtime-observability-${stamp}`));
  await mkdir(workDir, { recursive: true });

  const alertEmail = args['alert-email']
    ?? process.env.ZOOLANDING_OPS_ALERT_EMAIL
    ?? await optionalText('git', ['config', '--get', 'user.email']);

  const accountId = await awsText(['sts', 'get-caller-identity', '--query', 'Account']);
  const functionName = await findRuntimeFunction(region, args['function-name']);
  const api = await findRuntimeApi(region, apiName);
  const cloudFrontDistributionId = args['cloudfront-distribution-id'] ?? await findCloudFrontDistributionId(apiDomain);
  const concurrency = await ensureReservedConcurrency({
    region,
    functionName,
    reservedConcurrency,
    apply,
  });
  const topic = await getOrCreateTopic({
    region,
    topicName,
    tags: DEFAULT_TAGS,
    apply,
  });
  const emailSubscription = await ensureEmailSubscription({
    region,
    topicArn: topic.topicArn,
    alertEmail,
    apply,
  });

  const alarms = buildAlarmDefinitions({
    functionName,
    apiName: api.name,
    apiStage,
    cloudFrontDistributionId,
    topicArn: topic.topicArn,
    concurrencyThreshold,
  });

  await tagRuntimeResources({
    region,
    accountId,
    functionName,
    apiId: api.id,
    cloudFrontDistributionId,
    workDir,
    tags: DEFAULT_TAGS,
    apply,
  });
  await putAlarms({
    alarms,
    region,
    accountId,
    tags: DEFAULT_TAGS,
    apply,
  });
  const budget = configureBudget
    ? await ensureBudget({
      accountId,
      budgetName,
      amountUsd: budgetAmountUsd,
      services,
      alertEmail,
      workDir,
      apply,
    })
    : { name: budgetName, skipped: 'disabled' };

  const report = {
    generatedAtCentral: centralTimestamp(),
    apply,
    region,
    functionName,
    apiName: api.name,
    apiStage,
    apiDomain,
    cloudFrontDistributionId,
    reservedConcurrency: concurrency,
    topicName,
    emailSubscriptionConfigured: emailSubscription.configured,
    emailSubscriptionPendingConfirmation: emailSubscription.pendingConfirmation,
    alarms: alarms.map(alarm => ({
      name: alarm.name,
      namespace: alarm.namespace,
      metricName: alarm.metricName,
      threshold: alarm.threshold,
      statistic: alarm.statistic,
    })),
    budget: {
      name: budget.name,
      amountUsd: budgetAmountUsd,
      created: budget.created ?? false,
      exists: budget.exists ?? null,
      skipped: budget.skipped ?? null,
      services,
    },
    workDir,
  };

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  DEFAULT_BUDGET_AMOUNT_USD,
  DEFAULT_BUDGET_NAME,
  DEFAULT_CONCURRENCY_ALARM_THRESHOLD,
  DEFAULT_RESERVED_CONCURRENCY,
  buildAlarmDefinitions,
  buildBudgetConfig,
  buildBudgetNotifications,
  buildCloudFrontTags,
  parseArgs,
  tagsAsListArgs,
  tagsAsMapArg,
};
