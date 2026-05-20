import assert from 'node:assert/strict';
import test from 'node:test';

import {
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
} from '../ops/configure-runtime-observability.mjs';

test('parseArgs captures apply and observability options', () => {
  const args = parseArgs([
    '--apply',
    '--reserved-concurrency=100',
    '--budget-amount-usd=10',
    '--alert-email=ops@example.com',
  ]);

  assert.equal(args.apply, 'true');
  assert.equal(args['reserved-concurrency'], '100');
  assert.equal(args['budget-amount-usd'], '10');
  assert.equal(args['alert-email'], 'ops@example.com');
});

test('buildAlarmDefinitions creates impact-oriented runtime alarms', () => {
  const alarms = buildAlarmDefinitions({
    functionName: 'runtime-read',
    apiName: 'runtime-api',
    apiStage: 'Prod',
    cloudFrontDistributionId: 'DIST123',
    topicArn: 'arn:aws:sns:us-east-1:123:topic',
    concurrencyThreshold: DEFAULT_CONCURRENCY_ALARM_THRESHOLD,
  });

  assert.deepEqual(
    alarms.map(alarm => alarm.name),
    [
      'zoolanding-runtime-lambda-errors',
      'zoolanding-runtime-lambda-throttles',
      'zoolanding-runtime-lambda-concurrency-high',
      'zoolanding-runtime-apigw-5xx',
      'zoolanding-runtime-cloudfront-5xx-rate',
    ],
  );
  assert.equal(alarms.every(alarm => alarm.treatMissingData === 'notBreaching'), true);
  assert.equal(alarms.find(alarm => alarm.name.endsWith('concurrency-high')).threshold, String(DEFAULT_CONCURRENCY_ALARM_THRESHOLD));
  const cloudFrontAlarm = alarms.find(alarm => alarm.name.endsWith('cloudfront-5xx-rate'));
  assert.equal(cloudFrontAlarm.region, 'us-east-1');
  assert.equal(cloudFrontAlarm.evaluationPeriods, '3');
  assert.equal(cloudFrontAlarm.datapointsToAlarm, '2');
});

test('buildBudgetConfig scopes a notification-only monthly cost budget to runtime services', () => {
  const budget = buildBudgetConfig();

  assert.equal(budget.BudgetName, DEFAULT_BUDGET_NAME);
  assert.equal(budget.BudgetLimit.Amount, String(DEFAULT_BUDGET_AMOUNT_USD));
  assert.equal(budget.BudgetLimit.Unit, 'USD');
  assert.equal(budget.BudgetType, 'COST');
  assert.equal(budget.CostFilters.Service.includes('AWS Lambda'), true);
  assert.equal(budget.CostFilters.Service.includes('Amazon CloudFront'), true);
});

test('buildBudgetNotifications uses forecasted and actual email thresholds', () => {
  const notifications = buildBudgetNotifications('ops@example.com');

  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].Notification.NotificationType, 'FORECASTED');
  assert.equal(notifications[0].Notification.Threshold, 80);
  assert.equal(notifications[1].Notification.NotificationType, 'ACTUAL');
  assert.equal(notifications[1].Notification.Threshold, 100);
  assert.equal(notifications.every(notification => notification.Subscribers[0].Address === 'ops@example.com'), true);
});

test('tag helpers use AWS CLI map and list shapes', () => {
  assert.equal(tagsAsMapArg({ Project: 'Zoolandingpage', ManagedBy: 'Codex' }), 'Project=Zoolandingpage,ManagedBy=Codex');
  assert.deepEqual(tagsAsListArgs({ Project: 'Zoolandingpage' }), ['Key=Project,Value=Zoolandingpage']);
  assert.deepEqual(buildCloudFrontTags({ Project: 'Zoolandingpage' }), {
    Items: [{ Key: 'Project', Value: 'Zoolandingpage' }],
  });
});

test('reserved concurrency default is the documented no-fixed-cost guardrail', () => {
  assert.equal(DEFAULT_RESERVED_CONCURRENCY, 100);
});
