import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_CACHE_POLICY_NAME,
  buildRuntimeCachePolicyConfig,
  findBehavior,
  findCachePolicy,
  parseArgs,
  patchRuntimeBehaviorCachePolicy,
} from '../ops/configure-runtime-front-door-cache.mjs';

test('parseArgs captures apply and TTL options', () => {
  const args = parseArgs(['--apply', '--default-ttl=15', '--cache-policy-name=runtime-cache']);

  assert.equal(args.apply, 'true');
  assert.equal(args['default-ttl'], '15');
  assert.equal(args['cache-policy-name'], 'runtime-cache');
});

test('buildRuntimeCachePolicyConfig keys cache by all query strings only', () => {
  const config = buildRuntimeCachePolicyConfig({ minTtl: 1, defaultTtl: 10, maxTtl: 60 });

  assert.equal(config.Name, DEFAULT_CACHE_POLICY_NAME);
  assert.equal(config.MinTTL, 1);
  assert.equal(config.DefaultTTL, 10);
  assert.equal(config.MaxTTL, 60);
  assert.equal(config.ParametersInCacheKeyAndForwardedToOrigin.QueryStringsConfig.QueryStringBehavior, 'all');
  assert.equal(config.ParametersInCacheKeyAndForwardedToOrigin.HeadersConfig.HeaderBehavior, 'none');
  assert.equal(config.ParametersInCacheKeyAndForwardedToOrigin.CookiesConfig.CookieBehavior, 'none');
  assert.equal(config.ParametersInCacheKeyAndForwardedToOrigin.EnableAcceptEncodingGzip, true);
  assert.equal(config.ParametersInCacheKeyAndForwardedToOrigin.EnableAcceptEncodingBrotli, true);
});

test('findCachePolicy locates custom policy by name', () => {
  const found = findCachePolicy({
    CachePolicyList: {
      Items: [
        { CachePolicy: { Id: 'one', CachePolicyConfig: { Name: 'other' } } },
        { CachePolicy: { Id: 'two', CachePolicyConfig: { Name: 'target' } } },
      ],
    },
  }, 'target');

  assert.equal(found.Id, 'two');
});

test('patchRuntimeBehaviorCachePolicy only changes runtime behavior cache policy', () => {
  const current = {
    CacheBehaviors: {
      Items: [
        {
          PathPattern: '/runtime-bundle*',
          TargetOriginId: 'runtime',
          CachePolicyId: 'old',
          OriginRequestPolicyId: 'origin-policy',
        },
        {
          PathPattern: '/config-authoring*',
          TargetOriginId: 'authoring',
          CachePolicyId: 'old',
        },
      ],
    },
  };

  const patch = patchRuntimeBehaviorCachePolicy(current, {
    pathPattern: '/runtime-bundle*',
    cachePolicyId: 'new',
  });

  assert.equal(patch.previousCachePolicyId, 'old');
  assert.equal(patch.changed, true);
  assert.equal(patch.targetOriginId, 'runtime');
  assert.equal(patch.originRequestPolicyId, 'origin-policy');
  assert.equal(findBehavior(patch.distributionConfig, '/runtime-bundle*').CachePolicyId, 'new');
  assert.equal(findBehavior(patch.distributionConfig, '/config-authoring*').CachePolicyId, 'old');
  assert.equal(findBehavior(current, '/runtime-bundle*').CachePolicyId, 'old');
});
